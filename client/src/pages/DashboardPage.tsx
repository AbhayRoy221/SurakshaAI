import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertTriangle, Users, CheckCircle, Activity, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import type { KPIData, LiveAlert } from '../types';

function KPICard({ title, value, trend, icon: Icon, color }: { title: string; value: string | number; trend: number; icon: any; color: string }) {
  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend > 0 ? 'text-danger' : 'text-success'}`}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(trend)}% from yesterday</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: color + '20' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { apiFetch } = useApi();
  const { liveAlerts } = useSocket();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<Record<string, KPIData> | null>(null);
  const [riskDist, setRiskDist] = useState<any[]>([]);
  const [alertVolume, setAlertVolume] = useState<any[]>([]);
  const [topFlagged, setTopFlagged] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/dashboard/kpis'),
      apiFetch('/api/dashboard/risk-distribution'),
      apiFetch('/api/dashboard/alert-volume'),
      apiFetch('/api/dashboard/top-flagged'),
    ]).then(([k, r, a, f]) => {
      setKpis(k);
      setRiskDist(r);
      setAlertVolume(a);
      setTopFlagged(f);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 skeleton rounded-xl" />)}</div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 h-80 skeleton rounded-xl" />
          <div className="col-span-2 h-80 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  const severityColors: Record<string, string> = { critical: '#FF3B5C', high: '#FF8C00', medium: '#FFB700', low: '#00C48C' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time monitoring dashboard</p>
        </div>
        <div className="text-xs text-gray-500 font-mono">{new Date().toLocaleString('en-IN')}</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Alerts" value={kpis?.activeAlerts?.value || 0} trend={kpis?.activeAlerts?.trend || 0} icon={AlertTriangle} color="#FF3B5C" />
        <KPICard title="High Risk Users" value={kpis?.highRiskUsers?.value || 0} trend={kpis?.highRiskUsers?.trend || 0} icon={Users} color="#FFB700" />
        <KPICard title="Resolved Today" value={kpis?.resolvedToday?.value || 0} trend={kpis?.resolvedToday?.trend || 0} icon={CheckCircle} color="#00C48C" />
        <KPICard title="System Health" value={`${kpis?.systemHealth?.value || 99.7}%`} trend={kpis?.systemHealth?.trend || 0} icon={Activity} color="#00F5D4" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Alert Feed */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            Live Alert Feed
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {liveAlerts.length === 0 && <p className="text-xs text-gray-500 text-center py-8">Waiting for alerts...</p>}
            {liveAlerts.slice(0, 10).map((alert, i) => (
              <div key={alert.id} className={`p-3 rounded-lg bg-navy-900 border border-navy-700 ${i === 0 ? 'animate-slide-in-top' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">{alert.employeeName}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded`} style={{ color: severityColors[alert.severity], backgroundColor: severityColors[alert.severity] + '15' }}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{alert.alertType}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-500 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  <span className="text-[10px] font-mono text-warning">Risk: {alert.riskScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Risk Score Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={riskDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="band" tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1E293B', borderRadius: '8px', fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {riskDist.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Volume */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Alert Volume (7 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={alertVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1E293B', borderRadius: '8px', fontSize: 12 }} />
              <Line type="monotone" dataKey="alerts" stroke="#00F5D4" strokeWidth={2} dot={{ fill: '#00F5D4', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Flagged Users */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Top 5 Flagged Users</h3>
          <button onClick={() => navigate('/alerts')} className="text-xs text-mint hover:underline flex items-center gap-1">View All <ArrowRight size={12} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-navy-700">
                <th className="text-left pb-3 font-medium">Employee</th>
                <th className="text-left pb-3 font-medium">Department</th>
                <th className="text-left pb-3 font-medium">Risk Score</th>
                <th className="text-left pb-3 font-medium">Last Flagged Action</th>
                <th className="text-left pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {topFlagged.map(user => (
                <tr key={user.id} className="border-b border-navy-700/50 hover:bg-navy-900/50 cursor-pointer transition-colors" onClick={() => navigate(`/alerts`)}>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-xs font-mono text-mint">{user.id.slice(-4)}</div>
                      <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-gray-400">{user.department}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${user.risk_score}%`, backgroundColor: user.risk_score >= 80 ? '#FF3B5C' : user.risk_score >= 60 ? '#FF8C00' : '#FFB700' }} />
                      </div>
                      <span className="text-xs font-mono text-white">{user.risk_score}</span>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-gray-400 max-w-[200px] truncate">{user.last_flagged_action || 'N/A'}</td>
                  <td className="py-3">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      user.status === 'flagged' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    }`}>{user.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
