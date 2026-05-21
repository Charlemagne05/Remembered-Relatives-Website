const request = require('supertest');
const app = require('../server');

describe('Auth — Register', () => {
  test('crée un compte avec des données valides', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'alice@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.username).toBe('alice');
    expect(res.body.is_admin).toBe(false);
  });

  test('refuse un username trop court', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'ab',
      email: 'ab@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  test('refuse un email invalide', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'validuser',
      email: 'pas-un-email',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  test('refuse un mot de passe trop court', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'validuser',
      email: 'valid@test.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });

  test('refuse un username déjà pris', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'dupuser',
      email: 'dup@test.com',
      password: 'password123',
    });
    const res = await request(app).post('/api/auth/register').send({
      username: 'dupuser',
      email: 'autre@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });
});

describe('Auth — Login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      username: 'loginuser',
      email: 'login@test.com',
      password: 'monmotdepasse',
    });
  });

  test('connecte avec les bons identifiants', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'loginuser',
      password: 'monmotdepasse',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('refuse un mauvais mot de passe', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'loginuser',
      password: 'mauvaismdp',
    });
    expect(res.status).toBe(401);
  });

  test('refuse un username inexistant', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'inexistant',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('Auth — /me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'meuser',
      email: 'me@test.com',
      password: 'password123',
    });
    token = res.body.token;
  });

  test('retourne le profil avec un token valide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('meuser');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  test('refuse sans token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('refuse avec un token invalide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer tokenbidon');
    expect(res.status).toBe(401);
  });
});
