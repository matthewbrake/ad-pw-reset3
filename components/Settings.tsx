import React, { useState, useEffect } from 'react';
import { GraphApiConfig, SmtpConfig, EnvironmentProfile } from '../types';
import { validateGraphPermissions, log } from '../services/mockApi';
import { CheckCircleIcon, XCircleIcon, AzureIcon, PlusCircleIcon, SettingsIcon } from './icons';

const Settings: React.FC = () => {
  const [environments, setEnvironments] = useState<EnvironmentProfile[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string>('default');
  const [showGraphSecret, setShowGraphSecret] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [graphConfig, setGraphConfig] = useState<GraphApiConfig>({
    tenantId: '', clientId: '', clientSecret: '', defaultExpiryDays: 90
  });

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '', port: 587, secure: true, username: '', password: '', fromEmail: ''
  });

  const [validatingGraph, setValidatingGraph] = useState(false);
  const [validatingSmtp, setValidatingSmtp] = useState(false);
  const [graphChecks, setGraphChecks] = useState<any>(null);

  useEffect(() => {
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
      loadEnvs();
  }, []);

  const handleAzureTest = async () => {
      setValidatingGraph(true);
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
              body: JSON.stringify({ id: activeEnvId, graph: graphConfig, type: 'azure' })
          });
          log('success', 'Azure Identity Credentials Committed.');
      } catch (e) { log('error', 'Azure Save Error'); }
  };

  const handleSmtpTest = async () => {
      setValidatingSmtp(true);
      try {
          const res = await fetch('/api/test-email', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ email: smtpConfig.fromEmail, subject: 'SMTP RELAY TEST', body: 'Handshake Successful.' })
          });
          if (res.ok) log('success', 'SMTP Handshake Confirmed');
          else throw new Error();
      } catch (e) { log('error', 'SMTP Relay Rejected'); }
      finally { setValidatingSmtp(false); }
  };

  const handleSmtpSave = async () => {
      try {
          await fetch('/api/environments', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ id: activeEnvId, smtp: smtpConfig, type: 'smtp' })
          });
          log('success', 'SMTP Relay settings Committed.');
      } catch (e) { log('error', 'SMTP Save Error'); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32 font-sans animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-gray-800 pb-8">
          <div className="space-y-2">
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                Infrastructure Control
            </h2>
            <p className="text-gray-600 font-black uppercase text-[11px] tracking-[0.5em]">Enterprise Environment Management</p>
          </div>
          <div className="flex items-center gap-6">
              <select value={activeEnvId} onChange={e => setActiveEnvId(e.target.value)} className="bg-gray-800 border-gray-700 text-white rounded-xl px-6 py-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-primary-500 shadow-2xl">
                  {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
              </select>
              <button className="p-3 bg-gray-800 rounded-xl border border-gray-700 hover:bg-gray-700 transition-all">
                  <PlusCircleIcon className="w-6 h-6 text-gray-400" />
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* AZURE IDENTITY */}
          <div className="bg-gray-800 p-12 rounded-[2.5rem] border border-gray-700 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-primary-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary-500 shadow-[0_0_15px_#3b82f6]"></div>
                    Entra ID Authority
                  </h3>
                  <button onClick={() => window.open(`https://login.microsoftonline.com/${graphConfig.tenantId}/adminconsent?client_id=${graphConfig.clientId}`, '_blank')} className="bg-gray-900 px-5 py-2.5 rounded-lg border border-gray-800 text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all shadow-xl">Grant Consent URL</button>
              </div>

              <div className="space-y-6">
                  <div className="space-y-2">
                      <label className="text-[10px] text-gray-600 font-black uppercase ml-1">Tenant ID</label>
                      <input type="text" value={graphConfig.tenantId} onChange={e => setGraphConfig({...graphConfig, tenantId: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-xl p-5 text-white font-mono text-sm outline-none focus:border-primary-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] text-gray-600 font-black uppercase ml-1">Client ID</label>
                      <input type="text" value={graphConfig.clientId} onChange={e => setGraphConfig({...graphConfig, clientId: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-xl p-5 text-white font-mono text-sm outline-none focus:border-primary-500 transition-all" />
                  </div>
                  <div className="space-y-2 relative">
                      <label className="text-[10px] text-gray-600 font-black uppercase ml-1">Client Secret</label>
                      <input type={showGraphSecret ? 'text' : 'password'} value={graphConfig.clientSecret} onChange={e => setGraphConfig({...graphConfig, clientSecret: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-xl p-5 text-white font-mono text-sm outline-none focus:border-primary-500 transition-all pr-16" />
                      <button onClick={() => setShowGraphSecret(!showGraphSecret)} className="absolute right-6 bottom-5 text-gray-600 hover:text-gray-400 font-black text-[9px] uppercase">Toggle</button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${graphChecks?.auth ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-600'} flex items-center justify-between transition-all`}>
                      <span className="text-[10px] font-black uppercase tracking-widest italic">Token Flow</span>
                      {graphChecks?.auth ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                  </div>
                  <div className={`p-4 rounded-xl border ${graphChecks?.userScope ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-600'} flex items-center justify-between transition-all`}>
                      <span className="text-[10px] font-black uppercase tracking-widest italic">User Scope</span>
                      {graphChecks?.userScope ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                  </div>
              </div>

              <div className="flex gap-4">
                  <button onClick={handleAzureTest} disabled={validatingGraph} className="flex-1 py-4 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all shadow-xl">
                      {validatingGraph ? 'VALIDATING...' : 'VERIFY CONNECTION'}
                  </button>
                  <button onClick={handleAzureSave} className="flex-1 py-4 bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all shadow-2xl">
                      COMMIT IDENTITY
                  </button>
              </div>
          </div>

          {/* SMTP RELAY */}
          <div className="bg-gray-800 p-12 rounded-[2.5rem] border border-gray-700 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-emerald-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]"></div>
                    SMTP Delivery Relay
                  </h3>
                  <div className="flex items-center gap-4 bg-[#0f172a] px-4 py-2 rounded-xl border border-gray-800 shadow-inner">
                      <span className="text-[9px] font-black text-gray-600 uppercase">SSL / TLS</span>
                      <button onClick={() => setSmtpConfig({...smtpConfig, secure: !smtpConfig.secure})} className={`w-12 h-6 rounded-full relative transition-colors ${smtpConfig.secure ? 'bg-emerald-600' : 'bg-gray-900'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${smtpConfig.secure ? 'left-7' : 'left-1'}`}></div>
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-4 gap-6">
                  <div className="col-span-3 space-y-2">
                      <label className="text-[10px] text-gray-600 font-black uppercase ml-1">Relay Host</label>
                      <input type="text" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-xl p-5 text-white text-sm outline-none" placeholder="smtp.office365.com" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] text-gray-600 font-black uppercase ml-1">Port</label>
                      <input type="number" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: parseInt(e.target.value) || 587})} className="w-full bg-[#0f172a] border-gray-800 rounded-xl p-5 text-white text-sm outline-none" />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-[10px] text-gray-600 font-black uppercase ml-1">Auth Principal</label>
                      <input type="text" value={smtpConfig.username} onChange={e => setSmtpConfig({...smtpConfig, username: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-xl p-5 text-white text-sm outline-none" />
                  </div>
                  <div className="space-y-2 relative">
                      <label className="text-[10px] text-gray-600 font-black uppercase ml-1">Auth Secret</label>
                      <input type={showSmtpPass ? 'text' : 'password'} value={smtpConfig.password} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-xl p-5 text-white text-sm outline-none pr-16" />
                      <button onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-6 bottom-5 text-gray-600 hover:text-gray-400 font-black text-[9px] uppercase">Toggle</button>
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 font-black uppercase ml-1">Sender Email ID</label>
                  <input type="text" value={smtpConfig.fromEmail} onChange={e => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})} className="w-full bg-[#0f172a] border-gray-800 rounded-xl p-5 text-white text-sm outline-none italic" placeholder="alerts@company.com" />
              </div>

              <div className="flex gap-4">
                  <button onClick={handleSmtpTest} disabled={validatingSmtp} className="flex-1 py-4 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all shadow-xl">
                      {validatingSmtp ? 'HANDSHAKING...' : 'TEST RELAY'}
                  </button>
                  <button onClick={handleSmtpSave} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all shadow-2xl">
                      COMMIT RELAY
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;