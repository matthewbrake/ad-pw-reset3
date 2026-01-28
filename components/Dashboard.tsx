import React, { useState, useEffect, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { fetchUsers } from '../services/mockApi';
import { User, GraphApiConfig } from '../types';
import UserTable from './UserTable';
import { AlertTriangleIcon, CheckCircleIcon, SearchIcon, UserIcon, XCircleIcon } from './icons';

const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSync, setLastSync] = useState<string>('Never');
  
  const [filterEnabledOnly, setFilterEnabledOnly] = useState(false);
  const [filterNeverExpireOnly, setFilterNeverExpireOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'critical' | 'expired' | 'safe'>('all');

  const [graphConfig] = useLocalStorage<GraphApiConfig>('graphApiConfig', { tenantId: '', clientId: '', clientSecret: '' });

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await fetchUsers(graphConfig);
      setUsers(fetchedUsers);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Identity Sync Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [graphConfig]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userPrincipalName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEnabled = filterEnabledOnly ? user.accountEnabled === true : true;
      const matchesNeverExpire = filterNeverExpireOnly ? user.neverExpires === true : true;

      let matchesQuickFilter = true;
      if (quickFilter === 'critical') matchesQuickFilter = user.passwordExpiresInDays <= 14 && !user.neverExpires && user.passwordExpiresInDays > 0;
      if (quickFilter === 'expired') matchesQuickFilter = user.passwordExpiresInDays <= 0 && !user.neverExpires;
      if (quickFilter === 'safe') matchesQuickFilter = user.neverExpires || user.passwordExpiresInDays > 14;

      return matchesSearch && matchesEnabled && matchesNeverExpire && matchesQuickFilter;
    });
  }, [users, searchTerm, filterEnabledOnly, filterNeverExpireOnly, quickFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const critical = users.filter(u => u.passwordExpiresInDays > 0 && u.passwordExpiresInDays <= 14 && !u.neverExpires).length;
    const expired = users.filter(u => u.passwordExpiresInDays <= 0 && !u.neverExpires).length;
    const safe = total - critical - expired;
    return { total, critical, expired, safe };
  }, [users]);

  const handleExport = () => {
      const headers = "DisplayName,UPN,AccountEnabled,NeverExpires,LastSet,ExpiryDate,DaysRemaining,DaysSinceReset\n";
      const rows = filteredUsers.map(u => 
          `"${u.displayName}","${u.userPrincipalName}",${u.accountEnabled},${u.neverExpires},"${u.passwordLastSetDateTime}","${u.passwordExpiryDate}",${u.passwordExpiresInDays},${u.daysSinceLastReset}`
      ).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-pulse-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
  };

  const StatCard = ({ title, value, colorClass, icon, filterKey }: {title: string, value: number, colorClass: string, icon: React.ReactNode, filterKey: typeof quickFilter}) => (
    <button 
      onClick={() => setQuickFilter(quickFilter === filterKey ? 'all' : filterKey)}
      className={`bg-gray-800 p-6 rounded-2xl flex items-center space-x-5 border-2 transition-all text-left shadow-xl ${
        quickFilter === filterKey ? colorClass : 'border-gray-700 hover:border-gray-600'
      }`}
    >
        <div className="p-4 bg-gray-900 rounded-xl shadow-inner">{icon}</div>
        <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
        </div>
    </button>
  );

  return (
    <div className="space-y-10 font-sans max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">AD Pulse</h2>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em]">Enterprise Hybrid Entity Intelligence</p>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Last Sync: <span className="text-primary-500">{lastSync}</span></span>
            <button onClick={handleExport} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Export Data</button>
            <button onClick={loadUsers} className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all">
               {loading ? 'SYNCING...' : 'REFRESH FABRIC'}
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Entities Managed" value={stats.total} colorClass="border-primary-500 bg-primary-950/20" icon={<UserIcon className="w-8 h-8 text-primary-500" />} filterKey="all" />
        <StatCard title="Healthy Scope" value={stats.safe} colorClass="border-emerald-500 bg-emerald-950/20" icon={<CheckCircleIcon className="w-8 h-8 text-emerald-500" />} filterKey="safe" />
        <StatCard title="Warning Phase" value={stats.critical} colorClass="border-yellow-500 bg-yellow-950/20" icon={<AlertTriangleIcon className="w-8 h-8 text-yellow-500" />} filterKey="critical" />
        <StatCard title="Access Expired" value={stats.expired} colorClass="border-red-500 bg-red-950/20" icon={<XCircleIcon className="w-8 h-8 text-red-500" />} filterKey="expired" />
      </div>

      <div className="bg-gray-800/50 p-8 rounded-[2rem] border border-gray-700">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex flex-wrap items-center gap-10">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                        type="text"
                        placeholder="SEARCH PRINCIPALS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-900 text-white pl-12 pr-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 border border-gray-800 w-[400px] text-[11px] font-black tracking-widest"
                    />
                </div>
                
                <div className="flex items-center space-x-8">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={filterEnabledOnly} onChange={(e) => setFilterEnabledOnly(e.target.checked)} className="w-5 h-5 rounded-lg bg-gray-900 border-gray-800 text-primary-600" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Enabled Only</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={filterNeverExpireOnly} onChange={(e) => setFilterNeverExpireOnly(e.target.checked)} className="w-5 h-5 rounded-lg bg-gray-900 border-gray-800 text-primary-600" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Never Expiring</span>
                    </label>
                </div>
            </div>
            <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-900 px-6 py-3 rounded-xl border border-gray-800 shadow-inner">
                MATCHES: <span className="text-primary-500 text-lg ml-2">{filteredUsers.length}</span>
            </div>
        </div>

        {loading ? (
            <div className="text-center py-40">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-gray-600 font-black tracking-[0.5em] uppercase text-xs">Accessing Microsoft Identity Fabric...</p>
            </div>
        ) : error ? (
            <div className="bg-red-900/20 text-red-400 p-8 rounded-2xl border border-red-800/50 flex items-center space-x-6">
                <AlertTriangleIcon className="w-10 h-10"/>
                <div className="space-y-1">
                    <p className="font-black uppercase tracking-widest text-lg">Identity Sync Failed</p>
                    <p className="text-sm font-mono opacity-60">{error}</p>
                </div>
            </div>
        ) : (
            <UserTable users={filteredUsers} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;