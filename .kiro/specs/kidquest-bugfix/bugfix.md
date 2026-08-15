# Bugfix Requirements Document

## Introduction

This document consolidates seven bugs identified during a thorough audit of the KidQuest React Native / Expo app (Firebase + Zustand). The bugs span the kid stats screen, the reward vault, the root layout, the mission board header, the shared task hooks, and the parent analytics screen. Left unfixed, these defects cause incorrect or missing data for all kids not named "Alex", expose every kid's XP to cross-contamination, hide all parent-configured rewards, waste Firestore quota with duplicate reads, silently log kids out via a misplaced navigation call, pollute shared state during navigation transitions, and render a non-deterministic weekly chart. All seven bugs are addressed here under a single set of requirements.

---

## Bug Analysis

---

### Bug 1 — stats.tsx: Tasks queried by hardcoded name instead of current user's UID

#### Current Behavior (Defect)

1.1 WHEN a kid whose name is not "Alex" opens the Stats screen THEN the system queries Firestore with `where('assignedTo', '==', 'Alex')` and returns zero matching tasks, showing 0 XP and 0 completed quests for that kid.

1.2 WHEN any kid opens the Stats screen THEN the system uses a hardcoded string literal as the filter value instead of the authenticated user's UID, making the query identity-agnostic.

#### Expected Behavior (Correct)

2.1 WHEN a kid opens the Stats screen THEN the system SHALL query Firestore with `where('assignedToUid', '==', auth.currentUser.uid)` so that only that kid's own tasks are returned.

2.2 WHEN `auth.currentUser` is null on the Stats screen THEN the system SHALL skip the Firestore query and display a loading or empty state without crashing.

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a kid named "Alex" opens the Stats screen THEN the system SHALL CONTINUE TO display their XP and completed task count correctly (this kid was the only one seeing correct data before the fix).

3.2 WHEN the Stats screen XP listener updates THEN the system SHALL CONTINUE TO calculate the level, level progress, and badge unlock states from the returned XP value.

---

### Bug 2 — stats.tsx: Second useEffect sums XP across ALL kids

#### Current Behavior (Defect)

1.1 WHEN any kid opens the Stats screen THEN the system's second `useEffect` subscribes to `where('role', '==', 'kid')`, aggregates `totalXp` from every kid document in Firestore, and overwrites the XP value produced by the first listener with the combined total of all kids.

1.2 WHEN multiple kid accounts exist THEN the system displays a falsely inflated XP value to each individual kid, reflecting the sum of all kids' XP rather than their own.

#### Expected Behavior (Correct)

2.1 WHEN a kid opens the Stats screen THEN the system SHALL read `totalXp` exclusively from the document at `Users/{auth.currentUser.uid}` so only that kid's own XP is shown.

2.2 WHEN the kid's `totalXp` field changes in Firestore THEN the system SHALL CONTINUE TO update the displayed XP in real time without reading any other user's document.

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN only one kid account exists THEN the system SHALL CONTINUE TO display XP correctly (the bug was hidden in single-kid setups).

3.2 WHEN the Stats screen unmounts THEN the system SHALL CONTINUE TO unsubscribe cleanly from the Firestore listener.

---

### Bug 3 — vault.tsx: Rewards use hardcoded static array, ignoring Firestore

#### Current Behavior (Defect)

1.1 WHEN a kid opens The Vault THEN the system renders a hardcoded local `REWARDS` constant array (5 fixed items: Video Games, Pizza Night, Movie Choice, etc.) regardless of what rewards the parent has created, edited, or deleted in Firestore.

1.2 WHEN a parent creates a new reward in Firestore THEN the system does not show it in the kid's Vault because the component never subscribes to the `Rewards` collection.

1.3 WHEN a parent deletes or disables a reward THEN the system continues to display it in the kid's Vault because the list is static.

#### Expected Behavior (Correct)

2.1 WHEN a kid opens The Vault THEN the system SHALL fetch the kid's `linkedParentId` from their Firestore User document and subscribe to live rewards via `rewardService.subscribeToKidRewards(linkedParentId, callback)`.

2.2 WHEN the parent creates, updates, or deletes a reward THEN the system SHALL CONTINUE TO reflect those changes in the Vault in real time without requiring a restart.

2.3 WHEN no rewards are available for the linked parent THEN the system SHALL display an empty state message instead of the hardcoded list.

2.4 WHEN `linkedParentId` is null or undefined THEN the system SHALL display an appropriate message and SHALL NOT attempt to query Firestore.

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a kid taps "Claim" on a reward THEN the system SHALL CONTINUE TO invoke the `claimReward` Cloud Function and handle the success/failure alert flow as before.

3.2 WHEN a kid has insufficient XP THEN the system SHALL CONTINUE TO show the "Not Enough XP" alert and block the claim.

3.3 WHEN the Vault screen unmounts THEN the system SHALL CONTINUE TO unsubscribe from the Firestore real-time listener.

---

### Bug 4 — _layout.tsx: Duplicate Firestore read on every auth state change

#### Current Behavior (Defect)

1.1 WHEN a user signs in or the auth state resolves THEN the system performs a second `getDoc(doc(db, 'Users', firebaseUser.uid))` call solely to read the `role` field for the daily reminder scheduler, even though `data.role` from the first read is already in scope.

1.2 WHEN authentication resolves THEN the system therefore executes two sequential Firestore reads for the same document on every app launch and every token refresh, doubling read costs unnecessarily.

#### Expected Behavior (Correct)

2.1 WHEN the root layout resolves auth state THEN the system SHALL use the `role` variable already derived from the first `userSnap` read to determine whether to call `scheduleDailyReminder`, eliminating the second `getDoc` call entirely.

2.2 WHEN `role === 'kid'` based on the first read THEN the system SHALL call `scheduleDailyReminder(16, 0)` without issuing any additional Firestore request.

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a kid logs in THEN the system SHALL CONTINUE TO schedule the daily reminder at 16:00 as before.

3.2 WHEN a parent logs in THEN the system SHALL CONTINUE TO skip the reminder scheduling.

3.3 WHEN the first `getDoc` fails THEN the system SHALL CONTINUE TO fall back to the `'parent'` role default and SHALL NOT attempt the second read.

---

### Bug 5 — mission-board.tsx: Logo button navigates to login, logging the kid out

#### Current Behavior (Defect)

1.1 WHEN a kid taps the KidQuestLogo button in the Mission Board header THEN the system calls `router.replace('/(auth)/login')`, navigating away from the kid's session and effectively logging them out.

1.2 WHEN a kid accidentally taps the logo area THEN the system silently replaces the navigation stack with the login screen, losing all active navigation state.

#### Expected Behavior (Correct)

2.1 WHEN a kid taps the KidQuestLogo in the Mission Board header THEN the system SHALL perform no navigation action (the logo SHALL be non-interactive or the `onPress` handler SHALL be removed).

2.2 WHEN the logo is rendered THEN the system SHALL display it as a purely decorative/branding element with no side effects on tap.

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN the Mission Board mounts THEN the system SHALL CONTINUE TO render the logo in the header in the same visual position.

3.2 WHEN a kid navigates away via the back button or tab bar THEN the system SHALL CONTINUE TO behave as before — only the logo tap action is changed.

---

### Bug 6 — useTasks.ts: Shared Zustand store polluted by concurrent parent/kid subscriptions

#### Current Behavior (Defect)

1.1 WHEN a parent screen and a kid screen are both mounted during a navigation transition THEN the system has both `useParentTasks` and `useKidTasks` writing to the same single `useTaskStore`, so whichever subscription fires last silently overwrites the other's task array.

1.2 WHEN a component with a null `parentId` or `kidId` mounts (early-return path) THEN the system calls `setLoading(false)` unconditionally, potentially clearing the loading flag for an already-active subscription in a different component.

#### Expected Behavior (Correct)

2.1 WHEN `useParentTasks` receives a null or undefined `parentId` THEN the system SHALL only call `setLoading(false)` if no active subscription exists, so a concurrently active `useKidTasks` subscription is not affected.

2.2 WHEN `useKidTasks` receives a null or undefined `kidId` THEN the system SHALL only call `setLoading(false)` if no active subscription exists, so a concurrently active `useParentTasks` subscription is not affected.

2.3 WHEN both hooks are active simultaneously THEN the system SHALL ensure each hook's task data is scoped to its own store slice (either via separate Zustand slices for parent tasks and kid tasks, or by preventing concurrent active subscriptions from overwriting each other).

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN only `useParentTasks` is active THEN the system SHALL CONTINUE TO populate the task store with parent tasks in real time.

3.2 WHEN only `useKidTasks` is active THEN the system SHALL CONTINUE TO populate the task store with kid tasks and expose the `pendingTasks`, `submittedTasks`, and `completedTasks` derived arrays.

3.3 WHEN either hook's component unmounts THEN the system SHALL CONTINUE TO unsubscribe from the Firestore listener and stop all writes to the store.

---

### Bug 7 — analytics.tsx: Weekly chart uses random numbers instead of real timestamps

#### Current Behavior (Defect)

1.1 WHEN a parent opens the Analytics screen THEN the system generates weekly bar chart data by calling `Math.random()` inside `fetchAnalytics`, producing different bar heights on every render or refresh for the same underlying task data.

1.2 WHEN a parent refreshes the Analytics screen THEN the system displays a different distribution of completed tasks across weekdays even though no tasks have changed, making the chart untrustworthy.

#### Expected Behavior (Correct)

2.1 WHEN a parent opens the Analytics screen THEN the system SHALL group completed tasks by the day-of-week of their `completedAt` Firestore Timestamp and use those real counts to populate each bar in the weekly chart.

2.2 WHEN a task's `completedAt` field is null or missing THEN the system SHALL exclude that task from the weekly grouping rather than assigning it to a random day.

2.3 WHEN the parent refreshes the Analytics screen THEN the system SHALL display identical chart data for the same set of tasks (the chart SHALL be deterministic).

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN tasks exist THEN the system SHALL CONTINUE TO display the correct total completed count, pending count, XP earned, and completion rate — only the weekly chart data source is changed.

3.2 WHEN no tasks have a `completedAt` timestamp THEN the system SHALL CONTINUE TO render the weekly chart with all bars at zero height rather than crashing.

3.3 WHEN the Analytics screen is loading THEN the system SHALL CONTINUE TO show the activity indicator until the Firestore fetch completes.
