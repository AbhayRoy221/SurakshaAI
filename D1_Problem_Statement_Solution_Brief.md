# D1 - Problem Statement + Solution Brief
## PS1: AI-Driven Early Warning System for Internal & Privileged User Fraud

* **Team Name**: GenZPT
* **Domain**: Fraud Detection / ML / Cybersecurity
* **Members**: Abhaykumar Roy (Backend), Dhiraj Agrawal (AiML), Aditya Thakare (Frontend), Sanyam Patwari (Banking/Security)

---

## PART A: THE PROBLEM (1 PAGE MAX)

### 1. The Problem in One Sentence
**Core Problem**: Core Banking (CBS), Treasury, and Loan Origination systems at Union Bank of India are accessed daily by privileged users, leaving the bank vulnerable to rogue insiders who bypass external security and commit fraud or exfiltrate data undetected for months.

### 2. Who Is Affected and How Severely?
* **Fraud Investigation Teams**: Currently rely on manual, post-facto audits that take an average of **287 days** to detect threats, resulting in reactive rather than preventive action.
* **Financial Burden**: RBI estimates insider fraud accounts for 15-20% of total bank fraud value, averaging **$15.38 Million** (₹128 Cr) per incident.
* **Operational Impact**: A single privileged user (like a database admin) has access rights that can cause vastly more damage than standard external cyberattacks.
* **Compliance Risk**: Delays in detecting insider violations violate RBI/FIU-IND mandates, leading to penalties and severe reputational damage.

### 3. Why Current Approaches Fail
* **Vulnerable Rules**: Legacy rule-based alerts use static thresholds (e.g. transfer > ₹10L) which insiders easily bypass by executing slow, sub-threshold activities.
* **No Real-Time Baselines**: Banks lack systems that continuously learn individual employee behavior habits to flag deviations in real time.
* **Siloed Systems**: Access logs for transaction modules, databases, and customer records are isolated. Cross-system collusion is never correlated.
* **Alert Fatigue**: Rule-based engines trigger high false-positive rates with zero contextual explanations, overwhelming fraud analysts.

---

## PART B: OUR SOLUTION

### 4. What We Are Building: SurakshaAI
SurakshaAI is an AI-powered behavioral monitoring system that creates a dynamic baseline of normal activity for every privileged user, identifies multi-user collusion networks, and provides explainable alerts alongside an interactive natural language investigator assistant.

### 5. Core Features of Our POC
* **Ensemble Outlier ML**: Extracts 12 behavioral features (off-hours access, volume spikes, system diversity, etc.) from log data. It runs an Isolation Forest + LOF (Local Outlier Factor) ensemble to score users against their baseline.
* **Graph Collusion Engine**: Maps relationships (approvals, shared IPs) as a network. Risk scores are propagated via a PageRank-style formula and analyzed using BFS community detection to expose collusion rings.
* **SHAP Explainable AI**: Renders clear visual charts showing the exact feature contributions (e.g., "+35 Off-hours data export") driving a user's risk rating.
* **Gemini Copilot with Tool Use**: Integrates Google Gemini API with 9 database query tools, enabling investigators to audit records in natural language.
* **Regulatory Reporting**: Automatically exports Suspicious Transaction Reports (STRs) as compliance-ready PDFs.

### 6. What Is Built vs. What Is Planned

| BUILT (DEMONSTRABLE IN POC) | PLANNED (NOT YET BUILT) |
| :--- | :--- |
| • **Ensemble ML script** (Isolation Forest + LOF) running on activity logs. | • **PyTorch Geometric (GNN)** deployment for deep graph node embeddings. |
| • **Graph Risk Solver** calculating PageRank risk, Centrality, and BFS Fraud rings. | • **Big Data Ingestion** using live Apache Kafka brokers and Apache Flink stream workers. |
| • **Gemini AI Copilot with 9 database tools** executing live SQL queries. | • **Real-time model auto-retraining** pipelines on new stream data. |
| • **CISO Data Pipeline Monitor** showing simulated Flink/Kafka event queues and topic lags. | • **Direct API integration** with production Core Banking Systems (CBS). |
| • **STR PDF Export Engine** generating compliance reports. | • **Unified case management** and cross-department collaboration workflow. |
