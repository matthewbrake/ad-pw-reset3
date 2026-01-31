# Docker & Runtime Configuration

The AD Notifier is designed for cloud-native deployment. It prioritizes **System Environment Variables** over local configuration files. This ensures your Client Secrets never touch a persistent disk in a production environment.

## 1. Environment Variable Priority
The application checks settings in this order:
1.  **Process Environment**: Variables passed via Docker (`-e`) or System `export`.
2.  **.env File**: Local file at the application root.
3.  **Config File**: `data/config/environments.json` (UI-managed).

## 2. Docker Run Example
To pick up IDs automatically on startup:

```bash
docker run -d \
  -p 8085:3000 \
  -e AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000" \
  -e AZURE_CLIENT_ID="11111111-1111-1111-1111-111111111111" \
  -e AZURE_CLIENT_SECRET="YourSecretValue" \
  -v $(pwd)/data:/app/data \
  --name ad-notifier-demo \
  matthewbrake/ad-notifier:latest
```

## 3. Persistence Mapping
Ensure you map the `/app/data` volume. This folder contains:
- `config/`: Authentication profiles.
- `logs/`: System verbosity logs.
- `state/`: Transmission history and read-receipt audit data.
