const admin = require('firebase-admin');
const axios = require('axios');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8082';

admin.initializeApp({ projectId: 'demo-no-project' });
const db = admin.firestore();

async function run() {
  const parentId = 'parent_call';
  const childId = 'child_call';
  const familyId = 'family_call';

  // Create auth users via Auth emulator REST API to get UIDs, then create
  // corresponding Firestore profiles keyed by the auth UID.
  const signupUrl = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=testing';
  // Parent
  const parentEmail = `${parentId}@example.test`;
  const parentPw = 'password123';
  let parentAuthUid;
  try {
    const parentSignup = await axios.post(signupUrl, { email: parentEmail, password: parentPw, returnSecureToken: true });
    parentAuthUid = parentSignup.data.localId;
  } catch (e) {
    // If user already exists, sign in to fetch the UID
    const signInUrl = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=testing';
    const res = await axios.post(signInUrl, { email: parentEmail, password: parentPw, returnSecureToken: true });
    parentAuthUid = res.data.localId;
  }
  await db.collection('Users').doc(parentAuthUid).set({ uid: parentAuthUid, name: 'ParentCall', role: 'parent', familyId, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  // Child
  const childEmail = `${childId}@example.test`;
  const childPw = 'password123';
  let childAuthUid;
  try {
    const childSignup = await axios.post(signupUrl, { email: childEmail, password: childPw, returnSecureToken: true });
    childAuthUid = childSignup.data.localId;
  } catch (e) {
    const signInUrl = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=testing';
    const res = await axios.post(signInUrl, { email: childEmail, password: childPw, returnSecureToken: true });
    childAuthUid = res.data.localId;
  }
  await db.collection('Users').doc(childAuthUid).set({ uid: childAuthUid, name: 'ChildCall', role: 'kid', familyId, totalXp: 0, currentStreak: 0, bestStreak: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  const taskRef = db.collection('Tasks').doc();
  const taskData = { title: 'Do Homework', description: 'Solve math', xp: 7, status: 'pending', parentId: parentAuthUid, assignedToUid: childAuthUid, familyId, createdAt: admin.firestore.FieldValue.serverTimestamp() };
  await taskRef.set(taskData);

  console.log('Task created:', taskRef.id);

  // Call the callable function endpoint on the emulator
  const url = `http://127.0.0.1:5001/demo-no-project/us-central1/completeTaskTransaction`;
  try {
    // Create a user via the Auth emulator REST API and sign in to obtain an idToken.
    // This avoids requiring service account credentials for custom token creation.
    const signupUrl = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=testing';
    const email = parentEmail;
    const password = parentPw;
    await axios.post(signupUrl, { email, password, returnSecureToken: true }).catch((e) => {
      // If user already exists, that's OK; we'll sign in below.
    });

    const signInUrl = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=testing';
    const tokenResp = await axios.post(signInUrl, { email, password, returnSecureToken: true });
    const idToken = tokenResp.data && tokenResp.data.idToken;
    if (!idToken) throw new Error('Failed to obtain idToken from Auth emulator. Is it running?');

    const resp = await axios.post(url, { data: { taskId: taskRef.id, childUid: childAuthUid, xpValue: 7 } }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, timeout: 10000 });
    console.log('Function response:', resp.data);
  } catch (err) {
    console.error('Function call failed:', err && err.response ? err.response.data : err.toString());
  }

  const updatedChild = await db.collection('Users').doc(childAuthUid).get();
  const updatedTask = await db.collection('Tasks').doc(taskRef.id).get();
  console.log('Child after function:', updatedChild.data());
  console.log('Task after function:', updatedTask.data());
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
