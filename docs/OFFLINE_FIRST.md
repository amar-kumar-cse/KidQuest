# KidQuest Offline-First Architecture & Conflict Resolution Guide

## 1. Overview
KidQuest is designed to work seamlessly offline, allowing kids and parents to browse tasks, draft submissions, capture photo proofs, and make progress even in environments with intermittent or zero internet connectivity.

The architecture is built on four core pillars:
1. **Local Persistent SQLite (`expo-sqlite` + `drizzle-orm`)**: Fast, atomic, embedded relational storage configured with Write-Ahead Logging (`WAL`) mode.
2. **Server State via TanStack Query**: Manages query caching, optimistic UI updates, background re-validation, and garbage collection.
3. **Pure Client State via Zustand**: Dedicated strictly to UI-only state (modals, active filters, haptic preferences, navigation overlays).
4. **Resilient Background Sync Queue**: Exponential backoff with random jitter, multi-retry failure tracking, and atomic status reconciliation.

---

## 2. Conflict Resolution Strategy & Rationale

KidQuest uses a **Hybrid Conflict Resolution** model that pairs **Server-Authoritative Resolution** with **Last-Write-Wins (LWW)**:

```
┌─────────────────────────────────┬─────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Domain / Entity                 │ Resolution Model                │ Core Rationale                                         │
├─────────────────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ XP, Levels, Badges, Streaks     │ 🛡️ Server-Authoritative         │ Anti-Cheat / Economic Integrity: Gamification rewards  │
│ & Task Approvals                │ (Firebase Cloud Functions)      │ translate to real parental privileges. Client edits    │
│                                 │                                 │ cannot dictate ledger updates.                         │
├─────────────────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Task Details, Descriptions,     │ ⏱️ Last-Write-Wins (LWW) with   │ Collaborative Flexibility: Parent instructions and     │
│ Categories & Due Dates          │ field-level timestamp check     │ kid local notes should not lock each other out.        │
├─────────────────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Proof Photos & Draft Media      │ 📦 Deferred Local-First Enqueue │ Network Efficiency: Heavy image uploads are pre-       │
│                                 │ with Optimistic Local URIs      │ compressed, saved locally, and queued safely.          │
└─────────────────────────────────┴─────────────────────────────────┴────────────────────────────────────────────────────────┘
```

### Why Server-Authoritative for Gamification & Approvals?
In KidQuest, kids earn XP for completing tasks, and parents approve those tasks to release rewards. If approval or XP incrementing used Last-Write-Wins or client-side calculation:
1. An offline child device could forge completed timestamps or manipulate XP balances locally.
2. Inconsistent state between two parents reviewing the same task offline could double-spend XP.
3. Therefore, all approval actions invoke `completeTaskTransaction` on Firebase Cloud Functions, which uses an atomic transaction on the server anti-cheat ledger.

### Why Last-Write-Wins (LWW) for Tasks & Edits?
Tasks frequently receive minor edits (e.g., parent clarifies instructions or changes due date). If a parent updates a task offline while the app cache already holds an older version, the mutation carrying the latest client timestamp wins upon reconciliation, while non-conflicting fields are merged. If the local version has un-synced dirty flags (`synced = 0`), the local store locks those fields until sync completes.

---

## 3. Exponential Backoff & Jitter Algorithm

When network connectivity is flaky or the Firebase API returns transient errors, mutations in `sync_queue` execute with exponential backoff and randomized jitter to prevent thundering herd spikes on the backend:

$$\text{delay} = \min\left(1000 \times 2^{\text{retry\_count}},\, 30000\right) + \text{random\_jitter}(0..500\text{ms})$$

| Attempt | Base Delay | Maximum Delay + Jitter |
|---|---|---|
| 0 (Initial) | Immediate | 0 ms |
| 1st Retry | 1,000 ms | 1,500 ms |
| 2nd Retry | 2,000 ms | 2,500 ms |
| 3rd Retry | 4,000 ms | 4,500 ms |
| 4th Retry | 8,000 ms | 8,500 ms |
| 5th Retry | 16,000 ms | 16,500 ms |
| Maximum Cap | 30,000 ms | 30,500 ms |

If `retry_count >= max_retries` (default 5), the mutation is marked as `failed`, retaining the error message in SQLite for diagnostics and providing a manual "Retry" action on the UI `OfflineBanner`.

---

## 4. Offline Media & Proof Upload Pipeline

1. **Capture**: Kid takes a photo proof via camera or image picker.
2. **Pre-Upload Optimization (`imageOptimizer`)**:
   - Resized to `maxWidth = 1200px` (preserving aspect ratio).
   - Compressed to JPEG quality `0.75`.
   - File size reduced from ~6MB down to ~250KB–400KB without visible degradation.
3. **Optimistic Local Display**: Local file URI (`file://...`) is saved to `local_tasks` with `status: 'pending_approval'`.
4. **Sync Queue Enqueue**: Queued in `sync_queue` with action `SUBMIT_PROOF`.
5. **Background Sync**: Once online, `syncQueueService` uploads the compressed file to Firebase Storage (`proofs/{taskId}/{timestamp}.jpg`), receives public URL, updates Firestore, and updates SQLite `synced = 1`.

---

## 5. Network Status UI (`OfflineBanner`)
Mounted at the root of `Frontend/app/_layout.tsx`, the banner:
- Listens to `@react-native-community/netinfo`.
- Subscribes to `syncQueueService` pending count.
- If offline: Displays amber warning banner with number of pending local mutations.
- If online but syncing: Displays blue sync indicator with direct "Retry" tap handler.
- Fully accessible with `accessibilityRole="alert"` and minimum 44px tap targets.

