import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import { Download, CheckCircle, AlertTriangle, FileText, Filter } from 'lucide-react';
import type { AuditEntry } from '../types';

export default function CompliancePage() {
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const [trail, setTrail] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  useEffect(() => {
    const params = new URLSearchParams();
    if (deptFilter !== 'all') params.set('department', deptFilter);
    if (actionFilter !== 'all') params.set('actionType', actionFilter);
    if (outcomeFilter !== 'all') params.set('outcome', outcomeFilter);
    Promise.all([
      apiFetch(`/api/compliance/audit-trail?${params}`),
      apiFetch('/api/compliance/summary'),
    ]).then(([t, s]) => { setTrail(t); setSummary(s); setLoading(false); });
  }, [deptFilter, actionFilter, outcomeFilter]);

  const exportCSV = () => {
    const headers = 'ID,Actor,Action,Department,Target,Outcome,Details,Timestamp\n';
    const rows = trail.map(r => `${r.id},"${r.actor}","${r.action_type}","${r.department}","${r.target}","${r.outcome}","${r.details}","${r.timestamp}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast('Audit log exported as CSV', 'success');
  };

  const outcomeColor: Record<string, string> = { SUCCESS: 'text-success bg-success/10', BLOCKED: 'text-danger bg-danger/10', FLAGGED: 'text-warning bg-warning/10', UNDER_REVIEW: 'text-info bg-info/10' };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 skeleton rounded-xl" />)}</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Compliance Dashboard</h1><p className="text-sm text-gray-400 mt-1">Regulatory monitoring and audit trail</p></div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-mint to-mint-dark text-navy-950 rounded-lg text-sm font-semibold"><Download size={16} /> Export Audit Log</button>
      </div>

      {/* Regulatory Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle size={20} className="text-success" />
              <span className="text-xs text-gray-400">{summary.rbiCompliance.label}</span>
            </div>
            <p className="text-lg font-bold text-success">✅ Compliant</p>
            <p className="text-xs text-gray-500 mt-1">{summary.rbiCompliance.details}</p>
          </div>
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <FileText size={20} className="text-info" />
              <span className="text-xs text-gray-400">{summary.fiuReporting.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{summary.fiuReporting.filed} <span className="text-sm text-gray-400">filed</span> • {summary.fiuReporting.pending} <span className="text-sm text-warning">pending</span></p>
          </div>
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-warning" />
              <span className="text-xs text-gray-400">{summary.sebiFlags.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{summary.sebiFlags.reviewed} <span className="text-sm text-gray-400">reviewed</span> • {summary.sebiFlags.pending} <span className="text-sm text-warning">pending</span></p>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Audit Trail ({trail.length} entries)</h3>
          <div className="flex gap-2">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="bg-navy-900 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-gray-300">
              <option value="all">All Depts</option>
              {['Core Banking', 'Treasury', 'Loan Origination', 'Customer Database', 'IT Admin'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-navy-900 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-gray-300">
              <option value="all">All Actions</option>
              {['LOGIN', 'DATA_ACCESS', 'TRANSFER', 'APPROVAL', 'CONFIG_CHANGE', 'EXPORT'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)} className="bg-navy-900 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-gray-300">
              <option value="all">All Outcomes</option>
              {['SUCCESS', 'BLOCKED', 'FLAGGED', 'UNDER_REVIEW'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-navy-800">
              <tr className="text-gray-500 border-b border-navy-700">
                <th className="text-left pb-3 font-medium">Actor</th><th className="text-left pb-3 font-medium">Action</th><th className="text-left pb-3 font-medium">Department</th>
                <th className="text-left pb-3 font-medium">Target</th><th className="text-left pb-3 font-medium">Outcome</th><th className="text-left pb-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {trail.map(entry => (
                <tr key={entry.id} className="border-b border-navy-700/50 hover:bg-navy-900/50">
                  <td className="py-2.5 text-white">{entry.actor}</td>
                  <td className="py-2.5 text-gray-400 font-mono">{entry.action_type}</td>
                  <td className="py-2.5 text-gray-400">{entry.department}</td>
                  <td className="py-2.5 text-gray-400 font-mono">{entry.target}</td>
                  <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${outcomeColor[entry.outcome] || 'text-gray-400'}`}>{entry.outcome}</span></td>
                  <td className="py-2.5 text-gray-500 font-mono">{new Date(entry.timestamp).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
