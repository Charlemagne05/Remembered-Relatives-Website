const db = require('../database/db');

function containsBannedWord(text) {
  const words = db.prepare('SELECT word FROM banned_words').all();
  const lower = text.toLowerCase();
  return words.some(({ word }) => lower.includes(word.toLowerCase()));
}

function checkBannedWords(...fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (value && containsBannedWord(value)) {
        return res.status(400).json({ error: `Le champ "${field}" contient un mot interdit` });
      }
    }
    next();
  };
}

module.exports = { checkBannedWords, containsBannedWord };
