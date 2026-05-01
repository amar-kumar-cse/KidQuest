const fs = require('fs');
const path = require('path');

const root = process.cwd();

const frontend = [
  'app', 'assets', 'components', 'hooks', 'lib', 'services', 'store', 'types', 'constants', '__tests__',
  'app.json', 'babel.config.js', 'global.css', 'metro.config.js', 'package.json', 'tsconfig.json', 'tailwind.config.js', 'jest.config.ts', 'expo-env.d.ts', 'nativewind-env.d.ts'
];

const backend = [
  'functions', 'firebase.json', 'firestore.rules', 'storage.rules', 'firestore.indexes.json', 'scripts'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveItem(item, destRoot) {
  const src = path.join(root, item);
  if (!fs.existsSync(src)) {
    console.log('SKIP (not found):', item);
    return;
  }
  const dest = path.join(root, destRoot, item);
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  // If dest exists, skip to avoid overwrite
  if (fs.existsSync(dest)) {
    console.log('SKIP (dest exists):', dest);
    return;
  }
  try {
    fs.renameSync(src, dest);
    console.log('MOVED:', item, '->', destRoot);
  } catch (e) {
    console.error('FAILED to move', item, e && e.toString());
  }
}

console.log('Starting workspace reorganization...');
ensureDir(path.join(root, 'frontend'));
ensureDir(path.join(root, 'backend'));

frontend.forEach((it) => moveItem(it, 'frontend'));
backend.forEach((it) => moveItem(it, 'backend'));

console.log('Done. Review repository to confirm files moved.');
