import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import type { Alert } from '../types';

export default function AlertsListPage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/api/alerts').then(data => { setAlerts(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = alerts.filter(a => {
    if (filter !== 'all' && a.severity !== filter) return false;
    if (search && !a.employee_name?.toLowerCase().includes(search.toLowerCase()) && !a.alert_type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const severityColors: Record<string, string> = { critical: '#FF3B5C', high: '#FF8C00', medium: '#FFB700', low: '#00C48C' };

  if (loading) return <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Alert Center</h1>
        <p className="text-sm text-gray-400 mt-1">{alerts.length} total alerts</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts..." className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-mint/50" />
        </div>
        <div className="flex gap-2">
          {['all', 'critical', 'high', 'medium'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-2 rounded-lg font-medium transition-all ${filter === f ? 'bg-mint/10 text-mint border border-mint/30' : 'bg-navy-800 text-gray-400 border border-navy-700 hover:border-gray-600'}`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(alert => (
          <div key={alert.id} onClick={() => navigate(`/alerts/${alert.id}`)} className="bg-navy-800 rounded-xl border border-navy-700 p-5 cursor-pointer card-hover flex items-center gap-5">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: severityColors[alert.severity] + '15' }}>
              <span className="text-lg font-bold font-mono" style={{ color: severityColors[alert.severity] }}>{alert.risk_score}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">{alert.employee_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium" style={{ color: severityColors[alert.severity], backgroundColor: severityColors[alert.severity] + '15' }}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-mint font-medium">{alert.alert_type}</p>
              <p className="text-xs text-gray-400 mt-1 truncate">{alert.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">{alert.department}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-1">{new Date(alert.timestamp).toLocaleString('en-IN')}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${
                alert.status === 'active' ? 'bg-warning/10 text-warning' : alert.status === 'escalated' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
              }`}>{alert.status}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No alerts matching your criteria</div>}
      </div>
    </div>
  );
}
