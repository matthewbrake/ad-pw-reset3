import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import nodemailer from 'nodemailer';
import fs from 'fs';
import dotenv from 'dotenv';

// v3.2.0 "Obsidian-Hardened" - Enterprise Demo Edition
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = "v3.2.0 Obsidian-Hardened";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// --- INFRASTRUCTURE: PERSISTENCE ENGINE ---
const DATA_ROOT = path.join(__dirname, 'data');
const CONFIG_DIR = path.join(DATA_ROOT, 'config');
const LOGS_DIR = path.join(DATA_ROOT, 'logs');
const STATE_DIR = path.join(DATA_ROOT, 'state');

[DATA_ROOT, CONFIG_DIR, LOGS_DIR, STATE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ENVIRONMENTS_FILE = path.join(CONFIG_DIR, 'environments.json');
const HISTORY_FILE = path.join(STATE_DIR, 'history.json');
const QUEUE_FILE = path.join(STATE_DIR, 'queue.json');

const fileLog = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message} ${data ? (typeof data === 'string' ? data : JSON.stringify(data)) : ''}\n`;
    process.stdout.write(logLine);
    try { fs.appendFileSync(path.join(LOGS_DIR, `system.log`), logLine); } catch (e) {}
};

const writeJsonAtomic = (filePath, data) => {
    const tempPath = `${filePath}.${Date.now()}.tmp`;
    try {
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(tempPath, content, 'utf-8');
        fs.renameSync(tempPath, filePath);
    } catch (e) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        fileLog('error', `IO_FAULT: Atomic write failed for ${path.basename(filePath)}`, e.message);
    }
};

const readJsonSafe = (filePath, defaultValue = []) => {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        return content ? JSON.parse(content) : defaultValue;
    } catch (e) { 
        fileLog('warn', `IO_CORRUPTION: Using default for ${path.basename(filePath)}`);
        return defaultValue; 
    }
};

// --- CORE: GRAPH API CLIENT (MS COMPLIANT) ---
class GraphClient {
    constructor(cfg) {
        // PRIORITY: Environment variables (Docker/System) > File Config
        this.cfg = {
            tenantId: process.env.AZURE_TENANT_ID || cfg.tenantId,
            clientId: process.env.AZURE_CLIENT_ID || cfg.clientId,
            clientSecret: process.env.AZURE_CLIENT_SECRET || cfg.clientSecret,
            defaultExpiryDays: cfg.defaultExpiryDays || 90
        };
        this.token = null;
        this.expiry = null;
    }

    async getAccessToken() {
        if (this.token && this.expiry && Date.now() < this.expiry) return this.token;
        
        if (!this.cfg.tenantId || !this.cfg.clientId || !this.cfg.clientSecret) {
            throw new Error("AUTH_CONFIG_MISSING: Ensure TenantID, ClientID, and Secret are provided via UI or Docker ENV.");
        }

        fileLog('info', `OAUTH_INIT: Requesting token for ${this.cfg.tenantId}`);
        try {
            const res = await axios.post(`https://login.microsoftonline.com/${this.cfg.tenantId}/oauth2/v2.0/token`, new URLSearchParams({
                client_id: this.cfg.clientId,
                scope: 'https://graph.microsoft.com/.default',
                client_secret: this.cfg.clientSecret,
                grant_type: 'client_credentials'
            }), { timeout: 15000 });
            
            this.token = res.data.access_token;
            this.expiry = Date.now() + (res.data.expires_in - 300) * 1000;
            fileLog('success', 'OAUTH_READY: Bearer session established.');
            return this.token;
        } catch (e) {
            const msg = e.response?.data?.error_description || e.message;
            fileLog('error', 'OAUTH_FAILED', msg);
            throw new Error(`Microsoft Auth Error: ${msg}`);
        }
    }

    async request(url, params = {}) {
        const token = await this.getAccessToken();
        try {
            return await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
        } catch (e) {
            // Handle MS Graph 429 (Throttling)
            if (e.response?.status === 429) {
                const retryAfter = parseInt(e.response.headers['retry-after']) || 2;
                fileLog('warn', `THROTTLED: Microsoft Graph rate limit. Backing off ${retryAfter}s...`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
                return this.request(url, params);
            }
            throw e;
        }
    }

    async fetchAll(endpoint, params = {}) {
        let results = [];
        let nextLink = endpoint;

        while (nextLink) {
            const res = await this.request(nextLink, nextLink === endpoint ? params : {});
            results = results.concat(res.data.value);
            nextLink = res.data['@odata.nextLink'];
            if (nextLink) fileLog('info', `PAGINATION_ACTIVE: Aggregating directory... (${results.length} records)`);
        }
        return results;
    }
}

// --- CORE: JOB PROCESSOR (ANTI-FLOOD / SERIAL) ---
class JobProcessor {
    static isProcessing = false;

    static async run(profile, smtpCfg, users) {
        if (this.isProcessing) throw new Error("BUSY: Another job is currently in progress.");
        this.isProcessing = true;
        
        fileLog('info', `JOB_START: ${profile.name} processing ${users.length} targets.`);
        const transporter = nodemailer.createTransport({
            host: smtpCfg.host,
            port: smtpCfg.port,
            secure: smtpCfg.secure,
            auth: { user: smtpCfg.username, pass: smtpCfg.password }
        });

        try {
            for (const user of users) {
                const mailOptions = {
                    from: smtpCfg.fromEmail,
                    to: user.userPrincipalName,
                    subject: profile.subjectLine,
                    text: profile.emailTemplate
                        .replace(/{{user.displayName}}/g, user.displayName)
                        .replace(/{{daysUntilExpiry}}/g, user.passwordExpiresInDays),
                    headers: profile.recipients.readReceipt ? {
                        'Disposition-Notification-To': smtpCfg.fromEmail,
                        'Return-Receipt-To': smtpCfg.fromEmail
                    } : {}
                };

                await transporter.sendMail(mailOptions);
                fileLog('success', `DELIVERY_OK: ${user.userPrincipalName}`);
                
                // Atomic Audit Record
                const history = readJsonSafe(HISTORY_FILE, []);
                history.push({
                    timestamp: new Date().toISOString(),
                    recipient: user.userPrincipalName,
                    profileId: profile.name,
                    status: 'sent'
                });
                writeJsonAtomic(HISTORY_FILE, history.slice(-2000));

                // Anti-Spam / Anti-Flood Buffer (2 Seconds)
                await new Promise(r => setTimeout(r, 2000));
            }
        } finally {
            this.isProcessing = false;
            fileLog('info', `JOB_COMPLETE: ${profile.name}`);
        }
    }
}

const getActiveEnv = () => {
    const envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    let env = envs.find(e => e.active) || envs[0];
    if (!env) {
        env = {
            id: 'default', name: 'Global Controller', active: true,
            graph: { tenantId: '', clientId: '', clientSecret: '', defaultExpiryDays: 90 },
            smtp: { host: '', port: 587, secure: true, username: '', password: '', fromEmail: '' },
            lastValidation: { auth: false, userScope: false, groupScope: false, timestamp: null }
        };
        writeJsonAtomic(ENVIRONMENTS_FILE, [env]);
    }
    return env;
};

// --- API: ROUTES (STRICT JSON) ---
app.get('/api/config', (req, res) => res.json(getActiveEnv()));

app.get('/api/users', async (req, res) => {
    const env = getActiveEnv();
    if (!env.graph.clientId && !process.env.AZURE_CLIENT_ID) return res.json([]);
    
    try {
        const client = new GraphClient(env.graph);
        const users = await client.fetchAll('https://graph.microsoft.com/v1.0/users', {
            '$select': 'id,displayName,userPrincipalName,accountEnabled,passwordPolicies,lastPasswordChangeDateTime,createdDateTime,onPremisesSyncEnabled',
            '$top': 999
        });

        const processed = users.map(u => {
            const isHybrid = u.onPremisesSyncEnabled === true;
            const never = (u.passwordPolicies || "").includes("DisablePasswordExpiration") && !isHybrid;
            let last = u.lastPasswordChangeDateTime || u.createdDateTime;
            let exp = new Date(last);
            exp.setDate(exp.getDate() + (env.graph.defaultExpiryDays || 90));
            return {
                ...u,
                passwordLastSetDateTime: last,
                passwordExpiresInDays: never ? 999 : Math.ceil((exp - new Date()) / 86400000),
                passwordExpiryDate: never ? null : exp.toISOString(),
                neverExpires: never,
                daysSinceLastReset: Math.floor((new Date() - new Date(last)) / 86400000)
            };
        });
        return res.json(processed);
    } catch (e) {
        fileLog('error', 'FETCH_USERS_FAULT', e.message);
        return res.status(500).json({ message: e.message });
    }
});

app.post('/api/validate-permissions', async (req, res) => {
    const cfg = req.body.tenantId ? req.body : getActiveEnv().graph;
    const checks = { auth: false, userScope: false, groupScope: false, timestamp: new Date().toISOString() };
    
    try {
        const client = new GraphClient(cfg);
        const token = await client.getAccessToken();
        checks.auth = true;

        await axios.get('https://graph.microsoft.com/v1.0/users?$top=1', { headers: { Authorization: `Bearer ${token}` } });
        checks.userScope = true;

        await axios.get('https://graph.microsoft.com/v1.0/groups?$top=1', { headers: { Authorization: `Bearer ${token}` } });
        checks.groupScope = true;

        let envs = readJsonSafe(ENVIRONMENTS_FILE, []);
        let active = envs.find(e => e.id === req.body.envId) || envs.find(e => e.active) || envs[0];
        if (active) {
            active.lastValidation = checks;
            writeJsonAtomic(ENVIRONMENTS_FILE, envs);
            fileLog('success', 'VALIDATION_LOCKED: State persistent in context.');
        }

        return res.json({ success: true, checks });
    } catch (e) {
        const msg = e.response?.data?.error_description || e.message;
        fileLog('error', 'PERM_CHECK_FAILED', msg);
        return res.status(401).json({ success: false, checks, message: msg });
    }
});

app.post('/api/verify-group', async (req, res) => {
    const { name } = req.body;
    const env = getActiveEnv();
    try {
        const client = new GraphClient(env.graph);
        const gRes = await client.request(`https://graph.microsoft.com/v1.0/groups`, {
            '$filter': `displayName eq '${name}'`,
            '$select': 'id,displayName'
        });

        if (gRes.data.value.length === 0) return res.status(404).json({ message: `NOT_FOUND: Group '${name}' does not exist in this tenant.` });
        
        const groupId = gRes.data.value[0].id;
        const members = await client.fetchAll(`https://graph.microsoft.com/v1.0/groups/${groupId}/transitiveMembers`, { '$select': 'id' });
        
        return res.json({ success: true, id: groupId, count: members.length });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

app.post('/api/environments', (req, res) => {
    const payload = req.body;
    let envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    
    if (payload.action === 'add') {
        envs.forEach(e => e.active = false);
        envs.push({
            id: Date.now().toString(), name: payload.name, active: true,
            graph: { tenantId: '', clientId: '', clientSecret: '', defaultExpiryDays: 90 },
            smtp: { host: '', port: 587, secure: true, username: '', password: '', fromEmail: '' },
            lastValidation: { auth: false, userScope: false, groupScope: false, timestamp: null }
        });
    } else if (payload.action === 'switch') {
        envs.forEach(e => e.active = e.id === payload.id);
    } else if (payload.action === 'update') {
        let env = envs.find(e => e.id === payload.id);
        if (env) {
            if (payload.graph) env.graph = payload.graph;
            if (payload.smtp) env.smtp = payload.smtp;
        }
    }
    
    writeJsonAtomic(ENVIRONMENTS_FILE, envs);
    return res.json({ success: true });
});

app.get('/api/environments', (req, res) => res.json(readJsonSafe(ENVIRONMENTS_FILE, [])));
app.get('/api/history', (req, res) => res.json(readJsonSafe(HISTORY_FILE, []).reverse()));
app.get('/api/queue', (req, res) => res.json(readJsonSafe(QUEUE_FILE, [])));

app.listen(PORT, () => {
    fileLog('system', `BOOT_MASTER: ${VERSION} online on port ${PORT}`);
});
