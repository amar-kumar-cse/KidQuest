Emulator testing notes for `completeTaskTransaction`

- The `completeTaskTransaction` callable requires an authenticated caller in production.
- During local development, tests can be run against the Auth emulator to obtain a real ID token.

How to run the Auth emulator and execute the callable test:

1. Start the emulators (from repository root):

```bash
npx firebase-tools emulators:start --only functions,firestore,auth
```

2. In another terminal, run the helper script which exchanges a custom token for an ID token
   from the Auth emulator and calls the callable:

```bash
$env:NODE_PATH="functions\\node_modules"; node scripts/call-complete.js
```

Notes:
- The test script uses `admin.auth().createCustomToken(uid)` then exchanges it with the Auth emulator
  REST endpoint `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=testing`
  to obtain an `idToken` suitable for `Authorization: Bearer <idToken>` when calling the callable in the Functions emulator.
- Remove or ignore this file before merging if you prefer not to include emulator guidance in the repo.
