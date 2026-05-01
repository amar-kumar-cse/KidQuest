# Launch & Analytics Guide

This file summarizes recommended steps for UX polish, analytics, crash tracking, AI features and Play Store preparation.

## 1. UX Polish (Haptics / Confetti / Sound / TTS)
- Haptics: use `expo-haptics` for short vibrations on success events.
- Confetti: `react-native-confetti-cannon` (already used in code). Uses `Celebration` component at `components/Celebration.tsx`.
- Sound: use `expo-av` to play small WAV/MP3 assets. Place sounds under `assets/sounds/` and pass `require('../assets/sounds/cheer.wav')` to `Celebration` via `soundAsset` prop.
- TTS: use `expo-speech` (helper at `lib/tts.ts`). Example: `speak('Arjun, homework time!')`.

## 2. Firebase Analytics & Crashlytics
- Analytics: Install `expo-firebase-analytics` or `@react-native-firebase/analytics` depending on bare/expo-managed.
  - Track events: `task_completed`, `task_approved`, `reward_claimed`, `session_start`, `session_end`.
- Crashlytics: Use `@react-native-firebase/crashlytics` (requires native setup). Ensure Crashlytics collection is enabled and tested before release.

## 3. AI Parenting Assistant (Gemini)
- Backend: `functions/src/ai/verifyProof.ts` and `functions/src/ai/suggestTasks.ts` placeholders exist.
- Provide `GEMINI_API_KEY` in environment for Cloud Functions (use secrets manager in prod).
- `suggestTasks` should accept `age`, `context`, and return an array of task prototypes. Persist suggestions optionally under `AISuggestions`.

## 4. Account Deletion & Privacy
- Add a `Delete Account` UI item that calls a secure Cloud Function to:
  - Delete user auth account (Admin SDK)
  - Remove/mark user data in Firestore (Users doc, optionally anonymize child entries)
  - Remove storage objects (proofs/avatars)
- Add `Privacy Policy` page and include a link in the app and Play Store console. Ensure COPPA compliance if targeting children under applicable jurisdictions.

## 5. Quick Local Run / Test
- To test `Celebration` locally, add a button that toggles `<Celebration play soundAsset={require('../assets/sounds/cheer.wav')} onComplete={() => setShow(false)} />`.

## 6. Next Work Items
- Implement `functions/src/ai/suggestTasks.ts` (Gemini integration and prompt engineering).
- Add Admin UI to edit `adminConfig/main` doc.
- Wire Analytics events across app flows.

