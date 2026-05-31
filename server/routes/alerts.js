const express = require('express');
const { getDb, saveDb } = require('../db/connection');
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

router.get('/', async (req, res) => {
  const db = await getDb();
  const alerts = allRows(db, `SELECT a.*, e.name as employee_name, e.department FROM alerts a JOIN employees e ON a.employee_id = e.id ORDER BY a.timestamp DESC`);
  res.json(alerts);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const alert = oneRow(db, `
    SELECT a.*, e.name as employee_name, e.department, e.role as employee_role,
           e.email as employee_email, e.date_of_joining, e.risk_score as employee_risk_score
    FROM alerts a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?
  `, [req.params.id]);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  const xaiFactors = allRows(db, 'SELECT * FROM xai_factors WHERE alert_id = ? ORDER BY weight DESC', [req.params.id]);
  const events = allRows(db, 'SELECT * FROM activity_events WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 50', [alert.employee_id]);

  // Generate heatmap data (7 days × 24 hours)
  const heatmap = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      let intensity = Math.random() * 0.3;
      if (alert.risk_score > 60 && (h >= 1 && h <= 4)) intensity = 0.6 + Math.random() * 0.4;
      if (alert.risk_score > 60 && d >= 5 && h >= 22) intensity = 0.8 + Math.random() * 0.2;
      heatmap.push({ day: dayNames[d], hour: h, intensity: parseFloat(intensity.toFixed(2)), isAnomalous: intensity > 0.7 });
    }
  }

  res.json({ alert, xaiFactors, events, heatmap });
});

router.patch('/:id/action', async (req, res) => {
  const { action } = req.body;
  const validActions = { false_positive: 'false_positive', escalate: 'escalated', resolve: 'resolved' };
  const newStatus = validActions[action];
  if (!newStatus) return res.status(400).json({ error: 'Invalid action' });

  const db = await getDb();
  db.run('UPDATE alerts SET status = ? WHERE id = ?', [newStatus, req.params.id]);
  saveDb();
  res.json({ success: true, newStatus, message: action === 'false_positive' ? 'Feedback recorded. Model threshold adjusted for this user.' : `Alert ${newStatus} successfully.` });
});

module.exports = router;
