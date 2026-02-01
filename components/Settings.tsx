import React, { useState, useEffect } from 'react';
import { GraphApiConfig, SmtpConfig, EnvironmentProfile } from '../types';
import { validateGraphPermissions, log, saveBackendConfig, fetchConfig, fetchEnvironments, switchEnvironment, addEnvironment } from '../services/mockApi';
import { CheckCircleIcon, XCircleIcon, PlusCircleIcon } from './icons';

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
  const [graphChecks, setGraphChecks] = useState<any>({ auth: false, userScope: false, groupScope: false });

  const loadData = async () => {
      try {
          const active = await fetchConfig();
          const envsData = await fetchEnvironments();
          
          setEnvironments(envsData);
          
          if (active) {
              setActiveEnvId(active.id);
              setGraphConfig(active.graph || { tenantId: '', clientId: '', clientSecret: '', defaultExpiryDays: 90 });
              setSmtpConfig(active.smtp || { host: '', port: 587, secure: true, username: '', password: '', fromEmail: '' });
              
              // REHYDRATION: Restore validation states if present
              if ((active as any).lastValidation) {
                  setGraphChecks((active as any).lastValidation);
              }
          }
      } catch (e: any) { 
          log('error', 'CORE_REHYDRATION_FAILED: Check backend connectivity.'); 
      }
  };

  useEffect(() => { loadData(); }, []);

  const handleSwitch = async (id: string) => {
      try {
          await switchEnvironment(id);
          loadData();
          log('info', `CONTEXT_SHIFT: Active environment set to ${id}`);
      } catch (e: any) { log('error', e.message); }
  };

  const handleAdd = async () => {
      if(!newEnvName) return;
      try {
          await addEnvironment(newEnvName);
          setNewEnvName(''); 
          loadData();
          log('success', `ENVIRONMENT_CREATED: ${newEnvName} is now active.`);
      } catch (e: any) { log('error', e.message); }
  };

  const handleAzureTest = async () => {
      setValidatingGraph(true);
      try {
          const res = await validateGraphPermissions(graphConfig, activeEnvId);
          setGraphChecks(res.checks || { auth: false, userScope: false, groupScope: false });
      } catch (e: any) {
          log('error', `VALIDATION_INTERRUPTED: ${e.message}`);
          setGraphChecks({ auth: false, userScope: false, groupScope: false });
      } finally { setValidatingGraph(false); }
  };

  const handleSave = async () => {
      try {
          await saveBackendConfig(graphConfig, smtpConfig, activeEnvId);
          log('success', 'INFRASTRUCTURE_SYNC: Configuration committed.');
          localStorage.setItem('graphApiConfig', JSON.stringify(graphConfig));
          localStorage.setItem('smtpConfig', JSON.stringify(smtpConfig));
      } catch (e: any) { 
          log('error', `SYNC_FAULT: ${e.message}`); 
      }
  };

  const btnClass = "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md border disabled:opacity-50";

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 font-sans animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-gray-800 pb-8">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Mission Control</h2>
            <p className="text-gray-600 font-bold uppercase text-[9px] tracking-[0.4em]">Infrastructure Management & Security Scopes</p>
          </div>
          <div className="flex items-center gap-4">
              <input 
                type="text" 
                placeholder="PROFILE NAME..." 
                value={newEnvName}
                onChange={e => setNewEnvName(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-[10px] font-black text-white outline-none focus:border-primary-500 w-48"
              />
              <button onClick={handleAdd} className="p-2.5 bg-primary-600 rounded-lg hover:bg-primary-500 transition-all shadow-lg shadow-primary-900/20">
                  <PlusCircleIcon className="w-5 h-5 text-white" />
              </button>
              <div className="h-8 w-[1px] bg-gray-800 mx-2"></div>
              <select value={activeEnvId} onChange={e => handleSwitch(e.target.value)} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary-500">
                  {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* ENTRA ID CONFIG */}
          <div className="bg-gray-800/40 p-10 rounded-[2.5rem] border border-gray-700 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                  <h3 className="text-[12px] font-black text-primary-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_12px_#3b82f6] animate-pulse"></div>
                    Entra ID Foundation
                  </h3>
                  <button onClick={() => window.open(`https://login.microsoftonline.com/${graphConfig.tenantId}/adminconsent?client_id=${graphConfig.clientId}`, '_blank')} className="text-[9px] font-black uppercase text-gray-600 hover:text-white transition-all underline tracking-widest">Admin Consent</button>
              </div>

              <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Directory (Tenant) ID</label>
                          <input type="text" value={graphConfig.tenantId || ''} onChange={e => setGraphConfig({...graphConfig, tenantId: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white font-mono text-[11px] outline-none focus:border-primary-500" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Application (Client) ID</label>
                          <input type="text" value={graphConfig.clientId || ''} onChange={e => setGraphConfig({...graphConfig, clientId: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white font-mono text-[11px] outline-none focus:border-primary-500" />
                      </div>
                  </div>
                  <div className="space-y-2 relative">
                      <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Client Secret</label>
                      <input type={showGraphSecret ? 'text' : 'password'} value={graphConfig.clientSecret || ''} onChange={e => setGraphConfig({...graphConfig, clientSecret: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white font-mono text-[11px] outline-none focus:border-primary-500 pr-16" />
                      <button onClick={() => setShowGraphSecret(!showGraphSecret)} className="absolute right-4 bottom-3.5 text-gray-700 hover:text-white text-[9px] font-black uppercase">Toggle</button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  {[
                      { label: 'OAUTH Handshake', ok: graphChecks.auth },
                      { label: 'User Read All', ok: graphChecks.userScope },
                      { label: 'Group Read All', ok: graphChecks.groupScope },
                      { label: 'Fabric Status', ok: graphChecks.auth && graphChecks.userScope && graphChecks.groupScope }
                  ].map(check => (
                      <div key={check.label} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${check.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-950 border-gray-800 text-gray-700'}`}>
                          <span className="text-[9px] font-black uppercase tracking-widest">{check.label}</span>
                          {check.ok ? <CheckCircleIcon className="w-4 h-4 shadow-[0_0_8px_currentColor]" /> : <XCircleIcon className="w-4 h-4" />}
                      </div>
                  ))}
              </div>

              <div className="flex gap-4 pt-4">
                  <button onClick={handleAzureTest} disabled={validatingGraph} className={`${btnClass} flex-1 bg-gray-950 border-gray-700 text-gray-400 hover:text-white`}>
                      {validatingGraph ? 'VALIDATING...' : 'Verify Connectivity'}
                  </button>
                  <button onClick={handleSave} className={`${btnClass} flex-1 bg-primary-600 border-primary-500 text-white hover:bg-primary-500 shadow-xl shadow-primary-900/20`}>
                      Lock In Context
                  </button>
              </div>
          </div>

          {/* SMTP RELAY CONFIG */}
          <div className="bg-gray-800/40 p-10 rounded-[2.5rem] border border-gray-700 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                  <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981]"></div>
                    Notification Relay
                  </h3>
                  <div className="flex items-center gap-3 bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800">
                      <span className="text-[9px] font-black text-gray-600 uppercase">Secure (TLS)</span>
                      <button onClick={() => setSmtpConfig({...smtpConfig, secure: !smtpConfig.secure})} className={`w-10 h-5 rounded-full relative transition-colors ${smtpConfig.secure ? 'bg-emerald-600' : 'bg-gray-900'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${smtpConfig.secure ? 'left-6' : 'left-1'}`}></div>
                      </button>
                  </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-6">
                    <div className="col-span-3 space-y-2">
                        <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">SMTP Host</label>
                        <input type="text" value={smtpConfig.host || ''} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-[11px] outline-none" placeholder="smtp.office365.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Port</label>
                        <input type="number" value={smtpConfig.port || 587} onChange={e => setSmtpConfig({...smtpConfig, port: parseInt(e.target.value) || 587})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-[11px] outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Auth Username</label>
                        <input type="text" value={smtpConfig.username || ''} onChange={e => setSmtpConfig({...smtpConfig, username: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-[11px] outline-none" />
                    </div>
                    <div className="space-y-2 relative">
                        <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Auth Password</label>
                        <input type={showSmtpPass ? 'text' : 'password'} value={smtpConfig.password || ''} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-[11px] outline-none pr-16" />
                        <button onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-4 bottom-3.5 text-gray-700 hover:text-white text-[9px] font-black uppercase">Toggle</button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Sender Email Identity</label>
                    <input type="text" value={smtpConfig.fromEmail || ''} onChange={e => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-[11px] outline-none italic" placeholder="it-alerts@company.com" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                  <button onClick={() => log('info', 'RELAY_PROBE: Test transmission queued.')} className={`${btnClass} flex-1 bg-gray-950 border-gray-700 text-gray-400 hover:text-white`}>
                      Test Relay
                  </button>
                  <button onClick={handleSave} className={`${btnClass} flex-1 bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-xl shadow-emerald-900/20`}>
                      Commit Relay
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;