
import React, { useState, useEffect } from 'react';
import { NotificationProfile, User } from '../types';
import { fetchProfiles, saveProfile, deleteProfile, runNotificationJob, fetchUsers } from '../services/mockApi';
import ProfileEditor from './ProfileEditor';
import { PlusCircleIcon, EditIcon, TrashIcon, SearchIcon, ClockIcon } from './icons';
import useLocalStorage from '../hooks/useLocalStorage';

const Profiles: React.FC = () => {
    const [profiles, setProfiles] = useState<NotificationProfile[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<NotificationProfile | null>(null);
    const [graphConfig] = useLocalStorage('graphApiConfig', { tenantId: '', clientId: '' });

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData, uData] = await Promise.all([
                fetchProfiles(),
                fetchUsers(graphConfig as any).catch(() => [] as User[])
            ]);
            setProfiles(pData);
            setUsers(uData);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSave = async (profile: NotificationProfile) => {
        await saveProfile(profile);
        setIsEditorOpen(false);
        loadData();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black text-white">Notification Profiles</h2>
                    <div className="bg-gray-800 px-3 py-1 rounded text-[10px] font-mono text-gray-500 border border-gray-700">
                        DIRECTORY_SYNC: {users.length} RECORDS
                    </div>
                </div>
                <button onClick={() => { setSelectedProfile(null); setIsEditorOpen(true); }} className="flex items-center space-x-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-500 shadow-xl transition-all">
                    <PlusCircleIcon className="w-5 h-5"/>
                    <span>Create Profile</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {profiles.map(profile => (
                    <div key={profile.id} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 flex flex-col justify-between hover:border-primary-500/50 transition-all group relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase ${
                            profile.status === 'active' ? 'bg-emerald-600 text-white' : 
                            profile.status === 'dryrun' ? 'bg-amber-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                            {profile.status}
                        </div>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-xl text-white">{profile.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{profile.description || 'No description provided.'}</p>
                                </div>
                                <div className="flex space-x-1">
                                    <button onClick={() => { setSelectedProfile(profile); setIsEditorOpen(true); }} className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                                        <EditIcon className="w-5 h-5"/>
                                    </button>
                                    <button onClick={async () => { if(confirm('Delete?')) { await deleteProfile(profile.id); loadData(); } }} className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {profile.cadence.daysBefore.map(d => (
                                    <span key={d} className="px-2 py-1 bg-gray-900 text-gray-400 text-[9px] font-black rounded border border-gray-700">T-{d}</span>
                                ))}
                                <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-[9px] font-black rounded border border-blue-500/20">
                                    {profile.assignedGroups.join(', ')}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => runNotificationJob(profile, 'preview')} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">Intel Preview</button>
                             <button onClick={() => runNotificationJob(profile, 'live')} className="flex-1 bg-primary-600 hover:bg-primary-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">Deploy Live</button>
                        </div>
                    </div>
                ))}
                {profiles.length === 0 && !loading && (
                    <div className="lg:col-span-2 p-20 text-center border-2 border-dashed border-gray-700 rounded-3xl text-gray-500">
                        No notification profiles found. Click "Create Profile" to start monitoring your directory.
                    </div>
                )}
            </div>

            {isEditorOpen && (
                <ProfileEditor 
                    profile={selectedProfile} 
                    availableUsers={users}
                    onSave={handleSave} 
                    onClose={() => setIsEditorOpen(false)} 
                />
            )}
        </div>
    );
};

export default Profiles;
