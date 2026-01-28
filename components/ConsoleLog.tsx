
import React, { useEffect, useRef, useState } from 'react';
import { subscribeToLogs, log } from '../services/mockApi';
import { LogEntry } from '../types';

const ConsoleLog: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isVerbose, setIsVerbose] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const VERSION = "v2.5.1";
    const UPDATED = "2024-05-22";

    useEffect(() => {
        const unsubscribe = subscribeToLogs((entry) => {
            setLogs(prev => [...prev, entry]);
        });
        
        // FIX: Directly call the log function to show initial build info instead of incorrectly invoking the subscribeToLogs return.
        log('system', `CORE INIT: ${VERSION} Build ${UPDATED} | REPO: https://github.com/matthewbrake/ad-pw-reset2`);
        
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (visible) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, visible]);

    const filteredLogs = isVerbose ? logs : logs.filter(l => l.level !== 'system' || l.message.includes('INIT'));

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 h-64 bg-black/95 border-t border-gray-700 text-xs font-mono z-50 flex flex-col shadow-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                <span className="font-bold text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    System Console <span className="text-gray-500 font-normal">{VERSION}</span>
                </span>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                        <input type="checkbox" checked={isVerbose} onChange={e => setIsVerbose(e.target.checked)} className="w-3 h-3 bg-gray-700 border-gray-600 rounded" />
                        <span className="text-[10px] font-bold uppercase">Verbose</span>
                    </label>
                    <button onClick={() => setLogs([])} className="text-gray-400 hover:text-white px-2">Clear</button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white px-2">Hide</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {filteredLogs.length === 0 && <p className="text-gray-600 italic">Listening for system events...</p>}
                {filteredLogs.map((log, i) => (
                    <div key={i} className="flex space-x-2 border-b border-white/5 pb-1">
                        <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                        <span className={`uppercase font-bold shrink-0 w-16 ${
                            log.level === 'error' ? 'text-red-500' :
                            log.level === 'warn' ? 'text-yellow-500' :
                            log.level === 'success' ? 'text-green-500' : 
                            log.level === 'system' ? 'text-purple-400' : 'text-blue-400'
                        }`}>{log.level}</span>
                        <span className="text-gray-300 break-all">
                            {log.message}
                            {(isVerbose && log.details) && (
                                <span className="block ml-0 text-gray-500 whitespace-pre-wrap mt-1 bg-white/5 p-2 rounded">
                                    {JSON.stringify(log.details, null, 2)}
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