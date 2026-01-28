# Azure AD Password Expiry Notifier (Enterprise Edition)

A professional-grade system for automated password expiration monitoring.

## 🚀 Quick Update
Run this command to pull the latest changes and restart your container:
```bash
docker stop azure-password-notifier && docker rm azure-password-notifier && git pull https://github.com/matthewbrake/ad-pw-reset2 && docker-compose up -d --build
```

## 📂 Multi-Environment Profiles
You can now save multiple sets of credentials (e.g., "Production", "Staging", "Pilot") and switch between them instantly in the Settings tab. These are saved in `./data/config/environments.json`.

## 🛡 Hybrid Logic
The app intelligently identifies Hybrid IDs. Even if Microsoft Entra ID reports "Never Expires," the app will calculate the on-prem expiry if `onPremisesSyncEnabled` is true.