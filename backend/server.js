require('dotenv').config();

// Fallback so the server starts even without a .env file
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'relatives_remembered_default_dev_key_change_in_prod';
}
if (!process.env.PORT) {
  process.env.PORT = '3001';
}

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const storiesRoutes = require('./routes/stories');
const commentsRoutes = require('./routes/comments');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/stories/:storyId/comments', commentsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  // Erreurs Multer (upload fichiers)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image trop lourde (max 5 MB par fichier)' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Champ de fichier inattendu' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Maximum 15 images par story' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Erreur upload: ${err.message}` });
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Relatives Remembered API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
