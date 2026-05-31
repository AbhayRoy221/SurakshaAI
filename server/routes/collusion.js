const express = require('express');
const { getDb, saveDb } = require('../db/connection');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/* ── helper functions ─────────────────────────────────────── */

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

/* ── graph utility functions ──────────────────────────────── */

/**
 * Build an adjacency list from employees and edges.
 * Returns { adjacency: Map<id, [{neighborId, strength}]>, nodeSet: Set<id> }
 */
function buildAdjacency(employees, edges) {
  const adjacency = new Map();
  const nodeSet = new Set();
  for (const emp of employees) {
    adjacency.set(emp.id, []);
    nodeSet.add(emp.id);
  }
  for (const edge of edges) {
    const strength = typeof edge.edge_strength === 'number' ? edge.edge_strength : 0.5;
    if (nodeSet.has(edge.source_id) && nodeSet.has(edge.target_id)) {
      adjacency.get(edge.source_id).push({ neighborId: edge.target_id, strength });
      adjacency.get(edge.target_id).push({ neighborId: edge.source_id, strength });
    }
  }
  return { adjacency, nodeSet };
}

/**
 * Find connected components using BFS.
 * Returns an array of Sets, each Set containing the node ids in that component.
 */
function findConnectedComponents(adjacency) {
  const visited = new Set();
  const components = [];
  for (const nodeId of adjacency.keys()) {
    if (visited.has(nodeId)) continue;
    const component = new Set();
    const queue = [nodeId];
    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      component.add(current);
      for (const { neighborId } of adjacency.get(current)) {
        if (!visited.has(neighborId)) queue.push(neighborId);
      }
    }
    components.push(component);
  }
  return components;
}

/**
 * Compute the local clustering coefficient for a single node.
 */
function localClusteringCoefficient(nodeId, adjacency) {
  const neighbors = adjacency.get(nodeId);
  if (!neighbors || neighbors.length < 2) return 0;
  const neighborSet = new Set(neighbors.map(n => n.neighborId));
  let triangles = 0;
  for (const { neighborId } of neighbors) {
    for (const { neighborId: nn } of adjacency.get(neighborId)) {
      if (neighborSet.has(nn) && nn !== nodeId) triangles++;
    }
  }
  // Each triangle counted twice (once from each direction)
  const k = neighbors.length;
  return triangles / (k * (k - 1));
}

/**
 * Compute betweenness centrality for all nodes (unweighted BFS approach).
 * Returns Map<nodeId, betweenness>.
 */
function computeBetweenness(adjacency) {
  const nodes = [...adjacency.keys()];
  const betweenness = new Map();
  for (const n of nodes) betweenness.set(n, 0);

  for (const s of nodes) {
    const stack = [];
    const pred = new Map();
    const sigma = new Map();
    const dist = new Map();
    for (const n of nodes) { pred.set(n, []); sigma.set(n, 0); dist.set(n, -1); }
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue = [s];
    while (queue.length) {
      const v = queue.shift();
      stack.push(v);
      for (const { neighborId: w } of adjacency.get(v)) {
        if (dist.get(w) < 0) { queue.push(w); dist.set(w, dist.get(v) + 1); }
        if (dist.get(w) === dist.get(v) + 1) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          pred.get(w).push(v);
        }
      }
    }
    const delta = new Map();
    for (const n of nodes) delta.set(n, 0);
    while (stack.length) {
      const w = stack.pop();
      for (const v of pred.get(w)) {
        delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
      }
      if (w !== s) betweenness.set(w, betweenness.get(w) + delta.get(w));
    }
  }
  // Normalize (undirected graph: divide by 2)
  for (const n of nodes) betweenness.set(n, betweenness.get(n) / 2);
  return betweenness;
}

/* ── GET /graph  (preserved exactly as-is) ────────────────── */

router.get('/graph', async (req, res) => {
  const { department, minRisk, showLowRisk } = req.query;
  const db = await getDb();
  let employees = allRows(db, 'SELECT * FROM employees');

  if (department && department !== 'all') employees = employees.filter(e => e.department === department);
  if (minRisk) employees = employees.filter(e => e.risk_score >= parseInt(minRisk));
  if (showLowRisk === 'false') employees = employees.filter(e => e.risk_score >= 30);

  const empIds = new Set(employees.map(e => e.id));
  const allEdges = allRows(db, 'SELECT * FROM collusion_edges');
  const edges = allEdges.filter(e => empIds.has(e.source_id) && empIds.has(e.target_id));

  const fraudRingMembers = new Set();
  edges.filter(e => e.is_fraud_ring).forEach(e => {
    fraudRingMembers.add(e.source_id);
    fraudRingMembers.add(e.target_id);
  });

  const nodes = employees.map(e => ({
    ...e,
    isFraudRing: fraudRingMembers.has(e.id),
    riskLevel: e.risk_score >= 80 ? 'critical' : e.risk_score >= 60 ? 'high' : e.risk_score >= 30 ? 'medium' : 'low'
  }));

  res.json({ nodes, edges, fraudRingDetected: fraudRingMembers.size > 0, fraudRingMembers: [...fraudRingMembers] });
});

/* ── POST /scan  — real graph risk propagation ────────────── */

router.post('/scan', async (req, res) => {
  try {
    const db = await getDb();
    const employees = allRows(db, 'SELECT * FROM employees');
    const edges = allRows(db, 'SELECT * FROM collusion_edges');

    if (!employees.length) {
      return res.json({ scanComplete: true, fraudRingsFound: 0, involvedEmployees: [], riskPropagation: [], graphMetrics: { totalNodes: 0, totalEdges: 0, avgClusteringCoefficient: 0, maxBetweenness: 0 } });
    }

    /* ── 1. Build graph ────────────────────────────────────── */
    const { adjacency } = buildAdjacency(employees, edges);

    // Map from id → current risk score
    const riskMap = new Map();
    const oldRiskMap = new Map();
    const empMap = new Map();
    for (const emp of employees) {
      const score = typeof emp.risk_score === 'number' ? emp.risk_score : 0;
      riskMap.set(emp.id, score);
      oldRiskMap.set(emp.id, score);
      empMap.set(emp.id, emp);
    }

    /* ── 2. Weighted Risk Propagation (3 iterations) ───────── */
    const DAMPING = 0.85;
    const ITERATIONS = 3;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const nextRisk = new Map(riskMap);
      for (const [nodeId, neighbors] of adjacency) {
        let ownRisk = riskMap.get(nodeId);
        let maxPropagated = ownRisk;
        for (const { neighborId, strength } of neighbors) {
          const propagated = riskMap.get(neighborId) * strength * DAMPING;
          if (propagated > maxPropagated) maxPropagated = propagated;
        }
        nextRisk.set(nodeId, Math.round(Math.min(maxPropagated, 100)));
      }
      for (const [k, v] of nextRisk) riskMap.set(k, v);
    }

    /* ── 3. Build riskPropagation change list ──────────────── */
    const riskPropagation = [];
    for (const emp of employees) {
      const oldScore = oldRiskMap.get(emp.id);
      const newScore = riskMap.get(emp.id);
      if (newScore !== oldScore) {
        // Find the neighbor that contributed most
        const neighbors = adjacency.get(emp.id);
        let bestNeighbor = null;
        let bestVal = 0;
        for (const { neighborId, strength } of neighbors) {
          const val = oldRiskMap.get(neighborId) * strength * DAMPING;
          if (val > bestVal) { bestVal = val; bestNeighbor = neighborId; }
        }
        const neighborEmp = bestNeighbor ? empMap.get(bestNeighbor) : null;
        const reason = neighborEmp
          ? `Connected to ${neighborEmp.emp_id || bestNeighbor} (risk: ${oldRiskMap.get(bestNeighbor)})`
          : 'Risk recalculated';
        riskPropagation.push({ empId: emp.emp_id || emp.id, oldScore, newScore, reason });
      }
    }

    /* ── 4. Detect fraud rings ─────────────────────────────── */
    // Filter edges with strength > 0.7 to build a high-strength sub-graph
    const strongEdges = edges.filter(e => (typeof e.edge_strength === 'number' ? e.edge_strength : 0) > 0.7);
    const { adjacency: strongAdj } = buildAdjacency(employees, strongEdges);
    const components = findConnectedComponents(strongAdj);

    const fraudRings = [];
    const involvedEmployeesSet = new Set();
    for (const comp of components) {
      if (comp.size < 2) continue; // a ring needs at least 2 nodes
      const memberIds = [...comp];
      const avgRisk = memberIds.reduce((sum, id) => sum + riskMap.get(id), 0) / memberIds.length;
      if (avgRisk > 70) {
        fraudRings.push(memberIds);
        memberIds.forEach(id => involvedEmployeesSet.add(id));
      }
    }
    const involvedEmployees = [...involvedEmployeesSet].map(id => {
      const emp = empMap.get(id);
      return emp ? (emp.emp_id || id) : id;
    });

    /* ── 5. Update DB with propagated risk scores ──────────── */
    for (const emp of employees) {
      const newScore = riskMap.get(emp.id);
      if (newScore !== oldRiskMap.get(emp.id)) {
        db.run('UPDATE employees SET risk_score = ? WHERE id = ?', [newScore, emp.id]);
      }
    }
    // Mark fraud ring edges
    for (const ring of fraudRings) {
      const ringSet = new Set(ring);
      for (const edge of edges) {
        if (ringSet.has(edge.source_id) && ringSet.has(edge.target_id)) {
          db.run('UPDATE collusion_edges SET is_fraud_ring = 1 WHERE id = ?', [edge.id]);
        }
      }
    }
    saveDb();

    /* ── 6. Compute graph metrics ──────────────────────────── */
    const totalNodes = employees.length;
    const totalEdges = edges.length;

    // Average clustering coefficient
    let ccSum = 0;
    for (const emp of employees) ccSum += localClusteringCoefficient(emp.id, adjacency);
    const avgClusteringCoefficient = totalNodes > 0 ? parseFloat((ccSum / totalNodes).toFixed(4)) : 0;

    // Max betweenness centrality
    const betweenness = computeBetweenness(adjacency);
    let maxBetweenness = 0;
    for (const val of betweenness.values()) {
      if (val > maxBetweenness) maxBetweenness = val;
    }
    maxBetweenness = parseFloat(maxBetweenness.toFixed(4));

    res.json({
      scanComplete: true,
      fraudRingsFound: fraudRings.length,
      involvedEmployees,
      riskPropagation,
      graphMetrics: {
        totalNodes,
        totalEdges,
        avgClusteringCoefficient,
        maxBetweenness
      }
    });
  } catch (err) {
    console.error('Collusion scan error:', err);
    res.status(500).json({ error: 'Scan failed', details: err.message });
  }
});

/* ── GET /metrics  — graph analytics ──────────────────────── */

router.get('/metrics', async (req, res) => {
  try {
    const db = await getDb();
    const employees = allRows(db, 'SELECT * FROM employees');
    const edges = allRows(db, 'SELECT * FROM collusion_edges');

    const totalNodes = employees.length;
    const totalEdges = edges.length;

    if (!totalNodes) {
      return res.json({ totalNodes: 0, totalEdges: 0, avgDegree: 0, connectedComponents: 0, density: 0, communities: [] });
    }

    const { adjacency } = buildAdjacency(employees, edges);

    // Average degree
    let degreeSum = 0;
    for (const neighbors of adjacency.values()) degreeSum += neighbors.length;
    const avgDegree = parseFloat((degreeSum / totalNodes).toFixed(2));

    // Connected components
    const components = findConnectedComponents(adjacency);
    const connectedComponents = components.length;

    // Density: 2*|E| / (|V|*(|V|-1))
    const density = totalNodes > 1
      ? parseFloat(((2 * totalEdges) / (totalNodes * (totalNodes - 1))).toFixed(4))
      : 0;

    // Communities / clusters — label each component
    const communities = components
      .filter(comp => comp.size >= 2)
      .map((comp, idx) => {
        const memberIds = [...comp];
        const avgRisk = parseFloat(
          (memberIds.reduce((sum, id) => {
            const emp = employees.find(e => e.id === id);
            return sum + (emp ? emp.risk_score : 0);
          }, 0) / memberIds.length).toFixed(1)
        );
        return {
          id: idx + 1,
          size: memberIds.length,
          avgRisk,
          members: memberIds.map(id => {
            const emp = employees.find(e => e.id === id);
            return emp ? (emp.emp_id || id) : id;
          })
        };
      });

    res.json({ totalNodes, totalEdges, avgDegree, connectedComponents, density, communities });
  } catch (err) {
    console.error('Collusion metrics error:', err);
    res.status(500).json({ error: 'Failed to compute metrics', details: err.message });
  }
});

module.exports = router;

