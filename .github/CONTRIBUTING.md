# Contributing to KidQuest

Thank you for your interest in contributing to **KidQuest**! KidQuest helps children build positive habits and routines through gamification, while giving parents and educators seamless oversight.

We welcome contributions of all kinds: bug fixes, new features, documentation enhancements, UI/UX improvements, and issue reports.

---

## Code of Conduct

We are committed to providing a welcoming, friendly, and harassment-free environment for everyone. Please be respectful, constructive, and considerate in all interactions across issues, discussions, and pull requests.

---

## Repository Structure

KidQuest is structured as a monorepo:

- **`Frontend/`**: Cross-platform mobile app built with Expo, React Native, TypeScript, Zustand, NativeWind (Tailwind CSS), and expo-router.
- **`Backend/`**: Backend services and Firebase Cloud Functions (TypeScript), Firebase Auth, Firestore, and Cloud Storage.
- **`school-portal/`**: Teacher and administrator web portal built with React, Vite, TypeScript, and Tailwind CSS.
- **`docs/`**: Project architecture, schema specifications, and feature guides.
- **`scripts/`**: Utility and automation scripts.

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js**: v18.x or v20.x LTS
- **npm** or **yarn**
- **Git**
- **Expo Go** app on your physical device (iOS/Android), or an Android Studio Emulator / Xcode Simulator
- *(Optional for backend)* **Firebase CLI**: `npm install -g firebase-tools` and Java JRE/JDK for Firebase Emulators

### Local Setup

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/<your-username>/KidQuest.git
   cd KidQuest
   ```

2. **Install Root and Workspace Dependencies**:
   ```bash
   # Root dependencies
   npm install

   # Frontend dependencies
   cd Frontend && npm install && cd ..

   # School Portal dependencies
   cd school-portal && npm install && cd ..

   # Backend functions dependencies (if working on backend)
   cd Backend/functions && npm install && cd ../..
   ```

3. **Configure Environment Variables**:
   Copy the example environment configuration into `Frontend/.env`:
   ```bash
   cp .env.example Frontend/.env
   ```
   Fill in your local Firebase config or emulator settings.

4. **Run Development Servers**:
   - **Full stack (Mobile + Firebase Emulators)**:
     ```bash
     npm run dev
     ```
   - **Frontend only**:
     ```bash
     npm run frontend:start
     ```
     Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.
   - **School Portal only**:
     ```bash
     cd school-portal
     npm run dev
     ```

---

## Development Workflow

1. **Branch Naming**:
   Create a descriptive branch off `main`:
   - `fix/issue-description` (e.g., `fix/offline-queue-sync`)
   - `feat/feature-name` (e.g., `feat/streak-freeze-badge`)
   - `docs/update-readme`
   - `refactor/component-name`

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Code Standards & Validation**:
   Before submitting your changes, make sure all linting and type checks pass:

   ```bash
   # Type check Frontend
   npm run frontend:typecheck

   # Lint Frontend
   cd Frontend && npm run lint

   # Run tests
   cd Frontend && npm test

   # Format code
   cd Frontend && npm run format
   ```

3. **Commit Messages**:
   Follow conventional commits formatting:
   - `feat(frontend): add celebration overlay on quest completion`
   - `fix(offline): prevent duplicated quest submissions in queue`
   - `docs(setup): clarify Firebase emulator prerequisites`
   - `chore: update dependencies`

---

## Submitting a Pull Request (PR)

1. Push your branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request against `main` on the [upstream repository](https://github.com/amar-kumar-cse/KidQuest).
3. Fill out the PR template completely:
   - Clearly explain the problem being solved or the feature added.
   - Link the relevant issue (e.g., `Fixes #123`).
   - Include screenshots or screen recordings for any UI changes.
   - List any breaking changes or required environment variables.
4. Address any feedback or requested changes promptly.

---

## Community & Questions

Need help getting set up or have questions about architecture?
- Open an issue using the appropriate template.
- Reach out via GitHub Discussions.
