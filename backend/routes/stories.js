const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { checkBannedWords } = require('../middleware/bannedWords');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `story-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images seulement'));
    cb(null, true);
  },
});

function getOptionalUserId(req) {
  if (!req.headers.authorization) return null;
  try {
    const jwt = require('jsonwebtoken');
    return jwt.verify(req.headers.authorization.slice(7), process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
}

function enrichStory(story, userId) {
  const likeCount = db
    .prepare('SELECT COUNT(*) as count FROM story_likes WHERE story_id = ?')
    .get(story.id).count;
  const userLiked = userId
    ? Boolean(db.prepare('SELECT 1 FROM story_likes WHERE story_id = ? AND user_id = ?').get(story.id, userId))
    : false;
  const author = db.prepare('SELECT username FROM users WHERE id = ?').get(story.user_id);
  return { ...story, likes: likeCount, user_liked: userLiked, author: author?.username };
}

// GET /api/stories — liste publique avec recherche et tri
router.get('/', (req, res) => {
  const { search, sort } = req.query;
  const userId = getOptionalUserId(req);

  let query = 'SELECT * FROM stories WHERE is_public = 1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  let stories = db.prepare(query).all(...params).map((s) => enrichStory(s, userId));

  if (sort === 'likes') {
    stories.sort((a, b) => b.likes - a.likes);
  }

  res.json(stories);
});

// GET /api/stories/user/:userId — histoires d'un profil
router.get('/user/:userId', (req, res) => {
  const viewerIsOwner =
    req.headers.authorization &&
    (() => {
      try {
        const jwt = require('jsonwebtoken');
        const id = jwt.verify(req.headers.authorization.slice(7), process.env.JWT_SECRET).id;
        return id === parseInt(req.params.userId);
      } catch {
        return false;
      }
    })();

  const stories = viewerIsOwner
    ? db.prepare('SELECT * FROM stories WHERE user_id = ? ORDER BY created_at DESC').all(req.params.userId)
    : db.prepare('SELECT * FROM stories WHERE user_id = ? AND is_public = 1 ORDER BY created_at DESC').all(req.params.userId);

  res.json(stories.map((s) => enrichStory(s, null)));
});

// GET /api/stories/:id
router.get('/:id', (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Histoire introuvable' });

  const userId = getOptionalUserId(req);

  if (!story.is_public && story.user_id !== userId) {
    return res.status(403).json({ error: 'Histoire privée' });
  }

  res.json(enrichStory(story, userId));
});

// POST /api/stories — créer une histoire
router.post(
  '/',
  requireAuth,
  upload.single('image'),
  checkBannedWords('title', 'content'),
  [
    body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Titre: 3-100 caractères'),
    body('content').trim().isLength({ min: 10 }).withMessage('Contenu trop court'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, relationship = '', content, is_public = 1 } = req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;

    const result = db
      .prepare('INSERT INTO stories (user_id, title, relationship, content, image_path, is_public) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.id, title, relationship, content, image_path, is_public ? 1 : 0);

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(enrichStory(story, req.user.id));
  }
);

// PUT /api/stories/:id — modifier sa propre histoire
router.put(
  '/:id',
  requireAuth,
  checkBannedWords('title', 'content'),
  [
    body('title').optional().trim().isLength({ min: 3, max: 100 }),
    body('content').optional().trim().isLength({ min: 10 }),
  ],
  (req, res) => {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
    if (!story) return res.status(404).json({ error: 'Histoire introuvable' });
    if (story.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const title = req.body.title ?? story.title;
    const relationship = req.body.relationship ?? story.relationship;
    const content = req.body.content ?? story.content;
    const is_public =
      req.body.is_public !== undefined ? (req.body.is_public ? 1 : 0) : story.is_public;

    db.prepare('UPDATE stories SET title = ?, relationship = ?, content = ?, is_public = ? WHERE id = ?').run(
      title, relationship, content, is_public, story.id
    );

    const updated = db.prepare('SELECT * FROM stories WHERE id = ?').get(story.id);
    res.json(enrichStory(updated, req.user.id));
  }
);

// DELETE /api/stories/:id
router.delete('/:id', requireAuth, (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Histoire introuvable' });
  if (story.user_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  if (story.image_path) {
    const fullPath = path.join(__dirname, '..', story.image_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
  res.json({ message: 'Histoire supprimée' });
});

// POST /api/stories/:id/report
router.post('/:id/report', requireAuth, (req, res) => {
  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Histoire introuvable' });

  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Raison requise' });

  const already = db
    .prepare('SELECT 1 FROM reports WHERE story_id = ? AND reported_by = ?')
    .get(story.id, req.user.id);
  if (already) return res.status(409).json({ error: 'Vous avez déjà signalé cette histoire' });

  db.prepare('INSERT INTO reports (story_id, reported_by, reason) VALUES (?, ?, ?)')
    .run(story.id, req.user.id, reason.trim());

  res.status(201).json({ message: 'Signalement envoyé' });
});

// POST /api/stories/:id/like — toggle like
router.post('/:id/like', requireAuth, (req, res) => {
  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Histoire introuvable' });

  const existing = db
    .prepare('SELECT 1 FROM story_likes WHERE user_id = ? AND story_id = ?')
    .get(req.user.id, story.id);

  if (existing) {
    db.prepare('DELETE FROM story_likes WHERE user_id = ? AND story_id = ?').run(req.user.id, story.id);
  } else {
    db.prepare('INSERT INTO story_likes (user_id, story_id) VALUES (?, ?)').run(req.user.id, story.id);
  }

  const count = db
    .prepare('SELECT COUNT(*) as count FROM story_likes WHERE story_id = ?')
    .get(story.id).count;

  res.json({ liked: !existing, likes: count });
});

module.exports = router;
