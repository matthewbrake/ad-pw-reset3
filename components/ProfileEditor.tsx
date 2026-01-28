
import React, { useState, useEffect, useMemo } from 'react';
import { NotificationProfile, User } from '../types';
import { AzureIcon, SearchIcon, CheckCircleIcon, ClockIcon, UserIcon } from './icons';
import { log } from '../services/mockApi';

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
  const [previewIndex, setPreviewIndex] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // Filter users that match the assigned groups
  const targetedUsers = useMemo(() => {
      if (groupsInput.toLowerCase().includes('all users')) return availableUsers;
      const groups = groupsInput.split(',').map(g => g.trim().toLowerCase());
      return availableUsers.filter(u => u.assignedGroups?.some(g => groups.includes(g.toLowerCase())));
  }, [availableUsers, groupsInput]);

  const currentPreviewUser = targetedUsers[previewIndex] || targetedUsers[0] || {
      displayName: 'Sample User',
      userPrincipalName: 'sample@company.com',
      passwordExpiresInDays: 10,
      passwordExpiryDate: new Date().toISOString()
  };

  const mapTemplate = (tmpl: string, user: any) => {
      return tmpl
        .replace(/{{user.displayName}}/g, user.displayName)
        .replace(/{{user.userPrincipalName}}/g, user.userPrincipalName)
        .replace(/{{daysUntilExpiry}}/g, String(user.passwordExpiresInDays))
        .replace(/{{expiryDate}}/g, user.passwordExpiryDate ? new Date(user.passwordExpiryDate).toLocaleDateString() : 'N/A');
  };

  const handleVerify = async () => {
      setVerifying(true);
      log('info', `Verifying group membership: ${groupsInput}`);
      // Simulate API call to Graph
      await new Promise(r => setTimeout(r, 800));
      setVerifying(false);
      log('success', `Found ${targetedUsers.length} matching users for scope.`);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2533] rounded-lg border border-gray-700 w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl text-gray-200">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold">Edit Profile</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-sm font-semibold">Profile Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#2a3447] border-gray-600 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-semibold">Preferred Time of Day (Optional)</label>
                    <div className="relative">
                        <input type="time" value={formData.preferredTime} onChange={e => setFormData({...formData, preferredTime: e.target.value})} className="w-full bg-[#2a3447] border-gray-600 rounded p-2 outline-none" />
                        <p className="text-[10px] text-gray-500 mt-1">If set, emails will be queued for this time.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-semibold">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#2a3447] border-gray-600 rounded p-2 h-20 outline-none" />
            </div>

            <div className="space-y-1">
                <label className="text-sm font-semibold">Assigned Groups (Azure AD Group Names)</label>
                <div className="flex gap-2">
                    <input type="text" value={groupsInput} onChange={e => setGroupsInput(e.target.value)} className="flex-1 bg-[#2a3447] border-gray-600 rounded p-2 font-mono text-sm outline-none" placeholder="PLA-INTUNE-IT-PILOTGROUP" />
                    <button onClick={handleVerify} disabled={verifying} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition-all">
                        <SearchIcon className="w-4 h-4" /> {verifying ? '...' : 'Verify'}
                    </button>
                </div>
                <p className="text-[10px] text-gray-500">Exact name of the Azure AD Group. Use "All Users" to check everyone.</p>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-semibold">Notification Cadence (Days Before Expiry)</label>
                <input type="text" value={cadenceInput} onChange={e => setCadenceInput(e.target.value)} className="w-full bg-[#2a3447] border-gray-600 rounded p-2 outline-none" placeholder="14, 7, 1" />
                <p className="text-[10px] text-gray-500">Comma separated integers (e.g. 14, 7, 3, 1).</p>
            </div>

            <div className="bg-[#171d29] p-4 rounded border border-gray-700 space-y-4">
                <h4 className="text-sm font-bold border-b border-gray-700 pb-2">Recipients & Options</h4>
                <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.recipients.toUser} onChange={e => setFormData({...formData, recipients: {...formData.recipients, toUser: e.target.checked}})} className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600" />
                        <span className="text-sm">Send to User</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.recipients.toManager} onChange={e => setFormData({...formData, recipients: {...formData.recipients, toManager: e.target.checked}})} className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600" />
                        <span className="text-sm">CC User's Manager (from Azure AD)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.recipients.readReceipt} onChange={e => setFormData({...formData, recipients: {...formData.recipients, readReceipt: e.target.checked}})} className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600" />
                        <span className="text-sm">Request Read Receipt</span>
                    </label>
                </div>
                <div className="pt-2">
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">CC Admins (Comma Separated)</label>
                    <input type="text" value={formData.recipients.toAdmins.join(', ')} onChange={e => setFormData({...formData, recipients: {...formData.recipients, toAdmins: e.target.value.split(',').map(s => s.trim())}})} className="w-full bg-[#2a3447] border-gray-600 rounded p-2 text-sm outline-none" placeholder="admin@company.com" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div className="flex-1 space-y-1 mr-4">
                        <label className="text-sm font-semibold">Email Subject Line</label>
                        <input type="text" value={formData.subjectLine} onChange={e => setFormData({...formData, subjectLine: e.target.value})} className="w-full bg-[#2a3447] border-gray-600 rounded p-2 outline-none" />
                    </div>
                    <div className="bg-[#2a3447] px-3 py-1 rounded border border-gray-600 text-[10px] font-bold text-blue-400">
                        TARGETED: {targetedUsers.length} USERS
                    </div>
                </div>
                
                <div className="space-y-1">
                    <label className="text-sm font-semibold">Email Body Template</label>
                    <div className="relative group">
                        <textarea value={formData.emailTemplate} onChange={e => setFormData({...formData, emailTemplate: e.target.value})} className="w-full bg-[#171d29] border-gray-600 rounded p-4 h-48 font-mono text-xs outline-none focus:border-blue-500 border" />
                        
                        {/* Live Preview Overly */}
                        <div className="mt-4 p-6 bg-white text-gray-800 rounded shadow-inner min-h-[150px] relative">
                            <div className="absolute top-2 right-2 flex gap-2">
                                <button 
                                    onClick={() => setPreviewIndex(prev => (prev > 0 ? prev - 1 : targetedUsers.length - 1))}
                                    className="bg-gray-100 hover:bg-gray-200 p-1 rounded text-gray-500 text-[10px] font-bold"
                                >PREV RECORD</button>
                                <button 
                                    onClick={() => setPreviewIndex(prev => (prev < targetedUsers.length - 1 ? prev + 1 : 0))}
                                    className="bg-gray-100 hover:bg-gray-200 p-1 rounded text-gray-500 text-[10px] font-bold"
                                >NEXT RECORD</button>
                            </div>
                            <div className="text-[10px] font-bold text-blue-600 uppercase mb-4">Preview: {currentPreviewUser.displayName}</div>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                {mapTemplate(formData.emailTemplate, currentPreviewUser)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3 bg-[#1e2533]">
            <button onClick={onClose} className="px-6 py-2 rounded text-sm font-semibold hover:bg-gray-700">Cancel</button>
            <button 
                onClick={() => onSave({
                    ...formData,
                    cadence: { daysBefore: cadenceInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) },
                    assignedGroups: groupsInput.split(',').map(s => s.trim()).filter(Boolean)
                })} 
                className="px-8 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold shadow-lg"
            >Save Profile</button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
