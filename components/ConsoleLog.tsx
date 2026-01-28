import React, { useEffect, useRef, useState } from 'react';
import { subscribeToLogs, log } from '../services/mockApi';
import { LogEntry } from '../types';

const ConsoleLog: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isVerbose, setIsVerbose] = useState(true);
    const endRef = useRef<HTMLDivElement>(null);

    const VERSION = "v2.8.0 Enterprise";
    const UPDATED = "2024-05-23";

    useEffect(() => {
        const unsubscribe = subscribeToLogs((entry) => {
            setLogs(prev => [...prev, entry]);
        });
        
        log('system', `BOOTSTRAP: ${VERSION} Build ${UPDATED} | NODE: production`);
        log('system', `PERSISTENCE: Monitoring /app/data/config for changes...`);
        
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (visible) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, visible]);

    const filteredLogs = isVerbose ? logs : logs.filter(l => l.level !== 'system' && l.level !== 'info');

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 h-72 bg-[#020617]/95 border-t border-gray-800 text-[11px] font-mono z-50 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex justify-between items-center px-6 py-3 bg-[#0f172a] border-b border-gray-800">
                <span className="font-black text-gray-400 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                    SYSTEM CONSOLE <span className="text-primary-500 opacity-60 ml-2 font-mono">{VERSION}</span>
                </span>
                <div className="flex items-center space-x-6">
                    <label className="flex items-center gap-3 cursor-pointer text-gray-500 hover:text-white transition-all">
                        <input type="checkbox" checked={isVerbose} onChange={e => setIsVerbose(e.target.checked)} className="w-3.5 h-3.5 bg-gray-900 border-gray-700 rounded text-primary-600 focus:ring-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Enhanced Verbosity</span>
                    </label>
                    <button onClick={() => setLogs([])} className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest">Flush Buffer</button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2 font-light">&times;</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2 selection:bg-primary-500/30">
                {filteredLogs.length === 0 && <p className="text-gray-700 italic font-black uppercase tracking-widest">Listening for fabric events...</p>}
                {filteredLogs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-4 group">
                        <span className="text-gray-700 font-mono text-[9px] shrink-0 pt-0.5">[{log.timestamp}]</span>
                        <span className={`uppercase font-black shrink-0 w-20 text-[10px] tracking-widest ${
                            log.level === 'error' ? 'text-red-500' :
                            log.level === 'warn' ? 'text-yellow-500' :
                            log.level === 'success' ? 'text-emerald-500' : 
                            log.level === 'system' ? 'text-gray-500' : 'text-blue-500'
                        }`}>{log.level}</span>
                        <span className="text-gray-300 break-all font-medium group-hover:text-white transition-colors">
                            {log.message}
                            {(isVerbose && log.details) && (
                                <span className="block ml-0 text-gray-600 font-mono text-[9px] mt-2 bg-black/40 p-3 rounded-lg border border-gray-800 shadow-inner">
                                    {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                                </span>
                            )}
                        </span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
};

export default ConsoleLog;