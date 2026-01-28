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
const VERSION = "v2.8.0 Enterprise";

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATA PERSISTENCE LAYER ---
const DATA_ROOT = path.join(__dirname, 'data');
const CONFIG_DIR = path.join(DATA_ROOT, 'config');
const LOGS_DIR = path.join(DATA_ROOT, 'logs');

[DATA_ROOT, CONFIG_DIR, LOGS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ENVIRONMENTS_FILE = path.join(CONFIG_DIR, 'environments.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');

const writeJsonAtomic = (filePath, data) => {
    const tempPath = `${filePath}.${Date.now()}.tmp`;
    try {
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tempPath, filePath);
        fileLog('system', `IO_WRITE_SUCCESS: ${path.basename(filePath)}`);
    } catch (e) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        fileLog('error', `IO_WRITE_FAILED: ${path.basename(filePath)}`, e.message);
        throw e;
    }
};

const readJsonSafe = (filePath, defaultValue = []) => {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        return content ? JSON.parse(content) : defaultValue;
    } catch (e) { return defaultValue; }
};

const fileLog = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    process.stdout.write(logLine);
    try { fs.appendFileSync(path.join(LOGS_DIR, `system.log`), logLine); } catch (e) {}
};

// --- CORE ENGINE ---
const getActiveEnv = () => {
    const envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    return envs.find(e => e.active) || envs[0];
};

app.get('/api/config', (req, res) => {
    const env = getActiveEnv();
    if (!env) return res.json({});
    res.json({ ...env.graph, smtp: env.smtp });
});

app.post('/api/config', (req, res) => {
    const payload = req.body;
    let envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    let activeIdx = envs.findIndex(e => e.active);
    if (activeIdx === -1) activeIdx = 0;
    
    if (envs[activeIdx]) {
        envs[activeIdx].graph = {
            tenantId: payload.tenantId,
            clientId: payload.clientId,
            clientSecret: payload.clientSecret,
            defaultExpiryDays: payload.defaultExpiryDays
        };
        envs[activeIdx].smtp = payload.smtp;
        writeJsonAtomic(ENVIRONMENTS_FILE, envs);
    }
    res.json({ success: true });
});

app.get('/api/users', async (req, res) => {
    try {
        const env = getActiveEnv();
        const cfg = env?.graph;
        if (!cfg?.clientId) {
            fileLog('warn', 'Sync attempted with no ClientID configured.');
            return res.json([]);
        }
        
        fileLog('info', 'Contacting Entra ID Authority...');
        const auth = await axios.post(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, new URLSearchParams({
            client_id: cfg.clientId,
            scope: 'https://graph.microsoft.com/.default',
            client_secret: cfg.clientSecret,
            grant_type: 'client_credentials'
        }));
        
        const response = await axios.get('https://graph.microsoft.com/v1.0/users', {
            headers: { Authorization: `Bearer ${auth.data.access_token}` },
            params: { '$select': 'id,displayName,userPrincipalName,accountEnabled,passwordPolicies,lastPasswordChangeDateTime,createdDateTime,onPremisesSyncEnabled', '$top': 999 }
        });

        const now = new Date();
        const data = response.data.value.map(u => {
            const isHybrid = u.onPremisesSyncEnabled === true;
            const never = (u.passwordPolicies || "").includes("DisablePasswordExpiration") && !isHybrid;
            let last = u.lastPasswordChangeDateTime || u.createdDateTime;
            
            let exp = new Date(last);
            exp.setDate(exp.getDate() + (cfg.defaultExpiryDays || 90));
            const diff = Math.ceil((exp - now) / 86400000);
            const resetDiff = Math.floor((now - new Date(last)) / 86400000);

            return { 
                ...u, 
                passwordLastSetDateTime: last, 
                passwordExpiresInDays: never ? 999 : diff, 
                passwordExpiryDate: never ? null : exp.toISOString(), 
                neverExpires: never,
                daysSinceLastReset: resetDiff
            };
        });
        fileLog('success', `Identity Fabric Synchronized: ${data.length} records.`);
        res.json(data);
    } catch (e) {
        fileLog('error', 'Entra ID Sync Failed', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/validate-permissions', async (req, res) => {
    const env = getActiveEnv();
    const cfg = env?.graph;
    const checks = { connectivity: false, auth: false, userScope: false, groupScope: false };
    try {
        fileLog('info', 'Validating Security Scopes...');
        const authRes = await axios.post(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, new URLSearchParams({
            client_id: cfg.clientId,
            scope: 'https://graph.microsoft.com/.default',
            client_secret: cfg.clientSecret,
            grant_type: 'client_credentials'
        }), { timeout: 5000 });
        checks.auth = true; checks.connectivity = true;
        fileLog('success', 'Token Acquisition Success');
        
        const token = authRes.data.access_token;
        try { 
            await axios.get('https://graph.microsoft.com/v1.0/users?$top=1', { headers: { Authorization: `Bearer ${token}` } }); 
            checks.userScope = true; 
            fileLog('success', 'User.Read.All Scope Verified');
        } catch (e) { fileLog('error', 'User Scope Denied'); }
        
        try { 
            await axios.get('https://graph.microsoft.com/v1.0/groups?$top=1', { headers: { Authorization: `Bearer ${token}` } }); 
            checks.groupScope = true; 
            fileLog('success', 'Group.Read.All Scope Verified');
        } catch (e) { fileLog('error', 'Group Scope Denied'); }
        
        res.json({ success: checks.userScope, checks });
    } catch (e) { 
        fileLog('error', 'Permission Validation Engine Error', e.message);
        res.status(500).json({ success: false, checks, message: e.message }); 
    }
});

app.get('/api/environments', (req, res) => res.json(readJsonSafe(ENVIRONMENTS_FILE, [])));
app.post('/api/environments', (req, res) => {
    const payload = req.body;
    let envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    
    if (payload.action === 'add') {
        envs.forEach(e => e.active = false);
        envs.push({
            id: Date.now().toString(),
            name: payload.name || 'New Profile',
            active: true,
            graph: { tenantId: '', clientId: '', clientSecret: '', defaultExpiryDays: 90 },
            smtp: { host: '', port: 587, secure: true, username: '', password: '', fromEmail: '' }
        });
        fileLog('system', `Created Environment: ${payload.name}`);
    } else if (payload.action === 'switch') {
        envs.forEach(e => e.active = e.id === payload.id);
        fileLog('system', `Switched Environment Context to ID: ${payload.id}`);
    } else {
        let env = envs.find(e => e.id === payload.id);
        if (env) {
            if (payload.graph) env.graph = payload.graph;
            if (payload.smtp) env.smtp = payload.smtp;
        }
    }
    
    writeJsonAtomic(ENVIRONMENTS_FILE, envs);
    res.json({ success: true });
});

app.listen(PORT, () => fileLog('system', `${VERSION} ONLINE | PORT: ${PORT}`));