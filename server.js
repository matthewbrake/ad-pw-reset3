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
const VERSION = "v2.7.0 Enterprise";

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
    } catch (e) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
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
const getActiveConfig = () => {
    const envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    const active = envs.find(e => e.active);
    if (active) return { ...active.graph, smtp: active.smtp };
    return {
        tenantId: process.env.AZURE_TENANT_ID || '',
        clientId: process.env.AZURE_CLIENT_ID || '',
        clientSecret: process.env.AZURE_CLIENT_SECRET || '',
        defaultExpiryDays: 90,
        smtp: {
            host: process.env.SMTP_HOST || '',
            port: 587,
            secure: true,
            username: process.env.SMTP_USERNAME || '',
            password: process.env.SMTP_PASSWORD || '',
            fromEmail: process.env.SMTP_FROM || ''
        }
    };
};

app.get('/api/users', async (req, res) => {
    try {
        const cfg = getActiveConfig();
        if (!cfg.clientId) return res.json([]);
        
        fileLog('info', 'Executing Entra ID Principal Synchronization...');
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
        fileLog('success', `Synchronized ${data.length} principals.`);
        res.json(data);
    } catch (e) {
        fileLog('error', 'Fabric Sync Failed', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/validate-permissions', async (req, res) => {
    const cfg = getActiveConfig();
    const checks = { connectivity: false, auth: false, userScope: false, groupScope: false };
    try {
        const authRes = await axios.post(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, new URLSearchParams({
            client_id: cfg.clientId,
            scope: 'https://graph.microsoft.com/.default',
            client_secret: cfg.clientSecret,
            grant_type: 'client_credentials'
        }), { timeout: 5000 });
        checks.auth = true; checks.connectivity = true;
        const token = authRes.data.access_token;
        try { await axios.get('https://graph.microsoft.com/v1.0/users?$top=1', { headers: { Authorization: `Bearer ${token}` } }); checks.userScope = true; } catch (e) {}
        try { await axios.get('https://graph.microsoft.com/v1.0/groups?$top=1', { headers: { Authorization: `Bearer ${token}` } }); checks.groupScope = true; } catch (e) {}
        res.json({ success: checks.userScope, checks });
    } catch (e) { res.status(500).json({ success: false, checks, message: e.message }); }
});

app.get('/api/environments', (req, res) => res.json(readJsonSafe(ENVIRONMENTS_FILE, [])));
app.post('/api/environments', (req, res) => {
    const payload = req.body;
    let envs = readJsonSafe(ENVIRONMENTS_FILE, []);
    let env = envs.find(e => e.id === payload.id);
    if (!env) {
        env = { id: payload.id, name: 'Default', active: true, graph: {}, smtp: {} };
        envs.push(env);
    }
    envs = envs.map(e => ({ ...e, active: e.id === payload.id }));
    if (payload.graph) env.graph = payload.graph;
    if (payload.smtp) env.smtp = payload.smtp;
    writeJsonAtomic(ENVIRONMENTS_FILE, envs);
    res.json({ success: true });
});

app.listen(PORT, () => fileLog('system', `${VERSION} ONLINE | PORT: ${PORT}`));