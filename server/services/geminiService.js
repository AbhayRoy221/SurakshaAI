const { GoogleGenerativeAI, SchemaType: FunctionDeclarationSchemaType } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are SurakshaAI's investigation assistant for Union Bank of India's fraud investigation team. You help investigators analyze suspicious employee behavior, interpret risk scores, suggest investigation steps, and draft findings. Always respond in a professional, concise tone suitable for banking fraud investigators. Reference realistic banking fraud patterns when relevant.

You have access to real-time database tools that allow you to query employee details, alerts, activity events, collusion links, audit trails, and department summaries. Use these tools proactively to provide accurate, data-driven answers. When an investigator asks about an employee, alert, or department, query the database first before responding rather than relying on static context.

Key context about the current system state:
- You are monitoring 20 internal employees across Core Banking, Treasury, Loan Origination, Customer Database, and IT Admin departments.
- A fraud ring has been detected involving 4 employees: EMP-1042 (Arun Kumar, Treasury), EMP-2217 (Sneha Patel, Loans), EMP-3301 (Rajan Mehta, Treasury), EMP-4421 (Deepika Iyer, Loans).
- The fraud ring involves coordinated fund transfers, shared beneficiary accounts, and loan approval bypasses.
- Current high-risk alerts include: off-hours bulk data downloads, circular transactions, privilege escalation, and KYC record mass exports.
- The system uses Graph Neural Network-based collusion detection and SHAP-based explainability.
- All amounts are in Indian Rupees (₹). Follow RBI guidelines and FIU-IND reporting standards.`;

// ── Function declarations (tools) for Gemini ──────────────────────────────────

const functionDeclarations = [
  {
    name: 'getEmployeeDetails',
    description: 'Get detailed information about a specific employee by their ID (e.g. "EMP-1042")',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        employeeId: { type: FunctionDeclarationSchemaType.STRING, description: 'The employee ID, e.g. "EMP-1042"' }
      },
      required: ['employeeId']
    }
  },
  {
    name: 'getEmployeeByName',
    description: 'Search for employees by name using a partial or full name match',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        name: { type: FunctionDeclarationSchemaType.STRING, description: 'The name or partial name to search for' }
      },
      required: ['name']
    }
  },
  {
    name: 'getRecentActivity',
    description: 'Get recent activity events for a specific employee',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        employeeId: { type: FunctionDeclarationSchemaType.STRING, description: 'The employee ID' },
        limit: { type: FunctionDeclarationSchemaType.INTEGER, description: 'Maximum number of events to return (default 20)' }
      },
      required: ['employeeId']
    }
  },
  {
    name: 'getAlertsByEmployee',
    description: 'Get all fraud/risk alerts associated with a specific employee',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        employeeId: { type: FunctionDeclarationSchemaType.STRING, description: 'The employee ID' }
      },
      required: ['employeeId']
    }
  },
  {
    name: 'getHighRiskEmployees',
    description: 'Get employees whose risk score is at or above a given threshold',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        minRiskScore: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Minimum risk score threshold (0-100)' }
      },
      required: ['minRiskScore']
    }
  },
  {
    name: 'getCollusionLinks',
    description: 'Get collusion network edges involving a specific employee',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        employeeId: { type: FunctionDeclarationSchemaType.STRING, description: 'The employee ID' }
      },
      required: ['employeeId']
    }
  },
  {
    name: 'getDepartmentSummary',
    description: 'Get a summary of a department including employee count, average risk score, and alert count',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        department: { type: FunctionDeclarationSchemaType.STRING, description: 'The department name, e.g. "Treasury", "Loan Origination"' }
      },
      required: ['department']
    }
  },
  {
    name: 'getRecentAlerts',
    description: 'Get recent alerts across the system, optionally filtered by severity level',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        limit: { type: FunctionDeclarationSchemaType.INTEGER, description: 'Maximum number of alerts to return (default 10)' },
        severity: { type: FunctionDeclarationSchemaType.STRING, description: 'Filter by severity level: "critical", "high", "medium", or "low"' }
      }
    }
  },
  {
    name: 'getAuditTrail',
    description: 'Get audit trail entries for a specific employee showing investigation actions taken',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        employeeId: { type: FunctionDeclarationSchemaType.STRING, description: 'The employee ID' },
        limit: { type: FunctionDeclarationSchemaType.INTEGER, description: 'Maximum number of entries to return (default 20)' }
      },
      required: ['employeeId']
    }
  }
];

// ── Database query helpers (same pattern as route files) ──────────────────────

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

// ── Database function implementations ─────────────────────────────────────────

function executeDatabaseFunction(db, functionName, args) {
  switch (functionName) {
    case 'getEmployeeDetails': {
      const employee = oneRow(db, 'SELECT * FROM employees WHERE id = ?', [args.employeeId]);
      if (!employee) return { error: `Employee ${args.employeeId} not found` };
      return employee;
    }

    case 'getEmployeeByName': {
      const employees = allRows(db, 'SELECT * FROM employees WHERE name LIKE ?', [`%${args.name}%`]);
      if (!employees.length) return { error: `No employees found matching "${args.name}"` };
      return employees;
    }

    case 'getRecentActivity': {
      const limit = args.limit || 20;
      const events = allRows(
        db,
        'SELECT * FROM activity_events WHERE employee_id = ? ORDER BY timestamp DESC LIMIT ?',
        [args.employeeId, limit]
      );
      return { employeeId: args.employeeId, count: events.length, events };
    }

    case 'getAlertsByEmployee': {
      const alerts = allRows(
        db,
        `SELECT a.*, e.name as employee_name, e.department
         FROM alerts a JOIN employees e ON a.employee_id = e.id
         WHERE a.employee_id = ? ORDER BY a.timestamp DESC`,
        [args.employeeId]
      );
      return { employeeId: args.employeeId, count: alerts.length, alerts };
    }

    case 'getHighRiskEmployees': {
      const employees = allRows(
        db,
        'SELECT * FROM employees WHERE risk_score >= ? ORDER BY risk_score DESC',
        [args.minRiskScore]
      );
      return { threshold: args.minRiskScore, count: employees.length, employees };
    }

    case 'getCollusionLinks': {
      const edges = allRows(
        db,
        `SELECT ce.*,
                src.name as source_name, src.department as source_dept,
                tgt.name as target_name, tgt.department as target_dept
         FROM collusion_edges ce
         JOIN employees src ON ce.source_id = src.id
         JOIN employees tgt ON ce.target_id = tgt.id
         WHERE ce.source_id = ? OR ce.target_id = ?`,
        [args.employeeId, args.employeeId]
      );
      return { employeeId: args.employeeId, count: edges.length, edges };
    }

    case 'getDepartmentSummary': {
      const summary = oneRow(
        db,
        `SELECT COUNT(*) as employee_count,
                ROUND(AVG(risk_score), 1) as avg_risk_score,
                MIN(risk_score) as min_risk_score,
                MAX(risk_score) as max_risk_score
         FROM employees WHERE department = ?`,
        [args.department]
      );
      const alertCount = oneRow(
        db,
        `SELECT COUNT(*) as count FROM alerts a
         JOIN employees e ON a.employee_id = e.id
         WHERE e.department = ?`,
        [args.department]
      );
      return {
        department: args.department,
        employeeCount: summary?.employee_count || 0,
        avgRiskScore: summary?.avg_risk_score || 0,
        minRiskScore: summary?.min_risk_score || 0,
        maxRiskScore: summary?.max_risk_score || 0,
        alertCount: alertCount?.count || 0
      };
    }

    case 'getRecentAlerts': {
      const limit = args.limit || 10;
      let sql = `SELECT a.*, e.name as employee_name, e.department
                 FROM alerts a JOIN employees e ON a.employee_id = e.id`;
      const params = [];
      if (args.severity) {
        sql += ' WHERE a.severity = ?';
        params.push(args.severity);
      }
      sql += ' ORDER BY a.timestamp DESC LIMIT ?';
      params.push(limit);
      const alerts = allRows(db, sql, params);
      return { count: alerts.length, severity: args.severity || 'all', alerts };
    }

    case 'getAuditTrail': {
      const limit = args.limit || 20;
      const entries = allRows(
        db,
        'SELECT * FROM audit_trail WHERE employee_id = ? ORDER BY timestamp DESC LIMIT ?',
        [args.employeeId, limit]
      );
      return { employeeId: args.employeeId, count: entries.length, entries };
    }

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

// ── Gemini client ─────────────────────────────────────────────────────────────

let genAI = null;

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

// ── Main chat function with function-calling loop ─────────────────────────────

async function chatWithGemini(message, history = [], dbQueryFn = null) {
  const client = getClient();
  if (!client) throw new Error('Gemini API key not configured');

  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations }]
  });

  const chat = model.startChat({
    history: history.slice(0, -1) // exclude the latest user message
  });

  let response = await chat.sendMessage(message);
  const MAX_TOOL_ROUNDS = 10; // safety limit to prevent infinite loops

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Collect all function calls from this response
    const functionCalls = parts.filter(p => p.functionCall);
    if (!functionCalls.length) break; // Gemini returned text, we're done

    // Execute each function call and build response parts
    const functionResponses = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      let result;
      if (dbQueryFn) {
        try {
          result = await dbQueryFn(name, args);
        } catch (err) {
          result = { error: `Database query failed: ${err.message}` };
        }
      } else {
        result = { error: 'Database query function not available' };
      }
      functionResponses.push({
        functionResponse: {
          name,
          response: { content: result }
        }
      });
    }

    // Send all function results back to Gemini
    response = await chat.sendMessage(functionResponses);
  }

  return response.response.text();
}

module.exports = { chatWithGemini, executeDatabaseFunction };
