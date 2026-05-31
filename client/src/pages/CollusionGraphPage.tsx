import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import { Search, SlidersHorizontal, Play, Eye, EyeOff, X } from 'lucide-react';
import type { GraphData, Employee } from '../types';

export default function CollusionGraphPage() {
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Employee | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [department, setDepartment] = useState('all');
  const [minRisk, setMinRisk] = useState(0);
  const [showLowRisk, setShowLowRisk] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGraph = () => {
    const params = new URLSearchParams();
    if (department !== 'all') params.set('department', department);
    if (minRisk > 0) params.set('minRisk', minRisk.toString());
    params.set('showLowRisk', showLowRisk.toString());
    apiFetch(`/api/collusion/graph?${params}`).then(data => {
      setGraphData(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchGraph(); }, [department, minRisk, showLowRisk]);

  useEffect(() => {
    if (!graphData || !cyRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [];

    graphData.nodes.forEach(n => {
      elements.push({
        data: {
          id: n.id, label: n.name, riskScore: n.risk_score, department: n.department,
          role: n.role, isFraudRing: n.isFraudRing, riskLevel: n.riskLevel,
          nodeData: JSON.stringify(n)
        }
      });
    });

    graphData.edges.forEach(e => {
      elements.push({
        data: { source: e.source_id, target: e.target_id, strength: e.strength, isFraudRing: e.is_fraud_ring, pattern: e.pattern_type }
      });
    });

    if (cyInstance.current) cyInstance.current.destroy();

    const cy = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => {
              const risk = ele.data('riskScore');
              if (risk >= 80) return '#FF3B5C';
              if (risk >= 60) return '#FF8C00';
              if (risk >= 30) return '#FFB700';
              return '#00C48C';
            },
            'width': (ele: any) => Math.max(30, ele.data('riskScore') * 0.6 + 20),
            'height': (ele: any) => Math.max(30, ele.data('riskScore') * 0.6 + 20),
            'label': 'data(label)',
            'font-size': '9px',
            'color': '#E2E8F0',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'border-width': (ele: any) => ele.data('isFraudRing') ? 3 : 1,
            'border-color': (ele: any) => ele.data('isFraudRing') ? '#FF3B5C' : '#1E293B',
            'font-family': 'Inter, sans-serif',
          } as any
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => Math.max(1, ele.data('strength') * 5),
            'line-color': (ele: any) => ele.data('isFraudRing') ? '#FF3B5C' : '#334155',
            'curve-style': 'bezier',
            'opacity': (ele: any) => ele.data('isFraudRing') ? 0.8 : 0.4,
            'line-style': (ele: any) => ele.data('isFraudRing') ? 'solid' : 'dashed',
          } as any
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 3, 'border-color': '#00F5D4', 'overlay-opacity': 0 }
        }
      ],
      layout: { name: 'cose', animate: true, animationDuration: 1000, nodeRepulsion: () => 8000, idealEdgeLength: () => 120, padding: 50 } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = JSON.parse(node.data('nodeData'));
      setSelectedNode(nodeData);

      const neighbors = node.neighborhood('node');
      const connected = neighbors.map((n: any) => JSON.parse(n.data('nodeData')));
      setConnectedUsers(connected);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) { setSelectedNode(null); setConnectedUsers([]); }
    });

    cyInstance.current = cy;

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
        cyInstance.current = null;
      }
    };
  }, [graphData]);

  const runCollusionScan = async () => {
    setScanning(true);
    try {
      const result = await apiFetch('/api/collusion/scan', { method: 'POST' });
      addToast(`Scan complete! ${result.fraudRingsFound} fraud ring(s) detected involving ${result.involvedEmployees.length} employees`, 'warning');
      fetchGraph();
    } catch (err: any) { addToast(err.message, 'error'); }
    finally { setScanning(false); }
  };

  if (loading) return <div className="h-[calc(100vh-120px)] skeleton rounded-xl" />;

  return (
    <div className="animate-fade-in h-[calc(100vh-120px)] flex gap-4">
      {/* Main Graph */}
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold text-white">Collusion Network Graph</h1>
            <p className="text-xs text-gray-400">GNN-based relationship analysis • {graphData?.nodes.length} nodes • {graphData?.edges.length} edges</p>
          </div>
          {graphData?.fraudRingDetected && (
            <div className="animate-pulse-red px-4 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center gap-2">
              <AlertTriangleIcon /> FRAUD RING DETECTED — {graphData.fraudRingMembers.length} employees involved
            </div>
          )}
        </div>

        <div ref={cyRef} className="w-full h-full bg-navy-900 rounded-xl border border-navy-700" />

        {/* Controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-3">
          <select value={department} onChange={e => setDepartment(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-mint/40">
            <option value="all">All Departments</option>
            <option value="Core Banking">Core Banking</option>
            <option value="Treasury">Treasury</option>
            <option value="Loan Origination">Loan Origination</option>
            <option value="Customer Database">Customer Database</option>
            <option value="IT Admin">IT Admin</option>
          </select>

          <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2">
            <span className="text-[10px] text-gray-500">Min Risk:</span>
            <input type="range" min={0} max={80} value={minRisk} onChange={e => setMinRisk(+e.target.value)} className="w-24 h-1 accent-mint" />
            <span className="text-xs text-mint font-mono">{minRisk}</span>
          </div>

          <button onClick={() => setShowLowRisk(!showLowRisk)} className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-xs ${showLowRisk ? 'bg-navy-800 border-navy-700 text-gray-400' : 'bg-mint/10 border-mint/30 text-mint'}`}>
            {showLowRisk ? <Eye size={14} /> : <EyeOff size={14} />} {showLowRisk ? 'Showing All' : 'High Risk Only'}
          </button>

          <button onClick={runCollusionScan} disabled={scanning} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mint to-mint-dark text-navy-950 rounded-lg text-xs font-semibold disabled:opacity-50">
            <Play size={14} /> {scanning ? 'Scanning...' : 'Run Collusion Scan'}
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-navy-800/90 backdrop-blur border border-navy-700 rounded-lg p-3">
          <p className="text-[10px] text-gray-500 mb-2 font-medium">LEGEND</p>
          <div className="space-y-1.5">
            {[{ color: '#00C48C', label: 'Low Risk (0-29)' }, { color: '#FFB700', label: 'Medium (30-59)' }, { color: '#FF8C00', label: 'High (60-79)' }, { color: '#FF3B5C', label: 'Critical (80+)' }].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-gray-400">{l.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 border-t border-navy-700 mt-1">
              <div className="w-6 h-0.5 bg-danger" />
              <span className="text-[10px] text-gray-400">Fraud Ring Link</span>
            </div>
          </div>
        </div>
      </div>

      {/* Node Detail Panel */}
      {selectedNode && (
        <div className="w-80 bg-navy-800 border border-navy-700 rounded-xl p-5 animate-slide-in overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Employee Detail</h3>
            <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
          </div>

          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-lg font-bold" style={{
              backgroundColor: (selectedNode.risk_score >= 80 ? '#FF3B5C' : selectedNode.risk_score >= 60 ? '#FF8C00' : '#FFB700') + '20',
              color: selectedNode.risk_score >= 80 ? '#FF3B5C' : selectedNode.risk_score >= 60 ? '#FF8C00' : '#FFB700'
            }}>
              {selectedNode.risk_score}
            </div>
            <p className="text-white font-semibold">{selectedNode.name}</p>
            <p className="text-xs text-gray-400 font-mono">{selectedNode.id}</p>
            {selectedNode.isFraudRing && <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger font-bold mt-1 inline-block">⚠ FRAUD RING MEMBER</span>}
          </div>

          <div className="space-y-2 text-xs mb-4">
            <div className="flex justify-between py-1.5 border-b border-navy-700"><span className="text-gray-500">Department</span><span className="text-white">{selectedNode.department}</span></div>
            <div className="flex justify-between py-1.5 border-b border-navy-700"><span className="text-gray-500">Role</span><span className="text-white">{selectedNode.role}</span></div>
            <div className="flex justify-between py-1.5 border-b border-navy-700"><span className="text-gray-500">Risk Level</span><span className="text-white capitalize">{selectedNode.riskLevel}</span></div>
          </div>

          {connectedUsers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Connected Users ({connectedUsers.length})</h4>
              <div className="space-y-2">
                {connectedUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-2 p-2 bg-navy-900 rounded-lg border border-navy-700">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{
                      backgroundColor: (u.risk_score >= 80 ? '#FF3B5C' : u.risk_score >= 60 ? '#FF8C00' : '#00C48C') + '20',
                      color: u.risk_score >= 80 ? '#FF3B5C' : u.risk_score >= 60 ? '#FF8C00' : '#00C48C'
                    }}>{u.risk_score}</div>
                    <div>
                      <p className="text-[11px] text-white font-medium">{u.name}</p>
                      <p className="text-[9px] text-gray-500">{u.department}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedNode.isFraudRing && (
                <div className="mt-3 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                  <p className="text-[11px] text-danger">
                    <span className="font-bold">Risk Propagation: </span>
                    Risk score elevated due to connections with flagged users in the detected fraud ring.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertTriangleIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
}
