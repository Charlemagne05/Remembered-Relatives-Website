const request = require('supertest');
const app = require('../server');

let tokenA, tokenB, storyId;

beforeAll(async () => {
  const resA = await request(app).post('/api/auth/register').send({
    username: 'auteurA',
    email: 'auteurA@test.com',
    password: 'password123',
  });
  tokenA = resA.body.token;

  const resB = await request(app).post('/api/auth/register').send({
    username: 'auteurB',
    email: 'auteurB@test.com',
    password: 'password123',
  });
  tokenB = resB.body.token;
});

describe('Stories — Création', () => {
  test('crée une histoire avec des données valides', async () => {
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'En souvenir de Grand-mère',
        content: 'Elle nous a quittés en 2020 mais son sourire reste gravé dans nos cœurs.',
        is_public: 1,
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('En souvenir de Grand-mère');
    expect(res.body.author).toBe('auteurA');
    expect(res.body.likes).toBe(0);
    storyId = res.body.id;
  });

  test('refuse sans authentification', async () => {
    const res = await request(app).post('/api/stories').send({
      title: 'Une histoire',
      content: 'Du contenu suffisamment long pour passer la validation.',
    });
    expect(res.status).toBe(401);
  });

  test('refuse un titre trop court', async () => {
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'ab', content: 'Contenu suffisamment long.' });
    expect(res.status).toBe(400);
  });

  test('refuse un contenu trop court', async () => {
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Titre valide', content: 'court' });
    expect(res.status).toBe(400);
  });
});

describe('Stories — Lecture', () => {
  test('liste les histoires publiques', async () => {
    const res = await request(app).get('/api/stories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('retourne une histoire par son id', async () => {
    const res = await request(app).get(`/api/stories/${storyId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(storyId);
  });

  test('retourne 404 pour un id inexistant', async () => {
    const res = await request(app).get('/api/stories/99999');
    expect(res.status).toBe(404);
  });

  test('recherche par mot-clé dans le titre', async () => {
    const res = await request(app).get('/api/stories?search=Grand-mère');
    expect(res.status).toBe(200);
    expect(res.body.some((s) => s.id === storyId)).toBe(true);
  });

  test('trie par likes', async () => {
    const res = await request(app).get('/api/stories?sort=likes');
    expect(res.status).toBe(200);
    const likes = res.body.map((s) => s.likes);
    expect(likes).toEqual([...likes].sort((a, b) => b - a));
  });
});

describe('Stories — Histoire privée', () => {
  let privateStoryId;

  test('crée une histoire privée', async () => {
    const res = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Histoire privée',
        content: 'Ceci est un souvenir privé que je garde pour moi.',
        is_public: 0,
      });
    expect(res.status).toBe(201);
    privateStoryId = res.body.id;
  });

  test("n'apparaît pas dans la liste publique", async () => {
    const res = await request(app).get('/api/stories');
    expect(res.body.every((s) => s.id !== privateStoryId)).toBe(true);
  });

  test("retourne 403 si un autre user essaie d'y accéder", async () => {
    const res = await request(app)
      .get(`/api/stories/${privateStoryId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });
});

describe('Stories — Modification', () => {
  test("modifie sa propre histoire", async () => {
    const res = await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Titre modifié' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Titre modifié');
  });

  test("interdit la modification par un autre user", async () => {
    const res = await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'Vol de titre' });
    expect(res.status).toBe(403);
  });
});

describe('Stories — Likes', () => {
  test('like une histoire', async () => {
    const res = await request(app)
      .post(`/api/stories/${storyId}/like`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(true);
    expect(res.body.likes).toBe(1);
  });

  test('unlike en recliquant (toggle)', async () => {
    const res = await request(app)
      .post(`/api/stories/${storyId}/like`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(false);
    expect(res.body.likes).toBe(0);
  });

  test('refuse le like sans authentification', async () => {
    const res = await request(app).post(`/api/stories/${storyId}/like`);
    expect(res.status).toBe(401);
  });
});

describe('Stories — Suppression', () => {
  test("interdit la suppression par un autre user", async () => {
    const res = await request(app)
      .delete(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  test("supprime sa propre histoire", async () => {
    const res = await request(app)
      .delete(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });

  test('retourne 404 après suppression', async () => {
    const res = await request(app).get(`/api/stories/${storyId}`);
    expect(res.status).toBe(404);
  });
});
