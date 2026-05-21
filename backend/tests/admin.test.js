const request = require('supertest');
const app = require('../server');
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let adminToken, userToken, userId, storyId, commentId;

beforeAll(async () => {
  // Créer l'admin directement en DB (is_admin = 1)
  const hash = bcrypt.hashSync('adminpass', 10);
  const result = db
    .prepare('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, 1)')
    .run('superadmin', 'admin@test.com', hash);

  adminToken = jwt.sign(
    { id: result.lastInsertRowid, username: 'superadmin', is_admin: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Créer un user normal
  const resUser = await request(app).post('/api/auth/register').send({
    username: 'cibleadmin',
    email: 'cible@test.com',
    password: 'password123',
  });
  userToken = resUser.body.token;
  const decoded = jwt.decode(resUser.body.token);
  userId = decoded.id;

  // Créer une histoire avec le user normal
  const resStory = await request(app)
    .post('/api/stories')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'Histoire test admin',
      content: 'Contenu suffisamment long pour passer la validation.',
    });
  storyId = resStory.body.id;

  // Créer un commentaire
  const resComment = await request(app)
    .post(`/api/stories/${storyId}/comments`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({ content: 'Commentaire à supprimer par admin' });
  commentId = resComment.body.id;
});

describe('Admin — Accès', () => {
  test('refuse un non-admin', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('refuse sans token', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  test('admin accède aux stats', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('stories');
    expect(res.body).toHaveProperty('comments');
  });
});

describe('Admin — Gestion des utilisateurs', () => {
  test('liste tous les utilisateurs', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('bannit un utilisateur', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${userId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.banned).toBe(true);
  });

  test('un user banni ne peut plus se connecter', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'cibleadmin',
      password: 'password123',
    });
    expect(res.status).toBe(403);
  });

  test('débannit un utilisateur', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${userId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.banned).toBe(false);
  });

  test('supprime un utilisateur', async () => {
    const resNew = await request(app).post('/api/auth/register').send({
      username: 'asupprimer',
      email: 'delete@test.com',
      password: 'password123',
    });
    const id = jwt.decode(resNew.body.token).id;

    const res = await request(app)
      .delete(`/api/admin/users/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Admin — Gestion des histoires', () => {
  test('liste toutes les histoires (public + privé)', async () => {
    const res = await request(app)
      .get('/api/admin/stories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((s) => s.id === storyId)).toBe(true);
  });

  test('supprime une histoire', async () => {
    const resNew = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'A supprimer admin', content: 'Contenu suffisamment long.' });
    const newId = resNew.body.id;

    const res = await request(app)
      .delete(`/api/admin/stories/${newId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const check = await request(app).get(`/api/stories/${newId}`);
    expect(check.status).toBe(404);
  });
});

describe('Admin — Gestion des commentaires', () => {
  test('liste tous les commentaires', async () => {
    const res = await request(app)
      .get('/api/admin/comments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('supprime un commentaire', async () => {
    const res = await request(app)
      .delete(`/api/admin/comments/${commentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Admin — Mots bannis', () => {
  let wordId;

  test('ajoute un mot banni', async () => {
    const res = await request(app)
      .post('/api/admin/banned-words')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ word: 'insulte' });
    expect(res.status).toBe(201);
    expect(res.body.word).toBe('insulte');
    wordId = res.body.id;
  });

  test('le mot banni bloque une histoire', async () => {
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Histoire avec insulte dedans',
        content: 'Contenu normal sans problème.',
      });
    expect(res.status).toBe(400);
  });

  test('liste les mots bannis', async () => {
    const res = await request(app)
      .get('/api/admin/banned-words')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((w) => w.word === 'insulte')).toBe(true);
  });

  test('retire un mot de la liste', async () => {
    const res = await request(app)
      .delete(`/api/admin/banned-words/${wordId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('le mot retiré ne bloque plus', async () => {
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Histoire avec insulte dedans',
        content: 'Contenu normal sans problème du tout.',
      });
    expect(res.status).toBe(201);
  });
});
