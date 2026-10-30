# KidQuest Master Production Release Checklist

A strict, step-by-step checklist to guide the deployment of KidQuest to the **Google Play Store** and **Apple App Store**.

---

## 1. Pre-Flight Code & Security Verification

Run all deterministic verification commands locally before cutting a release:

- [ ] **Type Safety**: `npm --prefix Frontend run type-check` (Must pass with 0 errors).
- [ ] **School Portal Build**: `npm --prefix school-portal run build` (Must succeed in < 5s).
- [ ] **Backend Functions**: `npm --prefix Backend/functions run build` (Must compile cleanly).
- [ ] **Unit & Store Tests**: `npm --prefix Frontend test` (All 18 test suites / 100 tests must pass).
- [ ] **Firestore Rules Tests**: `npm run test:rules` (All security rules & teacher isolation tests pass).
- [ ] **Code Hygiene**: `npm run lint` (0 ESLint errors in Frontend and 0 Oxlint errors in school portal).
- [ ] **Git Working Tree**: Confirm on `master` branch with clean working directory and zero untracked files (`git status`).

---

## 2. App Versioning & Credentials

- [ ] **Version Bump**: Update version in `Frontend/app.json`:
  - `expo.version`: e.g. `"1.0.0"`
  - `expo.ios.buildNumber`: Increment by 1 (e.g. `"2"`)
  - `expo.android.versionCode`: Increment by 1 (e.g. `2`)
- [ ] **Credentials Check**: Run `eas credentials` to verify:
  - Android Keystore is configured and valid for Google Play signing.
  - Apple Distribution Certificate and Provisioning Profile are linked.
- [ ] **Environment Secrets**: Verify `Frontend/.env` or EAS Secret variables:
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - `EXPO_PUBLIC_SENTRY_DSN`

---

## 3. Production Cloud Builds (EAS)

Run cloud builds via EAS CLI or trigger via GitHub Actions release tag (`git tag v1.0.0 && git push origin v1.0.0`):

```bash
# Android Production App Bundle (.aab)
eas build --platform android --profile production

# iOS Production App Archive (.ipa)
eas build --platform ios --profile production
```

- [ ] Download and verify the generated `.aab` and `.ipa` artifacts.
- [ ] Verify bundle size using `npm --prefix Frontend run bundle:check`.

---

## 4. Google Play Console Submission

- [ ] **Create New Release**:
  - Upload `.aab` file to **Internal Testing** track first.
  - Test on at least 2 physical Android devices (one low-end, one high-end).
- [ ] **App Content Declarations**:
  - **Data Safety Form**: Fill in exact answers from [`docs/STORE_LISTING_METADATA.md`](./STORE_LISTING_METADATA.md).
  - **Target Audience & Content**: Select **Ages 6–8 and 9–12**; accept Families Policy terms.
  - **Ads Declaration**: Declare **No Ads** present in the app.
  - **Privacy Policy**: Enter public privacy policy URL (e.g. `https://kidquest.app/privacy`).
- [ ] **Store Listing**:
  - App Name: `KidQuest: Gamified Habit Quest`
  - Short Description & Full Description (Use English & Hindi copy from metadata guide).
  - Upload App Icon (512x512 PNG, 32-bit).
  - Upload Feature Graphic (1024x500 PNG).
  - Upload 4–6 phone screenshots (1080x2400) and 2 tablet screenshots.
- [ ] **Promotion**:
  - Promote release from Internal Testing → Closed Testing → Production Track (start staged rollout at 20%).

---

## 5. Apple App Store Connect Submission

- [ ] **TestFlight Internal Testing**:
  - Push build to TestFlight; verify push notifications and camera permissions on physical iPhone.
- [ ] **App Privacy Nutrition Labels**:
  - Complete questions according to [`docs/STORE_LISTING_METADATA.md`](./STORE_LISTING_METADATA.md).
  - Confirm **No Data Used to Track You**.
- [ ] **Kids Category Declaration**:
  - Check **Made for Kids** checkbox.
  - Verify parental gates are active on external links and account deletion.
- [ ] **App Review Information**:
  - Provide a test Parent account (`demo.parent@kidquest.app` / `Password123!`).
  - Provide a test Kid account linked to the parent.
  - Explain camera usage: *"Camera is used exclusively for kids to capture verification photos of finished homework and chores for parental approval."*
- [ ] **Submit for Review**.

---

## 6. Post-Launch Observability & Rollback Plan

- [ ] **Sentry Monitoring**:
  - Monitor Sentry dashboard for initial 24 hours post-launch for any spikes in JS or native crashes.
  - Verify crash-free user rate remains > 99.5%.
- [ ] **Firebase Cloud Functions**:
  - Verify execution logs for `completeTaskTransaction` and `deleteAccount` show 0 cold-start timeouts.
- [ ] **Staged Rollout Expansion**:
  - Day 1: 20%
  - Day 3: 50%
  - Day 5: 100%
- [ ] **Emergency Rollback**:
  - If a critical bug is detected during staged rollout, halt the rollout in Google Play Console immediately and push a hotfix build via EAS with patch version bump.
