import React, { useState, useMemo } from 'react';
import { User } from '../types';

type SortKey = keyof User;
type SortOrder = 'asc' | 'desc';

const UserTable: React.FC<{ users: User[] }> = ({ users }) => {
  const [sortKey, setSortKey] = useState<SortKey>('passwordExpiresInDays');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === undefined || bVal === undefined) return 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') return aVal - bVal;
      const sA = String(aVal).toLowerCase();
      const sB = String(bVal).toLowerCase();
      return sA < sB ? -1 : 1;
    });
    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [users, sortKey, sortOrder]);

  const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '—';
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const TableHeader = ({ columnKey, label }: { columnKey: SortKey, label: string }) => (
    <th
        className="px-6 py-4 text-left text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-white/5 transition-colors border-b border-gray-800"
        onClick={() => {
            if (columnKey === sortKey) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            else { setSortKey(columnKey); setSortOrder('asc'); }
        }}
    >
        <div className="flex items-center space-x-2">
            <span>{label}</span>
            {sortKey === columnKey && <span className="text-primary-500 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
        </div>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-gray-800 bg-gray-900/40">
        <table className="min-w-full">
            <thead className="bg-[#0f172a] sticky top-0 z-10 shadow-xl">
                <tr>
                    <TableHeader columnKey="displayName" label="Identity" />
                    <TableHeader columnKey="passwordLastSetDateTime" label="Last Reset" />
                    <TableHeader columnKey="passwordExpiryDate" label="Target Expiry" />
                    <TableHeader columnKey="passwordExpiresInDays" label="Days Balance" />
                    <TableHeader columnKey="neverExpires" label="Policy Mode" />
                    <TableHeader columnKey="accountEnabled" label="Status" />
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
                {sortedUsers.map(user => {
                    const isCritical = user.passwordExpiresInDays <= 14 && !user.neverExpires;
                    const isExpired = user.passwordExpiresInDays <= 0 && !user.neverExpires;
                    
                    return (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-5">
                                <div className="text-xs font-black text-white group-hover:text-primary-400">{user.displayName}</div>
                                <div className="text-[10px] text-gray-600 font-mono mt-1">{user.userPrincipalName}</div>
                            </td>
                            <td className="px-6 py-5">
                                <div className="text-[10px] font-black text-gray-400 uppercase">{formatDate(user.passwordLastSetDateTime)}</div>
                                <div className="text-[8px] text-gray-700 uppercase font-black mt-1">
                                    {/* FIX: Removed 'as any' cast as daysSinceLastReset is now a valid property of User interface */}
                                    {user.daysSinceLastReset} DAYS AGO
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className={`text-[10px] font-black uppercase ${isExpired ? 'text-red-500' : isCritical ? 'text-yellow-500' : 'text-gray-400'}`}>
                                    {user.neverExpires ? 'INFINITY' : formatDate(user.passwordExpiryDate)}
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className={`text-lg font-black italic tracking-tighter ${isExpired ? 'text-red-500' : isCritical ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                    {user.neverExpires ? '∞' : (isExpired ? `-${Math.abs(user.passwordExpiresInDays)}` : user.passwordExpiresInDays)}
                                </div>
                                <div className="text-[8px] text-gray-700 uppercase font-black mt-1">
                                    {isExpired ? 'OVERDUE' : 'REMAINING'}
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${
                                    user.neverExpires ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-gray-800 border-gray-700 text-gray-500'
                                }`}>
                                    {user.neverExpires ? 'NEVER EXPIRE' : 'HYBRID ENFORCED'}
                                </span>
                            </td>
                            <td className="px-6 py-5">
                                <div className={`w-3 h-3 rounded-full ${user.accountEnabled ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
  );
};

export default UserTable;