# Implementation Plan

---

## Phase 1 — Exploration: Write Bug Condition Tests (BEFORE any fix)

- [ ] 1. Write bug condition exploration tests for all 7 bugs
  - **Property 1: Bug Condition** - KidQuest Seven-Bug Suite
  - **CRITICAL**: Write ALL of these tests BEFORE implementing any fix
  - **GOAL**: Surface counterexamples that prove each bug exists on unfixed code
  - **EXPECTED OUTCOME for every test below**: FAIL (correct — confirms bug is present)
  - Do NOT fix the code when tests fail; document the counterexamples and move on
  - Mark task complete when all seven tests are written, run, and failures are documented

  ### 1a — Bug 1: Stats screen hardcoded "Alex" query
  - **Property 1: Bug Condition** - Stats query uses hardcoded name instead of current user UID
  - Scoped PBT approach: render `KidStatsScreen` with a signed-in user whose UID is NOT the "Alex" account; assert `completedTasks > 0` for a kid that has completed tasks
  - Concrete failing case: create a test kid "Jordan" (UID `uid-jordan`) with 2 completed tasks; render Stats as Jordan; assert `completedTasks === 2`
  - On unfixed code: query uses `where('assignedTo', '==', 'Alex')` → returns 0 for Jordan → test FAILS
  - Document counterexample: `completedTasks` is `0` instead of `2`
  - _Bug_Condition: isBugCondition_Bug1 = queryFilterValue === 'Alex' AND currentUserId !== 'uid-of-Alex'_
  - _Requirements: 1.1, 1.2_

  ### 1b — Bug 2: Stats screen fans out XP across all kids
  - **Property 1: Bug Condition** - Stats XP aggregates all kids instead of current kid only
  - Scoped PBT approach: create 3 kid accounts with `totalXp` values [100, 200, 300]; render Stats as kid-1 (XP=100); assert displayed `totalXp === 100`
  - On unfixed code: second useEffect sums all kids → shows 600 to kid-1 → test FAILS
  - Document counterexample: displayed XP is `600` instead of `100`
  - _Bug_Condition: isBugCondition_Bug2 = query targets collection('Users') with where('role','==','kid') AND kidCount > 1_
  - _Requirements: 1.1, 1.2_

  ### 1c — Bug 3: Vault renders static REWARDS instead of Firestore rewards
  - **Property 1: Bug Condition** - Vault shows hardcoded rewards, not parent-configured Firestore rewards
  - Scoped PBT approach: mock a Firestore `Rewards` document `{ title: 'Beach Day', xpCost: 500, isActive: true, parentId: 'p1' }`; set kid's `linkedParentId = 'p1'`; render `TheVault`; assert "Beach Day" appears in the rendered output
  - On unfixed code: component renders the static `REWARDS` constant, never reads Firestore → "Beach Day" is absent → test FAILS
  - Document counterexample: "Beach Day" not found; only static items ("1 Hour of Video Games", etc.) are rendered
  - _Bug_Condition: isBugCondition_Bug3 = rewardSource === 'static'_
  - _Requirements: 1.1, 1.2, 1.3_

  ### 1d — Bug 4: Root layout issues duplicate Firestore read per auth resolution
  - **Property 1: Bug Condition** - Two `getDoc` calls fired for same document on single auth state change
  - Scoped PBT approach: mock `getDoc` as a jest spy; trigger an `onAuthStateChanged` callback for a kid user where `userSnap.exists() === true`; assert spy call count `=== 1`
  - On unfixed code: second `getDoc` call fires for `scheduleDailyReminder` role check → spy count is `2` → test FAILS
  - Document counterexample: `getDoc` call count is `2` instead of `1`
  - _Bug_Condition: isBugCondition_Bug4 = firstReadCompleted === true AND secondReadIssued === true_
  - _Requirements: 1.1, 1.2_

  ### 1e — Bug 5: Mission Board logo tap navigates to login
  - **Property 1: Bug Condition** - Tapping KidQuestLogo calls `router.replace('/(auth)/login')`
  - Scoped PBT approach: render `MissionBoard` with a mocked router; `fireEvent.press` on the logo container element; assert `mockRouter.replace` was NOT called with `'/(auth)/login'`
  - On unfixed code: `TouchableOpacity` fires `router.replace('/(auth)/login')` on press → test FAILS
  - Document counterexample: `mockRouter.replace` was called with `'/(auth)/login'`
  - _Bug_Condition: isBugCondition_Bug5 = target === 'KidQuestLogo' AND navigationTriggered('/(auth)/login') === true_
  - _Requirements: 1.1, 1.2_

  ### 1f — Bug 6: Concurrent hook mounts overwrite each other's task store
  - **Property 1: Bug Condition** - Kid task snapshot overwrites parent tasks in shared store
  - Scoped PBT approach: mount `useParentTasks('parent-1')` and `useKidTasks('kid-1')` in the same test; fire parent Firestore snapshot with tasks `[{id:'A'}, {id:'B'}]`; then fire kid Firestore snapshot with tasks `[{id:'C'}]`; assert the store accessible to `useParentTasks` still contains tasks `[{id:'A'}, {id:'B'}]`
  - On unfixed code: both hooks share `useTaskStore`; kid snapshot overwrites parent tasks → parent store shows `[{id:'C'}]` → test FAILS
  - Document counterexample: parent tasks array is `[{id:'C'}]` instead of `[{id:'A'}, {id:'B'}]`
  - _Bug_Condition: isBugCondition_Bug6 = sharedStore === true AND useParentTasksMounted === true AND useKidTasksMounted === true_
  - _Requirements: 1.1, 1.2_

  ### 1g — Bug 7: Weekly chart is non-deterministic due to Math.random()
  - **Property 1: Bug Condition** - Two calls to fetchAnalytics with identical task data produce different weeklyData
  - Scoped PBT approach: mock `getDocs` to return the same 3 completed tasks on every call; call `fetchAnalytics` twice; assert the two resulting `weeklyData` arrays are deep-equal
  - On unfixed code: `Math.random()` in `mapped` construction produces different bar heights each call → arrays differ → test FAILS
  - Document counterexample: first call `weeklyData[0].completed = 2`, second call `weeklyData[0].completed = 0` (values vary)
  - _Bug_Condition: isBugCondition_Bug7 = tasksUnchanged === true AND chartDataDiffersAcrossCalls(call1, call2) === true_
  - _Requirements: 1.1, 1.2_

---

## Phase 2 — Preservation: Write Baseline Tests (BEFORE any fix)

- [ ] 2. Write preservation property tests for all 7 bugs (BEFORE implementing fixes)
  - **Property 2: Preservation** - KidQuest Seven-Bug Baseline Behaviors
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs, observe outputs, then encode as tests
  - **EXPECTED OUTCOME for every test below**: PASS on unfixed code (confirms baseline to preserve)
  - Mark task complete when all preservation tests are written, run, and passing on unfixed code

  ### 2a — Bug 1 preservation: "Alex" kid still sees correct data; level/badge logic intact
  - **Property 2: Preservation** - Stats screen works for the one identity the hardcoded query accidentally serves
  - Observe: render Stats as the "Alex" account → `completedTasks` and `totalXp` are correct on unfixed code
  - Write property test: for the kid whose display name matches the hardcoded filter, Stats shows correct `completedTasks` and correct level/badge state derived from XP
  - Verify test passes on unfixed code
  - _Requirements: 3.1, 3.2_

  ### 2b — Bug 2 preservation: Single-kid scenario still displays correct XP
  - **Property 2: Preservation** - When only one kid account exists, fan-out sum equals that kid's XP (bug is invisible)
  - Observe: with exactly 1 kid (XP=400) the fan-out query still returns 400 on unfixed code
  - Write property test: for a single-kid Firestore state, displayed `totalXp` equals that kid's document value; Stats unmounts cleanly (unsubscribe called)
  - Verify test passes on unfixed code
  - _Requirements: 3.1, 3.2_

  ### 2c — Bug 3 preservation: Claim flow alert behavior and XP listener are unchanged
  - **Property 2: Preservation** - handleClaim Alert flow and XP live listener work identically when static REWARDS are in place
  - Observe on unfixed code: tapping a static reward with sufficient XP fires the confirmation Alert; tapping with insufficient XP fires the "Not Enough XP" Alert; Vault unmounts without error
  - Write property tests: (a) for any reward where `totalXp >= reward.cost`, `Alert.alert` is called with title `'Claim Reward? 🎉'`; (b) for any reward where `totalXp < reward.cost`, `Alert.alert` is called with title `'Not Enough XP! 😅'`; (c) unmounting Vault calls the XP `onSnapshot` unsubscribe
  - Verify tests pass on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

  ### 2d — Bug 4 preservation: Reminder scheduled for kids, skipped for parents; failure fallback intact
  - **Property 2: Preservation** - scheduleDailyReminder is called exactly once for kid accounts, never for parents
  - Observe on unfixed code: kid auth resolution → `scheduleDailyReminder(16, 0)` is called (albeit via duplicate read); parent auth resolution → not called; first read failure → role defaults to `'parent'`, no reminder
  - Write property tests: (a) kid auth state → `scheduleDailyReminder` called with `(16, 0)`; (b) parent auth state → `scheduleDailyReminder` NOT called; (c) `getDoc` throws → `setRole('parent')` called, `scheduleDailyReminder` NOT called
  - Verify tests pass on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

  ### 2e — Bug 5 preservation: Logo renders in header; notification icon and back navigation are unaffected
  - **Property 2: Preservation** - Non-logo interactions on MissionBoard work identically
  - Observe on unfixed code: `KidQuestLogo` is visible in the header; tapping the notification icon calls `router.push('/(kid)/notifications')`; tab bar and back navigation work normally
  - Write property tests: (a) `KidQuestLogo` element is present in the rendered output; (b) pressing the notification icon fires `router.push` with `'/(kid)/notifications'`
  - Verify tests pass on unfixed code
  - _Requirements: 3.1, 3.2_

  ### 2f — Bug 6 preservation: Single-hook scenarios return correct data and unsubscribe on unmount
  - **Property 2: Preservation** - When only one hook is active, tasks and derived arrays populate correctly
  - Observe on unfixed code: with only `useParentTasks` active, a Firestore snapshot sets `tasks` and clears `isLoading`; with only `useKidTasks` active, `pendingTasks`, `submittedTasks`, `completedTasks` derive correctly; unmount triggers unsubscribe
  - Write property tests: (a) `useParentTasks` alone — snapshot fires → `tasks` equals snapshot payload, `isLoading === false`; (b) `useKidTasks` alone — `pendingTasks` contains only `status === 'pending'` tasks; (c) unmount → Firestore unsubscribe spy called once
  - Verify tests pass on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

  ### 2g — Bug 7 preservation: Summary cards are correct; chart renders without crashing when no completedAt data
  - **Property 2: Preservation** - totalCompleted, totalPending, totalXpEarned, completionRate computed identically; zero-timestamp chart does not crash
  - Observe on unfixed code: summary cards derive from the task loop (not from `Math.random()`), so they are already deterministic; rendering with all-null `completedAt` tasks doesn't crash
  - Write property tests: (a) for any task set, `totalCompleted + totalPending === allSnap.size` and `totalXpEarned === sum of xp on completed tasks`; (b) when all tasks have `completedAt = null`, the component renders without throwing
  - Verify tests pass on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

---

## Phase 3 — Implementation: Apply All Seven Fixes

- [ ] 3. Fix Bug 1 — `stats.tsx`: Replace hardcoded "Alex" filter with current user UID

  - [ ] 3.1 Implement the fix
    - In `Frontend/app/(kid)/stats.tsx`, first `useEffect`: add `const uid = auth.currentUser?.uid` at the top of the effect
    - If `uid` is falsy, call `setLoading(false)` and return early (null-uid guard)
    - Replace `where('assignedTo', '==', 'Alex')` with `where('assignedToUid', '==', uid)`
    - Leave the snapshot handler, XP summation, completed-count increment, and `unsubscribe` return unchanged
    - _Bug_Condition: isBugCondition_Bug1 = queryFilterValue === 'Alex' AND currentUserId !== 'uid-of-Alex'_
    - _Expected_Behavior: query uses where('assignedToUid', '==', uid); null uid returns early without crash_
    - _Preservation: level calculation, XP progress bar, badge unlock logic, streak data, and HP bar must continue to derive correctly from totalXp_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ] 3.2 Verify Bug 1 exploration test now passes
    - **Property 1: Expected Behavior** - Stats query uses current user UID, not hardcoded name
    - Re-run the SAME test written in task 1a — do NOT write a new test
    - Jordan (uid-jordan) renders Stats → `completedTasks === 2` (matches actual task count)
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 1 is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify Bug 1 preservation tests still pass
    - **Property 2: Preservation** - Alex account and level/badge logic unchanged
    - Re-run the SAME tests written in task 2a — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

- [ ] 4. Fix Bug 2 — `stats.tsx`: Replace fan-out XP query with single-document listener

  - [ ] 4.1 Implement the fix
    - In `Frontend/app/(kid)/stats.tsx`, second `useEffect`: add `const uid = auth.currentUser?.uid`; if falsy, return early
    - Replace `query(collection(db, 'Users'), where('role', '==', 'kid'))` + forEach sum with `onSnapshot(doc(db, 'Users', uid), ...)`
    - In the snapshot handler, read `const xp = snap.data()?.totalXp ?? 0` and call `setTotalXp(xp)` unconditionally (remove the `if (xp > 0)` guard)
    - Remove the XP summation `forEach` loop
    - Add Firestore `doc` import if not already present (it is — verify import list)
    - _Bug_Condition: isBugCondition_Bug2 = query targets collection('Users') with where('role','==','kid') AND kidCount > 1_
    - _Expected_Behavior: onSnapshot(doc(db,'Users',uid)) reads totalXp scalar from single document_
    - _Preservation: unsubscribe on unmount; single-kid scenario continues to show correct XP; real-time updates continue_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ] 4.2 Verify Bug 2 exploration test now passes
    - **Property 1: Expected Behavior** - Stats shows only current kid's XP, not aggregate
    - Re-run the SAME test written in task 1b — do NOT write a new test
    - Kid-1 (XP=100) renders Stats → displayed `totalXp === 100`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 2 is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 4.3 Verify Bug 2 preservation tests still pass
    - **Property 2: Preservation** - Single-kid XP display and listener cleanup unchanged
    - Re-run the SAME tests written in task 2b — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

- [ ] 5. Fix Bug 3 — `vault.tsx`: Replace static REWARDS with live Firestore subscription

  - [ ] 5.1 Implement the fix
    - In `Frontend/app/(kid)/vault.tsx`:
    - Remove the `REWARDS` constant array entirely
    - Add imports: `import { rewardService } from '../../services/rewardService'` and `import type { Reward } from '../../types'`
    - Add state: `const [rewards, setRewards] = useState<Reward[]>([])` and `const [rewardsLoading, setRewardsLoading] = useState(true)`
    - Add a new `useEffect` after the XP listener effect: read `auth.currentUser?.uid`; if null, set `rewardsLoading(false)` and return; subscribe to `onSnapshot(doc(db, 'Users', uid))` to get `linkedParentId`; when `linkedParentId` is present, call `rewardService.subscribeToKidRewards(linkedParentId, (liveRewards) => { setRewards(liveRewards); setRewardsLoading(false); })`; clean up both unsubscribers on unmount
    - Update `handleClaim`: change parameter type from `typeof REWARDS[0]` to `Reward`; change `reward.cost` references to `reward.xpCost`; change `reward.icon` references to `reward.iconEmoji`
    - Update render: replace `{REWARDS.map(...)}` with `{rewards.map(...)}`; show `<ActivityIndicator>` while `rewardsLoading`; show empty-state `<Text>` when `!rewardsLoading && rewards.length === 0`; use `reward.xpCost` for XP threshold and display; use `reward.iconEmoji` for emoji display
    - _Bug_Condition: isBugCondition_Bug3 = rewardSource === 'static'_
    - _Expected_Behavior: subscribes to rewardService.subscribeToKidRewards(linkedParentId); reflects live parent create/update/delete_
    - _Preservation: handleClaim Alert flow (insufficient XP guard, confirmation dialog, claimReward call) remains identical; XP onSnapshot listener on Users/{uid} untouched; unsubscribe on unmount_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [ ] 5.2 Verify Bug 3 exploration test now passes
    - **Property 1: Expected Behavior** - Vault renders live Firestore rewards for linked parent
    - Re-run the SAME test written in task 1c — do NOT write a new test
    - "Beach Day" reward from Firestore appears in rendered output
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 3 is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 5.3 Verify Bug 3 preservation tests still pass
    - **Property 2: Preservation** - Claim flow alerts and XP listener unchanged
    - Re-run the SAME tests written in task 2c — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

- [ ] 6. Fix Bug 4 — `_layout.tsx`: Remove duplicate Firestore read; derive isKid from existing role variable

  - [ ] 6.1 Implement the fix
    - In `Frontend/app/_layout.tsx`, inside the `onAuthStateChanged` callback, locate the block after the `if (userSnap.exists()) { ... } else { ... }` section:
    - Remove the duplicate `getDoc` call: `const isKid = (await getDoc(doc(db, 'Users', firebaseUser.uid))).data()?.role === 'kid'`
    - Replace the `if (isKid)` check with `if (role === 'kid')` using the `role` constant already declared earlier in the same `if (userSnap.exists())` block
    - Move the `scheduleDailyReminder(16, 0).catch(() => {})` call to the end of the `if (userSnap.exists())` block, still guarded by `if (role === 'kid')`
    - No changes to the `else` branch (new user defaulting to `'parent'`), the `catch` block, or any other part of the layout
    - _Bug_Condition: isBugCondition_Bug4 = firstReadCompleted === true AND secondReadIssued === true_
    - _Expected_Behavior: exactly one getDoc call per auth resolution; role derived from userSnap already in scope_
    - _Preservation: kid daily reminder scheduled at 16:00 as before; parent accounts skip reminder; first-read failure falls back to 'parent' with no reminder_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [ ] 6.2 Verify Bug 4 exploration test now passes
    - **Property 1: Expected Behavior** - Exactly one getDoc call per auth state resolution
    - Re-run the SAME test written in task 1d — do NOT write a new test
    - `getDoc` spy call count `=== 1`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 4 is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 6.3 Verify Bug 4 preservation tests still pass
    - **Property 2: Preservation** - Reminder scheduling behavior and failure fallback unchanged
    - Re-run the SAME tests written in task 2d — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

- [ ] 7. Fix Bug 5 — `mission-board.tsx`: Replace logo TouchableOpacity with plain View

  - [ ] 7.1 Implement the fix
    - In `Frontend/app/(kid)/mission-board.tsx`, in the Header Bar section:
    - Replace the `<TouchableOpacity ... onPress={() => router.replace('/(auth)/login')}>` wrapping `KidQuestLogo` with a plain `<View>`
    - Preserve the existing className (`"w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm"`) on the `View` so the visual layout is unchanged
    - Keep `<KidQuestLogo width={24} height={24} showText={false} showTagline={false} />` as the child
    - No other changes to this file
    - _Bug_Condition: isBugCondition_Bug5 = target === 'KidQuestLogo' AND navigationTriggered('/(auth)/login') === true_
    - _Expected_Behavior: no navigation action on logo tap; logo is purely decorative_
    - _Preservation: logo renders in same visual position in header; notification icon and back-navigation behavior unchanged_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ] 7.2 Verify Bug 5 exploration test now passes
    - **Property 1: Expected Behavior** - Logo tap has no navigation side effect
    - Re-run the SAME test written in task 1e — do NOT write a new test
    - `mockRouter.replace` is NOT called after pressing the logo area
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 5 is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 7.3 Verify Bug 5 preservation tests still pass
    - **Property 2: Preservation** - Logo visible; notification icon and other navigation unchanged
    - Re-run the SAME tests written in task 2e — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

- [ ] 8. Fix Bug 6 — `useTaskStore.ts` + `useTasks.ts`: Isolate parent and kid stores

  - [ ] 8.1 Implement the fix in `store/useTaskStore.ts`
    - In `Frontend/store/useTaskStore.ts`:
    - Extract the existing `create<TaskState>(...)` body into a named factory function `createTaskStore()`
    - Export two new named store instances: `export const useParentTaskStore = createTaskStore()` and `export const useKidTaskStore = createTaskStore()`
    - Keep `export const useTaskStore = useParentTaskStore` as a backward-compatibility alias so any existing direct consumers of `useTaskStore` continue to compile without changes
    - The `TaskState` interface and all field/selector shapes remain identical
    - _Bug_Condition: isBugCondition_Bug6 = sharedStore === true AND useParentTasksMounted AND useKidTasksMounted_
    - _Expected_Behavior: parent snapshots write only to useParentTaskStore; kid snapshots write only to useKidTaskStore_
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 8.2 Implement the fix in `hooks/useTasks.ts`
    - In `Frontend/hooks/useTasks.ts`:
    - Update the `useParentTasks` import to use `useParentTaskStore` instead of `useTaskStore`
    - Update the `useKidTasks` import to use `useKidTaskStore` instead of `useTaskStore`
    - No other logic changes — the hook bodies, Firestore subscription calls, return shapes, and unsubscribe cleanup are all unchanged
    - The `setLoading(false)` early-return path in each hook now only touches its own isolated store, so it cannot clear loading for the other hook's active subscription
    - _Preservation: useParentTasks continues to expose {tasks, isLoading}; useKidTasks continues to expose {tasks, isLoading, pendingTasks, submittedTasks, completedTasks}; both hooks unsubscribe on unmount_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [ ] 8.3 Verify Bug 6 exploration test now passes
    - **Property 1: Expected Behavior** - Concurrent hook mounts do not overwrite each other's task data
    - Re-run the SAME test written in task 1f — do NOT write a new test
    - After kid snapshot fires, parent store still holds `[{id:'A'}, {id:'B'}]`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 6 is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 8.4 Verify Bug 6 preservation tests still pass
    - **Property 2: Preservation** - Single-hook scenarios and unmount cleanup unchanged
    - Re-run the SAME tests written in task 2f — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

- [ ] 9. Fix Bug 7 — `analytics.tsx`: Replace Math.random() with real completedAt day-of-week grouping

  - [ ] 9.1 Implement the fix
    - In `Frontend/app/(parent)/analytics.tsx`:
    - Add `Timestamp` to the Firestore import line: `import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'`
    - After the existing task loop (where `completed`, `pending`, and `xpEarned` are summed), add a day-of-week grouping pass:
      ```typescript
      const completedByDay = [0, 0, 0, 0, 0, 0, 0]; // index 0=Mon … 6=Sun
      allSnap.forEach((d) => {
        const data = d.data();
        if (data.status === 'completed' && data.completedAt) {
          const jsDay = (data.completedAt as Timestamp).toDate().getDay(); // 0=Sun…6=Sat
          const chartIndex = jsDay === 0 ? 6 : jsDay - 1; // remap: Sun→6, Mon→0, …
          completedByDay[chartIndex]++;
        }
      });
      ```
    - Replace the entire `const mapped = days.map(...)` block (which uses `Math.random()`) with:
      ```typescript
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const mapped: DayStats[] = days.map((day, i) => ({
        day,
        completed: completedByDay[i],
        total: completedByDay[i],
      }));
      ```
    - Remove the `today` variable and all `Math.random()` / `Math.floor` calls that were part of the old mock
    - No changes to `setTotalCompleted`, `setTotalPending`, `setTotalXpEarned`, the loading indicator, the chart rendering JSX, or the summary card computation
    - _Bug_Condition: isBugCondition_Bug7 = tasksUnchanged === true AND chartDataDiffersAcrossCalls(call1, call2) === true_
    - _Expected_Behavior: weeklyData derived from completedAt Timestamp day-of-week; identical on every call for same data_
    - _Preservation: totalCompleted, totalPending, totalXpEarned, completionRate computed identically; chart renders without crash when no completedAt timestamps exist_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [ ] 9.2 Verify Bug 7 exploration test now passes
    - **Property 1: Expected Behavior** - Weekly chart is deterministic for identical task data
    - Re-run the SAME test written in task 1g — do NOT write a new test
    - Two calls with the same mock snapshot return deep-equal `weeklyData` arrays
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 7 is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 9.3 Verify Bug 7 preservation tests still pass
    - **Property 2: Preservation** - Summary cards and zero-timestamp rendering unchanged
    - Re-run the SAME tests written in task 2g — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (no regressions)

---

## Phase 4 — Checkpoint

- [ ] 10. Checkpoint — Ensure all tests pass
  - Run the full test suite; confirm all 7 exploration tests now PASS and all 14 preservation tests still PASS
  - Verify no TypeScript compiler errors across the 6 modified files: `app/(kid)/stats.tsx`, `app/(kid)/vault.tsx`, `app/_layout.tsx`, `app/(kid)/mission-board.tsx`, `store/useTaskStore.ts`, `hooks/useTasks.ts`, `app/(parent)/analytics.tsx`
  - Confirm the backward-compatibility alias `useTaskStore = useParentTaskStore` does not break any existing imports outside the hooks
  - If any test is failing or any question arises, stop and ask before proceeding
