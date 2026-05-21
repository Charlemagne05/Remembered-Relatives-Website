const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// ── Utilisateurs ──────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = db
    .prepare('SELECT id, username, email, is_admin, is_banned, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json(users.map((u) => ({ ...u, is_admin: Boolean(u.is_admin), is_banned: Boolean(u.is_banned) })));
});

// POST /api/admin/users — créer un compte manuellement
router.post(
  '/users',
  [
    body('username').trim().isLength({ min: 3, max: 30 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password, is_admin = 0 } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) return res.status(409).json({ error: 'Username ou email déjà utilisé' });

    const password_hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)')
      .run(username, email, password_hash, is_admin ? 1 : 0);

    res.status(201).json({ id: result.lastInsertRowid, username, email, is_admin: Boolean(is_admin) });
  }
);

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Impossible de se supprimer soi-même' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Utilisateur supprimé' });
});

// PATCH /api/admin/users/:id/ban — toggle ban
router.patch('/users/:id/ban', (req, res) => {
  const user = db.prepare('SELECT id, is_banned FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const newBanned = user.is_banned ? 0 : 1;
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(newBanned, user.id);
  res.json({ banned: Boolean(newBanned) });
});

// ── Histoires ─────────────────────────────────────────────────────────────────

// GET /api/admin/stories
router.get('/stories', (req, res) => {
  const stories = db
    .prepare(`
      SELECT s.*, u.username as author
      FROM stories s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `)
    .all();
  res.json(stories);
});

// POST /api/admin/stories
router.post(
  '/stories',
  [
    body('title').trim().isLength({ min: 3, max: 100 }),
    body('content').trim().isLength({ min: 10 }),
    body('user_id').isInt(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, relationship = '', content, user_id, is_public = 1 } = req.body;
    const result = db
      .prepare('INSERT INTO stories (user_id, title, relationship, content, is_public) VALUES (?, ?, ?, ?, ?)')
      .run(user_id, title, relationship, content, is_public ? 1 : 0);

    res.status(201).json({ id: result.lastInsertRowid });
  }
);

// DELETE /api/admin/stories/:id
router.delete('/stories/:id', (req, res) => {
  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Histoire introuvable' });

  db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Histoire supprimée' });
});

// ── Commentaires ──────────────────────────────────────────────────────────────

// GET /api/admin/comments
router.get('/comments', (req, res) => {
  const comments = db
    .prepare(`
      SELECT c.*, u.username, s.title as story_title
      FROM comments c
      JOIN users u ON u.id = c.user_id
      JOIN stories s ON s.id = c.story_id
      ORDER BY c.created_at DESC
    `)
    .all();
  res.json(comments);
});

// DELETE /api/admin/comments/:id
router.delete('/comments/:id', (req, res) => {
  const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Commentaire introuvable' });

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Commentaire supprimé' });
});

// ── Mots bannis ───────────────────────────────────────────────────────────────

// GET /api/admin/banned-words
router.get('/banned-words', (req, res) => {
  res.json(db.prepare('SELECT * FROM banned_words ORDER BY word ASC').all());
});

// POST /api/admin/banned-words
router.post('/banned-words', [body('word').trim().isLength({ min: 1 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = db
      .prepare('INSERT INTO banned_words (word) VALUES (?)')
      .run(req.body.word.toLowerCase());
    res.status(201).json({ id: result.lastInsertRowid, word: req.body.word.toLowerCase() });
  } catch {
    res.status(409).json({ error: 'Mot déjà dans la liste' });
  }
});

// DELETE /api/admin/banned-words/:id
router.delete('/banned-words/:id', (req, res) => {
  db.prepare('DELETE FROM banned_words WHERE id = ?').run(req.params.id);
  res.json({ message: 'Mot retiré de la liste' });
});

// ── Statistiques ──────────────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  res.json({
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    stories: db.prepare('SELECT COUNT(*) as count FROM stories').get().count,
    comments: db.prepare('SELECT COUNT(*) as count FROM comments').get().count,
    likes: db.prepare('SELECT COUNT(*) as count FROM story_likes').get().count,
    banned_users: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1').get().count,
  });
});

module.exports = router;
