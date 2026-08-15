# KidQuest Multi-Bug Bugfix Design

## Overview

This document formalizes the fix design for seven bugs identified in the KidQuest React Native / Expo app. The bugs span six files: `app/(kid)/stats.tsx` (Bugs 1 & 2), `app/(kid)/vault.tsx` (Bug 3), `app/_layout.tsx` (Bug 4), `app/(kid)/mission-board.tsx` (Bug 5), `hooks/useTasks.ts` + `store/useTaskStore.ts` (Bug 6), and `app/(parent)/analytics.tsx` (Bug 7).

Each bug is treated as an independent fix with its own bug condition C(X), correctness property P, and preservation requirements. All fixes are additive/targeted; no surrounding behavior is changed beyond what each requirement specifies.

---

## Glossary

- **Bug_Condition (C)**: A predicate over an input or runtime state that identifies exactly when a bug manifests.
- **Property (P)**: The desired correct behavior for any input satisfying C(X).
- **Preservation**: Existing behavior that must be identical before and after the fix for all inputs where C does not hold.
- **F**: Original (unfixed) function or component.
- **F'**: Fixed function or component.
- **`auth.currentUser`**: The Firebase Auth object for the signed-in user; `.uid` is their stable identity string.
- **`assignedToUid`**: The Firestore field on Task documents that stores the kid's Firebase UID (distinct from the legacy `assignedTo` display-name field).
- **`linkedParentId`**: The Firestore field on a kid's User document that stores their parent's Firebase UID.
- **`completedAt`**: A Firestore `Timestamp` field on Task documents recording when a task was completed.
- **`useTaskStore`**: The single Zustand store in `store/useTaskStore.ts` shared (incorrectly) by both `useParentTasks` and `useKidTasks`.
- **`useParentTaskStore` / `useKidTaskStore`**: The two separate Zustand stores introduced by Bug 6's fix.
- **`rewardService.subscribeToKidRewards`**: Real-time Firestore subscription in `services/rewardService.ts` that returns active rewards for a parent's ID.

---

## Bug Details

### Bug 1 — stats.tsx: Hardcoded name filter

#### Bug Condition

The bug manifests when any kid whose Firebase UID does not correspond to the display name "Alex" opens the Stats screen. The first `useEffect` in `KidStatsScreen` issues a Firestore query filtered by the literal string `'Alex'` rather than the authenticated user's UID, so only that one identity ever returns results.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug1(context)
  INPUT: context = { currentUserId: string, queryFilterValue: string }
  OUTPUT: boolean

  RETURN queryFilterValue === 'Alex'
         AND currentUserId !== 'uid-of-Alex'
END FUNCTION
```

**Examples:**
- Kid "Jordan" (UID `abc123`) opens Stats → query `where('assignedTo', '==', 'Alex')` returns 0 docs → XP = 0, Quests Done = 0. **Expected:** XP and completed count for UID `abc123`.
- Kid "Alex" (UID `xyz789`) opens Stats → query accidentally returns correct results because the hardcoded name matches. **Expected (preserved):** still returns correct results after fix.
- `auth.currentUser` is `null` → must not crash.

---

### Bug 2 — stats.tsx: Fan-out XP aggregation across all kids

#### Bug Condition

The second `useEffect` in `KidStatsScreen` queries `where('role', '==', 'kid')` and sums `totalXp` across every kid document in the `Users` collection, overwriting the XP value produced by the first listener.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug2(context)
  INPUT: context = { kidCount: number, query: FirestoreQuery }
  OUTPUT: boolean

  RETURN query targets collection('Users') with where('role', '==', 'kid')
         AND kidCount > 1
END FUNCTION
```

**Examples:**
- Three kids with XP [200, 300, 500] → screen shows 1000 to all three. **Expected:** each kid sees only their own XP.
- Single kid with XP 750 → bug is invisible (1-kid aggregation equals individual). **Expected (preserved):** single kid still sees 750 after fix.
- Kid's `totalXp` changes in Firestore → screen must update in real time.

---

### Bug 3 — vault.tsx: Static reward list ignores Firestore

#### Bug Condition

The `TheVault` component renders from the local constant `REWARDS` (5 hardcoded items) and never reads the `Rewards` Firestore collection, so parent-managed rewards are never shown.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug3(context)
  INPUT: context = { rewardSource: 'static' | 'firestore', linkedParentId: string | null }
  OUTPUT: boolean

  RETURN rewardSource === 'static'
END FUNCTION
```

**Examples:**
- Parent creates "Beach Day" reward (500 XP) in Firestore → kid's Vault never shows it. **Expected:** "Beach Day" appears live.
- Parent disables "Pizza Night" → kid's Vault still shows it. **Expected:** item disappears.
- `linkedParentId` is `null` → must not crash; display an appropriate empty-state message.
- Kid claims a reward → `claimReward` Cloud Function call must continue to work unchanged.

---

### Bug 4 — _layout.tsx: Duplicate Firestore read for role check

#### Bug Condition

After the first `getDoc` resolves successfully, a second identical `getDoc(doc(db, 'Users', firebaseUser.uid))` is issued solely to read `role` for the daily reminder scheduler. The `role` value is already in scope from the first read.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug4(context)
  INPUT: context = { firstReadCompleted: boolean, secondReadIssued: boolean }
  OUTPUT: boolean

  RETURN firstReadCompleted === true
         AND secondReadIssued === true
END FUNCTION
```

**Examples:**
- Kid logs in → two sequential reads for `Users/{uid}` are fired. **Expected:** only one read.
- Parent logs in → same duplicate. **Expected:** one read; reminder not scheduled.
- First read fails → second read must NOT be attempted (already the case with catch block; preserved).

---

### Bug 5 — mission-board.tsx: Logo tap logs the kid out

#### Bug Condition

The `TouchableOpacity` wrapping `KidQuestLogo` in the Mission Board header has `onPress={() => router.replace('/(auth)/login')}`, which navigates to the login screen and discards the kid's session.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug5(event)
  INPUT: event = { target: 'KidQuestLogo', type: 'tap' }
  OUTPUT: boolean

  RETURN target === 'KidQuestLogo'
         AND navigationTriggered('/(auth)/login') === true
END FUNCTION
```

**Examples:**
- Kid taps logo → redirected to login, navigation stack replaced. **Expected:** no navigation; logo is purely decorative.
- Kid navigates via tab bar or back button → must continue to work unchanged.
- Logo remains visible in same header position after fix.

---

### Bug 6 — useTasks.ts / useTaskStore.ts: Shared store overwritten by concurrent subscriptions

#### Bug Condition

Both `useParentTasks` and `useKidTasks` read from and write to the same `useTaskStore` singleton. During navigation transitions, both hooks can be mounted simultaneously, causing whichever Firestore snapshot fires last to silently overwrite the other's task array. The early-return `setLoading(false)` path (null ID) also unconditionally clears the loading flag for any concurrently active subscription.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug6(context)
  INPUT: context = {
    useParentTasksMounted: boolean,
    useKidTasksMounted: boolean,
    sharedStore: boolean
  }
  OUTPUT: boolean

  RETURN sharedStore === true
         AND useParentTasksMounted === true
         AND useKidTasksMounted === true
END FUNCTION
```

**Examples:**
- Parent dashboard mounts, then kid mission-board mounts during a transition → kid's task snapshot overwrites parent's pending approvals. **Expected:** each hook writes to its own isolated store slice.
- `useKidTasks(null)` called (null uid) → `setLoading(false)` clears loading for an active parent subscription. **Expected:** null-id guard only clears loading in its own slice.
- Only `useParentTasks` active → parent tasks displayed correctly (preserved).
- Only `useKidTasks` active → `pendingTasks`, `submittedTasks`, `completedTasks` derived arrays populated correctly (preserved).

---

### Bug 7 — analytics.tsx: Non-deterministic weekly chart

#### Bug Condition

Inside `fetchAnalytics`, the weekly chart data is generated with `Math.random()`, producing a different bar-height distribution on every render/refresh for the same underlying task data.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug7(renderCall)
  INPUT: renderCall = { callIndex: number, tasksUnchanged: boolean }
  OUTPUT: boolean

  RETURN tasksUnchanged === true
         AND chartDataDiffersAcrossCalls(callIndex, callIndex + 1) === true
END FUNCTION
```

**Examples:**
- Parent opens Analytics → chart shows Mon=2, Tue=1. Refreshes with same tasks → chart shows Mon=0, Tue=3. **Expected:** identical chart on both renders.
- Task has `completedAt = null` → must be excluded from weekly grouping, not crash.
- Summary cards (totalCompleted, totalPending, totalXpEarned, completionRate) must remain unchanged.

---

## Expected Behavior

### Preservation Requirements (all bugs)

**Unchanged Behaviors:**
- Bug 1 & 2: Level calculation, XP progress bar, badge unlock logic, streak data, and HP bar must all continue to derive correctly from the `totalXp` value after the fix.
- Bug 3: The `handleClaim` function's Alert flow (insufficient XP guard, confirmation dialog, Cloud Function call via `claimReward`) must remain identical. XP live listener on `Users/{uid}` is untouched.
- Bug 4: Kid's daily reminder is scheduled at 16:00 exactly as before. Parent accounts do not trigger the reminder. First-read failure falls back to `'parent'` role as before.
- Bug 5: Logo renders in the same visual position in the header. All other navigation paths (back, tab bar, notification icon) are unaffected.
- Bug 6: `useParentTasks` continues to expose `{ tasks, isLoading }`. `useKidTasks` continues to expose `{ tasks, isLoading, pendingTasks, submittedTasks, completedTasks }`. Both hooks unsubscribe from Firestore on unmount.
- Bug 7: `totalCompleted`, `totalPending`, `totalXpEarned`, and `completionRate` summary cards are computed identically. The weekly chart renders without crashing when no tasks have `completedAt`.

**Scope of Non-Affected Inputs:**
- All inputs that do not trigger the specific bug condition for each bug are completely unaffected. For example, non-keyboard events in Bug 5 context; parent-only flows for Bug 1/2/3; non-auth-state changes for Bug 4; single-hook-mounted scenarios for Bug 6; chart refreshes with actual timestamp data for Bug 7.

---

## Hypothesized Root Causes

### Bug 1
The developer used a placeholder display name (`'Alex'`) as a filter value and the Firestore field `assignedTo` (display name) instead of `assignedToUid` (UID). The correct field `assignedToUid` already exists in the schema (confirmed in `lib/firestoreService.ts`).

### Bug 2
A second `useEffect` was added to pull live XP from the user profile but used a collection-wide query (`where('role', '==', 'kid')`) instead of a single-document reference. This aggregates all kids' XP and overwrites the per-task XP calculated in the first effect.

### Bug 3
The component was scaffolded with a static mock `REWARDS` array for early UI development and never wired up to `rewardService.subscribeToKidRewards`. The `linkedParentId` needed for the query is available on the kid's Firestore User document and in `useAppStore().kidProfile.linkedParentId`.

### Bug 4
The scheduler call was added after the main `if/else` role block, and the developer re-fetched the document for safety rather than reusing the already-available `role` constant. This doubles Firestore reads on every auth state resolution.

### Bug 5
A `TouchableOpacity` was used as a brand-safe wrapper (for potential future navigation to a home screen) but was wired to the login route, effectively acting as a logout button.

### Bug 6
`useParentTasks` and `useKidTasks` were designed to use the same Zustand store (`useTaskStore`) as a simplification. This is safe only when the two hooks are never mounted concurrently, which is violated during Expo Router stack transitions where both a parent and a kid screen can be in the navigation tree simultaneously.

### Bug 7
`Math.random()` was used as a quick mock to fill the weekly chart during MVP development and was never replaced with real timestamp-based aggregation. The `completedAt` Firestore Timestamp field required for grouping already exists on task documents.

---

## Correctness Properties

Property 1: Bug Condition — Stats Screen Shows Current Kid's Data Only

_For any_ kid whose `auth.currentUser.uid` does not match the string `'Alex'`, the fixed `KidStatsScreen` SHALL query Firestore using `where('assignedToUid', '==', auth.currentUser.uid)` (Bug 1) and read `totalXp` exclusively from `doc(db, 'Users', auth.currentUser.uid)` (Bug 2), displaying only that kid's own XP and completed task count.

**Validates: Requirements 2.1, 2.2 (Bug 1); Requirements 2.1, 2.2 (Bug 2)**

Property 2: Preservation — Stats Screen Continues to Work for "Alex"

_For any_ kid where the pre-fix query accidentally produced correct results (the single kid whose name is "Alex"), the fixed screen SHALL produce the same XP and completed count, and SHALL continue to calculate level, level progress, and badge states identically.

**Validates: Requirements 3.1, 3.2 (Bug 1); Requirements 3.1, 3.2 (Bug 2)**

Property 3: Bug Condition — Vault Shows Live Parent-Configured Rewards

_For any_ kid with a non-null `linkedParentId`, the fixed `TheVault` SHALL subscribe to `rewardService.subscribeToKidRewards(linkedParentId, callback)` and render only the rewards returned by that subscription, reflecting any parent create/update/delete in real time.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4 (Bug 3)**

Property 4: Preservation — Vault Claim Flow Unchanged

_For any_ reward tap where the kid has sufficient XP, the fixed `TheVault` SHALL invoke `claimReward(kidUid, reward.xpCost, reward.id)` from `lib/firestoreService` and handle the result identically to the original component.

**Validates: Requirements 3.1, 3.2, 3.3 (Bug 3)**

Property 5: Bug Condition — Root Layout Issues Exactly One Firestore Read per Auth Resolution

_For any_ auth state change where `userSnap.exists()` is true, the fixed `_layout.tsx` SHALL issue exactly one `getDoc` call, derive `isKid` from the already-available `role` variable, and call `scheduleDailyReminder(16, 0)` when `role === 'kid'` without any additional network request.

**Validates: Requirements 2.1, 2.2 (Bug 4)**

Property 6: Preservation — Daily Reminder Scheduling Behavior Unchanged

_For any_ auth state resolution, the fixed `_layout.tsx` SHALL schedule the reminder for kids and skip it for parents exactly as before; the first-read failure fallback to `'parent'` SHALL remain intact.

**Validates: Requirements 3.1, 3.2, 3.3 (Bug 4)**

Property 7: Bug Condition — Logo Tap Has No Navigation Side Effect

_For any_ tap event on the `KidQuestLogo` element in the Mission Board header, the fixed component SHALL NOT call `router.replace` or any other navigation method.

**Validates: Requirements 2.1, 2.2 (Bug 5)**

Property 8: Preservation — Mission Board Navigation Paths Unchanged

_For any_ navigation action that does not involve tapping the logo (back button, tab bar, notification icon), the fixed `MissionBoard` SHALL produce identical navigation behavior to the original.

**Validates: Requirements 3.1, 3.2 (Bug 5)**

Property 9: Bug Condition — Concurrent Hook Mounts Do Not Overwrite Each Other's Task Data

_For any_ runtime state where both `useParentTasks` and `useKidTasks` are simultaneously mounted, the fixed implementation SHALL write parent tasks exclusively to `useParentTaskStore` and kid tasks exclusively to `useKidTaskStore`, so neither subscription can overwrite the other.

**Validates: Requirements 2.1, 2.2, 2.3 (Bug 6)**

Property 10: Preservation — Single-Hook-Active Scenarios Unchanged

_For any_ runtime state where only one of `useParentTasks` or `useKidTasks` is mounted, the fixed implementation SHALL expose identical return values (`tasks`, `isLoading`, derived arrays) to the original and SHALL unsubscribe from Firestore on unmount.

**Validates: Requirements 3.1, 3.2, 3.3 (Bug 6)**

Property 11: Bug Condition — Weekly Chart Is Deterministic

_For any_ two calls to `fetchAnalytics` with an identical set of Firestore task documents, the fixed `AnalyticsScreen` SHALL produce identical `weeklyData` values for all seven days.

**Validates: Requirements 2.1, 2.2, 2.3 (Bug 7)**

Property 12: Preservation — Analytics Summary Cards Unchanged

_For any_ set of task documents, the fixed `AnalyticsScreen` SHALL compute `totalCompleted`, `totalPending`, `totalXpEarned`, and `completionRate` identically to the original, and SHALL render the weekly chart without crashing when no tasks have a `completedAt` timestamp.

**Validates: Requirements 3.1, 3.2, 3.3 (Bug 7)**

---

## Fix Implementation

### Bug 1 — `app/(kid)/stats.tsx`

**File:** `Frontend/app/(kid)/stats.tsx`  
**Function:** First `useEffect` in `KidStatsScreen`

**Specific Changes:**

1. **Guard for null UID**: Before constructing the query, read `const uid = auth.currentUser?.uid`. If `uid` is falsy, call `setLoading(false)` and return early.

2. **Replace query field and value:**
   - Old: `where('assignedTo', '==', 'Alex')`
   - New: `where('assignedToUid', '==', uid)`

3. **No other changes** to the snapshot handler, XP summation, or unsubscribe return.

```typescript
// Fixed first useEffect
useEffect(() => {
  const uid = auth.currentUser?.uid;
  if (!uid) { setLoading(false); return; }

  const q = query(
    collection(db, 'Tasks'),
    where('assignedToUid', '==', uid),
    where('status', '==', 'completed')
  );

  const unsubscribe = onSnapshot(q, (snap) => {
    let xp = 0;
    let count = 0;
    snap.forEach((d) => {
      xp += d.data().xp || 0;
      count++;
    });
    setTotalXp(xp);
    setCompletedTasks(count);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

---

### Bug 2 — `app/(kid)/stats.tsx`

**File:** `Frontend/app/(kid)/stats.tsx`  
**Function:** Second `useEffect` in `KidStatsScreen`

**Specific Changes:**

1. **Guard for null UID**: Read `const uid = auth.currentUser?.uid`. If falsy, return early.

2. **Replace collection-wide query with single-document listener:**
   - Old: `query(collection(db, 'Users'), where('role', '==', 'kid'))` + fan-out sum
   - New: `onSnapshot(doc(db, 'Users', uid), ...)` reading `snap.data()?.totalXp`

3. **Remove the XP summation loop**; read the scalar `totalXp` directly from the snapshot.

4. **Remove the `if (xp > 0)` guard** — the document listener should always reflect the current value; a zero XP should not be suppressed.

```typescript
// Fixed second useEffect
useEffect(() => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const unsubscribe = onSnapshot(doc(db, 'Users', uid), (snap) => {
    const xp = snap.data()?.totalXp ?? 0;
    setTotalXp(xp);
  });

  return () => unsubscribe();
}, []);
```

> **Note on interaction between the two effects:** Both effects write to `totalXp`. The second effect (user document) will always fire after the first (tasks) and will overwrite. This is intentional — the `Users/{uid}.totalXp` field is the authoritative source maintained by the Cloud Function on task approval, so it is the more reliable value. The task-XP summation in the first effect acts as an initial approximation that the second effect supersedes. If the ordering is considered undesirable in a future refactor, the first effect's `setTotalXp` call can be removed; for this fix it is left in place to minimise the diff.

---

### Bug 3 — `app/(kid)/vault.tsx`

**File:** `Frontend/app/(kid)/vault.tsx`

**Specific Changes:**

1. **Remove** the `REWARDS` constant entirely.

2. **Add state variables:**
   ```typescript
   const [rewards, setRewards] = useState<Reward[]>([]);
   const [rewardsLoading, setRewardsLoading] = useState(true);
   ```
   Import the `Reward` type from `../../types`.

3. **Add `rewardService` import:**
   ```typescript
   import { rewardService } from '../../services/rewardService';
   ```

4. **Add a new `useEffect` for the rewards subscription** (runs after the XP listener effect):
   ```typescript
   useEffect(() => {
     const uid = auth.currentUser?.uid;
     if (!uid) { setRewardsLoading(false); return; }

     // Step 1: fetch this kid's linkedParentId
     const userRef = doc(db, 'Users', uid);
     let rewardUnsub: (() => void) | null = null;

     const userUnsub = onSnapshot(userRef, (snap) => {
       const linkedParentId: string | undefined = snap.data()?.linkedParentId;
       if (!linkedParentId) {
         setRewards([]);
         setRewardsLoading(false);
         return;
       }
       // Step 2: subscribe to live rewards for that parent
       if (rewardUnsub) rewardUnsub(); // clean up previous if parent changed
       rewardUnsub = rewardService.subscribeToKidRewards(linkedParentId, (liveRewards) => {
         setRewards(liveRewards);
         setRewardsLoading(false);
       });
     });

     return () => {
       userUnsub();
       if (rewardUnsub) rewardUnsub();
     };
   }, []);
   ```

   > **Why nest inside a user snapshot?** `linkedParentId` can theoretically change (re-linking), so listening on the user doc and re-subscribing to rewards on change is more correct than a one-shot `getDoc`. In practice it also simplifies the code to a single effect.

5. **Update `handleClaim`**: Change the parameter type from `typeof REWARDS[0]` to `Reward`. The body (`claimReward(kidUid, reward.xpCost, reward.id)`) already uses the correct fields; just update `reward.cost` references to `reward.xpCost` to match the `Reward` type from Firestore.

6. **Update the render section**:
   - Replace `{REWARDS.map(...)}` with `{rewards.map(...)}`.
   - Show `<ActivityIndicator>` while `rewardsLoading` is true.
   - Show an empty-state `<Text>` when `!rewardsLoading && rewards.length === 0`.
   - Map `reward.xpCost` (not `reward.cost`) for the XP threshold check and display.
   - Map `reward.iconEmoji` (not `reward.icon`) for the emoji display.

---

### Bug 4 — `app/_layout.tsx`

**File:** `Frontend/app/_layout.tsx`  
**Function:** `onAuthStateChanged` callback inside `RootLayout`

**Specific Changes:**

1. **Remove** the second `getDoc` block (approximately lines 93–95 in the original):
   ```typescript
   // REMOVE THIS:
   const isKid = (await getDoc(doc(db, 'Users', firebaseUser.uid))).data()?.role === 'kid';
   if (isKid) {
     scheduleDailyReminder(16, 0).catch(() => {});
   }
   ```

2. **Replace with a local variable** derived from the already-available `role` constant:
   ```typescript
   // ADD THIS (immediately after the if/else profile-setting block):
   if (role === 'kid') {
     scheduleDailyReminder(16, 0).catch(() => {});
   }
   ```

3. **Move it inside the `try` block**, after the `if (userSnap.exists()) { ... } else { ... }` block and before the `catch`. The `role` variable is in scope for both branches of the `if/else` because `setRole('parent')` is called in the `else` branch — but `role` as a `const` is only assigned in the `if` branch. To avoid a reference-before-assignment issue:

   ```typescript
   const data = userSnap.data();
   const role = data.role as 'parent' | 'kid';
   setRole(role);
   // ... profile setting ...
   if (role === 'kid') {
     scheduleDailyReminder(16, 0).catch(() => {});
   }
   ```

   Place the `scheduleDailyReminder` call at the end of the `if (userSnap.exists())` block, before the `else` branch's closing brace. For the `else` (new user, defaulted to `'parent'`), no reminder is needed so no change is required there.

---

### Bug 5 — `app/(kid)/mission-board.tsx`

**File:** `Frontend/app/(kid)/mission-board.tsx`  
**Location:** Header section, `TouchableOpacity` wrapping `KidQuestLogo`

**Specific Changes:**

1. **Replace `TouchableOpacity` with `View`** to make the logo non-interactive:
   ```tsx
   // Before:
   <TouchableOpacity
     className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm"
     onPress={() => router.replace('/(auth)/login')}
   >
     <KidQuestLogo width={24} height={24} showText={false} showTagline={false} />
   </TouchableOpacity>

   // After:
   <View className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm">
     <KidQuestLogo width={24} height={24} showText={false} showTagline={false} />
   </View>
   ```

2. **No other changes** to the header, scroll view, proof modal, or any other component in this file.

---

### Bug 6 — `hooks/useTasks.ts` + `store/useTaskStore.ts`

**Files:** `Frontend/store/useTaskStore.ts`, `Frontend/hooks/useTasks.ts`

**Approach:** Add two new named store instances — `useParentTaskStore` and `useKidTaskStore` — each with the same shape as the current `useTaskStore`. The existing `useTaskStore` export is kept temporarily for backward compatibility but both hooks are updated to use the scoped stores.

**Changes to `store/useTaskStore.ts`:**

```typescript
// Shared state/action shape — defined once, instantiated twice
interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  setTasks: (tasks: Task[]) => void;
  setLoading: (loading: boolean) => void;
  getPendingApprovals: () => Task[];
  getPendingTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

function createTaskStore() {
  return create<TaskState>((set, get) => ({
    tasks: [],
    isLoading: true,
    setTasks: (tasks) => set({ tasks }),
    setLoading: (isLoading) => set({ isLoading }),
    getPendingApprovals: () => get().tasks.filter((t) => t.status === 'pending_approval'),
    getPendingTasks: () => get().tasks.filter((t) => t.status === 'pending'),
    getCompletedTasks: () => get().tasks.filter((t) => t.status === 'completed'),
  }));
}

export const useParentTaskStore = createTaskStore();
export const useKidTaskStore = createTaskStore();

// Backward-compat alias (existing direct consumers of useTaskStore, if any, continue to work)
export const useTaskStore = useParentTaskStore;
```

**Changes to `hooks/useTasks.ts`:**

```typescript
import { useParentTaskStore } from '../store/useTaskStore';
import { useKidTaskStore } from '../store/useTaskStore';

export function useParentTasks(parentId: string | null | undefined) {
  const { setTasks, setLoading, tasks, isLoading } = useParentTaskStore();

  useEffect(() => {
    if (!parentId) {
      // Only clear loading in parent store — does not affect kid store
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = taskService.subscribeToParentTasks(parentId, (tasks) => {
      setTasks(tasks);
      setLoading(false);
    });
    return unsubscribe;
  }, [parentId]);

  return { tasks, isLoading };
}

export function useKidTasks(kidId: string | null | undefined) {
  const { setTasks, setLoading, tasks, isLoading } = useKidTaskStore();

  useEffect(() => {
    if (!kidId) {
      // Only clear loading in kid store — does not affect parent store
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = taskService.subscribeToKidTasks(kidId, (tasks) => {
      setTasks(tasks);
      setLoading(false);
    });
    return unsubscribe;
  }, [kidId]);

  return {
    tasks,
    isLoading,
    pendingTasks: tasks.filter((t) => t.status === 'pending'),
    submittedTasks: tasks.filter((t) => t.status === 'pending_approval'),
    completedTasks: tasks.filter((t) => t.status === 'completed'),
  };
}
```

**Consumer updates required:**

| File | Change |
|------|--------|
| `app/(parent)/dashboard.tsx` | Uses `useParentTasks` → automatically reads from `useParentTaskStore` after hook update; no import change needed. |
| `app/(kid)/mission-board.tsx` | Uses `useKidTasks` → automatically reads from `useKidTaskStore` after hook update; no import change needed. |

No other files directly import `useTaskStore`.

---

### Bug 7 — `app/(parent)/analytics.tsx`

**File:** `Frontend/app/(parent)/analytics.tsx`  
**Function:** `fetchAnalytics`

**Specific Changes:**

1. **Remove all `Math.random()` calls** in the `mapped` array construction.

2. **After the main task loop** (where `completed`, `pending`, and `xpEarned` are summed), add a day-of-week grouping pass:

```typescript
// Day-of-week mapping:
// getDay() returns: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
// days array index:  0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
// Mapping: getDay() 1→0, 2→1, 3→2, 4→3, 5→4, 6→5, 0→6
const completedByDay = [0, 0, 0, 0, 0, 0, 0]; // index 0=Mon … 6=Sun

allSnap.forEach((d) => {
  const data = d.data();
  if (data.status === 'completed' && data.completedAt) {
    const jsDay = (data.completedAt as Timestamp).toDate().getDay(); // 0=Sun…6=Sat
    const chartIndex = jsDay === 0 ? 6 : jsDay - 1; // remap Sun(0)→6, Mon(1)→0, …
    completedByDay[chartIndex]++;
  }
});
```

3. **Replace the `mapped` array construction**:

```typescript
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const mapped: DayStats[] = days.map((day, i) => ({
  day,
  completed: completedByDay[i],
  total: completedByDay[i], // total = completed (only completed tasks have timestamps)
}));
setWeeklyData(mapped);
```

4. **Add `Timestamp` to the Firestore imports** at the top of the file:
   ```typescript
   import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
   ```

5. **No changes** to the summary card state setters (`setTotalCompleted`, `setTotalPending`, `setTotalXpEarned`), the loading indicator, or the chart rendering JSX.

> **Note on `total` vs `completed`:** The original chart used `total` as the background bar height and `completed` as the fill. Since `completedAt` is only available for completed tasks (not pending/future ones), the `total` field cannot be accurately populated per-day without a separate timestamp on all tasks. Setting `total === completed` means the background bar and fill bar are the same height — the chart effectively becomes a bar chart of completed counts per day, which is more informative than the original mock. This matches Requirement 2.1 ("group completed tasks by day-of-week of their `completedAt`").

---

## Testing Strategy

### Validation Approach

Testing follows the two-phase bug condition methodology: first run tests against unfixed code to surface counterexamples confirming the root cause, then verify the fix and preservation properties.

---

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples on the unfixed code to confirm root causes before implementing fixes.

**Test Cases (run against unfixed code):**

| # | Bug | Test | Expected Failure on Unfixed Code |
|---|-----|------|----------------------------------|
| E1 | Bug 1 | Render `KidStatsScreen` with a logged-in user whose UID is not "Alex"; assert `completedTasks > 0` if tasks exist | Fails: returns 0 |
| E2 | Bug 2 | Create 2 kid accounts with XP 100 and 200; render `KidStatsScreen` as kid-1; assert `totalXp === 100` | Fails: shows 300 |
| E3 | Bug 3 | Create a reward in Firestore; render `TheVault`; assert reward title appears in the rendered output | Fails: only static items shown |
| E4 | Bug 4 | Mock `getDoc` and count invocations per auth state change; assert `getDoc` called exactly once | Fails: called twice |
| E5 | Bug 5 | Render `MissionBoard`; simulate press on logo area; assert `router.replace` was NOT called | Fails: `router.replace('/(auth)/login')` is called |
| E6 | Bug 6 | Mount `useParentTasks` and `useKidTasks` concurrently with different IDs; fire parent snapshot then kid snapshot; assert `useParentTaskStore.tasks` still equals parent tasks | Fails: overwritten by kid tasks |
| E7 | Bug 7 | Call `fetchAnalytics` twice with same task set; assert `weeklyData` arrays are deep-equal | Fails: random values differ |

**Expected Counterexamples:**
- Bugs 1 & 2: Firestore query returns 0 results for non-Alex kids; XP shows aggregate of all kids.
- Bug 3: No Firestore reads to the `Rewards` collection occur; static array rendered.
- Bug 4: `getDoc` mock spy reports 2 calls.
- Bug 5: Navigation mock records a `replace` call to `'/(auth)/login'`.
- Bug 6: Parent task array is silently replaced by kid tasks or vice versa.
- Bug 7: Two calls yield different `weeklyData[i].completed` values.

---

### Fix Checking

**Goal:** Verify that for all inputs where each bug condition holds, the fixed code produces the correct behavior.

**Pseudocode (generic):**
```
FOR ALL input WHERE isBugCondition_BugN(input) DO
  result := fixedComponent(input)
  ASSERT correctProperty_N(result)
END FOR
```

**Fix-checking test plan (per bug):**

**Bug 1:** Render fixed `KidStatsScreen` with UID `uid-123` (not Alex); create tasks with `assignedToUid: 'uid-123'`; assert `completedTasks` count matches and `totalXp` sums correctly.

**Bug 2:** With 3 kid documents in `Users`, render fixed screen as kid-1; assert `totalXp` equals only kid-1's `totalXp` field, not the sum of all three.

**Bug 3:** With rewards `[{parentId: 'p1', isActive: true}, {parentId: 'p1', isActive: false}]` in Firestore and kid's `linkedParentId === 'p1'`; render fixed `TheVault`; assert only the active reward is shown.

**Bug 4:** In fixed `_layout.tsx`, mock `getDoc`; trigger an auth state change for a kid; assert `getDoc` called exactly once and `scheduleDailyReminder` called once with `(16, 0)`.

**Bug 5:** Render fixed `MissionBoard`; simulate press on the logo element; assert no navigation call is made.

**Bug 6:** Mount both hooks concurrently; fire parent snapshot with tasks `[A, B]`; fire kid snapshot with tasks `[C]`; assert `useParentTaskStore().tasks === [A, B]` and `useKidTaskStore().tasks === [C]` simultaneously.

**Bug 7:** Call fixed `fetchAnalytics` twice with the same Firestore snapshot (3 completed tasks: Mon, Mon, Wed); assert `weeklyData[0].completed === 2`, `weeklyData[2].completed === 1`, all other days `=== 0`; assert results are identical on both calls.

---

### Preservation Checking

**Goal:** Verify that for all inputs where the bug condition does NOT hold, fixed behavior equals original behavior.

**Pseudocode (generic):**
```
FOR ALL input WHERE NOT isBugCondition_BugN(input) DO
  ASSERT originalComponent(input) = fixedComponent(input)
END FOR
```

**Preservation test plan (per bug):**

**Bugs 1 & 2:** Render fixed screen for a kid named "Alex" whose `assignedToUid` matches their UID; verify XP and count are correct. Verify level, XP progress bar width, and badge unlock states are calculated identically.

**Bug 3:** Tap "Claim" on a reward with sufficient XP in the fixed Vault; verify `claimReward` Cloud Function is called with the same `rewardId`; verify the insufficient-XP alert still fires when XP < `reward.xpCost`.

**Bug 4:** Trigger auth state change for a parent account; verify `scheduleDailyReminder` is NOT called; verify `setRole('parent')` is called; verify only one `getDoc` call.

**Bug 5:** Verify the logo is still rendered in the header at the same position. Verify the notification icon and back-navigation behavior are unchanged.

**Bug 6:** With only `useParentTasks` mounted, fire a snapshot update; verify `useParentTaskStore().tasks` updates and `isLoading` transitions to `false`. Repeat symmetrically for `useKidTasks`. Verify unmount triggers unsubscribe.

**Bug 7:** Verify `totalCompleted`, `totalPending`, `totalXpEarned`, `completionRate` values are identical before and after fix for the same task set. Verify an all-zero `completedByDay` array renders the chart without crashing.

---

### Unit Tests

- **Bug 1:** Mock Firestore `onSnapshot`; assert query is constructed with `where('assignedToUid', '==', uid)`.
- **Bug 2:** Mock `onSnapshot(doc(...))` on the Users collection; assert the snapshot handler reads `.totalXp` from a single document.
- **Bug 3:** Mock `rewardService.subscribeToKidRewards`; assert it is called with the correct `linkedParentId`; assert unsubscribe is called on unmount.
- **Bug 4:** Mock `getDoc`; assert call count === 1 per auth state change.
- **Bug 5:** Use `@testing-library/react-native`; `fireEvent.press` on the logo container; assert `mockRouter.replace` not called.
- **Bug 6:** Call `useParentTasks` and `useKidTasks` in the same test; assert each store slice is independently writable.
- **Bug 7:** Call `fetchAnalytics` with a mock snapshot containing tasks with specific `completedAt` timestamps; assert `weeklyData[i].completed` equals expected day counts.

### Property-Based Tests

- **Bugs 1 & 2 (combined):** Generate random kid UIDs and XP values; for each, render the fixed stats screen; assert the displayed XP equals the document's `totalXp`, not an aggregate.
- **Bug 3:** Generate random arrays of active/inactive rewards; assert the Vault only renders rewards where `isActive === true`.
- **Bug 6:** Generate random interleaved sequences of parent-task and kid-task Firestore snapshots; assert after each snapshot that both stores hold correct independent state.
- **Bug 7:** Generate random lists of tasks with random `completedAt` timestamps spread across a week; call `fetchAnalytics` twice; assert the returned `weeklyData` arrays are deep-equal on both calls and that `sum(completedByDay) === completedTasksWithTimestamp.length`.

### Integration Tests

- **Bug 1 & 2:** Sign in a real test-account kid (not "Alex"); open Stats screen; assert displayed XP matches Firestore document; create an additional kid account; assert XP values remain independent.
- **Bug 3:** As a test parent, create a reward; open kid Vault; assert reward appears. Disable reward; assert it disappears without restart.
- **Bug 4:** Monitor Firestore read counts via Firebase emulator on login; assert single read per auth resolution.
- **Bug 5:** Open Mission Board in a test device; tap the logo; assert the screen remains on Mission Board.
- **Bug 6:** Navigate from parent Dashboard to kid Mission Board and back rapidly; assert pending approvals list on Dashboard is not contaminated by kid tasks.
- **Bug 7:** Complete several tasks on different days in a test environment; open Analytics; refresh twice; assert chart shows identical results and reflects actual completion days.
