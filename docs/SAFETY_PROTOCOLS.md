# Enterprise Safety & Security Protocols

## 1. Anti-Flood Mechanism (Serial Processing)
To prevent the application from being flagged as a SPAM engine or overwhelming the SMTP relay:
- **Serial Queue**: The `JobProcessor` handles emails one-by-one.
- **Transmission Delay**: A mandatory **2000ms pause** is enforced between every successful SMTP transaction.
- **Lock-out**: Only one job can run globally at any time.

## 2. Atomic Persistence (Data Integrity)
In a Docker environment, bind mounts can occasionally lead to file corruption if the process crashes during a write.
- **Protocol**: `writeJsonAtomic`. The engine writes to a temporary `.tmp` file, verifies the write, and then performs an OS-level atomic rename.
- **Impact**: Your notification profiles and history are never corrupted by power loss or process restarts.

## 3. Read Receipts & Auditing
- **MIME Headers**: If enabled, the engine injects `Disposition-Notification-To` and `Return-Receipt-To` headers into the MIME stream.
- **Atomic History**: Every transmission attempt is logged to `state/history.json` immediately after completion, creating a tamper-evident audit trail.

## 4. Loop Prevention
- **State Check**: Before sending any email, the engine calculates the current `daysUntilExpiry`. If the user has already reset their password since the last sync, the notification is skipped.
- **Verification Threshold**: Profiles require a "Verify Scope" success before they can be deployed live.
