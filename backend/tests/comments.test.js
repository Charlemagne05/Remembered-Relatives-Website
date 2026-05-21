const request = require('supertest');
const app = require('../server');

let token, otherToken, storyId, commentId;

beforeAll(async () => {
  const resUser = await request(app).post('/api/auth/register').send({
    username: 'commenteur',
    email: 'commenteur@test.com',
    password: 'password123',
  });
  token = resUser.body.token;

  const resOther = await request(app).post('/api/auth/register').send({
    username: 'autreuser',
    email: 'autre@test.com',
    password: 'password123',
  });
  otherToken = resOther.body.token;

  const resStory = await request(app)
    .post('/api/stories')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Histoire pour commentaires',
      content: 'Contenu long enough pour passer la validation du serveur.',
    });
  storyId = resStory.body.id;
});
describe('Comments — Création', () => {
  test('poste un commentaire', async () => {
    const res = await request(app)
      .post(`/api/stories/${storyId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Beau témoignage, merci du partage.' });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Beau témoignage, merci du partage.');
    expect(res.body.username).toBe('commenteur');
    commentId = res.body.id;
  });

  test('refuse sans authentification', async () => {
    const res = await request(app)
      .post(`/api/stories/${storyId}/comments`)
      .send({ content: 'Commentaire anonyme' });
    expect(res.status).toBe(401);
  });

  test('refuse un commentaire vide', async () => {
    const res = await request(app)
      .post(`/api/stories/${storyId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  test('refuse un commentaire trop long (>500 chars)', async () => {
    const res = await request(app)
      .post(`/api/stories/${storyId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'a'.repeat(501) });
    expect(res.status).toBe(400);
  });

  test('refuse sur une histoire inexistante', async () => {
    const res = await request(app)
      .post('/api/stories/99999/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Commentaire orphelin' });
    expect(res.status).toBe(404);
  });
});

describe('Comments — Lecture', () => {
  test('liste les commentaires d\'une histoire', async () => {
    const res = await request(app).get(`/api/stories/${storyId}/comments`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('username');
  });
});

describe('Comments — Suppression', () => {
  test("interdit la suppression par un autre user", async () => {
    const res = await request(app)
      .delete(`/api/stories/${storyId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  test("supprime son propre commentaire", async () => {
    const res = await request(app)
      .delete(`/api/stories/${storyId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
