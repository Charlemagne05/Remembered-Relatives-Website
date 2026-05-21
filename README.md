# Relatives Remembered

Plateforme de partage de souvenirs pour honorer les proches disparus.

## Structure

```
├── backend/    → API Express + SQLite (port 3001)
└── frontend/   → React + TypeScript + MUI (port 5173)
```

## Lancer le projet

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm start
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Ouvrir **http://localhost:5173**
