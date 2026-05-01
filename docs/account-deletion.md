# Account Deletion Flow

This document describes the intended account deletion flow and what the `deleteAccount` Cloud Function does.

- Trigger: User presses "Delete Account" in Settings / Privacy page.
- Client: Calls callable `deleteAccount`.
- Server (`functions/src/users/deleteAccount.ts`):
  - Deletes user's `Users` doc.
  - Deletes Tasks where `assignedToUid == uid` or `parentId == uid`.
  - Deletes Notifications, AISuggestions, AIVerifications, RewardClaims linked to uid.
  - Attempts to delete storage files under `avatars/{uid}` and `proofs/{familyId}/` (best-effort).
  - Deletes the Firebase Auth user via Admin SDK.

Notes:
- Deletions are batched in groups of 500; large accounts may take multiple invocations or longer to fully clean.
- Backups and logs may retain data for operational reasons.
- For strict legal compliance, consider queuing deletions and providing the user a deletion request ID and status.

