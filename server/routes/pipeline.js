const express = require('express');
const { getDb } = require('../db/connection');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/* ── helpers ─────────────────────────────────────────────────────────── */

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function jitter(base, range) {
  return Math.round(base + rand(-range, range));
}

function isoAgo(ms) {
  return new Date(Date.now() - ms).toISOString();
}

function formatUptime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

/* ── 1. GET /status ──────────────────────────────────────────────────── */

router.get('/status', async (req, res) => {
  try {
    const uptimeBase = 99.97;
    const uptime = +(uptimeBase - rand(0, 0.02)).toFixed(2);

    const slots = 16;
    const slotsUsed = randInt(10, 13);
    const docsCount = `${(2.4 + rand(-0.1, 0.1)).toFixed(1)}M`;
    const storageUsed = `${(12.7 + rand(-0.3, 0.3)).toFixed(1)} GB`;
    const connections = randInt(20, 30);
    const dbSize = `${(4.2 + rand(-0.1, 0.1)).toFixed(1)} GB`;

    res.json({
      overall: 'operational',
      uptime,
      lastHeartbeat: new Date().toISOString(),
      components: [
        {
          name: 'Kafka',
          status: 'healthy',
          metric: '3 Brokers',
          subMetrics: [
            'Topics: 12',
            'Partitions: 48',
            'Status: Active'
          ]
        },
        {
          name: 'Flink',
          status: 'healthy',
          metric: '4 Task Managers',
          subMetrics: [
            `Slots Used: ${slotsUsed}/${slots}`,
            'Job State: Running',
            'Heap: 68%'
          ]
        },
        {
          name: 'Elasticsearch',
          status: 'healthy',
          metric: '3 Nodes',
          subMetrics: [
            `Docs: ${docsCount}`,
            `Storage: ${storageUsed}`,
            'Health: Green'
          ]
        },
        {
          name: 'PostgreSQL',
          status: 'healthy',
          metric: `${connections} Connections`,
          subMetrics: [
            `Pool: ${connections}/100`,
            `DB Size: ${dbSize}`,
            'Lag: 0ms'
          ]
        }
      ]
    });
  } catch (err) {
    console.error('Pipeline status error:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline status' });
  }
});

/* ── 2. GET /throughput ──────────────────────────────────────────────── */

router.get('/throughput', async (req, res) => {
  try {
    const points = [];
    const now = Date.now();

    for (let i = 59; i >= 0; i--) {
      const ts = new Date(now - i * 60000).toISOString();

      // ~5 % chance of a spike to simulate bulk operations
      const isSpike = Math.random() < 0.05;
      const eventsPerSec = isSpike
        ? randInt(2500, 3000)
        : jitter(1200, 200);

      const bytesPerSec = Math.round(eventsPerSec * rand(380, 440));
      const latencyMs = isSpike
        ? randInt(35, 50)
        : randInt(10, 30);
      const errorRate = +(rand(0.0005, 0.003)).toFixed(4);

      points.push({ timestamp: ts, eventsPerSec, bytesPerSec, latencyMs, errorRate });
    }

    res.json(points);
  } catch (err) {
    console.error('Pipeline throughput error:', err);
    res.status(500).json({ error: 'Failed to fetch throughput data' });
  }
});

/* ── 3. GET /kafka-topics ────────────────────────────────────────────── */

const KAFKA_TOPICS = [
  { name: 'txn.core-banking.raw',  partitions: 6, replicationFactor: 3, baseMps: 450,  baseLag: 12, consumerGroups: 2 },
  { name: 'txn.treasury.raw',      partitions: 4, replicationFactor: 3, baseMps: 280,  baseLag: 5,  consumerGroups: 1 },
  { name: 'txn.loans.raw',         partitions: 4, replicationFactor: 3, baseMps: 180,  baseLag: 3,  consumerGroups: 1 },
  { name: 'auth.events',           partitions: 3, replicationFactor: 3, baseMps: 120,  baseLag: 0,  consumerGroups: 2 },
  { name: 'alerts.enriched',       partitions: 2, replicationFactor: 3, baseMps: 45,   baseLag: 0,  consumerGroups: 3 },
  { name: 'ml.predictions',        partitions: 2, replicationFactor: 3, baseMps: 30,   baseLag: 1,  consumerGroups: 1 }
];

router.get('/kafka-topics', async (req, res) => {
  try {
    const topics = KAFKA_TOPICS.map(t => ({
      name:              t.name,
      partitions:        t.partitions,
      replicationFactor: t.replicationFactor,
      messagesPerSec:    jitter(t.baseMps, Math.ceil(t.baseMps * 0.1)),
      consumerLag:       Math.max(0, jitter(t.baseLag, Math.ceil(t.baseLag * 0.5 + 1))),
      consumerGroups:    t.consumerGroups
    }));

    res.json(topics);
  } catch (err) {
    console.error('Kafka topics error:', err);
    res.status(500).json({ error: 'Failed to fetch Kafka topic data' });
  }
});

/* ── 4. GET /flink-jobs ──────────────────────────────────────────────── */

const FLINK_JOBS_BASE = [
  {
    id: 'job-001',
    name: 'Transaction Anomaly Detector',
    checkpointInterval: '30s',
    parallelism: 4,
    baseInputRate: 850,
    baseOutputRate: 45,
    baseEventsProcessed: 847293012
  },
  {
    id: 'job-002',
    name: 'Behavioral Profile Aggregator',
    checkpointInterval: '60s',
    parallelism: 2,
    baseInputRate: 320,
    baseOutputRate: 20,
    baseEventsProcessed: 234891023
  },
  {
    id: 'job-003',
    name: 'Real-time Alert Enricher',
    checkpointInterval: '10s',
    parallelism: 2,
    baseInputRate: 45,
    baseOutputRate: 45,
    baseEventsProcessed: 12039481
  }
];

// Simulate a stable start time ~14 days ago, fixed per process boot
const FLINK_START = Date.now() - (14 * 24 * 3600 + 7 * 3600 + 23 * 60) * 1000;

router.get('/flink-jobs', async (req, res) => {
  try {
    const now = Date.now();
    const uptimeMs = now - FLINK_START;

    const jobs = FLINK_JOBS_BASE.map((j, idx) => {
      // Slight per-job uptime offset (job-003 started a minute later)
      const jobUptimeMs = uptimeMs - idx * 30000;
      const eventsProcessed = j.baseEventsProcessed + Math.floor(jobUptimeMs / 1000 * j.baseInputRate * 0.001);

      // Parse checkpoint interval to ms for lastCheckpoint calculation
      const cpIntervalSec = parseInt(j.checkpointInterval, 10);
      const lastCheckpointAgo = randInt(0, cpIntervalSec) * 1000;

      return {
        id:                 j.id,
        name:               j.name,
        status:             'RUNNING',
        startTime:          new Date(FLINK_START + idx * 30000).toISOString(),
        uptime:             formatUptime(jobUptimeMs),
        eventsProcessed,
        checkpointInterval: j.checkpointInterval,
        lastCheckpoint:     isoAgo(lastCheckpointAgo),
        parallelism:        j.parallelism,
        inputRate:          jitter(j.baseInputRate, Math.ceil(j.baseInputRate * 0.05)),
        outputRate:         jitter(j.baseOutputRate, Math.ceil(j.baseOutputRate * 0.1))
      };
    });

    res.json(jobs);
  } catch (err) {
    console.error('Flink jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch Flink job data' });
  }
});

module.exports = router;
