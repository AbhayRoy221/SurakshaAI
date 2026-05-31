import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Employee, BehavioralDay } from '../types';

export default function BehavioralAnalyticsPage() {
  const { apiFetch } = useApi();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [behavioral, setBehavioral] = useState<BehavioralDay[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [peerComparison, setPeerComparison] = useState({ ratio: 1, peerAvg: 30 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/employees').then(data => { setEmployees(data); if (data.length) setSelectedId(data[0].id); });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    apiFetch(`/api/employees/${selectedId}/behavioral`).then(data => {
      setEmployee(data.employee); setBehavioral(data.behavioral); setPeerComparison(data.peerComparison); setLoading(false);
    });
  }, [selectedId]);

  const pieData = behavioral.length > 0 ? [
    { name: 'Core Banking', value: behavioral[behavioral.length - 1].core_banking_pct * 100, color: '#00F5D4' },
    { name: 'Treasury', value: behavioral[behavioral.length - 1].treasury_pct * 100, color: '#FFB700' },
    { name: 'Loans', value: behavioral[behavioral.length - 1].loans_pct * 100, color: '#3B82F6' },
    { name: 'Customer DB', value: behavioral[behavioral.length - 1].customer_db_pct * 100, color: '#FF3B5C' },
  ] : [];

  const ttStyle = { backgroundColor: '#111827', border: '1px solid #1E293B', borderRadius: '8px', fontSize: 11 };

  if (loading) return <div className="grid grid-cols-2 gap-6">{[1,2,3,4].map(i => <div key={i} className="h-64 skeleton rounded-xl" />)}</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Behavioral Analytics</h1><p className="text-sm text-gray-400 mt-1">Individual employee behavior profiling</p></div>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-mint/40 min-w-[250px]">
          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>)}
        </select>
      </div>
      {employee && <>
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-5 flex items-center gap-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{
            backgroundColor: (employee.risk_score >= 80 ? '#FF3B5C' : employee.risk_score >= 60 ? '#FF8C00' : '#FFB700') + '20',
            color: employee.risk_score >= 80 ? '#FF3B5C' : employee.risk_score >= 60 ? '#FF8C00' : '#FFB700'
          }}>{employee.risk_score}</div>
          <div className="flex-1"><h2 className="text-lg font-bold text-white">{employee.name}</h2><p className="text-xs text-gray-400">{employee.role} • {employee.department} • {employee.id}</p></div>
          <div className="text-right"><p className="text-xs text-gray-500">Peer Comparison</p><p className={`text-lg font-bold ${peerComparison.ratio > 2 ? 'text-danger' : 'text-success'}`}>{peerComparison.ratio}x</p><p className="text-[10px] text-gray-500">more records than peers</p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">30-Day Activity Trend vs Baseline</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={behavioral}><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" /><XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 9 }} tickFormatter={d => new Date(d).getDate().toString()} /><YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} /><Tooltip contentStyle={ttStyle} /><Line type="monotone" dataKey="baseline_count" stroke="#334155" strokeWidth={1} strokeDasharray="5 5" name="Baseline" dot={false} /><Line type="monotone" dataKey="action_count" stroke="#00F5D4" strokeWidth={2} name="Actual" dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">System Access Breakdown</h3>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={ttStyle} /></PieChart></ResponsiveContainer>
              <div className="space-y-2">{pieData.map(p => <div key={p.name} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} /><span className="text-[11px] text-gray-400">{p.name}: <span className="text-white font-mono">{p.value.toFixed(0)}%</span></span></div>)}</div>
            </div>
          </div>
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Anomaly Score History</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={behavioral}><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" /><XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 9 }} tickFormatter={d => new Date(d).getDate().toString()} /><YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 1]} /><Tooltip contentStyle={ttStyle} /><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF3B5C" stopOpacity={0.3} /><stop offset="95%" stopColor="#FF3B5C" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="anomaly_score" stroke="#FF3B5C" fill="url(#ag)" strokeWidth={2} name="Anomaly" /></AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Risk Score Timeline</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={behavioral}><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" /><XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 9 }} tickFormatter={d => new Date(d).getDate().toString()} /><YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 100]} /><Tooltip contentStyle={ttStyle} /><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FFB700" stopOpacity={0.3} /><stop offset="95%" stopColor="#FFB700" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="risk_score" stroke="#FFB700" fill="url(#rg)" strokeWidth={2} name="Risk" /></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>}
    </div>
  );
}
