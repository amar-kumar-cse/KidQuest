# KidQuest CI/CD & GitHub Secrets Configuration

This document lists all required GitHub Repository Secrets to run the automated CI/CD pipeline, security rules tests, and EAS Mobile cloud builds.

---

## Required Secrets (Settings → Secrets and variables → Actions)

| Secret Name | Purpose | Where to Obtain |
| :--- | :--- | :--- |
| `EXPO_TOKEN` | Authenticates EAS CLI to build and submit Android (`.aab`) and iOS (`.ipa`) builds to Expo Cloud. | [expo.dev](https://expo.dev) → Account Settings → Access Tokens → Create Token. |
| `FIREBASE_PROJECT_ID` | Identifies your Firebase project during security rules emulation and deployment. | Firebase Console Project Overview (`kidquest-app` or similar). |
| `FIREBASE_SERVICE_ACCOUNT` | Deploys Cloud Functions and updates Firestore Security Rules automatically. | Google Cloud Console → IAM & Admin → Service Accounts → Create Key (JSON format). |
| `EXPO_PUBLIC_SENTRY_DSN` | Injects Sentry error monitoring DSN into mobile client bundles at build time. | Sentry Console → Project Settings → Client Keys (DSN). |
| `SENTRY_AUTH_TOKEN` | Uploads release source maps to Sentry for de-minification of crash traces. | Sentry Console → User Settings → API Auth Tokens. |

---

## Workflow Triggers

1. **Pull Request (`main` / `master`)**:
   - `ci.yml`: Runs TypeScript type check, ESLint, Jest unit tests with coverage, and Firebase Security Rules test suite in emulator.
   - `eas-build.yml`: Triggers EAS **preview build** for internal team testing.
2. **Release Tag (`v*.*.*`)**:
   - `eas-build.yml`: Automatically triggers EAS **production build** and submits to Google Play Console and Apple TestFlight.
3. **Manual Trigger (`workflow_dispatch`)**:
   - Build preview or production builds on demand from the GitHub Actions tab.

