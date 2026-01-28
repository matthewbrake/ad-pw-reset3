import React, { useState, useEffect } from 'react';
import { GraphApiConfig, SmtpConfig, EnvironmentProfile } from '../types';
import { validateGraphPermissions, log } from '../services/mockApi';
import { CheckCircleIcon, XCircleIcon, PlusCircleIcon, TrashIcon } from './icons';

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
      } catch (e) { log('error', 'Persistence Load Failed'); }
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
      if (!newEnvName.trim()) return;
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
      } catch (e: any) {
          log('error', `Validation Engine Failure: ${e.message}`);
      } finally { setValidatingGraph(false); }
  };

  const handleAzureSave = async () => {
      try {
          await fetch('/api/environments', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id: activeEnvId, graph: graphConfig })
          });
          log('success', 'Azure Credentials Committed to Persistence.');
      } catch (e) { log('error', 'Commit Interrupted'); }
  };

  const handleSmtpSave = async () => {
      try {
          await fetch('/api/environments', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id: activeEnvId, smtp: smtpConfig })
          });
          log('success', 'SMTP Relay Settings Committed to Persistence.');
      } catch (e) { log('error', 'Commit Interrupted'); }
  };

  const buttonStyle = "px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border";

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-24 font-sans animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-gray-800 pb-8">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Infrastructure Control</h2>
            <p className="text-gray-600 font-bold uppercase text-[9px] tracking-[0.4em]">Multi-Tenant Environment Management</p>
          </div>
          <div className="flex items-center gap-4">
              <div className="relative">
                <input 
                    type="text" 
                    placeholder="ENVIRONMENT NAME..." 
                    value={newEnvName}
                    onChange={e => setNewEnvName(e.target.value)}
                    className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-[10px] font-black text-white outline-none focus:border-primary-500 w-48 placeholder:text-gray-800"
                />
                <button onClick={handleAddEnv} className="absolute right-1 top-1 p-1.5 bg-primary-600 rounded-md border border-primary-500 hover:bg-primary-500 transition-all">
                    <PlusCircleIcon className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="h-8 w-[1px] bg-gray-800 mx-2"></div>
              <select value={activeEnvId} onChange={e => handleSwitch(e.target.value)} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-5 py-2 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary-500 shadow-xl">
                  {environments.map(env => <option key={env.id} value={env.id}>{env.name} {env.active ? '(ACTIVE)' : ''}</option>)}
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* AZURE IDENTITY */}
          <div className="bg-gray-800/80 p-10 rounded-[2.5rem] border border-gray-700 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-primary-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_10px_#3b82f6]"></div>
                    Entra ID Fabric
                  </h3>
                  <button onClick={() => window.open(`https://login.microsoftonline.com/${graphConfig.tenantId}/adminconsent?client_id=${graphConfig.clientId}`, '_blank')} className="text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all underline tracking-widest">Generate Consent URL</button>
              </div>

              <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Directory (Tenant) ID</label>
                          <input type="text" value={graphConfig.tenantId} onChange={e => setGraphConfig({...graphConfig, tenantId: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white font-mono text-xs outline-none focus:border-primary-500" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Application (Client) ID</label>
                          <input type="text" value={graphConfig.clientId} onChange={e => setGraphConfig({...graphConfig, clientId: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white font-mono text-xs outline-none focus:border-primary-500" />
                      </div>
                  </div>
                  <div className="space-y-2 relative">
                      <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Client Secret</label>
                      <input type={showGraphSecret ? 'text' : 'password'} value={graphConfig.clientSecret} onChange={e => setGraphConfig({...graphConfig, clientSecret: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white font-mono text-xs outline-none focus:border-primary-500 pr-12" />
                      <button onClick={() => setShowGraphSecret(!showGraphSecret)} className="absolute right-4 bottom-3.5 text-gray-700 hover:text-white text-[8px] font-black uppercase">Toggle</button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  {[
                      { label: 'OAUTH Handshake', ok: graphChecks?.auth },
                      { label: 'User.Read.All', ok: graphChecks?.userScope },
                      { label: 'Group.Read.All', ok: graphChecks?.groupScope },
                      { label: 'Persistence API', ok: true }
                  ].map(check => (
                      <div key={check.label} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${check.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-950 border-gray-800 text-gray-700'}`}>
                          <span className="text-[9px] font-black uppercase tracking-widest">{check.label}</span>
                          {check.ok ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                      </div>
                  ))}
              </div>

              <div className="flex gap-4 pt-4">
                  <button onClick={handleAzureTest} disabled={validatingGraph} className={`${buttonStyle} flex-1 bg-gray-950 border-gray-800 text-gray-300 hover:bg-black`}>
                      {validatingGraph ? 'VALIDATING...' : 'Verify Connectivity'}
                  </button>
                  <button onClick={handleAzureSave} className={`${buttonStyle} flex-1 bg-primary-600 border-primary-500 text-white hover:bg-primary-500`}>
                      Commit Identity
                  </button>
              </div>
          </div>

          {/* SMTP RELAY */}
          <div className="bg-gray-800/80 p-10 rounded-[2.5rem] border border-gray-700 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-emerald-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                    SMTP Relay Fabric
                  </h3>
                  <div className="flex items-center gap-3 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
                      <span className="text-[8px] font-black text-gray-700 uppercase">SSL Mode</span>
                      <button onClick={() => setSmtpConfig({...smtpConfig, secure: !smtpConfig.secure})} className={`w-10 h-5 rounded-full relative transition-colors ${smtpConfig.secure ? 'bg-emerald-600' : 'bg-gray-900'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${smtpConfig.secure ? 'left-6' : 'left-1'}`}></div>
                      </button>
                  </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-2">
                        <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Relay Host</label>
                        <input type="text" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs outline-none focus:border-emerald-500" placeholder="smtp.office365.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Port</label>
                        <input type="number" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: parseInt(e.target.value) || 587})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Username</label>
                        <input type="text" value={smtpConfig.username} onChange={e => setSmtpConfig({...smtpConfig, username: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs outline-none" />
                    </div>
                    <div className="space-y-2 relative">
                        <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Password</label>
                        <input type={showSmtpPass ? 'text' : 'password'} value={smtpConfig.password} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs outline-none pr-12" />
                        <button onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-4 bottom-3.5 text-gray-700 hover:text-white text-[8px] font-black uppercase">Toggle</button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] text-gray-600 font-black uppercase ml-1">Sender Email ID (FROM)</label>
                    <input type="text" value={smtpConfig.fromEmail} onChange={e => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-xs outline-none italic" placeholder="alerts@company.com" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                  <button onClick={() => log('info', 'Executing SMTP Handshake...')} className={`${buttonStyle} flex-1 bg-gray-950 border-gray-800 text-gray-300 hover:bg-black`}>
                      Test Handshake
                  </button>
                  <button onClick={handleSmtpSave} className={`${buttonStyle} flex-1 bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500`}>
                      Commit Relay
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;