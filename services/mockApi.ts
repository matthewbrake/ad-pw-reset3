import { User, GraphApiConfig, SmtpConfig, NotificationProfile, LogEntry, PermissionResult, JobResult } from '../types';

let listeners: ((log: LogEntry) => void)[] = [];

// HARDENED: Unified Fetch Handler
// Uses .text() then JSON.parse() to bypass "Unexpected non-whitespace character" errors
// associated with browser-side ReadableStream closure bugs in proxy environments.
const apiRequest = async (url: string, options: RequestInit = {}) => {
    try {
        const response = await fetch(url, options);
        const text = await response.text();
        const trimmed = text.trim();
        
        let data: any = {};
        if (trimmed) {
            try {
                data = JSON.parse(trimmed);
            } catch (e) {
                log('error', `PARSE_ERROR: Response was not valid JSON.`, trimmed.substring(0, 100));
                throw new Error("SERVER_FAULT: Received malformed response from backend.");
            }
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP_ERROR: ${response.status}`);
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

export const fetchUsers = async (config: GraphApiConfig): Promise<User[]> => {
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
    log('info', `SYNCING_CONTEXT: committing configuration for environment [${id}]`);
    return await apiRequest('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, graph, smtp })
    });
};

export const verifyGroup = async (name: string) => {
    log('info', `LOOKUP: Finding group '${name}' in directory...`);
    try {
        const data = await apiRequest('/api/verify-group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        log('success', `FOUND: Group '${name}' has ${data.count} transitive members.`);
        return data;
    } catch (e: any) {
        throw e;
    }
};

export const runNotificationJob = async (profile: NotificationProfile, mode: 'preview' | 'test' | 'live') => {
    log('info', `DEPLOYMENT: Initiating ${mode} job for profile [${profile.name}]`);
    // Note: The actual job run endpoint should be implemented in server.js to utilize JobProcessor
    return { success: true, logs: [] };
};

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
