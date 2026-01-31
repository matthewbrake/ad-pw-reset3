import React, { useState, useMemo } from 'react';
import { NotificationProfile, User } from '../types';
import { SearchIcon } from './icons';
import { log, verifyGroup } from '../services/mockApi';

interface ProfileEditorProps {
  profile: NotificationProfile | null;
  availableUsers: User[];
  onSave: (profile: NotificationProfile) => void;
  onClose: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, availableUsers, onSave, onClose }) => {
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

  const handleVerify = async () => {
      setVerifying(true);
      try {
          const result = await verifyGroup(groupsInput);
          log('success', `VERIFIED: Found ${result.count} members in Entra ID Group.`);
      } catch (e: any) {
          log('error', `LOOKUP_FAIL: ${e.message}`);
      } finally {
          setVerifying(false);
      }
  };

  const mapTemplate = (tmpl: string, user: any) => {
      return tmpl
        .replace(/{{user.displayName}}/g, user.displayName)
        .replace(/{{user.userPrincipalName}}/g, user.userPrincipalName)
        .replace(/{{daysUntilExpiry}}/g, String(user.passwordExpiresInDays))
        .replace(/{{expiryDate}}/g, user.passwordExpiryDate ? new Date(user.passwordExpiryDate).toLocaleDateString() : 'N/A');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2533] rounded-[2rem] border border-gray-700 w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl text-gray-200">
        <div className="p-8 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-black uppercase tracking-tighter">Profile Configuration</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl font-light">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Profile Identifier</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#171d29] border border-gray-700 rounded-xl p-4 text-sm font-black outline-none focus:border-primary-500" placeholder="e.g. Sales Pilot Group" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Target Transmission Time</label>
                    <input type="time" value={formData.preferredTime} onChange={e => setFormData({...formData, preferredTime: e.target.value})} className="w-full bg-[#171d29] border border-gray-700 rounded-xl p-4 text-sm font-black outline-none" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Entra ID Scoping (Group Name)</label>
                <div className="flex gap-4">
                    <input type="text" value={groupsInput} onChange={e => setGroupsInput(e.target.value)} className="flex-1 bg-[#171d29] border border-gray-700 rounded-xl p-4 text-sm font-mono outline-none focus:border-primary-500" placeholder="e.g. Finance-Users-Synced" />
                    <button onClick={handleVerify} disabled={verifying} className="bg-primary-600 hover:bg-primary-500 px-8 py-4 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all">
                        <SearchIcon className="w-4 h-4" /> {verifying ? '...' : 'Verify Scope'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-[#171d29] p-8 rounded-2xl border border-gray-800 space-y-6">
                    <h4 className="text-[10px] font-black text-primary-500 uppercase tracking-widest border-b border-gray-800 pb-3">Routing Engine</h4>
                    <div className="space-y-4">
                        {[
                            { id: 'toUser', label: 'Primary Delivery (User UPN)', checked: formData.recipients.toUser },
                            { id: 'toManager', label: 'CC: Azure Managed-By Attribute', checked: formData.recipients.toManager },
                            { id: 'readReceipt', label: 'Disposition Header (Read Receipt)', checked: formData.recipients.readReceipt }
                        ].map(opt => (
                            <label key={opt.id} className="flex items-center gap-4 cursor-pointer group">
                                <input type="checkbox" checked={opt.checked} onChange={e => setFormData({...formData, recipients: {...formData.recipients, [opt.id]: e.target.checked}})} className="w-5 h-5 rounded bg-gray-900 border-gray-700 text-primary-600" />
                                <span className="text-xs font-bold text-gray-400 group-hover:text-white">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Warning Cadence (T-Minus Days)</label>
                    <input type="text" value={cadenceInput} onChange={e => setCadenceInput(e.target.value)} className="w-full bg-[#171d29] border border-gray-700 rounded-xl p-4 text-sm font-black outline-none focus:border-primary-500" placeholder="14, 7, 3, 1" />
                    <p className="text-[9px] text-gray-600 font-bold italic">Transmissions trigger on these specific offsets from expiry.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Subject Header</label>
                    <input type="text" value={formData.subjectLine} onChange={e => setFormData({...formData, subjectLine: e.target.value})} className="w-full bg-[#171d29] border border-gray-700 rounded-xl p-4 text-sm font-black outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Logic Template (Body)</label>
                    <textarea value={formData.emailTemplate} onChange={e => setFormData({...formData, emailTemplate: e.target.value})} className="w-full bg-[#171d29] border border-gray-700 rounded-xl p-6 h-48 font-mono text-xs outline-none focus:border-primary-500" />
                </div>
            </div>
        </div>

        <div className="p-8 border-t border-gray-700 flex justify-end gap-4 bg-[#1e2533]">
            <button onClick={onClose} className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-700">Abort Changes</button>
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
