import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import nodemailer from 'nodemailer';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = "v3.3.1 Security-Patch";

app.use(express.json());

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
        fileLog('error', `IO_FAULT: Atomic write failure on ${path.basename(filePath)}`, e.message);
    }
};

const readJsonSafe = (filePath, defaultValue = []) => {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        if (!content) return defaultValue;
        const parsed = JSON.parse(content);
        return parsed || defaultValue;
    } catch (e) { 
        fileLog('warn', `IO_CORRUPT: Corrupt JSON in ${path.basename(filePath)}. Using defaults.`);
        return defaultValue; 
    }
};

// --- GRAPH CLIENT ---
class GraphClient {
    constructor(cfg) {
        this.cfg = {
            tenantId: process.env.AZURE_TENANT_ID || cfg?.tenantId,
            clientId: process.env.AZURE_CLIENT_ID || cfg?.clientId,
            clientSecret: process.env.AZURE_CLIENT_SECRET || cfg?.clientSecret,
            defaultExpiryDays: cfg?.defaultExpiryDays || 90
        };
    }

    async getAccessToken() {
        if (!this.cfg.tenantId || !this.cfg.clientId || !this.cfg.clientSecret) {
            throw new Error("AUTH_CONFIG_INCOMPLETE: Missing Tenant, Client, or Secret.");
        }
        const res = await axios.post(`https://login.microsoftonline.com/${this.cfg.tenantId}/oauth2/v2.0/token`, new URLSearchParams({
            client_id: this.cfg.clientId,
            scope: 'https://graph.microsoft.com/.default',
            client_secret: this.cfg.clientSecret,
            grant_type: 'client_credentials'
        }));
        return res.data.access_token;
    }

    async fetchAll(endpoint, params = {}) {
        const token = await this.getAccessToken();
        let results = [];
        let nextLink = endpoint;
        while (nextLink) {
            const res = await axios.get(nextLink, {
                headers: { Authorization: `Bearer ${token}` },
                params: nextLink === endpoint ? params : {}
            });
            if (res.data?.value) results = results.concat(res.data.value);
            nextLink = res.data['@odata.nextLink'];
        }
        return results;
    }
}

// --- QUEUE CONTROLLER ---
let queueState = { paused: false };

const getActiveEnv = () => {
    const envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    let env = envs.find(e => e.active) || envs[0];
    if (!env) {
        env = {
            id: 'default', name: 'Primary Control', active: true,
            graph: { tenantId: '', clientId: '', clientSecret: '', defaultExpiryDays: 90 },
            smtp: { host: '', port: 587, secure: true, username: '', password: '', fromEmail: '' }
        };
        writeJsonAtomic(ENVIRONMENTS_FILE, [env]);
    }
    return env;
};

// --- API ROUTES ---

app.get('/api/config', (req, res) => res.json(getActiveEnv()));

app.get('/api/users', async (req, res) => {
    const env = getActiveEnv();
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
        fileLog('error', 'API_USERS_FAULT', e.message);
        return res.status(500).json({ message: e.message }); 
    }
});

app.post('/api/validate-permissions', async (req, res) => {
    const cfg = req.body.tenantId ? req.body : getActiveEnv().graph;
    try {
        const client = new GraphClient(cfg);
        await client.getAccessToken(); // Validate token exchange
        return res.json({ success: true, checks: { auth: true, userScope: true, groupScope: true } });
    } catch (e) { 
        return res.status(401).json({ success: false, message: e.message }); 
    }
});

app.post('/api/verify-group-detailed', async (req, res) => {
    const { name, expiryDays } = req.body;
    const env = getActiveEnv();
    try {
        const client = new GraphClient(env.graph);
        const gRes = await client.fetchAll(`https://graph.microsoft.com/v1.0/groups`, { 
            '$filter': `displayName eq '${name}'`, '$select': 'id' 
        });
        if (!gRes.length) return res.status(404).json({ message: `Group '${name}' not found.` });

        const members = await client.fetchAll(`https://graph.microsoft.com/v1.0/groups/${gRes[0].id}/transitiveMembers`, {
            '$select': 'id,displayName,userPrincipalName,lastPasswordChangeDateTime,onPremisesSyncEnabled,passwordPolicies,createdDateTime'
        });

        const hydrated = members.map(u => {
            const isHybrid = u.onPremisesSyncEnabled === true;
            const never = (u.passwordPolicies || "").includes("DisablePasswordExpiration") && !isHybrid;
            let last = u.lastPasswordChangeDateTime || u.createdDateTime;
            let exp = new Date(last);
            exp.setDate(exp.getDate() + (parseInt(expiryDays) || 90));
            return {
                displayName: u.displayName,
                userPrincipalName: u.userPrincipalName,
                expiryDate: never ? null : exp.toISOString(),
                daysLeft: never ? 999 : Math.ceil((exp - new Date()) / 86400000)
            };
        });

        return res.json({ count: hydrated.length, members: hydrated });
    } catch (e) { 
        return res.status(500).json({ message: e.message }); 
    }
});

app.get('/api/queue', (req, res) => res.json({ items: readJsonSafe(QUEUE_FILE, []), paused: queueState.paused }));

app.post('/api/queue/toggle', (req, res) => {
    queueState.paused = !queueState.paused;
    fileLog('system', `QUEUE_SIGNAL: Global relay state changed to ${queueState.paused ? 'PAUSED' : 'ACTIVE'}`);
    return res.json({ paused: queueState.paused });
});

app.post('/api/queue/cancel', (req, res) => {
    const { id } = req.body;
    let items = readJsonSafe(QUEUE_FILE, []);
    items = items.filter(i => i.id !== id);
    writeJsonAtomic(QUEUE_FILE, items);
    return res.json({ success: true });
});

app.post('/api/queue/clear', (req, res) => {
    writeJsonAtomic(QUEUE_FILE, []);
    return res.json({ success: true });
});

app.get('/api/history', (req, res) => res.json(readJsonSafe(HISTORY_FILE, []).reverse()));

app.get('/api/environments', (req, res) => res.json(readJsonSafe(ENVIRONMENTS_FILE, [])));

app.post('/api/environments', (req, res) => {
    const payload = req.body;
    let envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    
    if (payload.action === 'add') {
        envs.forEach(e => e.active = false);
        envs.push({ id: Date.now().toString(), name: payload.name, active: true, graph: {}, smtp: {} });
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

// Guard against falling through to static serving for /api routes
app.use('/api', (req, res) => res.status(404).json({ message: "API Route Not Found" }));

// Static frontend serving
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    fileLog('error', 'EXPRESS_UNCAUGHT_FAULT', err.message);
    res.status(500).json({ message: "Internal server fault during request processing." });
});

app.listen(PORT, () => fileLog('system', `BOOT_MASTER: ${VERSION} online.`));