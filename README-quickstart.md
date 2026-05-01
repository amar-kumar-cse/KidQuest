# KidQuest — Quickstart

Run frontend (Expo app):

```bash
npm run frontend:start
```

Build backend functions:

```bash
npm run backend:functions:build
```

Start emulators (functions, firestore, auth):

```bash
npm run backend:functions:serve
```

Note: First-time runs may require installing dependencies inside `frontend/` and `backend/functions`:

```bash
cd frontend && npm install
cd ../backend/functions && npm install
```
