export interface User {
  id: number;
  email: string;
  name: string;
  role: 'ciso' | 'investigator' | 'compliance';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  date_of_joining: string;
  risk_score: number;
  status: string;
  avatar_color: string;
  isFraudRing?: boolean;
  riskLevel?: string;
}

export interface Alert {
  id: string;
  employee_id: string;
  alert_type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  risk_score: number;
  system_affected: string;
  timestamp: string;
  status: string;
  confidence: number;
  employee_name?: string;
  department?: string;
  employee_role?: string;
  employee_email?: string;
  date_of_joining?: string;
  employee_risk_score?: number;
}

export interface XAIFactor {
  id: number;
  alert_id: string;
  factor_name: string;
  weight: number;
  description: string;
}

export interface HeatmapCell {
  day: string;
  hour: number;
  intensity: number;
  isAnomalous: boolean;
}

export interface ActivityEvent {
  id: number;
  employee_id: string;
  action_type: string;
  system: string;
  details: string;
  risk_contribution: number;
  timestamp: string;
}

export interface AlertDetail {
  alert: Alert;
  xaiFactors: XAIFactor[];
  events: ActivityEvent[];
  heatmap: HeatmapCell[];
}

export interface KPIData {
  value: number;
  trend: number;
}

export interface CollusionEdge {
  id: number;
  source_id: string;
  target_id: string;
  strength: number;
  pattern_type: string;
  is_fraud_ring: number;
}

export interface GraphData {
  nodes: Employee[];
  edges: CollusionEdge[];
  fraudRingDetected: boolean;
  fraudRingMembers: string[];
}

export interface BehavioralDay {
  employee_id: string;
  date: string;
  action_count: number;
  baseline_count: number;
  anomaly_score: number;
  core_banking_pct: number;
  treasury_pct: number;
  loans_pct: number;
  customer_db_pct: number;
  risk_score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface LiveAlert {
  id: string;
  employeeName: string;
  alertType: string;
  severity: string;
  riskScore: number;
  system: string;
  description: string;
  timestamp: string;
}

export interface AuditEntry {
  id: number;
  actor: string;
  action_type: string;
  department: string;
  target: string;
  outcome: string;
  details: string;
  timestamp: string;
}
