import React, { useState, useEffect } from 'react';
import { GraphApiConfig, SmtpConfig, EnvironmentProfile } from '../types';
import { validateGraphPermissions, log } from '../services/mockApi';
import { CheckCircleIcon, XCircleIcon, PlusCircleIcon, SettingsIcon } from './icons';

const Settings: React.FC = () => {
  const [environments, setEnvironments] = useState<EnvironmentProfile[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string>('');
  const [newEnvName, setNewEnvName] = useState<string>('');
  const [showGraphSecret, setShowGraphSecret] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [graphConfig, setGraphConfig] = useState<GraphApiConfig>({
    tenantId: '', clientId: '', clientSecret: '', defaultExpiryDays: 90
  });

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '', port: 587, secure: true, username: '', password: '', fromEmail: ''
  });

  const [validatingGraph, setValidatingGraph] = useState(false);
  const [graphChecks, setGraphChecks] = useState<any>(null);

  const loadEnvs = async () => {
      try {
          const res = await fetch('/api/environments');
          const data = await res.json();
          setEnvironments(data);
          const active = data.find((e: any) => e.active) || data[0];
          if (active) {
              setActiveEnvId(active.id);
              setGraphConfig(active.graph);
              setSmtpConfig(active.smtp);
          }
      } catch (e) { log('error', 'Environment Sync Failed'); }
  };

  useEffect(() => { loadEnvs(); }, []);

  const handleSwitch = async (id: string) => {
      await fetch('/api/environments', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id, action: 'switch' })
      });
      loadEnvs();
  };

  const handleAddEnv = async () => {
      if (!newEnvName) return;
      await fetch('/api/environments', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name: newEnvName, action: 'add' })
      });
      setNewEnvName('');
      loadEnvs();
  };

  const handleAzureTest = async () => {
      setValidatingGraph(true);
      setGraphChecks(null);
      try {
          const res = await validateGraphPermissions(graphConfig);
          setGraphChecks(res.checks || {});
      } finally { setValidatingGraph(false); }
  };

  const handleAzureSave = async () => {
      try {
          await fetch('/api/environments', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id: activeEnvId, graph: graphConfig })
          });
          log('success', 'Azure Credentials Committed to JSON.');
      } catch (e) { log('error', 'Commit Interrupted'); }
  };

  const handleSmtpSave = async () => {
      try {
          await fetch('/api/environments', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id: activeEnvId, smtp: smtpConfig })
          });
          log('success', 'Relay Settings Committed to JSON.');
      } catch (e) { log('error', 'Commit Interrupted'); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 font-sans animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                Infrastructure Control
            </h2>
            <p className="text-gray-600 font-bold uppercase text-[9px] tracking-[0.4em]">Enterprise Persistence Engine</p>
          </div>
          <div className="flex items-center gap-4">
              <input 
                type="text" 
                placeholder="PROFILE NAME..." 
                value={newEnvName}
                onChange={e => setNewEnvName(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-[10px] font-black text-white outline-none focus:border-primary-500 w-40"
              />
              <button onClick={handleAddEnv} className="p-2 bg-primary-600 rounded-lg border border-primary-500 hover:bg-primary-500 transition-all shadow-lg">
                  <PlusCircleIcon className="w-5 h-5 text-white" />
              </button>
              <div className="h-8 w-[1px] bg-gray-800 mx-2"></div>
              <select value={activeEnvId} onChange={e => handleSwitch(e.target.value)} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary-500 shadow-xl">
                  {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* AZURE IDENTITY */}
          <div className="bg-gray-800 p-10 rounded-[2rem] border border-gray-700 shadow-2xl space-y-8 relative overflow-hidden group">
              <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-primary-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_10px_#3b82f6]"></div>
                    Entra ID Authority
                  </h3>
                  <button onClick={() => window.open(`https://login.microsoftonline.com/${graphConfig.tenantId}/adminconsent?client_id=${graphConfig.clientId}`, '_blank')} className="bg-gray-900 px-4 py-2 rounded border border-gray-800 text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all">Grant Consent</button>
              </div>

              <div className="space-y-5">
                  <div className="space-y-1">
                      <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Tenant ID</label>
                      <input type="text" value={graphConfig.tenantId} onChange={e => setGraphConfig({...graphConfig, tenantId: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-lg p-4 text-white font-mono text-xs outline-none focus:border-primary-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Client ID</label>
                      <input type="text" value={graphConfig.clientId} onChange={e => setGraphConfig({...graphConfig, clientId: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-lg p-4 text-white font-mono text-xs outline-none focus:border-primary-500 transition-all" />
                  </div>
                  <div className="space-y-1 relative">
                      <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Client Secret</label>
                      <input type={showGraphSecret ? 'text' : 'password'} value={graphConfig.clientSecret} onChange={e => setGraphConfig({...graphConfig, clientSecret: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-lg p-4 text-white font-mono text-xs outline-none focus:border-primary-500 transition-all pr-12" />
                      <button onClick={() => setShowGraphSecret(!showGraphSecret)} className="absolute right-4 bottom-3.5 text-gray-700 hover:text-gray-400 text-[8px] font-black uppercase">View</button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  {[
                      { label: 'Connectivity', ok: graphChecks?.connectivity },
                      { label: 'User.Read.All', ok: graphChecks?.userScope },
                      { label: 'Group.Read.All', ok: graphChecks?.groupScope },
                      { label: 'Token Auth', ok: graphChecks?.auth }
                  ].map(check => (
                      <div key={check.label} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${check.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-700'}`}>
                          <span className="text-[9px] font-black uppercase tracking-widest">{check.label}</span>
                          {check.ok ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                      </div>
                  ))}
              </div>

              <div className="flex gap-4">
                  <button onClick={handleAzureTest} disabled={validatingGraph} className="flex-1 py-3.5 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl">
                      {validatingGraph ? 'VALIDATING...' : 'TEST AUTH FLOW'}
                  </button>
                  <button onClick={handleAzureSave} className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl">
                      COMMIT IDENTITY
                  </button>
              </div>
          </div>

          {/* SMTP RELAY */}
          <div className="bg-gray-800 p-10 rounded-[2rem] border border-gray-700 shadow-2xl space-y-8 relative overflow-hidden">
              <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                    SMTP Delivery Relay
                  </h3>
                  <div className="flex items-center gap-3 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-gray-800">
                      <span className="text-[8px] font-black text-gray-600 uppercase">SSL Mode</span>
                      <button onClick={() => setSmtpConfig({...smtpConfig, secure: !smtpConfig.secure})} className={`w-10 h-5 rounded-full relative transition-colors ${smtpConfig.secure ? 'bg-emerald-600' : 'bg-gray-900'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${smtpConfig.secure ? 'left-6' : 'left-1'}`}></div>
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3 space-y-1">
                      <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Relay Host</label>
                      <input type="text" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-lg p-4 text-white text-xs outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Port</label>
                      <input type="number" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: parseInt(e.target.value) || 587})} className="w-full bg-[#0f172a] border-gray-800 rounded-lg p-4 text-white text-xs outline-none focus:border-emerald-500 transition-all" />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Username</label>
                      <input type="text" value={smtpConfig.username} onChange={e => setSmtpConfig({...smtpConfig, username: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-lg p-4 text-white text-xs outline-none" />
                  </div>
                  <div className="space-y-1 relative">
                      <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Password</label>
                      <input type={showSmtpPass ? 'text' : 'password'} value={smtpConfig.password} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-lg p-4 text-white text-xs outline-none pr-12" />
                      <button onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-4 bottom-3.5 text-gray-700 hover:text-gray-400 text-[8px] font-black uppercase">View</button>
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Sender ID (From)</label>
                  <input type="text" value={smtpConfig.fromEmail} onChange={e => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-lg p-4 text-white text-xs outline-none italic" placeholder="alerts@company.com" />
              </div>

              <div className="flex gap-4">
                  <button onClick={() => {}} className="flex-1 py-3.5 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl">
                      TEST HANDSHAKE
                  </button>
                  <button onClick={handleSmtpSave} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl">
                      COMMIT RELAY
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;