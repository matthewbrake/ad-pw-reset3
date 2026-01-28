# Enterprise AD Notifier - Master Roadmap & Logic Specification

## 1. DASHBOARD & DATA OBSERAVBILITY
### UI Features
- **Stat Filtering**: Metric cards (Total, Healthy, Warning, Expired) act as toggles.
- **Dynamic Sort**: Every column in the user table supports multi-mode sorting (Asc/Desc/None).
- **Export Control**: CSV engine captures calculated fields (`DaysSinceReset`, `ExpiryDelta`).
- **Last Sync Timestamp**: Displays the exact second the last Graph API handshake succeeded.

### Calculation Formulas (Source of Truth)
- **Hybrid Detection**: `if (onPremisesSyncEnabled === true) { ignoreCloudNeverExpire = true; }`
- **Reset Delta**: `DaysSinceReset = Floor((Now - lastPasswordChangeDateTime) / 86400000)`
- **Expiry Goal**: `ExpiryDate = lastPasswordChangeDateTime + config.defaultExpiryDays`
- **Balance**: `DaysRemaining = Ceil((ExpiryDate - Now) / 86400000)`

## 2. INFRASTRUCTURE & PERSISTENCE
### Multi-Tenant Engine
- **JSON Root**: `/app/data/config/environments.json` is the state master.
- **Hot-Switching**: Context shifts instantly without container reload.
- **Verification Flow**:
  1. **Connectivity Check**: Ping `login.microsoftonline.com`.
  2. **Auth Handshake**: Exchange Client Secret for Bearer Token.
  3. **Scope Verification**: Attempt `GET /users` and `GET /groups`.

### Delivery Fabric (SMTP)
- **SSL/TLS Toggle**: Binary switch for Port 465 (Secure) vs 587 (STARTTLS).
- **Relay Handshake**: Validates SMTP credentials with a 0-byte transmission before committing.

## 3. NOTIFICATION ARCHITECT
### Template Logic
- **Simulation Mode**: Navigation controls allow "Record Cycling" through real user data to preview variable replacement.
- **Variable Injection**:
  - `{{user.displayName}}`: Common Name.
  - `{{user.userPrincipalName}}`: UPN/Email.
  - `{{expiryDate}}`: MMM DD, YYYY format.
  - `{{daysUntilExpiry}}`: Raw integer.
- **Routing Matrix**:
  - `toUser`: Direct delivery.
  - `toManager`: Graph Lookup for `manager` attribute.
  - `toAdmins`: Static CSV fallback.

## 4. QUEUE & AUDIT SYSTEM
### Transmission Lifecycle
- **Stage 1 (Pending)**: Record enters `queue.json`.
- **Stage 2 (Active)**: Background loop picks up record, status -> `IN-FLIGHT`.
- **Stage 3 (Commit)**: SMTP success, record moved to `history.json`, status -> `SENT`.
- **Stage 4 (Failed)**: Retries 3x, then moves to `history.json` with status `ERROR`.

### Reporting
- **Audit Table**: High-visibility log of all transmissions.
- **Raw View**: Modal showing exact JSON payload of a historical event.

## 5. SYSTEM CONSOLE (VERBOSITY)
- **Level GRAY**: Informational (IO operations, background loops).
- **Level BLUE**: System events (App boot, Sync start).
- **Level GREEN**: Success (Auth verified, Email sent).
- **Level YELLOW**: Warnings (Scope missing, Rate limits).
- **Level RED**: Critical (Auth fail, Write failure).