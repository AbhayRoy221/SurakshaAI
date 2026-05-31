import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { ArrowLeft, Shield, Clock, Server, Flag, CheckCircle, AlertTriangle, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { AlertDetail, HeatmapCell, ActivityEvent, XAIFactor } from '../types';

export default function AlertDetailPage() {
  const { id } = useParams();
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/alerts/${id}`).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleAction = async (action: string) => {
    try {
      const result = await apiFetch(`/api/alerts/${id}/action`, { method: 'PATCH', body: JSON.stringify({ action }) });
      addToast(result.message, action === 'false_positive' ? 'info' : 'success');
      setData(prev => prev ? { ...prev, alert: { ...prev.alert, status: result.newStatus } } : prev);
    } catch (err: any) { addToast(err.message, 'error'); }
  };

  const generateSTR = () => {
    if (!data) return;
    const doc = new jsPDF();
    const { alert, xaiFactors, events } = data;

    // Header
    doc.setFillColor(10, 14, 26);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(0, 245, 212);
    doc.setFontSize(20);
    doc.text('SurakshaAI', 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Suspicious Transaction Report', 15, 28);
    doc.text(`Union Bank of India | Report ID: STR-${Date.now().toString(36).toUpperCase()}`, 15, 35);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 150, 28);

    // Employee Details
    let y = 50;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('1. Employee Details', 15, y);
    y += 10;
    doc.setFontSize(10);
    const empDetails = [
      ['Name', alert.employee_name || ''],
      ['Employee ID', alert.employee_id],
      ['Department', alert.department || ''],
      ['Role', alert.employee_role || ''],
      ['Date of Joining', alert.date_of_joining || ''],
    ];
    empDetails.forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, 20, y);
      y += 7;
    });

    // Incident Summary
    y += 5;
    doc.setFontSize(14);
    doc.text('2. Incident Summary', 15, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Alert Type: ${alert.alert_type}`, 20, y); y += 7;
    doc.text(`Date/Time: ${new Date(alert.timestamp).toLocaleString('en-IN')}`, 20, y); y += 7;
    doc.text(`System Affected: ${alert.system_affected}`, 20, y); y += 7;
    const descLines = doc.splitTextToSize(`Description: ${alert.description}`, 170);
    doc.text(descLines, 20, y); y += descLines.length * 6 + 5;

    // Risk Assessment
    doc.setFontSize(14);
    doc.text('3. Risk Assessment', 15, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Risk Score: ${alert.risk_score}/100`, 20, y); y += 7;
    doc.text(`Confidence: ${(alert.confidence * 100).toFixed(0)}%`, 20, y); y += 10;
    doc.text('Contributing Factors (SHAP Analysis):', 20, y); y += 7;
    xaiFactors.slice(0, 5).forEach(f => {
      doc.text(`  • ${f.factor_name}: ${(f.weight * 100).toFixed(0)}%`, 25, y); y += 6;
    });

    // Activity Log
    y += 5;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text('4. Recent Suspicious Activity', 15, y);
    y += 10;
    doc.setFontSize(9);
    events.slice(0, 10).forEach(ev => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${new Date(ev.timestamp).toLocaleString('en-IN')} | ${ev.action_type} | ${ev.system} | ${ev.details}`, 20, y);
      y += 6;
    });

    // Recommended Action
    y += 10;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text('5. Recommended Action', 15, y);
    y += 10;
    doc.setFontSize(10);
    const recommendation = alert.risk_score >= 80
      ? 'IMMEDIATE escalation to Senior Investigator and CISO. Recommend temporary access suspension and FIU-IND STR filing within 24 hours.'
      : alert.risk_score >= 60
      ? 'Escalate to investigation team for detailed review. Monitor all activities for next 72 hours.'
      : 'Flag for routine review. No immediate action required but continue monitoring.';
    const recLines = doc.splitTextToSize(recommendation, 170);
    doc.text(recLines, 20, y); y += recLines.length * 6 + 10;

    // FIU-IND Fields
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text('6. FIU-IND Reporting Fields', 15, y);
    y += 10;
    doc.setFontSize(10);
    doc.text('Reporting Entity: Union Bank of India', 20, y); y += 7;
    doc.text('Branch Code: UBIN0530001', 20, y); y += 7;
    doc.text(`Transaction Reference: TXN-${Date.now().toString(36).toUpperCase()}`, 20, y);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by SurakshaAI | Confidential | For Internal Use Only', 15, 285);
      doc.text(`Page ${i} of ${pageCount}`, 185, 285);
    }

    doc.save(`STR_${alert.employee_id}_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast('STR Report generated and downloaded successfully', 'success');
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 skeleton rounded-xl" />)}</div>;
  if (!data) return <div className="text-center py-12 text-gray-500">Alert not found</div>;

  const { alert, xaiFactors, events, heatmap } = data;
  const riskColor = alert.risk_score >= 80 ? '#FF3B5C' : alert.risk_score >= 60 ? '#FF8C00' : alert.risk_score >= 30 ? '#FFB700' : '#00C48C';

  const xaiChartData = xaiFactors.map(f => ({ name: f.factor_name.length > 30 ? f.factor_name.slice(0, 30) + '...' : f.factor_name, weight: Math.round(f.weight * 100), fullName: f.factor_name }));

  // Group heatmap by day
  const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="animate-fade-in space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-mint transition-colors">
        <ArrowLeft size={16} /> Back to Alerts
      </button>

      {/* Alert Summary */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold`} style={{ color: riskColor, backgroundColor: riskColor + '15' }}>
                {alert.severity.toUpperCase()}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full ${alert.status === 'active' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                {alert.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{alert.alert_type}</h2>
            <p className="text-sm text-gray-400 mb-4">{alert.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div><span className="text-gray-500 block mb-1">Employee</span><span className="text-white font-medium">{alert.employee_name} ({alert.employee_id})</span></div>
              <div><span className="text-gray-500 block mb-1">Department</span><span className="text-white font-medium">{alert.department}</span></div>
              <div><span className="text-gray-500 block mb-1">System</span><span className="text-white font-medium">{alert.system_affected}</span></div>
              <div><span className="text-gray-500 block mb-1">Timestamp</span><span className="text-white font-mono">{new Date(alert.timestamp).toLocaleString('en-IN')}</span></div>
            </div>
          </div>
          {/* Risk Gauge */}
          <div className="flex flex-col items-center ml-6">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1E293B" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={riskColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${alert.risk_score * 2.64} ${264 - alert.risk_score * 2.64}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: riskColor }}>{alert.risk_score}</span>
                <span className="text-[9px] text-gray-500">RISK</span>
              </div>
            </div>
            <span className="text-xs mt-2 px-2 py-0.5 rounded bg-navy-700 text-gray-300 font-mono">{(alert.confidence * 100).toFixed(0)}% confidence</span>
          </div>
        </div>
      </div>

      {/* XAI Panel */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Shield size={16} className="text-mint" /> Explainability Panel (XAI)
        </h3>
        <p className="text-xs text-gray-500 mb-4">Top contributing factors identified by SHAP analysis</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={xaiChartData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 50]} unit="%" />
              <YAxis dataKey="name" type="category" width={180} tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1E293B', borderRadius: '8px', fontSize: 11 }} />
              <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                {xaiChartData.map((_, i) => <Cell key={i} fill={i === 0 ? '#FF3B5C' : i === 1 ? '#FF8C00' : '#FFB700'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="bg-navy-900 rounded-lg p-4 border border-navy-700">
            <p className="text-xs text-gray-300 leading-relaxed">
              <span className="text-mint font-semibold">AI Explanation: </span>
              This alert was triggered because <span className="text-white font-medium">{alert.employee_name}</span> {alert.description.toLowerCase().startsWith(alert.employee_name?.toLowerCase() || '') ? alert.description.slice(alert.employee_name?.length || 0).trim() : alert.description}
              {' '}Primary risk factors: <span className="text-warning">{xaiFactors.slice(0, 2).map(f => f.factor_name).join(' and ')}</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {xaiFactors.slice(0, 3).map(f => (
                <span key={f.id} className="text-[10px] px-2 py-1 rounded bg-navy-800 border border-navy-700 text-gray-400">
                  {f.factor_name}: <span className="text-white font-mono">{(f.weight * 100).toFixed(0)}%</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Heatmap */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock size={16} className="text-warning" /> Behavioral Heatmap (7 Days × 24 Hours)
        </h3>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="flex gap-0.5 mb-1">
              <div className="w-10" />
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex-1 text-center text-[8px] text-gray-600 font-mono">{i.toString().padStart(2, '0')}</div>
              ))}
            </div>
            {heatmapDays.map(day => (
              <div key={day} className="flex gap-0.5 mb-0.5">
                <div className="w-10 text-[10px] text-gray-500 flex items-center">{day}</div>
                {heatmap.filter(h => h.day === day).map((cell, i) => {
                  const bg = cell.intensity < 0.2 ? '#0F1629' : cell.intensity < 0.5 ? '#3d2e00' : cell.intensity < 0.7 ? '#FF8C00' : '#FF3B5C';
                  return (
                    <div key={i} className={`flex-1 h-6 rounded-sm transition-colors ${cell.isAnomalous ? 'animate-pulse-red ring-1 ring-danger/50' : ''}`}
                      style={{ backgroundColor: bg }} title={`${day} ${cell.hour}:00 - Intensity: ${(cell.intensity * 100).toFixed(0)}%`} />
                  );
                })}
              </div>
            ))}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#0F1629]" /> No Activity</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#3d2e00]" /> Moderate</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#FF8C00]" /> High</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#FF3B5C]" /> Anomalous</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Activity Timeline (Last 48 Hours)</h3>
        <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
          {events.slice(0, 20).map((ev, i) => (
            <div key={ev.id} className="flex gap-4 items-start">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  ev.risk_contribution > 15 ? 'bg-danger/20 text-danger' : ev.risk_contribution > 5 ? 'bg-warning/20 text-warning' : 'bg-navy-700 text-gray-400'
                }`}>{ev.action_type.slice(0, 2)}</div>
                {i < events.length - 1 && <div className="w-px h-6 bg-navy-700 mt-1" />}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">{ev.action_type} — {ev.system}</span>
                  {ev.risk_contribution > 10 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/10 text-danger font-mono">+{ev.risk_contribution}</span>}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{ev.details}</p>
                <p className="text-[10px] text-gray-600 font-mono mt-1">{new Date(ev.timestamp).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={() => handleAction('false_positive')} className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-gray-300 hover:border-success/40 hover:text-success transition-all">
          <CheckCircle size={16} /> Mark as False Positive
        </button>
        <button onClick={() => handleAction('escalate')} className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-gray-300 hover:border-danger/40 hover:text-danger transition-all">
          <AlertTriangle size={16} /> Escalate to Senior Investigator
        </button>
        <button onClick={generateSTR} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-mint to-mint-dark text-navy-950 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-mint/20 transition-all">
          <Download size={16} /> Generate STR Report
        </button>
      </div>
    </div>
  );
}
