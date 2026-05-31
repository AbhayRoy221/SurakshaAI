const express = require('express');
const { getDb } = require('../db/connection');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);
router.use(roleGuard('compliance', 'ciso'));

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

router.get('/audit-trail', async (req, res) => {
  const db = await getDb();
  let rows = allRows(db, 'SELECT * FROM audit_trail ORDER BY timestamp DESC LIMIT 100');
  const { department, actionType, outcome } = req.query;
  if (department && department !== 'all') rows = rows.filter(r => r.department === department);
  if (actionType && actionType !== 'all') rows = rows.filter(r => r.action_type === actionType);
  if (outcome && outcome !== 'all') rows = rows.filter(r => r.outcome === outcome);
  res.json(rows);
});

router.get('/summary', async (req, res) => {
  const db = await getDb();
  const totalAudits = oneRow(db, 'SELECT COUNT(*) as count FROM audit_trail').count;
  const flaggedActions = oneRow(db, "SELECT COUNT(*) as count FROM audit_trail WHERE outcome = 'FLAGGED'").count;
  const blockedActions = oneRow(db, "SELECT COUNT(*) as count FROM audit_trail WHERE outcome = 'BLOCKED'").count;
  res.json({
    rbiCompliance: { status: 'compliant', label: 'RBI Master Direction on Fraud', details: 'All monitoring controls active' },
    fiuReporting: { filed: 3, pending: 1, label: 'FIU-IND Reports This Month' },
    sebiFlags: { reviewed: 7, pending: 2, label: 'SEBI Insider Trading Flags' },
    stats: { totalAudits, flaggedActions, blockedActions }
  });
});

module.exports = router;
