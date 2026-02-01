import React, { useState, useEffect } from 'react';
import { NotificationProfile, User } from '../types';
import { fetchProfiles, saveProfile, deleteProfile, runNotificationJob } from '../services/mockApi';
import ProfileEditor from './ProfileEditor';
import { PlusCircleIcon, EditIcon, TrashIcon, ClockIcon } from './icons';

const Profiles: React.FC = () => {
    const [profiles, setProfiles] = useState<NotificationProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<NotificationProfile | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const pData = await fetchProfiles();
            setProfiles(pData);
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

    const setStatus = async (profile: NotificationProfile, status: NotificationProfile['status']) => {
        await saveProfile({ ...profile, status });
        loadData();
    };

    return (
        <div className="space-y-12 max-w-7xl mx-auto font-sans animate-in fade-in duration-700">
            <div className="flex justify-between items-end border-b border-gray-800 pb-8">
                <div className="space-y-1">
                    <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">Relay Architect</h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em]">Multi-Tenant Notification Workflows</p>
                </div>
                <button onClick={() => { setSelectedProfile(null); setIsEditorOpen(true); }} className="flex items-center space-x-3 bg-primary-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary-500 shadow-2xl transition-all shadow-primary-900/20">
                    <PlusCircleIcon className="w-5 h-5"/>
                    <span>Create New Profile</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {profiles.map(profile => (
                    <div key={profile.id} className="bg-gray-800/30 p-10 rounded-[2.5rem] border border-gray-700 flex flex-col justify-between hover:border-primary-500/50 transition-all group relative overflow-hidden shadow-2xl">
                        <div className={`absolute top-0 right-0 px-6 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg ${
                            profile.status === 'active' ? 'bg-emerald-600 text-white' : 
                            profile.status === 'paused' ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                            {profile.status}
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h4 className="font-black text-2xl text-white italic tracking-tighter">{profile.name}</h4>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className={`w-2 h-2 rounded-full ${profile.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`}></div>
                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                            {profile.status === 'active' ? 'Deployment Operational' : 'Standby Mode'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => { setSelectedProfile(profile); setIsEditorOpen(true); }} className="p-3 bg-gray-900 text-gray-400 hover:text-white rounded-xl border border-gray-800 transition-all">
                                        <EditIcon className="w-5 h-5"/>
                                    </button>
                                    <button onClick={async () => { if(confirm('Purge profile?')) { await deleteProfile(profile.id); loadData(); } }} className="p-3 bg-gray-900 text-gray-400 hover:text-red-500 rounded-xl border border-gray-800 transition-all">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-10">
                                <div className="bg-gray-950 p-5 rounded-2xl border border-gray-800">
                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Scope Targeting</span>
                                    <span className="text-[11px] font-black text-primary-400 uppercase tracking-tighter">{profile.assignedGroups.join(', ') || 'Global Directory'}</span>
                                </div>
                                <div className="bg-gray-950 p-5 rounded-2xl border border-gray-800">
                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Relay Cadence</span>
                                    <div className="flex gap-2">
                                        {profile.cadence.daysBefore.map(d => (
                                            <span key={d} className="px-2 py-0.5 bg-gray-800 text-[10px] font-black text-gray-400 rounded-md border border-gray-700">T-{d}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                             <div className="flex gap-3">
                                <button 
                                    onClick={() => setStatus(profile, 'active')} 
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${profile.status === 'active' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-white'}`}
                                >
                                    Play (Live)
                                </button>
                                <button 
                                    onClick={() => setStatus(profile, 'paused')} 
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${profile.status === 'paused' ? 'bg-amber-600/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-white'}`}
                                >
                                    Pause Relay
                                </button>
                             </div>
                             <button 
                                onClick={() => runNotificationJob(profile, 'preview')} 
                                className="w-full py-4 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                             >
                                Initiate Simulation Phase
                             </button>
                        </div>
                    </div>
                ))}
            </div>

            {isEditorOpen && (
                <ProfileEditor 
                    profile={selectedProfile} 
                    onSave={handleSave} 
                    onClose={() => setIsEditorOpen(false)} 
                />
            )}
        </div>
    );
};

export default Profiles;
