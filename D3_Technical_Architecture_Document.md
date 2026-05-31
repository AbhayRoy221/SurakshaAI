# D3 - Technical Architecture Document
## PS1: AI-Driven Early Warning System for Internal & Privileged User Fraud | Team: GenZPT

---

## 1. SYSTEM OVERVIEW — WHAT THE SYSTEM DOES

**SurakshaAI** is an AI-powered Early Warning System designed to continuously monitor the behavior of internal and privileged users across banking systems (Core Banking, Treasury consoles, Loan Origination modules, and databases) to detect anomalies and collusion networks in real time. It ingests synthetic activity logs, fits behavioral ML baselines, propagates risk weights across relationship networks to expose collusion rings, and provides investigators with a natural language AI Copilot to query records and compile Suspicious Transaction Reports (STRs).

---

## 2. HIGH-LEVEL ARCHITECTURE DIAGRAM

The system comprises 5 distinct layers. Data flows sequentially from Ingestion → Stream Processing → Database Storage → AI/ML Computation → UI Presentation.

### **LAYER 1 — DATA INGESTION**
* **Synthetic Logs Ingestion**:
  * Transactions
  * Authentication audits
  * Device connectivity logs
  * Database queries
* **Metadata Fields**:
  * Department affiliation
  * User role
  * Date of Joining (DOJ)
  * Normal shift hours
* **CMU CERT Dataset Alignment**:
  * Synthetic data matches the properties of standard cyber threat research data schemas:
    * USB bulk copies
    * Login velocities
    * After-hours accesses

▼  REST API Ingest & JSON Schema Validation  ▼

### **LAYER 2 — STREAM PROCESSING (Express API & WebSockets)**
* **Simulated Streaming Pipeline**: A Node.js background simulation loop handles raw events, pipeline throughput, and consumer lag.
* **Live WebSocket Updates**: Pushes real-time anomaly alerts directly to the dashboard via Socket.io.
* **Production Path**: Designed to upgrade to Apache Kafka topics (e.g. `txn.raw.events`, `user.behavior.events`) and Apache Flink for high-velocity streaming time windows (1-hour/24-hour frequency aggregations) without blocking Core Banking transactions.

▼  Transactional SQL Writes & Event Archiving  ▼

### **LAYER 3 — DATABASE & STORAGE**
* **Metadata Table (`employees`)**: Stores:
  * Personal profiles
  * Date of Joining (DOJ)
  * Active status
  * Current risk ratings
* **Raw Logs Table (`activity_events`)**: Stores thousands of rows containing raw system logs:
  * Timestamp
  * Action type
  * System accessed
  * Risk contribution
* **Network Table (`collusion_edges`)**: Encodes connections such as:
  * Shared supervisor approvals
  * Transaction paths
  * Shared network ranges
* **History Table (`behavioral_data`)**: Stores 30-day historical metrics per user.

▼  SQL Feature Engineering & Graph Retrieval  ▼

### **LAYER 4 — AI/ML FRAUD DETECTION ENGINE**
* **Behavioral ML Anomaly (scikit-learn)**: Features are run through an ensemble of **Isolation Forest** (detects global spikes/outliers) and **Local Outlier Factor (LOF)** (detects local density patterns). Outliers are written back to the database.
* **Graph Collusion Engine**: Custom Node.js solver calculating Brandes' Betweenness Centrality (bridges), local Clustering Coefficient (cliques), and PageRank-style max-flow risk propagation across relationships.
* **Gemini Copilot API**: Iterative Google Gemini 2.5 Flash tool-calling service mapping 9 database SQL functions to natural language investigator prompts.
* **SHAP Explainability**: Translates outlier feature weights into visible, explainable variables.

▼  WebSocket Alert Push & Gemini Tool Execution  ▼

### **LAYER 5 — PRESENTATION & REPORTING (React Dashboard)**
* **Live Feeds**: Socket.io real-time alert widgets.
* **Interactive Graphs**: Cytoscape.js network visualizer displaying community collusion rings.
* **Compliance Export**: Programmatic PDF compiler (jsPDF) generating FIU-IND formatted STR evidence packages.

---

## 3. TECH STACK SUMMARY

| LAYER | TECHNOLOGY | WHY THIS CHOICE |
| :--- | :--- | :--- |
| **Data Ingestion** | Express Ingestion API *(Kafka simulated)* | Local Express controller endpoint. Apache Kafka is the target system for production-scale ingestion. |
| **Stream Processing** | Live WebSocket Updates *(Flink simulated)* | Socket.io pushes alerts instantly. Apache Flink is the target engine for streaming analytical window computations. |
| **Database Storage** | SQLite (`surakshaai.db`) | Single-file SQL engine; requires zero local configuration, ensuring portable POC execution. |
| **ML Engine** | Python + scikit-learn | Isolation Forest offers unsupervised outlier isolation; LOF catches local density anomalies. |
| **AI Copilot** | Google Gemini 2.5 Flash API | State-of-the-art native tool-calling capabilities; queries database tables dynamically. |
| **Graph Visualization** | Cytoscape.js + React | High-performance canvas library; renders hundreds of interactive node links smoothly in-browser. |
| **Evidence Export** | jsPDF | Programmatic PDF generator; runs client-side with no external rendering server dependencies. |

---

## 4. KEY TECHNICAL DECISIONS & JUSTIFICATION

### **Why SQLite and not PostgreSQL + Elasticsearch?**
Evaluating teams at a hackathon must run code locally on single laptops. Setting up a local PostgreSQL service and an Elasticsearch cluster is error-prone. We utilized SQLite because it packages the entire relational database into a single file (`surakshaai.db`) that requires no local installation while supporting the identical SQL query logic used in PostgreSQL.

### **Why Isolation Forest + LOF and not Deep Learning Autoencoders?**
Autoencoders require millions of records and massive GPU compute resources to train, making them impractical for a lightweight bank console POC. The Isolation Forest + LOF ensemble runs in seconds, requires no GPUs, is completely unsupervised, and generates feature weights that map directly to SHAP bar charts for clean investigator explainability.

### **Why Gemini API and not Local LLMs (e.g. Llama)?**
Running local models like Llama requires advanced GPU hardware, which is not standard on developer laptops. Google Gemini 2.5 Flash provides a highly accessible free tier with native, fast tool-calling (function calling) capabilities, allowing us to connect natural language chatbot interfaces directly to our SQL tables.

---

## 5. KNOWN LIMITATIONS

* **Simulated Ingestion Pipeline**: In this local POC, the Kafka message broker and Flink streams are simulated using REST APIs to show the CISO monitor without heavy server infrastructure.
* **Batch ML Execution**: The Python ML outlier script is executed on demand in batch mode, whereas production would run continuous streaming inference.
* **SQLite Single-Thread Writes**: The database uses SQLite, which is limited during concurrent write processes compared to a production PostgreSQL database.
* **Gemini Free-Tier Rate Limits**: The chatbot is subject to rate-limiting on Google's free-tier endpoint.
* **Mock STR Legal Compliance**: The exported Suspicious Transaction Report PDF simulates the structure of an official FIU-IND document for evidence, but it is not legally connected to real government channels.
