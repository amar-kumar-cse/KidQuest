# 🎯 KidQuest

<div align="center">

**Gamified Daily Routine & Habit Tracking Ecosystem for Children, Parents, and Schools**

KidQuest transforms everyday responsibilities (morning routines, chores, homework, and reading) into an engaging RPG-style quest adventure for children — supervised by parents through real-time approvals and supported by educators via a companion school web portal.

[![CI Pipeline](https://img.shields.io/github/actions/workflow/status/amar-kumar-cse/KidQuest/ci.yml?branch=main&style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/amar-kumar-cse/KidQuest/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-v10-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[Architecture](#-system-architecture) • [App Screenshots](#-app-screenshots) • [Monorepo Structure](#-monorepo-structure) • [Quickstart Guide](#-quickstart-guide) • [Environment Variables](#-environment-configuration) • [Production Roadmap](#-production-roadmap)

</div>

---

## 🏗️ System Architecture

KidQuest is organized as an integrated monorepo connecting native cross-platform mobile apps, cloud backend triggers, and an educator management portal:

```mermaid
flowchart TB
    subgraph ClientTier ["Presentation Layer"]
        Mobile["📱 Mobile App (iOS / Android)<br/>Expo SDK 54 • React Native 0.81<br/>Expo Router v6 • NativeWind v4 • Zustand v5"]
        Portal["💻 School Educator Portal (Web)<br/>Vite 8 • React 19 • Tailwind CSS"]
    end

    subgraph ServiceTier ["Application & Security Tier"]
        Functions["⚡ Firebase Cloud Functions (Node 20, TypeScript)<br/>• Atomic Transaction Engine (Reward Claims & Streaks)<br/>• Scheduled Habit Checkers & Notification Cron<br/>• Cascade Account Deletion (COPPA / DPDP)"]
        SecRules["🛡️ Security Rules Engine<br/>• Cloud Firestore RBAC Rules<br/>• Firebase Cloud Storage Rules<br/>• Realtime Database Chat Rules"]
    end

    subgraph DataTier ["Cloud Infrastructure Layer"]
        Firestore[("🔥 Cloud Firestore<br/>Parents, Children, Tasks, Submissions")]
        Storage["📦 Firebase Cloud Storage<br/>Encrypted Task Proofs & Avatars"]
        Auth["🔑 Firebase Authentication<br/>Parent Auth & Protected Child PIN Profiles"]
        RTDB["💬 Realtime Database<br/>Parent-Teacher Instant Messaging"]
    end

    Mobile -->|Direct Live Subscriptions| Firestore
    Mobile -->|Photo Proof Uploads| Storage
    Mobile -->|Parent Login & Child PIN Session| Auth
    Mobile -->|Callable Functions| Functions

    Portal -->|Teacher Class Queries| Firestore
    Portal -->|Educator Auth Session| Auth

    Functions -->|Atomic Mutations & Ledgers| Firestore
    Functions -->|Storage Media Lifecycle| Storage
    Functions -->|User Lifecycle Management| Auth

    SecRules -.->|Enforces Least Privilege| Firestore
    SecRules -.->|Restricts Child Photo Access| Storage
    SecRules -.->|Secures Parent-Teacher Chat| RTDB
```

---

## 📸 App Screenshots

<div align="center">

<table>
  <tr>
    <th width="33.33%">🎮 Child Quest Feed</th>
    <th width="33.33%">🏆 Badges & Streaks</th>
    <th width="33.33%">👨‍👩‍👧 Parent Control Center</th>
  </tr>
  <tr>
    <td align="center">
      <img src="https://placehold.co/600x1200/1e1b4b/ffffff?text=Child+Quest+Feed" alt="Child Quest Feed" width="100%" />
      <br />
      <em>Daily quests, XP, visual timers, and Text-to-Speech audio support</em>
    </td>
    <td align="center">
      <img src="https://placehold.co/600x1200/1e1b4b/ffffff?text=Badges+%26+Streaks" alt="Badges & Streaks" width="100%" />
      <br />
      <em>Milestone badges, streak tracking, and customizable reward store</em>
    </td>
    <td align="center">
      <img src="https://placehold.co/600x1200/1e1b4b/ffffff?text=Parent+Approval+Queue" alt="Parent Control Center" width="100%" />
      <br />
      <em>Photo proof verification, task assignment, and weekly progress analytics</em>
    </td>
  </tr>
  <tr>
    <th width="33.33%">🏫 School Educator Portal</th>
    <th width="33.33%">🔒 Child PIN Protection</th>
    <th width="33.33%">⚙️ Privacy & Account Deletion</th>
  </tr>
  <tr>
    <td align="center">
      <img src="https://placehold.co/1200x800/1e1b4b/ffffff?text=School+Web+Portal" alt="School Portal" width="100%" />
      <br />
      <em>Teacher dashboard for classroom assignments and student progress monitoring</em>
    </td>
    <td align="center">
      <img src="https://placehold.co/600x1200/1e1b4b/ffffff?text=Child+PIN+Protected+Mode" alt="Child PIN Protection" width="100%" />
      <br />
      <em>Parent-gated zones preventing children from bypassing chore verification</em>
    </td>
    <td align="center">
      <img src="https://placehold.co/600x1200/1e1b4b/ffffff?text=COPPA+%26+Data+Deletion" alt="Privacy Settings" width="100%" />
      <br />
      <em>One-tap account and data deletion pipeline for child privacy compliance</em>
    </td>
  </tr>
</table>

</div>

---

## 📁 Monorepo Structure

```text
KidQuest/
├── packages/
│   └── shared/               # Shared TypeScript domain types & Zod validation schemas (@kidquest/shared)
│       ├── src/
│       │   ├── types/        # User, Parent, Kid, Teacher, Task, Reward interfaces
│       │   └── schemas/      # Runtime Zod validation schemas for forms & API payloads
│       └── tsconfig.json
├── Frontend/                 # Expo SDK 54 React Native cross-platform mobile app
│   ├── app/                  # Expo Router filesystem navigation ((auth), (parent), (kid))
│   ├── components/           # Reusable UI components (TaskCard, AISuggestionCard, etc.)
│   ├── hooks/                # Custom React hooks (useTasks, useAuth, etc.)
│   ├── lib/                  # Firebase SDK singleton & native persistence helpers
│   ├── services/             # Firestore, Storage & Cloud Functions service wrappers
│   ├── store/                # Zustand client state stores (taskStore, useAppStore)
│   ├── __tests__/            # Jest + React Native Testing Library test suites (51 passing)
│   ├── app.json              # Expo application manifest
│   └── eas.json              # EAS Build & Submit profiles (development, preview, production)
├── Backend/                  # Serverless infrastructure & security
│   ├── functions/            # Firebase Cloud Functions v2 (Node 20 / TypeScript)
│   │   └── src/              # Callable endpoints, AI suggestion helpers, cron jobs
│   ├── firestore.rules       # Cloud Firestore security rules
│   ├── storage.rules         # Cloud Storage access rules
│   └── firestore.indexes.json# Composite query indexes
├── school-portal/            # Vite 8 + React 19 + Tailwind CSS educator web application
│   ├── src/                  # Teacher dashboard views & class rosters
│   └── vite.config.ts        # Vite bundler configuration
├── docs/                     # Specifications, data model, launch & deletion guides
├── .github/workflows/        # GitHub Actions CI/CD (lint, typecheck, test, EAS builds)
├── .env.example              # Consolidated environment variable template
├── firebase.json             # Firebase configuration & local emulator ports
└── package.json              # Monorepo workspaces & orchestration scripts
```

---

## ⚡ Quickstart Guide

### Prerequisites
- **Node.js:** `v20.x LTS`
- **Package Manager:** `npm` (v10+)
- **Firebase CLI:** `npm install -g firebase-tools`
- **Expo CLI:** Bundled via `npx expo`

### 1. Installation
Clone repository and install monorepo dependencies:
```bash
git clone https://github.com/amar-kumar-cse/KidQuest.git
cd KidQuest
npm install
```

### 2. Environment Configuration
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
cp .env.example Frontend/.env
```
Fill in your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com).

### 3. Running Locally
Run both mobile and Firebase services:
```bash
# Start mobile app (Expo bundler)
npm run frontend:start

# Start school portal (Vite dev server)
npm run portal:dev

# Start Firebase emulators (Auth, Firestore, Functions, Storage, RTDB)
npm run emulate

# Build shared packages
npm run shared:build

# Run full typecheck across all 4 workspaces
npm run typecheck

# Run lint checks (Frontend + school-portal)
npm run lint

# Run unit test suites (Frontend Jest tests)
npm run test
```

---

## 🔒 Security, Privacy & Child Safety (COPPA & DPDP)

KidQuest is designed specifically for children and families with stringent privacy guardrails:
- **No Direct Child Accounts:** Children do not register with separate email/password credentials. Parents create and manage child profiles under their verified accounts.
- **Strict Photo Access Control:** Task completion photos are private and accessible only to the child who took them, their linked parent, and their classroom teacher.
- **Server-Authoritative Gamification:** XP calculations, streaks, and reward redemptions execute via atomic Cloud Functions transactions to prevent client tampering.
- **Self-Service Account & Data Deletion:** Automated cascade deletion purges user documents, child photos, and auth credentials upon parent request.

---

## 🗺️ Production Roadmap

- [x] **Phase 0:** System Architecture & Security Audit (`AUDIT.md`)
- [x] **Phase 1:** Repo Cleanup, Workspaces, and Unified Scripts
- [ ] **Phase 2:** Dependencies, Expo Doctor, and EAS Build Profiles
- [ ] **Phase 3:** Unified Data Model & Role-Based Security Rules
- [ ] **Phase 4:** Server-Side Cloud Functions Gamification Engine
- [ ] **Phase 5:** Auth, Parent PIN Gate, and Parental Consent Flow
- [ ] **Phase 6:** Offline-First Architecture (`expo-sqlite` + Sync Queue)
- [ ] **Phase 7:** UI/UX Polish, Accessibility (A11y), and Hindi/English i18n
- [ ] **Phase 8:** Gamification Store, Animations, and Parent Dashboard
- [ ] **Phase 9:** Sentry Observability, Maestro E2E, and CI/CD Pipeline
- [ ] **Phase 10:** School Portal Firebase Integration & Teacher RBAC
- [ ] **Phase 11:** Google Play Families Policy & App Store Launch Readiness

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
