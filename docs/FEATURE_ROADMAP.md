# AD Notifier Enterprise - Feature Master Specification

## 1. DASHBOARD (REAL-TIME OBSERVABILITY)
### UI Requirements
- **Interactive Metric Cards**: Clicking "Critical," "Expired," or "Safe" filters the table instantly.
- **Sync Control**: Refresh button displays "Last Sync: MM/DD HH:MM:SS" immediately adjacent.
- **Data Export**: "Export CSV" button captures all calculated attributes for external reporting.
- **Sorting**: All columns (Identity, Reset Date, Expiry, Days) must have high-visibility sort arrows.

### Calculation Logic
- **Reset Date**: Pulled from `lastPasswordChangeDateTime`. If null (Cloud-only user), use `createdDateTime`.
- **Expiry Date**: Reset Date + `GraphConfig.defaultExpiryDays`.
- **Days Since Reset**: `CurrentTime - ResetDate`.
- **Days Until Expiry**: `ExpiryDate - CurrentTime`.
- **Hybrid Override (Critical)**: If `onPremisesSyncEnabled` is TRUE, the Entra ID "Never Expire" flag is IGNORED. The system calculates expiry based on the defined tenant default.
- **Status Flags**: 
  - `CRITICAL`: <= 14 days remaining.
  - `EXPIRED`: <= 0 days (shown as negative numbers).
  - `SAFE`: Everything else.

## 2. PROFILE ARCHITECT (TEMPLATING & ROUTING)
### Logic & UI
- **Group Verification**: "Verify" button performs a live count of targeted users before saving.
- **Variable Mapping**:
  - `{{user.displayName}}` -> John Doe
  - `{{user.userPrincipalName}}` -> j.doe@company.com
  - `{{expiryDate}}` -> MMM DD, YYYY
  - `{{daysUntilExpiry}}` -> Integer
- **Recipient Matrix**:
  - `toUser`: Primary recipient.
  - `toManager`: Resolves manager email via Graph API.
  - `readReceipt`: Injects `Disposition-Notification-To` header in SMTP.
- **Simulation**: Navigation buttons `<` and `>` allow cycling through every user in the selected group to preview the exact email they will receive.

## 3. INFRASTRUCTURE SETTINGS (CONNECTIVITY)
### Identity (Azure)
- **Grant Consent**: Primary action button. Generates: `https://login.microsoftonline.com/{tenantId}/adminconsent?client_id={clientId}`.
- **Independent Buttons**: 
  - `VERIFY CONNECTIVITY`: Tests Token, User Scopes, and Group Scopes.
  - `COMMIT SETTINGS`: Saves to `/app/data/config/environments.json`.
- **Security**: Eye icon to toggle visibility of Client Secret.

### Delivery (SMTP)
- **SSL Toggle**: Explicit boolean switch for Port 465 (SSL) vs Port 587 (STARTTLS).
- **Independent Buttons**:
  - `TEST HANDSHAKE`: Sends a system-level verification email.
  - `COMMIT RELAY`: Saves relay info to persistence.

## 4. DELIVERY QUEUE & AUDIT LOGS
### Queue Logic
- **States**: `PENDING` (Waiting for window), `IN-FLIGHT` (Transmitting), `SENT` (Completed).
- **Control**: Ability to individual delete or "Clear All" pending tasks.
### Audit Logic
- **Persistence**: Every transmission is recorded in `history.json`.
- **Fields**: Timestamp, Recipient, Profile Name, Status (Success/Fail), Error Code (if any).

## 5. PERSISTENCE & ARCHITECTURE
- **Storage**: Prioritize `/app/data/config/*.json`. Fallback to `.env` only for initial container boot.
- **Verbosity**: All backend activities (Graph queries, SMTP handshakes) must stream to the UI Console in real-time.