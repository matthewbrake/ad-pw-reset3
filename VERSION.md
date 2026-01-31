# Version History - AD Notifier Enterprise

## [v2.9.1] - Stream Integrity & Null-Ref Patch
- **Fixed**: `ReadableStreamDefaultController` JSON parsing error by implementing a robust `fetch` wrapper in the service layer.
- **Fixed**: `tenantId` undefined crash by hardening the `getActiveEnv` logic to always return valid property paths.
- **Improved**: Admin Consent URL now handles empty Tenant IDs gracefully without crashing the UI.
- **Improved**: Added "Safety Return" patterns to Express routes to prevent potential stream double-write conditions.

## [v2.9.0] - Mission Control (Self-Healing)
- Fixed `tenantId` undefined error with "Factory Default" auto-init.
- Settings buttons resized to match sidebar.
- Environment "Plus" button logic fixed.