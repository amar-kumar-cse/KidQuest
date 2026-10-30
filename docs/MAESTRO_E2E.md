# Maestro E2E Testing Guide for KidQuest

KidQuest uses [Maestro](https://maestro.mobile.dev/) for deterministic mobile end-to-end testing across iOS simulators and Android emulators.

---

## 1. Installation

### macOS / Linux
```bash
curl -FsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
```

### Windows (PowerShell)
```powershell
# Using Chocolatey
choco install maestro

# Or run via WSL2 Ubuntu for full Android/iOS tooling
```

---

## 2. Test Suite Structure

All test flows are stored in `.maestro/`:

| Flow | File | Description |
| :--- | :--- | :--- |
| **01 Login** | `.maestro/01_login.yaml` | Validates sign-in fields, parent login credentials, and navigation to dashboard. |
| **02 Create Quest** | `.maestro/02_task_create.yaml` | Parent creates a new quest with category, title, description, and XP reward. |
| **03 Submit Proof** | `.maestro/03_task_submit.yaml` | Kid opens quest from mission board and submits completion proof. |
| **04 Approve Quest** | `.maestro/04_task_approve.yaml` | Parent approves submitted quest; kid receives celebration overlay with confetti & XP count. |
| **05 Offline Sync** | `.maestro/05_offline_sync.yaml` | Simulates network disconnection (`setAirplaneMode: true`), asserts offline banner, queues offline mutations in SQLite, reconnects, and verifies auto-sync. |
| **Master Suite** | `.maestro/run_all.yaml` | Executes all flows sequentially. |

---

## 3. Running Tests

Start your Android emulator or iOS simulator with the KidQuest build installed (`com.nowicstudio.kidquest`), then run:

```bash
# Run entire suite
maestro test .maestro/run_all.yaml

# Run individual flow
maestro test .maestro/01_login.yaml
maestro test .maestro/05_offline_sync.yaml

# Run continuously in watch mode while developing
maestro test .maestro/02_task_create.yaml --continuous
```

