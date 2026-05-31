-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  date_of_joining TEXT NOT NULL,
  risk_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  avatar_color TEXT DEFAULT '#00F5D4'
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('critical','high','medium','low')),
  risk_score INTEGER NOT NULL,
  system_affected TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','resolved','escalated','false_positive')),
  confidence REAL DEFAULT 0.85,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- XAI Factors
CREATE TABLE IF NOT EXISTS xai_factors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id TEXT NOT NULL,
  factor_name TEXT NOT NULL,
  weight REAL NOT NULL,
  description TEXT,
  FOREIGN KEY (alert_id) REFERENCES alerts(id)
);

-- Activity Events
CREATE TABLE IF NOT EXISTS activity_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  system TEXT NOT NULL,
  details TEXT,
  risk_contribution INTEGER DEFAULT 0,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Behavioral Data (daily aggregates)
CREATE TABLE IF NOT EXISTS behavioral_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  action_count INTEGER DEFAULT 0,
  baseline_count INTEGER DEFAULT 0,
  anomaly_score REAL DEFAULT 0,
  core_banking_pct REAL DEFAULT 0,
  treasury_pct REAL DEFAULT 0,
  loans_pct REAL DEFAULT 0,
  customer_db_pct REAL DEFAULT 0,
  risk_score INTEGER DEFAULT 0,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Collusion Edges
CREATE TABLE IF NOT EXISTS collusion_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  strength REAL NOT NULL,
  pattern_type TEXT NOT NULL,
  is_fraud_ring INTEGER DEFAULT 0,
  FOREIGN KEY (source_id) REFERENCES employees(id),
  FOREIGN KEY (target_id) REFERENCES employees(id)
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_trail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action_type TEXT NOT NULL,
  department TEXT NOT NULL,
  target TEXT,
  outcome TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL
);

-- Users (for auth)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ciso','investigator','compliance'))
);
