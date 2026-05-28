# Relatives Remembered

Plateforme de partage de souvenirs pour honorer les proches disparus.

## Structure du projet

```
Remembered-Relatives-Website/
├── backend/     → API Node.js + Express + SQLite (port 3001)
├── frontend/    → React + TypeScript + MUI (port 5173)
└── .vscode/     → Config VS Code (tâches de lancement)
```

---

## 🚀 Lancer le projet (première fois)

### 1. Cloner le repo
```bash
git clone https://github.com/Charlemagne05/Remembered-Relatives-Website.git
cd Remembered-Relatives-Website
```

### 2. Installer les dépendances backend
```bash
cd backend
npm install
cp .env.example .env
```
> Ouvre `.env` et mets un vrai secret : `JWT_SECRET=ton_secret_ici`

### 3. Lancer le backend
```bash
npm start
```
✅ Le backend tourne sur **http://localhost:3001**

### 4. Dans un 2ème terminal — installer et lancer le frontend
```bash
cd frontend
npm install
npm run dev
```
✅ Le frontend tourne sur **http://localhost:5173**

### 5. Ouvrir dans le navigateur
```
http://localhost:5173
```

---

## 🔄 Après un `git pull`

```bash
# Redémarrer le backend (important pour les nouvelles tables DB)
# Dans le terminal backend : Ctrl+C puis :
npm start

# Si le port 3001 est déjà occupé :
kill $(lsof -ti :3001) && npm start
```

---

## 🎮 Depuis VS Code

Ouvre le dossier `Remembered-Relatives-Website` dans VS Code puis :
- **Terminal > Run Task** → choisir **🚀 Start All (Backend + Frontend)**

Cela lance les deux serveurs dans des terminaux séparés automatiquement.

---

## 🌐 Partager avec des amis (ngrok)

```bash
# Dans un 3ème terminal, après avoir lancé backend + frontend :
ngrok http 5173
```
Partage l'URL `https://xxxx.ngrok-free.app` à tes amis.

---

## ⚙️ Prérequis

- **Node.js v22.5+** (requis pour SQLite intégré)
- **npm**
- **ngrok** (optionnel, pour accès distant)

Vérifier la version : `node --version`
