import React, { useState } from 'react';
import { NotificationProfile } from '../types';
import { log, verifyGroupDetailed } from '../services/mockApi';

interface ProfileEditorProps {
  profile: NotificationProfile | null;
  onSave: (profile: NotificationProfile) => void;
  onClose: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onClose }) => {
  const [formData, setFormData] = useState<NotificationProfile>({
    id: profile?.id || '',
    name: profile?.name || '',
    description: profile?.description || '',
    subjectLine: profile?.subjectLine || 'Action Required: Password Expiry Warning',
    emailTemplate: profile?.emailTemplate || `Hi {{user.displayName}},\n\nYour password for {{user.userPrincipalName}} is set to expire on {{expiryDate}}.\n\nPlease reset it soon.`,
    cadence: profile?.cadence || { daysBefore: [14, 7, 1] },
    recipients: profile?.recipients || { toUser: true, toManager: false, toAdmins: [], readReceipt: false },
    assignedGroups: profile?.assignedGroups || ['All Users'],
    preferredTime: profile?.preferredTime || '',
    status: profile?.status || 'active'
  });

  const [cadenceInput, setCadenceInput] = useState(formData.cadence.daysBefore.join(', '));
  const [groupsInput, setGroupsInput] = useState(formData.assignedGroups.join(', '));
  const [verifying, setVerifying] = useState(false);
  const [previewUsers, setPreviewUsers] = useState<any[]>([]);

  const handleVerify = async () => {
      setVerifying(true);
      setPreviewUsers([]);
      try {
          const data = await verifyGroupDetailed(groupsInput);
          setPreviewUsers(data.members || []);
          log('success', `SCOPE_VERIFIED: Group matched ${data.count} directory principals.`);
      } catch (e: any) {
          log('error', `SCOPE_ERROR: ${e.message}`);
      } finally {
          setVerifying(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-gray-200">
        <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
            <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Profile Architect</h3>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">Configure Cadence & Targeting Logic</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl font-light">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Profile Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm font-black outline-none focus:border-primary-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Target Start Time</label>
                            <input type="time" value={formData.preferredTime} onChange={e => setFormData({...formData, preferredTime: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm font-black outline-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Entra ID Group Context</label>
                        <div className="flex gap-4">
                            <input type="text" value={groupsInput} onChange={e => setGroupsInput(e.target.value)} className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm font-mono outline-none focus:border-primary-500" placeholder="e.g. All-Staff-Hybrid" />
                            <button onClick={handleVerify} disabled={verifying} className="bg-primary-600 hover:bg-primary-500 px-8 py-4 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all">
                                {verifying ? 'READING...' : 'Verify Scope'}
                            </button>
                        </div>
                    </div>

                    {previewUsers.length > 0 && (
                        <div className="bg-gray-950/50 border border-gray-800 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="px-6 py-4 bg-gray-900/50 border-b border-gray-800 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-primary-400">Live Member Preview ({previewUsers.length})</span>
                                <span className="text-[9px] text-gray-600 font-bold uppercase italic">Found via Transitive Lookup</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto divide-y divide-gray-900">
                                {previewUsers.slice(0, 50).map((u, i) => (
                                    <div key={i} className="px-6 py-3 flex justify-between items-center hover:bg-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-300">{u.displayName}</span>
                                            <span className="text-[9px] text-gray-600 font-mono">{u.userPrincipalName}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-black ${u.daysLeft <= 14 ? 'text-yellow-500' : 'text-emerald-500'}`}>T-{u.daysLeft} DAYS</span>
                                            <span className="block text-[8px] text-gray-700 font-black">EXPIRY: {u.expiryDate ? new Date(u.expiryDate).toLocaleDateString() : 'NEVER'}</span>
                                        </div>
                                    </div>
                                ))}
                                {previewUsers.length > 50 && <div className="p-3 text-center text-[9px] text-gray-700 font-black uppercase">...and {previewUsers.length - 50} more principals</div>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="bg-gray-950 p-8 rounded-3xl border border-gray-800 space-y-6">
                        <h4 className="text-[10px] font-black text-primary-500 uppercase tracking-widest border-b border-gray-800 pb-3">Transmission Routing</h4>
                        <div className="space-y-4">
                            {[
                                { id: 'toUser', label: 'Primary UPN Delivery', checked: formData.recipients.toUser },
                                { id: 'toManager', label: 'Direct Manager CC', checked: formData.recipients.toManager },
                                { id: 'readReceipt', label: 'Force Read Receipt', checked: formData.recipients.readReceipt }
                            ].map(opt => (
                                <label key={opt.id} className="flex items-center gap-4 cursor-pointer group">
                                    <input type="checkbox" checked={opt.checked} onChange={e => setFormData({...formData, recipients: {...formData.recipients, [opt.id as any]: e.target.checked}})} className="w-5 h-5 rounded bg-gray-900 border-gray-700 text-primary-600" />
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-white">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Warning Cadence (T-Days)</label>
                        <input type="text" value={cadenceInput} onChange={e => setCadenceInput(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm font-black outline-none focus:border-primary-500" placeholder="14, 7, 3, 1" />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Email Header (Subject)</label>
                    <input type="text" value={formData.subjectLine} onChange={e => setFormData({...formData, subjectLine: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm font-black outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">MIME Body (Supports Markdown Tags)</label>
                    <textarea value={formData.emailTemplate} onChange={e => setFormData({...formData, emailTemplate: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-6 h-64 font-mono text-xs outline-none focus:border-primary-500 leading-relaxed" />
                </div>
            </div>
        </div>

        <div className="p-8 border-t border-gray-800 flex justify-end gap-4 bg-gray-900/50">
            <button onClick={onClose} className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800">Discard</button>
            <button 
                onClick={() => onSave({
                    ...formData,
                    cadence: { daysBefore: cadenceInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) },
                    assignedGroups: groupsInput.split(',').map(s => s.trim()).filter(Boolean)
                })} 
                className="px-12 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-900/20"
            >Commit Profile</button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;