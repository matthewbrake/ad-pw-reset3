import React, { useState, useEffect } from 'react';
import { ClockIcon, TrashIcon } from './icons';

const QueueViewer: React.FC = () => {
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/queue');
            if (res.ok) {
                const data = await res.json();
                setQueue(data.sort((a:any,b:any) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    const clearQueue = async () => {
        if(!confirm("Destroy all pending delivery tasks?")) return;
        await fetch('/api/queue/clear', {method:'POST'});
        fetchQueue();
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 font-sans max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end border-b border-gray-800 pb-8">
                <div className="space-y-1">
                    <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                        <ClockIcon className="w-12 h-12 text-primary-500" />
                        Delivery Queue
                    </h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em]">Staging area for prioritized transmissions</p>
                </div>
                <button onClick={clearQueue} className="text-[10px] font-black text-red-500 hover:text-white uppercase tracking-widest border border-red-900 px-6 py-3 rounded-xl transition-all">Flush Entire Buffer</button>
            </div>

            <div className="bg-gray-800/50 rounded-[2rem] border border-gray-700 overflow-hidden shadow-2xl">
                <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-[#0f172a]">
                        <tr>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Time</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Entity Recipient</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Current State</th>
                            <th className="px-8 py-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {queue.map((item, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-all">
                                <td className="px-8 py-6 whitespace-nowrap text-xs text-primary-400 font-mono italic">
                                    {new Date(item.scheduledFor).toLocaleString()}
                                </td>
                                <td className="px-8 py-6 whitespace-nowrap">
                                    <div className="text-sm font-black text-white tracking-tight">{item.recipient}</div>
                                    <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">Direct Transmission</div>
                                </td>
                                <td className="px-8 py-6 whitespace-nowrap">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        item.status === 'pending' ? 'bg-blue-950/40 border-blue-500/30 text-blue-400' : 
                                        item.status === 'in-flight' ? 'bg-yellow-950/40 border-yellow-500/30 text-yellow-400 animate-pulse' : 
                                        'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                                    }`}>
                                        {item.status || 'Queued'}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button onClick={() => {}} className="text-gray-600 hover:text-red-500 transition-colors">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {queue.length === 0 && (
                    <div className="p-32 text-center text-gray-600 font-black tracking-[0.5em] uppercase text-xs italic">Buffer Empty: No pending transmissions found.</div>
                )}
            </div>
        </div>
    );
};

export default QueueViewer;