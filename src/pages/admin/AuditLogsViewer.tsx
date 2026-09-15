import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { getAuditLogs } from '../../services/db';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Activity,
  AlertCircle
} from 'lucide-react';

export const AuditLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const loadLogs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAuditLogs(100);
      setLogs(data || []);
    } catch (e: any) {
      console.error('Error loading audit logs:', e);
      setErrorMsg(e?.message || 'Unable to retrieve audit records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchResource = (log.resourceType || '').toLowerCase().includes(q) || (log.resourceId || '').toLowerCase().includes(q);
      const matchActor = (log.actorName || '').toLowerCase().includes(q) || (log.actorEmail || '').toLowerCase().includes(q);
      const matchDetails = (log.details || JSON.stringify(log.metadata || {})).toLowerCase().includes(q);
      return matchAction || matchResource || matchActor || matchDetails;
    }
    return true;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-[#F8FAFC] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#FF8A00]" />
            Audit & Compliance Log
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Immutable log of all administrative actions, vote transactions, status transitions, and data operations.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded-xl text-xs font-semibold transition-all border border-slate-700/60 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF8A00]' : 'text-[#94A3B8]'}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
          <button
            onClick={loadLogs}
            className="ml-auto underline hover:text-red-300 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs by actor, action type, resource, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF8A00]"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-[#334155] border border-slate-700 rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#FF8A00] font-medium"
        >
          <option value="all">All Action Types ({logs.length})</option>
          {uniqueActions.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 py-16 text-center text-[#94A3B8] text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#FF8A00] animate-spin" />
          <span>Loading audit trails...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-12 text-center space-y-2">
          <Activity className="w-8 h-8 text-[#94A3B8] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[#F8FAFC]">No Matching Audit Records</h3>
          <p className="text-xs text-[#94A3B8]">
            System activity will appear here as administrative actions and voting events occur.
          </p>
        </div>
      ) : (
        <div className="bg-[#1E293B] rounded-2xl border border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F172A]/70 border-b border-slate-800 text-[#94A3B8] uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {filteredLogs.map((log) => {
                  const isVote = (log.action || '').toUpperCase().includes('VOTE');
                  const isCreate = (log.action || '').toUpperCase().includes('CREATE') || (log.action || '').toUpperCase().includes('ADDED');
                  const isStatus = (log.action || '').toUpperCase().includes('STATUS') || (log.action || '').toUpperCase().includes('PUBLISH');

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3.5 text-[#94A3B8] whitespace-nowrap text-[11px]">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recent'}
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                            isVote
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isCreate
                              ? 'bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/30'
                              : isStatus
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700/50 text-[#F8FAFC] border border-slate-600/50'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-[#F8FAFC] font-sans text-xs">
                        <div className="font-semibold capitalize">{log.resourceType || 'Resource'}</div>
                        <div className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[120px]">
                          {log.resourceId}
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-[#F8FAFC] font-sans text-xs">
                        <div className="font-semibold">{log.actorName || 'System'}</div>
                        {log.actorEmail && (
                          <div className="text-[10px] text-[#94A3B8] truncate max-w-[140px]">
                            {log.actorEmail}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-3.5 font-mono text-[11px] text-[#94A3B8] max-w-sm">
                        <div className="truncate bg-[#334155]/60 px-2 py-1 rounded border border-slate-700 text-slate-300">
                          {log.details || JSON.stringify(log.metadata || {})}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

