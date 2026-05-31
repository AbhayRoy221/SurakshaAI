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

router.get('/', async (req, res) => {
  const db = await getDb();
  const employees = allRows(db, 'SELECT * FROM employees ORDER BY risk_score DESC');
  res.json(employees);
});

router.get('/:id/behavioral', async (req, res) => {
  const db = await getDb();
  const emp = oneRow(db, 'SELECT * FROM employees WHERE id = ?', [req.params.id]);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const behavioral = allRows(db, 'SELECT * FROM behavioral_data WHERE employee_id = ? ORDER BY date ASC', [req.params.id]);
  const peerAvg = oneRow(db, 'SELECT AVG(action_count) as avg_actions FROM behavioral_data WHERE employee_id IN (SELECT id FROM employees WHERE department = ? AND id != ?)', [emp.department, emp.id]);
  const empAvg = oneRow(db, 'SELECT AVG(action_count) as avg_actions FROM behavioral_data WHERE employee_id = ?', [req.params.id]);
  const peerRatio = peerAvg && peerAvg.avg_actions > 0 ? (empAvg.avg_actions / peerAvg.avg_actions).toFixed(1) : '1.0';

  res.json({ employee: emp, behavioral, peerComparison: { ratio: parseFloat(peerRatio), peerAvg: Math.round(peerAvg?.avg_actions || 0) } });
});

module.exports = router;
