# Core Feature List (Source of Truth)

The following features must be maintained across all versions of the Azure AD Password Notifier:

1. **Hybrid Expiry Calculation**: Always respect `onPremisesSyncEnabled`. If true, ignore cloud "Never Expire" policies and calculate based on `lastPasswordChangeDateTime` + `defaultExpiryDays`.
2. **Atomic Persistence**: Always use `writeJsonAtomic` in the server to prevent file corruption in bind mounts.
3. **Data Root**: All data must reside in `/app/data/` for Docker volume consistency.
4. **Environment Profiles**: Support switching between multiple sets of Azure/SMTP credentials without a restart.
5. **Privacy**: Mask `clientSecret` and `smtp.password` in logs and UI displays.

## Development Rules
- Do NOT delete the `data/` directory.
- Review this document before changing `server.js` logic.
- Always append the Version number to the Console Log header.