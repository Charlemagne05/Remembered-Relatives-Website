require('dotenv').config();

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
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image trop lourde (max 5MB)' });
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
