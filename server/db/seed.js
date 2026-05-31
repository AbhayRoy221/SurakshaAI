const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'surakshaai.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function seed() {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.run(schema);

  // ── Auth Users ──
  const hash = bcrypt.hashSync('password123', 10);
  db.run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', ['ciso@unionbank.in', hash, 'Rajesh Sharma', 'ciso']);
  db.run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', ['investigator@unionbank.in', hash, 'Priya Nair', 'investigator']);
  db.run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', ['compliance@unionbank.in', hash, 'Amit Deshmukh', 'compliance']);

  // ── Employees ──
  const employees = [
    { id: 'EMP-1042', name: 'Arun Kumar', email: 'arun.kumar@unionbank.in', department: 'Treasury', role: 'Senior Dealer', doj: '2019-03-15', risk: 82, status: 'flagged', color: '#FF3B5C' },
    { id: 'EMP-2217', name: 'Sneha Patel', email: 'sneha.patel@unionbank.in', department: 'Loan Origination', role: 'Loan Officer', doj: '2020-07-01', risk: 76, status: 'flagged', color: '#FF3B5C' },
    { id: 'EMP-3301', name: 'Rajan Mehta', email: 'rajan.mehta@unionbank.in', department: 'Treasury', role: 'Treasury Analyst', doj: '2018-11-20', risk: 91, status: 'flagged', color: '#FF3B5C' },
    { id: 'EMP-4421', name: 'Deepika Iyer', email: 'deepika.iyer@unionbank.in', department: 'Loan Origination', role: 'Senior Loan Manager', doj: '2017-01-10', risk: 88, status: 'flagged', color: '#FF3B5C' },
    { id: 'EMP-1105', name: 'Vikram Singh', email: 'vikram.singh@unionbank.in', department: 'Core Banking', role: 'Branch Manager', doj: '2016-05-22', risk: 45, status: 'active', color: '#FFB700' },
    { id: 'EMP-1203', name: 'Kavita Reddy', email: 'kavita.reddy@unionbank.in', department: 'Core Banking', role: 'Operations Lead', doj: '2019-09-14', risk: 32, status: 'active', color: '#00C48C' },
    { id: 'EMP-1307', name: 'Suresh Menon', email: 'suresh.menon@unionbank.in', department: 'Core Banking', role: 'Teller Supervisor', doj: '2021-02-28', risk: 18, status: 'active', color: '#00C48C' },
    { id: 'EMP-1412', name: 'Pooja Gupta', email: 'pooja.gupta@unionbank.in', department: 'Core Banking', role: 'Customer Service Manager', doj: '2020-06-15', risk: 22, status: 'active', color: '#00C48C' },
    { id: 'EMP-1508', name: 'Anand Joshi', email: 'anand.joshi@unionbank.in', department: 'Core Banking', role: 'Reconciliation Officer', doj: '2022-01-10', risk: 55, status: 'active', color: '#FFB700' },
    { id: 'EMP-2103', name: 'Nisha Verma', email: 'nisha.verma@unionbank.in', department: 'Treasury', role: 'Fund Manager', doj: '2018-04-18', risk: 38, status: 'active', color: '#00C48C' },
    { id: 'EMP-2305', name: 'Rohit Sharma', email: 'rohit.sharma@unionbank.in', department: 'Treasury', role: 'Risk Analyst', doj: '2021-08-05', risk: 42, status: 'active', color: '#FFB700' },
    { id: 'EMP-3105', name: 'Meera Krishnan', email: 'meera.krishnan@unionbank.in', department: 'Loan Origination', role: 'Credit Analyst', doj: '2019-12-01', risk: 28, status: 'active', color: '#00C48C' },
    { id: 'EMP-3209', name: 'Sanjay Rao', email: 'sanjay.rao@unionbank.in', department: 'Loan Origination', role: 'Verification Officer', doj: '2020-10-20', risk: 61, status: 'active', color: '#FFB700' },
    { id: 'EMP-3402', name: 'Priyanka Das', email: 'priyanka.das@unionbank.in', department: 'Loan Origination', role: 'Documentation Specialist', doj: '2022-03-15', risk: 15, status: 'active', color: '#00C48C' },
    { id: 'EMP-4102', name: 'Rahul Banerjee', email: 'rahul.banerjee@unionbank.in', department: 'Customer Database', role: 'Database Admin', doj: '2018-07-22', risk: 67, status: 'active', color: '#FFB700' },
    { id: 'EMP-4205', name: 'Anjali Nair', email: 'anjali.nair@unionbank.in', department: 'Customer Database', role: 'Data Analyst', doj: '2021-05-10', risk: 35, status: 'active', color: '#00C48C' },
    { id: 'EMP-4308', name: 'Karthik Sundaram', email: 'karthik.sundaram@unionbank.in', department: 'Customer Database', role: 'Senior DBA', doj: '2017-09-01', risk: 48, status: 'active', color: '#FFB700' },
    { id: 'EMP-5101', name: 'Manoj Tiwari', email: 'manoj.tiwari@unionbank.in', department: 'IT Admin', role: 'System Administrator', doj: '2019-01-15', risk: 58, status: 'active', color: '#FFB700' },
    { id: 'EMP-5205', name: 'Divya Sharma', email: 'divya.sharma@unionbank.in', department: 'IT Admin', role: 'Network Engineer', doj: '2020-11-01', risk: 25, status: 'active', color: '#00C48C' },
    { id: 'EMP-5309', name: 'Arjun Pillai', email: 'arjun.pillai@unionbank.in', department: 'IT Admin', role: 'Security Analyst', doj: '2021-06-20', risk: 30, status: 'active', color: '#00C48C' },
  ];

  for (const e of employees) {
    db.run('INSERT INTO employees VALUES (?,?,?,?,?,?,?,?,?)', [e.id, e.name, e.email, e.department, e.role, e.doj, e.risk, e.status, e.color]);
  }

  // ── Alerts ──
  const now = new Date();
  const alerts = [
    { id: 'ALT-001', empId: 'EMP-3301', type: 'Off-Hours Bulk Data Download', severity: 'critical', risk: 91, system: 'Treasury', desc: 'Rajan Mehta accessed 847 customer records at 2:14 AM — 6.2 standard deviations above his 30-day baseline.' },
    { id: 'ALT-002', empId: 'EMP-4421', type: 'Circular Transaction', severity: 'critical', risk: 88, system: 'Loan Origination', desc: 'Deepika Iyer initiated circular fund transfers totaling ₹4.2 Cr across 3 shell accounts within 47 minutes.' },
    { id: 'ALT-003', empId: 'EMP-1042', type: 'Suspicious Fund Transfer', severity: 'critical', risk: 82, system: 'Treasury', desc: 'Arun Kumar executed 12 high-value NEFT transfers to non-verified accounts after hours.' },
    { id: 'ALT-004', empId: 'EMP-2217', type: 'Loan Approval Without Verification', severity: 'critical', risk: 76, system: 'Loan Origination', desc: 'Sneha Patel approved 5 loans worth ₹8.5 Cr bypassing mandatory verification flags.' },
    { id: 'ALT-005', empId: 'EMP-4102', type: 'Bulk Customer Record Access', severity: 'critical', risk: 67, system: 'Customer Database', desc: 'Rahul Banerjee accessed 2,341 customer records in a single session — potential data exfiltration.' },
    { id: 'ALT-006', empId: 'EMP-1508', type: 'NEFT Transfer Override', severity: 'high', risk: 55, system: 'Core Banking', desc: 'Anand Joshi overrode 3 NEFT transfer limits without supervisor approval.' },
    { id: 'ALT-007', empId: 'EMP-5101', type: 'Privilege Escalation', severity: 'high', risk: 58, system: 'IT Infrastructure', desc: 'Manoj Tiwari escalated his own privileges to root access on production database server.' },
    { id: 'ALT-008', empId: 'EMP-3209', type: 'Cross-Department Data Query', severity: 'high', risk: 61, system: 'Loan Origination', desc: 'Sanjay Rao queried Treasury data from Loan Origination terminal — cross-department policy violation.' },
    { id: 'ALT-009', empId: 'EMP-2305', type: 'Unusual API Access Pattern', severity: 'high', risk: 42, system: 'Treasury', desc: 'Rohit Sharma accessed treasury API 340 times in 1 hour — 8x normal rate.' },
    { id: 'ALT-010', empId: 'EMP-4308', type: 'Unauthorized Account Access', severity: 'high', risk: 48, system: 'Customer Database', desc: 'Karthik Sundaram accessed dormant high-net-worth customer accounts without case ticket.' },
    { id: 'ALT-011', empId: 'EMP-1105', type: 'High-Value Transaction Override', severity: 'medium', risk: 45, system: 'Core Banking', desc: 'Vikram Singh approved a ₹2.1 Cr transaction override — within authority but unusual frequency.' },
    { id: 'ALT-012', empId: 'EMP-1203', type: 'Multiple Failed Auth Attempts', severity: 'medium', risk: 32, system: 'Core Banking', desc: 'Kavita Reddy had 7 failed login attempts from unrecognized IP before successful access.' },
    { id: 'ALT-013', empId: 'EMP-4205', type: 'KYC Record Bulk Export', severity: 'medium', risk: 35, system: 'Customer Database', desc: 'Anjali Nair exported 1,200 KYC records to external storage — compliance review needed.' },
    { id: 'ALT-014', empId: 'EMP-2103', type: 'Dormant Account Reactivation', severity: 'medium', risk: 38, system: 'Treasury', desc: 'Nisha Verma reactivated 4 dormant treasury accounts flagged by previous audit.' },
    { id: 'ALT-015', empId: 'EMP-3105', type: 'Data Exfiltration Attempt', severity: 'medium', risk: 28, system: 'Loan Origination', desc: 'Meera Krishnan downloaded loan portfolio reports outside business hours — low risk but flagged.' },
  ];

  for (let i = 0; i < alerts.length; i++) {
    const a = alerts[i];
    const ts = new Date(now.getTime() - (i * 3600000 + Math.random() * 7200000)).toISOString();
    const conf = (0.75 + Math.random() * 0.2).toFixed(2);
    db.run('INSERT INTO alerts VALUES (?,?,?,?,?,?,?,?,?,?)', [a.id, a.empId, a.type, a.desc, a.severity, a.risk, a.system, ts, 'active', parseFloat(conf)]);
  }

  // ── XAI Factors ──
  const xaiData = {
    'ALT-001': [
      ['Off-hours access (2:14 AM)', 0.42, 'Activity during non-business hours'],
      ['Bulk record download (847 records)', 0.38, 'Volume 6.2σ above baseline'],
      ['New IP address detected', 0.12, 'Access from unregistered IP'],
      ['Weekend access pattern', 0.05, 'Saturday activity anomaly'],
      ['Sequential record access', 0.03, 'Records accessed in sequential order'],
    ],
    'ALT-002': [
      ['Circular fund flow detected', 0.45, 'Funds routed through 3 linked accounts'],
      ['Shell account involvement', 0.30, '3 accounts flagged as potential shells'],
      ['Rapid execution (47 min)', 0.15, 'All transfers within single session'],
      ['Amount threshold breach (₹4.2 Cr)', 0.07, 'Exceeds auto-report threshold'],
      ['No dual authorization', 0.03, 'Bypassed maker-checker protocol'],
    ],
    'ALT-003': [
      ['After-hours NEFT transfers', 0.35, '12 transfers after branch closing'],
      ['Non-verified beneficiaries', 0.32, 'Accounts not in verified list'],
      ['High aggregate amount', 0.18, 'Total ₹7.8 Cr in single session'],
      ['Velocity anomaly', 0.10, '4x normal transaction rate'],
      ['VPN usage detected', 0.05, 'Access via commercial VPN service'],
    ],
    'ALT-004': [
      ['Verification bypass', 0.40, '5 loans without mandatory checks'],
      ['High cumulative value (₹8.5 Cr)', 0.28, 'Exceeds individual approval limit'],
      ['Same-day disbursement', 0.18, 'Unusually fast processing time'],
      ['Connected borrowers', 0.10, '3 of 5 borrowers share address'],
      ['Missing documentation', 0.04, 'Incomplete KYC files'],
    ],
    'ALT-005': [
      ['Mass record access (2,341)', 0.44, 'Far exceeds daily average of 45'],
      ['External storage transfer', 0.30, 'Data copied to USB device'],
      ['Sensitive PII fields accessed', 0.15, 'Aadhaar, PAN data queried'],
      ['No business justification', 0.08, 'No ticket or request logged'],
      ['Screen capture detected', 0.03, 'Screenshot tool activated'],
    ],
  };

  for (const [alertId, factors] of Object.entries(xaiData)) {
    for (const [name, weight, desc] of factors) {
      db.run('INSERT INTO xai_factors (alert_id, factor_name, weight, description) VALUES (?,?,?,?)', [alertId, name, weight, desc]);
    }
  }
  // Generic XAI for remaining
  for (const a of alerts) {
    if (!xaiData[a.id]) {
      db.run('INSERT INTO xai_factors (alert_id, factor_name, weight, description) VALUES (?,?,?,?)', [a.id, 'Behavioral anomaly detected', 0.35, 'Deviation from normal patterns']);
      db.run('INSERT INTO xai_factors (alert_id, factor_name, weight, description) VALUES (?,?,?,?)', [a.id, 'Access pattern violation', 0.25, 'Unusual access timing or frequency']);
      db.run('INSERT INTO xai_factors (alert_id, factor_name, weight, description) VALUES (?,?,?,?)', [a.id, 'Policy threshold breach', 0.20, 'Exceeded configured thresholds']);
      db.run('INSERT INTO xai_factors (alert_id, factor_name, weight, description) VALUES (?,?,?,?)', [a.id, 'Peer group deviation', 0.12, 'Activity differs from role peers']);
      db.run('INSERT INTO xai_factors (alert_id, factor_name, weight, description) VALUES (?,?,?,?)', [a.id, 'Historical risk correlation', 0.08, 'Matches known fraud patterns']);
    }
  }

  // ── Activity Events ──
  const actionTypes = ['LOGIN', 'LOGOUT', 'QUERY', 'DOWNLOAD', 'TRANSFER', 'APPROVE', 'MODIFY', 'EXPORT', 'VIEW', 'OVERRIDE', 'ESCALATE', 'DELETE'];
  const actionDetails = [
    'Accessed customer records database', 'Downloaded transaction report', 'Initiated NEFT transfer',
    'Modified loan approval status', 'Exported KYC records to CSV', 'Viewed high-value account details',
    'Overrode transaction limit', 'Queried dormant accounts list', 'Approved loan application',
    'Deleted audit log entry', 'Escalated support ticket', 'Changed account beneficiary details',
    'Accessed treasury trading platform', 'Ran bulk account balance query', 'Modified interest rate parameters',
    'Exported customer PII data', 'Accessed inter-branch transfer module', 'Viewed fraud investigation report'
  ];
  const systems = ['Core Banking', 'Treasury', 'Loan Origination', 'Customer Database', 'IT Infrastructure'];

  for (const emp of employees) {
    const eventCount = emp.risk > 60 ? 50 : 25;
    for (let i = 0; i < eventCount; i++) {
      const hoursAgo = Math.random() * 48;
      const ts = new Date(now.getTime() - hoursAgo * 3600000).toISOString();
      const action = actionTypes[Math.floor(Math.random() * actionTypes.length)];
      const sys = systems[Math.floor(Math.random() * systems.length)];
      const detail = actionDetails[Math.floor(Math.random() * actionDetails.length)];
      const riskC = emp.risk > 60 ? Math.floor(Math.random() * 30) + 5 : Math.floor(Math.random() * 15);
      db.run('INSERT INTO activity_events (employee_id, action_type, system, details, risk_contribution, timestamp) VALUES (?,?,?,?,?,?)', [emp.id, action, sys, detail, riskC, ts]);
    }
  }

  // ── Behavioral Data (30 days) ──
  function getDeptPcts(dept) {
    switch (dept) {
      case 'Core Banking': return [0.55, 0.15, 0.20, 0.10];
      case 'Treasury': return [0.15, 0.55, 0.15, 0.15];
      case 'Loan Origination': return [0.15, 0.10, 0.60, 0.15];
      case 'Customer Database': return [0.20, 0.10, 0.10, 0.60];
      default: return [0.25, 0.25, 0.25, 0.25];
    }
  }

  for (const emp of employees) {
    const baselineCount = 20 + Math.floor(Math.random() * 40);
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now.getTime() - d * 86400000).toISOString().split('T')[0];
      let actionCount = baselineCount + Math.floor((Math.random() - 0.4) * 20);
      let anomaly = Math.random() * 0.3;
      if (emp.risk > 60 && (d === 2 || d === 5 || d === 0)) {
        actionCount = Math.floor(baselineCount * (2 + Math.random() * 2));
        anomaly = 0.6 + Math.random() * 0.4;
      }
      const pcts = getDeptPcts(emp.department);
      const riskForDay = Math.max(0, Math.min(100, emp.risk + Math.floor((Math.random() - 0.5) * 20)));
      db.run('INSERT INTO behavioral_data (employee_id, date, action_count, baseline_count, anomaly_score, core_banking_pct, treasury_pct, loans_pct, customer_db_pct, risk_score) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [emp.id, date, Math.floor(actionCount), baselineCount, parseFloat(anomaly.toFixed(3)), pcts[0], pcts[1], pcts[2], pcts[3], riskForDay]);
    }
  }

  // ── Collusion Edges ──
  const edges = [
    ['EMP-1042', 'EMP-2217', 0.92, 'Coordinated fund transfers', 1],
    ['EMP-2217', 'EMP-3301', 0.88, 'Shared beneficiary accounts', 1],
    ['EMP-3301', 'EMP-4421', 0.95, 'Synchronized login patterns', 1],
    ['EMP-4421', 'EMP-1042', 0.85, 'Cross-approval chain', 1],
    ['EMP-1042', 'EMP-3301', 0.78, 'Shared IP address range', 1],
    ['EMP-2217', 'EMP-4421', 0.81, 'Sequential transaction approval', 1],
    ['EMP-1105', 'EMP-1203', 0.35, 'Same branch operations', 0],
    ['EMP-1203', 'EMP-1307', 0.28, 'Shared shift patterns', 0],
    ['EMP-2103', 'EMP-2305', 0.42, 'Treasury team collaboration', 0],
    ['EMP-3105', 'EMP-3209', 0.38, 'Loan processing workflow', 0],
    ['EMP-4102', 'EMP-4205', 0.45, 'Database maintenance team', 0],
    ['EMP-4205', 'EMP-4308', 0.32, 'Data access overlap', 0],
    ['EMP-5101', 'EMP-5205', 0.30, 'IT infrastructure team', 0],
    ['EMP-5205', 'EMP-5309', 0.25, 'Security audit cooperation', 0],
    ['EMP-1508', 'EMP-3209', 0.52, 'Cross-department query overlap', 0],
    ['EMP-4102', 'EMP-5101', 0.48, 'Admin access correlation', 0],
  ];
  for (const [s, t, str, pt, fr] of edges) {
    db.run('INSERT INTO collusion_edges (source_id, target_id, strength, pattern_type, is_fraud_ring) VALUES (?,?,?,?,?)', [s, t, str, pt, fr]);
  }

  // ── Audit Trail ──
  const auditActions = ['LOGIN', 'DATA_ACCESS', 'TRANSFER', 'APPROVAL', 'CONFIG_CHANGE', 'EXPORT', 'REPORT_GENERATION', 'ALERT_REVIEW'];
  const outcomes = ['SUCCESS', 'BLOCKED', 'FLAGGED', 'UNDER_REVIEW'];
  for (let i = 0; i < 200; i++) {
    const emp = employees[Math.floor(Math.random() * employees.length)];
    const action = auditActions[Math.floor(Math.random() * auditActions.length)];
    const outcome = emp.risk > 60 ? outcomes[Math.floor(Math.random() * outcomes.length)] : outcomes[0];
    const hoursAgo = Math.random() * 720;
    const ts = new Date(now.getTime() - hoursAgo * 3600000).toISOString();
    const detail = `${emp.name} performed ${action.toLowerCase().replace('_', ' ')} on ${systems[Math.floor(Math.random() * systems.length)]}`;
    db.run('INSERT INTO audit_trail (actor, action_type, department, target, outcome, details, timestamp) VALUES (?,?,?,?,?,?,?)', [emp.name, action, emp.department, emp.id, outcome, detail, ts]);
  }

  // Save to file
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  db.close();
  console.log('✅ Database seeded successfully with all mock data!');
}

seed().catch(console.error);
