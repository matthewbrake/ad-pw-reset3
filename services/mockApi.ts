import { User, GraphApiConfig, SmtpConfig, NotificationProfile, LogEntry, EnvironmentProfile } from '../types';

let listeners: ((log: LogEntry) => void)[] = [];

/**
 * Unified Hardened Fetch Handler
 * Prevents "Unexpected non-whitespace character" errors by consuming the stream 
 * as text first, then attempting to parse.
 */
export const apiRequest = async (url: string, options: RequestInit = {}) => {
    try {
        const response = await fetch(url, options);
        const text = await response.text();
        const trimmed = text.trim();
        
        let data: any = null;
        if (trimmed) {
            try {
                data = JSON.parse(trimmed);
            } catch (e) {
                // Log the failure to the in-app console for debugging
                log('error', `SERVER_BODY_MALFORMED: Expected JSON, got: "${trimmed.substring(0, 50)}..."`);
                throw new Error(`Parse Failed: Received non-JSON response from ${url}`);
            }
        }

        if (!response.ok) {
            throw new Error(data?.message || `Server Error: ${response.status}`);
        }

        return data;
    } catch (e: any) {
        log('error', `NETWORK_FAULT: ${e.message}`);
        throw e;
    }
};

export const log = (level: LogEntry['level'], message: string, details?: any) => {
    const entry: LogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        details
    };
    listeners.forEach(l => l(entry));
};

export const subscribeToLogs = (listener: (log: LogEntry) => void) => {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
};

// --- Unified API Surface ---

export const fetchConfig = async (): Promise<EnvironmentProfile> => {
    return apiRequest('/api/config');
};

export const fetchEnvironments = async (): Promise<EnvironmentProfile[]> => {
    return apiRequest('/api/environments');
};

export const fetchUsers = async (config?: GraphApiConfig): Promise<User[]> => {
  log('info', 'FABRIC_SYNC: Fetching directory from Entra ID...');
  try {
    const data = await apiRequest('/api/users');
    log('success', `SYNC_COMPLETE: Found ${data.length} principals.`);
    return data;
  } catch (error: any) {
    throw error;
  }
};

export const validateGraphPermissions = async (config: GraphApiConfig, envId?: string) => {
  log('info', 'OAUTH_HANDSHAKE: Verifying App Registration Credentials...');
  try {
    const data = await apiRequest('/api/validate-permissions', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, envId })
    });
    log('success', 'CREDENTIALS_VERIFIED: State locked into Infrastructure.');
    return data;
  } catch (error: any) {
    throw error;
  }
};

export const saveBackendConfig = async (graph: GraphApiConfig, smtp: SmtpConfig, id: string) => {
    log('info', `SYNCING_CONTEXT: Committing configuration for environment [${id}]`);
    return await apiRequest('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, graph, smtp })
    });
};

export const switchEnvironment = async (id: string) => {
    return apiRequest('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'switch' })
    });
};

export const addEnvironment = async (name: string) => {
    return apiRequest('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action: 'add' })
    });
};

export const verifyGroupDetailed = async (name: string, expiryDays?: number) => {
    return apiRequest('/api/verify-group-detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, expiryDays })
    });
};

export const fetchHistory = async () => {
    return apiRequest('/api/history');
};

export const fetchQueue = async () => {
    return apiRequest('/api/queue');
};

export const toggleQueue = async () => {
    return apiRequest('/api/queue/toggle', { method: 'POST' });
};

export const cancelQueueItem = async (id: string) => {
    return apiRequest('/api/queue/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
};

export const clearQueue = async () => {
    return apiRequest('/api/queue/clear', { method: 'POST' });
};

// --- Local Storage Management ---

export const fetchProfiles = async (): Promise<NotificationProfile[]> => {
    const s = localStorage.getItem('notification_profiles');
    return s ? JSON.parse(s) : [];
};

export const saveProfile = async (profile: NotificationProfile) => {
    const profiles = await fetchProfiles();
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx !== -1) profiles[idx] = profile;
    else profiles.push({ ...profile, id: Date.now().toString() });
    localStorage.setItem('notification_profiles', JSON.stringify(profiles));
    return profile;
};

export const deleteProfile = async (id: string) => {
    let profiles = await fetchProfiles();
    localStorage.setItem('notification_profiles', JSON.stringify(profiles.filter(p => p.id !== id)));
};

export const runNotificationJob = async (profile: NotificationProfile, mode: 'preview' | 'test' | 'live') => {
    log('info', `DEPLOYMENT: Initiating ${mode} job for profile [${profile.name}]`);
    return { success: true, logs: [] };
};