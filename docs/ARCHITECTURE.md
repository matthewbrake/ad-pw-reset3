
# Application Architecture v2.5

## Profile Simulation Logic
The application uses a "Preview -> Verify -> Deploy" pipeline.

### 1. Verification
When a user enters a group name (e.g., `PLA-INTUNE-PILOTS`), the frontend filters the locally cached `users` array to find matches. This provides instant feedback on the scope of the profile.

### 2. Variable Mapping
The following variables are dynamically replaced in both the **Subject Line** and **Email Body**:
- `{{user.displayName}}`: Friendly name (e.g. John Doe)
- `{{user.userPrincipalName}}`: Login ID (e.g. john.doe@company.com)
- `{{expiryDate}}`: Formatted date of expiration.
- `{{daysUntilExpiry}}`: Integer count of days remaining.

### 3. Recipient Logic
The backend processing engine resolves recipients in this order:
1. **User**: If `toUser` is true, sends to `userPrincipalName`.
2. **Manager CC**: If `toManager` is true, looks for the `managerEmail` property.
3. **Admins CC**: Static list of comma-separated emails.

## Stability Features
- **Atomic File Operations**: Uses a temp file (`.tmp`) before renaming to the final `.json` to prevent corruption if the process crashes during a write.
- **Rate Limiting**: SMTP delivery is throttled at 5 emails per second to prevent triggering SPAM filters or API locks.
