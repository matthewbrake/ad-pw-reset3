import React, { useState, useEffect } from 'react';
import { ClockIcon, TrashIcon, AlertTriangleIcon } from './icons';
import { log, fetchQueue, toggleQueue, cancelQueueItem, clearQueue } from '../services/mockApi';

const QueueViewer: React.FC = () => {
    const [queue, setQueue] = useState<any[]>([]);
    const [paused, setPaused] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const data = await fetchQueue();
            if (data) {
                setQueue(data.items.sort((a:any,b:any) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()));
                setPaused(data.paused);
            }
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleTogglePause = async () => {
        try {
            const data = await toggleQueue();
            setPaused(data.paused);
            log(data.paused ? 'warn' : 'info', `RELAY_SIGNAL: Master relay is now ${data.paused ? 'PAUSED' : 'ACTIVE'}.`);
        } catch (e: any) { log('error', e.message); }
    };

    const handleCancelItem = async (id: string) => {
        if(!confirm("Cancel this specific delivery task?")) return;
        try {
            await cancelQueueItem(id);
            loadData();
            log('warn', `QUEUE_MANIPULATION: Entry ${id} has been purged from the active buffer.`);
        } catch (e: any) { log('error', e.message); }
    };

    const handleClearQueue = async () => {
        if(!confirm("Destroy all pending delivery tasks?")) return;
        try {
            await clearQueue();
            loadData();
            log('error', 'BUFFER_PURGE: Entire transmission queue destroyed by operator.');
        } catch (e: any) { log('error', e.message); }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700 font-sans max-w-[1400px] mx-auto">
            <div className="flex justify-between items-end border-b border-gray-800 pb-8">
                <div className="space-y-1">
                    <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                        <ClockIcon className="w-12 h-12 text-primary-500" />
                        Relay Buffer
                    </h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em]">Staging area for prioritized directory transmissions</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={handleTogglePause} 
                        className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-xl ${paused ? 'bg-amber-600/20 border-amber-500 text-amber-500 shadow-amber-900/10' : 'bg-emerald-600/20 border-emerald-500 text-emerald-500 shadow-emerald-900/10'}`}
                    >
                        {paused ? 'Resume Relay' : 'Global Relay Pause'}
                    </button>
                    <button onClick={handleClearQueue} className="px-10 py-4 rounded-2xl text-[10px] font-black text-red-500 uppercase tracking-widest border border-red-900/30 hover:bg-red-900/20 transition-all">Destroy Buffer</button>
                </div>
            </div>

            {paused && (
                <div className="bg-amber-950/20 border border-amber-500/30 p-8 rounded-[2rem] flex items-center gap-6 animate-pulse">
                    <AlertTriangleIcon className="w-10 h-10 text-amber-500" />
                    <div className="space-y-1">
                        <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest">Master Relay Interrupted</h4>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Background worker will not initiate SMTP handshakes until manually resumed.</p>
                    </div>
                </div>
            )}

            <div className="bg-gray-800/30 rounded-[2.5rem] border border-gray-700 overflow-hidden shadow-2xl backdrop-blur-md">
                <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-gray-900/80">
                        <tr>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Transmission Window</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Target Principal</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Workflow State</th>
                            <th className="px-8 py-6"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                        {queue.map((item, i) => (
                            <tr key={item.id || i} className="hover:bg-white/5 transition-all group">
                                <td className="px-8 py-8 whitespace-nowrap">
                                    <div className="text-xs font-black text-primary-400 font-mono italic">{new Date(item.scheduledFor).toLocaleString()}</div>
                                    <div className="text-[9px] text-gray-700 font-black uppercase mt-1">Calculated Priority</div>
                                </td>
                                <td className="px-8 py-8 whitespace-nowrap">
                                    <div className="text-sm font-black text-white tracking-tight">{item.recipient}</div>
                                    <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Origin: {item.profileName || 'Daemon'}</div>
                                </td>
                                <td className="px-8 py-8 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${paused ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {paused ? 'HOLDING' : 'STAGED'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-8 text-right">
                                    <button onClick={() => handleCancelItem(item.id)} className="p-3 bg-gray-900 text-gray-700 hover:text-red-500 rounded-xl border border-gray-800 transition-all opacity-0 group-hover:opacity-100">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && queue.length === 0 && (
                    <div className="py-40 text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto border border-gray-800">
                            <ClockIcon className="w-8 h-8 text-gray-700" />
                        </div>
                        <p className="text-gray-700 font-black tracking-[0.5em] uppercase text-xs">Buffer Exhausted: System Idle</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QueueViewer;