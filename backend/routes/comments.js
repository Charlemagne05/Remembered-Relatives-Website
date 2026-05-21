const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { checkBannedWords } = require('../middleware/bannedWords');

const router = express.Router({ mergeParams: true });

// GET /api/stories/:storyId/comments
router.get('/', (req, res) => {
  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.storyId);
  if (!story) return res.status(404).json({ error: 'Histoire introuvable' });

  const comments = db
    .prepare(`
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.story_id = ?
      ORDER BY c.created_at ASC
    `)
    .all(req.params.storyId);

  res.json(comments);
});

// POST /api/stories/:storyId/comments
router.post(
  '/',
  requireAuth,
  checkBannedWords('content'),
  [body('content').trim().isLength({ min: 1, max: 500 }).withMessage('Commentaire: 1-500 caractères')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.storyId);
    if (!story) return res.status(404).json({ error: 'Histoire introuvable' });

    const result = db
      .prepare('INSERT INTO comments (story_id, user_id, content) VALUES (?, ?, ?)')
      .run(req.params.storyId, req.user.id, req.body.content);

    const comment = db
      .prepare(`
        SELECT c.*, u.username
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json(comment);
  }
);

// DELETE /api/stories/:storyId/comments/:id
router.delete('/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Commentaire introuvable' });

  if (comment.user_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Commentaire supprimé' });
});

module.exports = router;
