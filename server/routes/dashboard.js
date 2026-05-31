const express = require('express');
const { getDb } = require('../db/connection');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function allRows(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function oneRow(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

router.get('/kpis', async (req, res) => {
  const db = await getDb();
  const activeAlerts = oneRow(db, "SELECT COUNT(*) as count FROM alerts WHERE status = 'active'").count;
  const highRiskUsers = oneRow(db, "SELECT COUNT(*) as count FROM employees WHERE risk_score >= 60").count;
  const resolvedToday = oneRow(db, "SELECT COUNT(*) as count FROM alerts WHERE status IN ('resolved','false_positive')").count;
  res.json({
    activeAlerts: { value: activeAlerts, trend: 12 },
    highRiskUsers: { value: highRiskUsers, trend: -3 },
    resolvedToday: { value: resolvedToday || 2, trend: 8 },
    systemHealth: { value: 99.7, trend: 0.1 }
  });
});

router.get('/risk-distribution', async (req, res) => {
  const db = await getDb();
  const low = oneRow(db, "SELECT COUNT(*) as count FROM employees WHERE risk_score < 30").count;
  const medium = oneRow(db, "SELECT COUNT(*) as count FROM employees WHERE risk_score >= 30 AND risk_score < 60").count;
  const high = oneRow(db, "SELECT COUNT(*) as count FROM employees WHERE risk_score >= 60 AND risk_score < 80").count;
  const critical = oneRow(db, "SELECT COUNT(*) as count FROM employees WHERE risk_score >= 80").count;
  res.json([
    { band: 'Low (0-29)', count: low, color: '#00C48C' },
    { band: 'Medium (30-59)', count: medium, color: '#FFB700' },
    { band: 'High (60-79)', count: high, color: '#FF8C00' },
    { band: 'Critical (80+)', count: critical, color: '#FF3B5C' }
  ]);
});

router.get('/alert-volume', async (req, res) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    days.push({ day: label, alerts: Math.floor(Math.random() * 8) + 2 + (i === 1 ? 6 : 0) });
  }
  res.json(days);
});

router.get('/top-flagged', async (req, res) => {
  const db = await getDb();
  const users = allRows(db, `
    SELECT e.id, e.name, e.department, e.risk_score, e.status,
           (SELECT a.alert_type FROM alerts a WHERE a.employee_id = e.id ORDER BY a.timestamp DESC LIMIT 1) as last_flagged_action
    FROM employees e ORDER BY e.risk_score DESC LIMIT 5
  `);
  res.json(users);
});

module.exports = router;
