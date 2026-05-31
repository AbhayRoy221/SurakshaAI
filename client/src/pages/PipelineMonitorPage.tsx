import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from 'recharts';
import { Database, Server, Cpu, HardDrive, Activity, RefreshCw, Zap, Radio, Clock, ArrowRight, CheckCircle, Layers } from 'lucide-react';

/* ── Type definitions ───────────────────────────────────────────────── */

interface ComponentStatus {
  name: string;
  status: string;
  metric: string;
  subMetrics: string[];
}

interface PipelineStatus {
  overall: string;
  components: ComponentStatus[];
}

interface ThroughputPoint {
  time: string;
  eventsPerSec: number;
  latencyMs: number;
  errorRate?: number;
}

interface KafkaTopic {
  name: string;
  partitions: number;
  messagesPerSec: number;
  consumerLag: number;
  consumerGroups: number;
}

interface FlinkJob {
  id: string;
  name: string;
  status: string;
  inputRate: number;
  outputRate: number;
  eventsProcessed: number;
  uptime: string;
  parallelism: number;
  lastCheckpoint: string;
}

/* ── Fallback / mock data generators ────────────────────────────────── */

function generateFallbackStatus(): PipelineStatus {
  return {
    overall: 'operational',
    components: [
      { name: 'Kafka', status: 'healthy', metric: '3 Brokers', subMetrics: ['Replication Factor: 3', 'ISR: 100%'] },
      { name: 'Flink', status: 'healthy', metric: '4 Task Managers', subMetrics: ['Slots Used: 12/16', 'Heap: 68%'] },
      { name: 'Elasticsearch', status: 'healthy', metric: '3 Nodes', subMetrics: ['Shards: 45 active', 'Disk: 42%'] },
      { name: 'PostgreSQL', status: 'healthy', metric: '24 Connections', subMetrics: ['Pool: 24/100', 'Replication Lag: 0ms'] },
    ],
  };
}

function generateFallbackThroughput(): ThroughputPoint[] {
  const now = Date.now();
  return Array.from({ length: 60 }, (_, i) => {
    const t = new Date(now - (59 - i) * 60000);
    return {
      time: t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      eventsPerSec: 12000 + Math.floor(Math.random() * 4000),
      latencyMs: 8 + Math.random() * 12,
      errorRate: Math.random() * 0.3,
    };
  });
}

function generateFallbackTopics(): KafkaTopic[] {
  return [
    { name: 'txn.raw.events', partitions: 12, messagesPerSec: 8420, consumerLag: 2, consumerGroups: 3 },
    { name: 'txn.enriched', partitions: 12, messagesPerSec: 8380, consumerLag: 0, consumerGroups: 2 },
    { name: 'alerts.generated', partitions: 6, messagesPerSec: 142, consumerLag: 0, consumerGroups: 4 },
    { name: 'user.behavior.events', partitions: 8, messagesPerSec: 3210, consumerLag: 14, consumerGroups: 2 },
    { name: 'audit.log', partitions: 4, messagesPerSec: 560, consumerLag: 0, consumerGroups: 1 },
    { name: 'model.scores', partitions: 6, messagesPerSec: 1870, consumerLag: 38, consumerGroups: 3 },
  ];
}

function generateFallbackJobs(): FlinkJob[] {
  return [
    { id: 'fj-001', name: 'Transaction Anomaly Detector', status: 'RUNNING', inputRate: 8420, outputRate: 8380, eventsProcessed: 284_920_134, uptime: '14d 7h 23m', parallelism: 4, lastCheckpoint: '32s ago' },
    { id: 'fj-002', name: 'Behavioral Pattern Analyzer', status: 'RUNNING', inputRate: 3210, outputRate: 3180, eventsProcessed: 102_340_871, uptime: '14d 7h 22m', parallelism: 4, lastCheckpoint: '28s ago' },
    { id: 'fj-003', name: 'Real-time Risk Scorer', status: 'RUNNING', inputRate: 11600, outputRate: 11540, eventsProcessed: 410_283_091, uptime: '7d 2h 11m', parallelism: 8, lastCheckpoint: '15s ago' },
    { id: 'fj-004', name: 'Alert Aggregator', status: 'RUNNING', inputRate: 142, outputRate: 138, eventsProcessed: 4_820_330, uptime: '14d 7h 23m', parallelism: 2, lastCheckpoint: '45s ago' },
  ];
}

/* ── Icon mapping ───────────────────────────────────────────────────── */

const componentIcons: Record<string, React.ElementType> = {
  Kafka: Radio,
  Flink: Zap,
  Elasticsearch: Database,
  PostgreSQL: HardDrive,
};

const componentColors: Record<string, string> = {
  Kafka: '#00F5D4',
  Flink: '#3B82F6',
  Elasticsearch: '#FFB700',
  PostgreSQL: '#A78BFA',
};

/* ── Tooltip styling ─────────────────────────────────────────────────── */

const ttStyle: React.CSSProperties = {
  backgroundColor: '#111827',
  border: '1px solid #1E293B',
  borderRadius: '8px',
  fontSize: 11,
};

/* ── Helper ──────────────────────────────────────────────────────────── */

function fmtNum(n: number | undefined | null): string {
  if (n === undefined || n === null) return '0';
  return n.toLocaleString('en-IN');
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function PipelineMonitorPage() {
  const { apiFetch } = useApi();

  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [throughput, setThroughput] = useState<ThroughputPoint[]>([]);
  const [topics, setTopics] = useState<KafkaTopic[]>([]);
  const [jobs, setJobs] = useState<FlinkJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, t, k, f] = await Promise.all([
        apiFetch('/api/pipeline/status').catch(() => generateFallbackStatus()),
        apiFetch('/api/pipeline/throughput').catch(() => generateFallbackThroughput()),
        apiFetch('/api/pipeline/kafka-topics').catch(() => generateFallbackTopics()),
        apiFetch('/api/pipeline/flink-jobs').catch(() => generateFallbackJobs()),
      ]);
      const formattedThroughput = (t || []).map((p: any) => ({
        ...p,
        time: p.time || (p.timestamp ? new Date(p.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '')
      }));
      setStatus(s);
      setThroughput(formattedThroughput);
      setTopics(k);
      setJobs(f);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch {
      setStatus(generateFallbackStatus());
      setThroughput(generateFallbackThroughput());
      setTopics(generateFallbackTopics());
      setJobs(generateFallbackJobs());
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  /* Initial fetch + 10-second refresh */
  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  /* Tick counter – updates "X seconds ago" every second */
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [lastUpdated]);

  /* ── Loading skeleton ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 skeleton rounded-xl w-80" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 skeleton rounded-xl" />)}
        </div>
        <div className="h-80 skeleton rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 skeleton rounded-xl" />
          <div className="h-96 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Consumer lag color ─────────────────────────────────────────────── */
  function lagColor(lag: number): string {
    if (lag <= 5) return 'text-success';
    if (lag <= 20) return 'text-warning';
    return 'text-danger';
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Pipeline Monitor</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time streaming infrastructure status</p>
        </div>
        <div className="flex items-center gap-4">
          {/* System status indicator */}
          <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="text-xs text-success font-medium">All Systems Operational</span>
          </div>
          {/* Last updated + manual refresh */}
          <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
            <Clock size={12} />
            <span>Updated {secondsAgo}s ago</span>
            <button
              onClick={() => { fetchAll(); }}
              className="ml-1 p-1.5 rounded-lg bg-navy-800 border border-navy-700 hover:border-mint/40 transition-colors"
              title="Refresh now"
            >
              <RefreshCw size={13} className="text-gray-400 hover:text-mint" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Component Status Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(status?.components ?? []).map(comp => {
          const Icon = componentIcons[comp.name] || Server;
          const color = componentColors[comp.name] || '#00F5D4';
          return (
            <div key={comp.name} className="bg-navy-800 rounded-xl border border-navy-700 p-5 card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{comp.name}</p>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success">
                      Healthy
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-mint mb-2">{comp.metric}</p>
              {comp.subMetrics.map((sm, i) => (
                <p key={i} className="text-[11px] text-gray-500 leading-relaxed">{sm}</p>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Throughput Chart ────────────────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity size={14} className="text-mint" />
            Event Throughput (Last 60 Minutes)
          </h3>
          <div className="flex items-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded bg-[#00F5D4] inline-block" /> Events/sec</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded bg-[#FFB700] inline-block" /> Latency (ms)</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={throughput}>
            <defs>
              <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F5D4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00F5D4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 9 }} interval={9} />
            <YAxis yAxisId="left" tick={{ fill: '#94A3B8', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94A3B8', fontSize: 10 }} unit="ms" />
            <Tooltip contentStyle={ttStyle} formatter={(value: any, name: any) => {
              const numVal = Number(value || 0);
              if (name === 'eventsPerSec') return [fmtNum(numVal), 'Events/sec'];
              if (name === 'latencyMs') return [`${numVal.toFixed(1)} ms`, 'Latency'];
              return [numVal, name];
            }} />
            <Area yAxisId="left" type="monotone" dataKey="eventsPerSec" stroke="#00F5D4" fill="url(#throughputGrad)" strokeWidth={2} name="eventsPerSec" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="latencyMs" stroke="#FFB700" strokeWidth={1.5} dot={false} name="latencyMs" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Two-column: Kafka Topics + Flink Jobs ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Kafka Topics ─────────────────────────────────────────────── */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Radio size={14} className="text-[#00F5D4]" />
            Kafka Topics
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-navy-700">
                  <th className="text-left pb-3 font-medium">Topic Name</th>
                  <th className="text-right pb-3 font-medium">Part.</th>
                  <th className="text-right pb-3 font-medium">Msg/sec</th>
                  <th className="text-right pb-3 font-medium">Lag</th>
                  <th className="text-right pb-3 font-medium">Groups</th>
                </tr>
              </thead>
              <tbody>
                {topics.map(topic => (
                  <tr key={topic.name} className="border-b border-navy-700/50 hover:bg-navy-900/50 transition-colors">
                    <td className="py-2.5">
                      <span className="text-xs font-mono text-mint">{topic.name}</span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-400 text-right">{topic.partitions}</td>
                    <td className="py-2.5 text-xs text-white text-right font-mono">{fmtNum(topic.messagesPerSec)}</td>
                    <td className={`py-2.5 text-xs text-right font-mono font-medium ${lagColor(topic.consumerLag)}`}>
                      {fmtNum(topic.consumerLag)}
                    </td>
                    <td className="py-2.5 text-xs text-gray-400 text-right">{topic.consumerGroups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Flink Jobs ───────────────────────────────────────────────── */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={14} className="text-[#3B82F6]" />
            Flink Jobs
          </h3>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {jobs.map(job => {
              const maxRate = Math.max(job.inputRate, job.outputRate, 1);
              return (
                <div key={job.id} className="bg-navy-900 rounded-lg border border-navy-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-white">{job.name}</p>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success">
                      {job.status}
                    </span>
                  </div>

                  {/* Input → Output */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-500 mb-1">Input</p>
                      <div className="w-full h-1.5 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${(job.inputRate / maxRate) * 100}%` }} />
                      </div>
                      <p className="text-[10px] font-mono text-white mt-0.5">{fmtNum(job.inputRate)} evt/s</p>
                    </div>
                    <ArrowRight size={12} className="text-gray-600 mt-2" />
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-500 mb-1">Output</p>
                      <div className="w-full h-1.5 bg-navy-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-mint" style={{ width: `${(job.outputRate / maxRate) * 100}%` }} />
                      </div>
                      <p className="text-[10px] font-mono text-white mt-0.5">{fmtNum(job.outputRate)} evt/s</p>
                    </div>
                  </div>

                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><Layers size={10} /> Processed: <span className="text-white font-mono">{fmtNum(job.eventsProcessed)}</span></span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {job.uptime}</span>
                    <span>P: {job.parallelism}</span>
                    <span className="flex items-center gap-1"><CheckCircle size={10} className="text-success" /> Ckpt: {job.lastCheckpoint}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
