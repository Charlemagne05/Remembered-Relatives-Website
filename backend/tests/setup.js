// Base de données en mémoire pour les tests — rien n'est écrit sur le disque
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';
