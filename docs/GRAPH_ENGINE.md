# Microsoft Graph API Integration Engine

## 1. Authentication Lifecycle
The application utilizes the **OAuth 2.0 Client Credentials Flow**. This allows the backend to operate as a background daemon without user interaction.
- **Grant Type**: `client_credentials`
- **Resource Scope**: `https://graph.microsoft.com/.default`
- **Auth Endpoint**: `login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`
- **Reference**: [MS Docs: Client Credentials Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)

## 2. Directory Scalability (Paging)
For tenants with >999 users, the engine monitors the `@odata.nextLink` property. The `fetchAll` recursive logic ensures that every single directory principal is reached, preventing data silos.
- **Mechanism**: Continuation tokens.
- **Reference**: [MS Docs: Paging Microsoft Graph Data](https://learn.microsoft.com/en-us/graph/paging)

## 3. Scope Resolution (Transitive Members)
Unlike standard group member lookups, we utilize the `/transitiveMembers` endpoint.
- **Why**: This resolves nested groups (Groups within Groups). In enterprise Intune/Entra ID environments, users are often members of subgroups; transitive resolution ensures no one is missed.
- **Reference**: [MS Docs: List Transitive Members](https://learn.microsoft.com/en-us/graph/api/group-list-transitivemembers)

## 4. Hybrid Identity Intelligence
A common failure point in cloud-only notification tools is ignoring the on-prem Active Directory GPOs.
- **The Rule**: `if (onPremisesSyncEnabled === true) { ignore_cloud_never_expire_flag = true; }`
- Even if Microsoft Entra ID reports "Password Never Expires," the engine uses the `lastPasswordChangeDateTime` combined with your `defaultExpiryDays` to calculate the real expiry for synchronized accounts.

## 5. Throttling Resilience (429)
The `GraphClient` includes a `Retry-After` monitor. If Microsoft Graph signals a throttle event (429), the engine automatically pauses and retries according to the server's backoff headers.
