import React, { useEffect, useRef, useState } from 'react';
import { subscribeToLogs, log } from '../services/mockApi';
import { LogEntry } from '../types';

const ConsoleLog: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isVerbose, setIsVerbose] = useState(true);
    const endRef = useRef<HTMLDivElement>(null);

    const VERSION = "v2.9.0 Enterprise";
    const BUILD = "2024.05.23.01";

    useEffect(() => {
        const unsubscribe = subscribeToLogs((entry) => {
            setLogs(prev => [...prev.slice(-199), entry]); // Keep last 200 logs
        });
        
        log('system', `FACTORY_BOOT: ${VERSION} Build ${BUILD}`);
        log('system', `IO_WATCH: Listening for JSON root changes...`);
        
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (visible) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, visible]);

    const filteredLogs = isVerbose ? logs : logs.filter(l => l.level === 'error' || l.level === 'warn' || l.level === 'success');

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 h-72 bg-[#020617]/98 border-t border-gray-800 text-[10px] font-mono z-50 flex flex-col shadow-[0_-15px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl selection:bg-primary-500/40">
            <div className="flex justify-between items-center px-5 py-2.5 bg-[#0f172a] border-b border-gray-800">
                <span className="font-black text-gray-500 flex items-center gap-2 tracking-widest uppercase">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
                    Black-Box Console <span className="text-primary-500 ml-2">{VERSION}</span>
                </span>
                <div className="flex items-center space-x-6">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-white transition-all">
                        <input type="checkbox" checked={isVerbose} onChange={e => setIsVerbose(e.target.checked)} className="w-3 h-3 bg-gray-900 border-gray-700 rounded text-primary-600 focus:ring-0" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Enhanced Log Streaming</span>
                    </label>
                    <button onClick={() => setLogs([])} className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest">Wipe Buffer</button>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-lg px-2">&times;</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-1.5 leading-relaxed">
                {filteredLogs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-3 group">
                        <span className="text-gray-800 font-mono text-[9px] shrink-0 pt-0.5">[{log.timestamp}]</span>
                        <span className={`uppercase font-black shrink-0 w-16 text-[9px] tracking-widest text-center px-1 rounded ${
                            log.level === 'error' ? 'text-red-500 bg-red-950/20' :
                            log.level === 'warn' ? 'text-yellow-500 bg-yellow-950/20' :
                            log.level === 'success' ? 'text-emerald-500 bg-emerald-950/20' : 
                            log.level === 'system' ? 'text-gray-600' : 'text-blue-500'
                        }`}>{log.level}</span>
                        <span className="text-gray-400 font-medium group-hover:text-white transition-colors">
                            {log.message}
                            {(isVerbose && log.details) && (
                                <span className="block ml-0 text-gray-700 font-mono text-[8px] mt-1 bg-black/40 p-2 rounded border border-gray-900 shadow-inner">
                                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
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