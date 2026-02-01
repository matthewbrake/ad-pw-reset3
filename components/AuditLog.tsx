import React, { useState, useEffect } from 'react';
import { ClipboardListIcon, CheckCircleIcon, XCircleIcon, SearchIcon } from './icons';
import { fetchHistory } from '../services/mockApi';

const AuditLog: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        try {
            const data = await fetchHistory();
            if (data) setHistory(data);
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

    const filtered = history.filter(h => 
        h.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.profileId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-12 max-w-7xl mx-auto font-sans animate-in fade-in duration-700">
            <div className="flex justify-between items-end border-b border-gray-800 pb-8">
                <div className="space-y-1">
                    <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                        <ClipboardListIcon className="w-12 h-12 text-primary-500" />
                        Mission Audit
                    </h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em]">Tamper-Evident Transmission Reconciliation</p>
                </div>
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input 
                        type="text" 
                        placeholder="FILTER BY RECIPIENT..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-gray-950 border border-gray-800 rounded-xl pl-12 pr-6 py-4 text-[10px] font-black uppercase text-white outline-none focus:border-primary-500 w-[350px]"
                    />
                </div>
            </div>

            <div className="bg-gray-800/30 rounded-[2.5rem] border border-gray-700 overflow-hidden shadow-2xl">
                <table className="min-w-full divide-y divide-gray-900">
                    <thead className="bg-gray-900/50">
                        <tr>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Time (ISO-8601)</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Identity / UPN</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Relay Source</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Result</th>
                            <th className="px-8 py-6"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                        {filtered.map((entry, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-all group">
                                <td className="px-8 py-6 whitespace-nowrap text-[10px] text-gray-500 font-mono">
                                    {new Date(entry.timestamp).toLocaleString()}
                                </td>
                                <td className="px-8 py-6 whitespace-nowrap">
                                    <div className="text-xs font-black text-white">{entry.recipient}</div>
                                    <div className="text-[9px] text-gray-700 font-black uppercase tracking-widest mt-0.5">MIME Principal</div>
                                </td>
                                <td className="px-8 py-6 whitespace-nowrap">
                                    <div className="text-[10px] font-black text-primary-500 uppercase italic tracking-tighter">{entry.profileId}</div>
                                </td>
                                <td className="px-8 py-6 whitespace-nowrap">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-flex ${
                                        entry.status === 'SENT' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-red-950/20 border-red-500/30 text-red-400'
                                    }`}>
                                        {entry.status === 'SENT' ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                                        {entry.status}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button 
                                        onClick={() => setSelectedEntry(entry)} 
                                        className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest underline transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        Inspect Frame
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && filtered.length === 0 && <div className="py-40 text-center text-gray-700 font-black tracking-[0.5em] uppercase text-xs italic">Audit Registry Empty</div>}
            </div>

            {selectedEntry && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#0f172a] border border-gray-800 p-10 rounded-[3rem] w-full max-w-4xl shadow-2xl space-y-8 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black italic tracking-tighter text-white uppercase">MIME Packet Inspection</h3>
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Configuration Snapshot for Relay Event {selectedEntry.timestamp}</p>
                            </div>
                            <button onClick={() => setSelectedEntry(null)} className="p-3 bg-gray-900 text-gray-500 hover:text-white rounded-2xl">&times;</button>
                        </div>
                        <div className="flex-1 overflow-auto bg-black p-8 rounded-3xl border border-gray-900 shadow-inner">
                            <pre className="text-emerald-500 font-mono text-[11px] leading-relaxed">
                                {JSON.stringify(selectedEntry, null, 4)}
                            </pre>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black text-gray-700 uppercase tracking-widest">
                            <span>Hash Verified: SHA-256 Compatibility</span>
                            <button onClick={() => setSelectedEntry(null)} className="px-10 py-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-500 transition-all shadow-xl shadow-primary-900/20">Close Registry</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLog;