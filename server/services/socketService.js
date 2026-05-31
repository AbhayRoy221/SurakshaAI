const alertTemplates = [
  { type: 'Off-Hours Access', severity: 'high', system: 'Core Banking', desc: 'accessed core banking module outside business hours from unregistered device' },
  { type: 'Bulk Data Download', severity: 'critical', system: 'Customer Database', desc: 'downloaded over 500 customer records in a single session' },
  { type: 'Privilege Escalation', severity: 'high', system: 'IT Infrastructure', desc: 'attempted to escalate admin privileges on production server' },
  { type: 'Suspicious Transfer', severity: 'critical', system: 'Treasury', desc: 'initiated high-value transfer to non-whitelisted beneficiary' },
  { type: 'KYC Override', severity: 'medium', system: 'Loan Origination', desc: 'bypassed KYC verification checks for loan approval' },
  { type: 'Failed Auth Spike', severity: 'medium', system: 'Core Banking', desc: 'triggered 5 failed authentication attempts within 2 minutes' },
  { type: 'Cross-Dept Query', severity: 'medium', system: 'Treasury', desc: 'queried treasury data from unauthorized department terminal' },
  { type: 'Dormant Account Access', severity: 'high', system: 'Customer Database', desc: 'accessed dormant accounts flagged by previous audit cycle' },
];

const employeeNames = [
  'Arun Kumar', 'Sneha Patel', 'Rajan Mehta', 'Deepika Iyer', 'Vikram Singh',
  'Kavita Reddy', 'Suresh Menon', 'Pooja Gupta', 'Anand Joshi', 'Nisha Verma',
  'Rohit Sharma', 'Meera Krishnan', 'Sanjay Rao', 'Rahul Banerjee', 'Anjali Nair',
  'Karthik Sundaram', 'Manoj Tiwari', 'Divya Sharma', 'Arjun Pillai', 'Priyanka Das'
];

function startAlertEmitter(io) {
  setInterval(() => {
    const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
    const employee = employeeNames[Math.floor(Math.random() * employeeNames.length)];
    const riskScore = template.severity === 'critical' ? 75 + Math.floor(Math.random() * 25)
      : template.severity === 'high' ? 50 + Math.floor(Math.random() * 25)
      : 25 + Math.floor(Math.random() * 25);

    const alert = {
      id: `LIVE-${Date.now()}`,
      employeeName: employee,
      alertType: template.type,
      severity: template.severity,
      riskScore,
      system: template.system,
      description: `${employee} ${template.desc}`,
      timestamp: new Date().toISOString(),
    };

    io.emit('new-alert', alert);
  }, 5000 + Math.floor(Math.random() * 3000));
}

module.exports = { startAlertEmitter };
