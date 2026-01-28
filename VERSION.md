
# Version History - Azure AD Password Notifier

## [v2.5.0] - Profile Intelligence & Simulation
### Added
- **Live Mail Merge**: Preview pane in the editor now maps real directory data to variables.
- **Flip Records**: Cycle through targeted users within the editor to verify template accuracy.
- **Group Verification**: "Verify" button to check if the assigned Azure AD groups match directory records.
- **Recipient Matrix**: Restored CC Manager, CC Admins, and Read Receipt options to profiles.
- **Scheduling Context**: Added "Preferred Time" support for queued deliveries.

### Improved
- **Data Persistence**: Atomic writes for Profiles to prevent data loss during simultaneous edits.
- **Directory Cache**: One-time fetch of users/groups shared across the dashboard and profile editor.

## [v2.4.0] - Audit Compliance & Restoration
### Restored
- **SMTP Configuration**: Full SMTP engine returned to Settings tab.
- **Consent Workflow**: Deep-links for Azure Portal admin consent.

## [v2.3.0] - Hybrid Logic Foundation
- Established Hybrid ID expiry logic (Ignoring cloud "Never Expire" for synced IDs).
