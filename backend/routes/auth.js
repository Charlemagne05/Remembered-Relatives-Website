const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username: 3-30 caractères'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe: minimum 6 caractères'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existing = db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'Username ou email déjà utilisé' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username, email, password_hash);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username, is_admin: 0 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ id: result.lastInsertRowid, token, username, is_admin: false });
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username requis'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Compte suspendu' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ id: user.id, token, username: user.username, is_admin: Boolean(user.is_admin) });
  }
);

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({ ...user, is_admin: Boolean(user.is_admin) });
});

module.exports = router;
