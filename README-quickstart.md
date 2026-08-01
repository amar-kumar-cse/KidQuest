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

Note: First-time runs may require installing dependencies inside `Frontend/` and `Backend/functions`:

```bash
cd Frontend && npm install
cd ../Backend/functions && npm install
```

Run test suite:

```bash
cd Frontend && npm test
```


