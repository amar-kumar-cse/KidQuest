// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      'school-portal/*',
      'Backend/*',
      'packages/*',
      'coverage/*',
    ],
  },
  ...expoConfig,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
];
