export interface User {
  id: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled?: boolean; 
  passwordLastSetDateTime: string;
  onPremisesSyncEnabled?: boolean;
  passwordExpiresInDays: number;
  passwordExpiryDate: string | null; 
  neverExpires: boolean;
  assignedGroups?: string[];
  managerEmail?: string;
  // Added daysSinceLastReset to match the data structure returned by the backend in server.js
  daysSinceLastReset: number;
}

export interface GraphApiConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  defaultExpiryDays?: number;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
}

export interface EnvironmentProfile {
    id: string;
    name: string;
    graph: GraphApiConfig;
    smtp: SmtpConfig;
}

export interface NotificationProfile {
    id: string;
    name: string;
    description: string;
    emailTemplate: string;
    subjectLine: string;
    preferredTime?: string; 
    cadence: {
        daysBefore: number[];
    };
    recipients: {
        toUser: boolean;
        toManager: boolean;
        toAdmins: string[];
        readReceipt: boolean;
    };
    assignedGroups: string[];
    status: 'active' | 'paused' | 'dryrun';
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'skip' | 'queue' | 'system';
  message: string;
  details?: any;
}

export interface PermissionResult {
  connectivity: boolean;
  auth: boolean;
  userScope: boolean;
  groupScope: boolean;
}

export interface JobResult {
    success: boolean;
    logs: LogEntry[];
    previewData?: Array<{
        user: string;
        email: string;
        daysLeft: number;
        expiryDate: string;
        action: string;
    }>;
}