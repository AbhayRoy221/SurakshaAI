#!/usr/bin/env python3
"""
SurakshaAI — ML-Based Behavioral Anomaly Detector
===================================================
Uses Isolation Forest and Local Outlier Factor (LOF) to detect anomalous
employee behavior from activity event logs stored in SQLite.

This script connects directly to the surakshaai.db database, computes
anomaly scores for each employee, and updates their behavioral_data records.

Usage:
    python anomaly_detector.py              # Run detection and update DB
    python anomaly_detector.py --report     # Print report without DB update
    python anomaly_detector.py --visualize  # Generate ASCII risk report

Requirements:
    pip install scikit-learn numpy
    (sqlite3 is included in Python stdlib)
"""

import sqlite3
import os
import sys
import argparse
import json
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.preprocessing import StandardScaler
except ImportError:
    print("ERROR: scikit-learn is required. Install via: pip install scikit-learn numpy")
    sys.exit(1)

# ── Configuration ──
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db', 'surakshaai.db')
CONTAMINATION = 0.15       # Expected proportion of outliers
N_ESTIMATORS = 200         # Number of trees in Isolation Forest
RANDOM_STATE = 42


def get_db_connection():
    """Open a connection to the SQLite database."""
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Run 'npm run seed' first to create the database.")
        sys.exit(1)
    return sqlite3.connect(DB_PATH)


def extract_features(conn):
    """
    Extract behavioral feature vectors for each employee from activity_events.

    Features per employee:
      1. total_actions          — Total activity count
      2. unique_systems         — Number of distinct systems accessed
      3. unique_action_types    — Number of distinct action types used
      4. off_hours_ratio        — Proportion of events outside 9AM-6PM
      5. weekend_ratio          — Proportion of events on weekends
      6. avg_risk_contribution  — Average risk contribution per event
      7. max_risk_contribution  — Maximum risk contribution
      8. high_risk_action_count — Count of actions with risk > 15
      9. action_diversity       — Shannon entropy of action type distribution
     10. system_diversity       — Shannon entropy of system distribution
     11. burst_score            — Max events in a 1-hour window / avg hourly
     12. cross_dept_ratio       — Ratio of events on systems outside primary dept
    """
    cursor = conn.cursor()

    # Get all employees with their departments
    cursor.execute("SELECT id, name, department, risk_score FROM employees")
    employees = {row[0]: {'name': row[1], 'department': row[2], 'risk_score': row[3]}
                 for row in cursor.fetchall()}

    # Map departments to their primary systems
    dept_systems = {
        'Core Banking': 'Core Banking',
        'Treasury': 'Treasury',
        'Loan Origination': 'Loan Origination',
        'Customer Database': 'Customer Database',
        'IT Admin': 'IT Infrastructure',
    }

    # Get all activity events
    cursor.execute("""
        SELECT employee_id, action_type, system, risk_contribution, timestamp
        FROM activity_events
        ORDER BY employee_id, timestamp
    """)
    events = cursor.fetchall()

    # Group events by employee
    emp_events = defaultdict(list)
    for emp_id, action, system, risk_c, ts in events:
        emp_events[emp_id].append({
            'action': action,
            'system': system,
            'risk': risk_c,
            'timestamp': ts,
        })

    feature_names = [
        'total_actions', 'unique_systems', 'unique_action_types',
        'off_hours_ratio', 'weekend_ratio', 'avg_risk_contribution',
        'max_risk_contribution', 'high_risk_action_count', 'action_diversity',
        'system_diversity', 'burst_score', 'cross_dept_ratio',
    ]

    emp_ids = []
    feature_matrix = []

    for emp_id, info in employees.items():
        events_list = emp_events.get(emp_id, [])
        if not events_list:
            continue

        # Basic counts
        total = len(events_list)
        systems = set(e['system'] for e in events_list)
        actions = set(e['action'] for e in events_list)
        risks = [e['risk'] for e in events_list]

        # Time analysis
        off_hours = 0
        weekend = 0
        hourly_buckets = defaultdict(int)

        for e in events_list:
            try:
                dt = datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00'))
                hour = dt.hour
                day = dt.weekday()

                if hour < 9 or hour >= 18:
                    off_hours += 1
                if day >= 5:
                    weekend += 1

                bucket_key = dt.strftime('%Y-%m-%d-%H')
                hourly_buckets[bucket_key] += 1
            except (ValueError, AttributeError):
                pass

        # Shannon entropy for diversity
        def shannon_entropy(items):
            counts = defaultdict(int)
            for item in items:
                counts[item] += 1
            total_c = sum(counts.values())
            if total_c == 0:
                return 0.0
            entropy = 0.0
            for count in counts.values():
                p = count / total_c
                if p > 0:
                    entropy -= p * np.log2(p)
            return entropy

        action_types_list = [e['action'] for e in events_list]
        system_list = [e['system'] for e in events_list]

        # Burst detection
        if hourly_buckets:
            hourly_counts = list(hourly_buckets.values())
            max_hourly = max(hourly_counts)
            avg_hourly = np.mean(hourly_counts) if hourly_counts else 1
            burst = max_hourly / avg_hourly if avg_hourly > 0 else 1.0
        else:
            burst = 1.0

        # Cross-department access
        primary_system = dept_systems.get(info['department'], '')
        cross_dept = sum(1 for e in events_list if e['system'] != primary_system)

        features = [
            total,                                          # total_actions
            len(systems),                                   # unique_systems
            len(actions),                                   # unique_action_types
            off_hours / total if total > 0 else 0,          # off_hours_ratio
            weekend / total if total > 0 else 0,            # weekend_ratio
            np.mean(risks) if risks else 0,                 # avg_risk_contribution
            max(risks) if risks else 0,                     # max_risk_contribution
            sum(1 for r in risks if r > 15),                # high_risk_action_count
            shannon_entropy(action_types_list),              # action_diversity
            shannon_entropy(system_list),                    # system_diversity
            burst,                                          # burst_score
            cross_dept / total if total > 0 else 0,         # cross_dept_ratio
        ]

        emp_ids.append(emp_id)
        feature_matrix.append(features)

    return emp_ids, np.array(feature_matrix), feature_names, employees


def run_isolation_forest(X):
    """Run Isolation Forest and return anomaly scores (-1 to 1, higher = more anomalous)."""
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso_forest = IsolationForest(
        n_estimators=N_ESTIMATORS,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    iso_forest.fit(X_scaled)

    # decision_function: lower = more anomalous; we invert and normalize
    raw_scores = iso_forest.decision_function(X_scaled)
    # Normalize to 0-1 range (1 = most anomalous)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    if max_s - min_s > 0:
        normalized = 1 - (raw_scores - min_s) / (max_s - min_s)
    else:
        normalized = np.zeros_like(raw_scores)

    labels = iso_forest.predict(X_scaled)  # 1 = normal, -1 = anomaly
    return normalized, labels


def run_lof(X):
    """Run Local Outlier Factor and return anomaly scores."""
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    lof = LocalOutlierFactor(
        n_neighbors=min(5, len(X) - 1),
        contamination=CONTAMINATION,
        novelty=False,
    )
    labels = lof.fit_predict(X_scaled)

    # negative_outlier_factor_: more negative = more anomalous
    raw_scores = -lof.negative_outlier_factor_
    min_s, max_s = raw_scores.min(), raw_scores.max()
    if max_s - min_s > 0:
        normalized = (raw_scores - min_s) / (max_s - min_s)
    else:
        normalized = np.zeros_like(raw_scores)

    return normalized, labels


def compute_combined_scores(iso_scores, lof_scores):
    """Combine Isolation Forest and LOF scores (weighted ensemble)."""
    # Weight IF slightly higher as it handles high-dimensional data better
    combined = 0.6 * iso_scores + 0.4 * lof_scores
    return combined


def compute_risk_factors(features, feature_names, threshold=0.6):
    """Identify the top risk factors for anomalous employees."""
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features.reshape(1, -1) if features.ndim == 1
                                     else features)

    risk_factors = []
    z_scores = X_scaled[0] if X_scaled.ndim > 1 else X_scaled

    factor_descriptions = {
        'total_actions': 'Unusually high/low activity volume',
        'unique_systems': 'Accessing abnormal number of systems',
        'unique_action_types': 'Unusual variety of actions performed',
        'off_hours_ratio': 'Significant off-hours activity detected',
        'weekend_ratio': 'High weekend activity ratio',
        'avg_risk_contribution': 'Elevated average risk per action',
        'max_risk_contribution': 'Extremely high-risk actions detected',
        'high_risk_action_count': 'Multiple high-risk actions performed',
        'action_diversity': 'Unusual action pattern diversity',
        'system_diversity': 'Accessing diverse systems abnormally',
        'burst_score': 'Suspicious burst activity detected',
        'cross_dept_ratio': 'Excessive cross-department access',
    }

    for i, (name, z) in enumerate(zip(feature_names, z_scores)):
        if abs(z) > threshold:
            risk_factors.append({
                'factor': name,
                'z_score': round(float(z), 2),
                'description': factor_descriptions.get(name, 'Statistical anomaly'),
                'raw_value': round(float(features[i] if features.ndim == 1 else features[0][i]), 3),
            })

    risk_factors.sort(key=lambda x: abs(x['z_score']), reverse=True)
    return risk_factors[:5]  # Top 5


def update_database(conn, emp_ids, combined_scores, features, feature_names, employees):
    """Update behavioral_data anomaly_score and employee risk_score in the DB."""
    cursor = conn.cursor()
    updated = 0

    for i, emp_id in enumerate(emp_ids):
        anomaly_score = float(combined_scores[i])

        # Update the most recent behavioral_data row for this employee
        cursor.execute("""
            UPDATE behavioral_data
            SET anomaly_score = ?
            WHERE employee_id = ? AND date = (
                SELECT MAX(date) FROM behavioral_data WHERE employee_id = ?
            )
        """, (round(anomaly_score, 3), emp_id, emp_id))

        # Compute an ML-adjusted risk score
        # Blend the existing risk score with the ML anomaly score
        old_risk = employees[emp_id]['risk_score']
        ml_risk = int(anomaly_score * 100)
        # 60% existing risk + 40% ML-derived risk
        new_risk = min(100, max(0, int(0.6 * old_risk + 0.4 * ml_risk)))

        cursor.execute("""
            UPDATE employees SET risk_score = ? WHERE id = ?
        """, (new_risk, emp_id))

        updated += 1

    conn.commit()
    return updated


def print_report(emp_ids, combined_scores, iso_scores, lof_scores,
                 features, feature_names, employees):
    """Print a detailed anomaly detection report."""
    print("\n" + "=" * 80)
    print("  SurakshaAI — ML Anomaly Detection Report")
    print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}")
    print(f"  Model: Ensemble (Isolation Forest + LOF)")
    print(f"  Employees Analyzed: {len(emp_ids)}")
    print("=" * 80)

    # Sort by combined score descending
    indices = np.argsort(-combined_scores)

    print(f"\n{'Rank':<5} {'Employee ID':<12} {'Name':<22} {'Department':<20} "
          f"{'IF Score':<10} {'LOF Score':<10} {'Combined':<10} {'Risk':<6}")
    print("-" * 95)

    for rank, idx in enumerate(indices, 1):
        emp_id = emp_ids[idx]
        info = employees[emp_id]
        status = "🔴 ANOMALY" if combined_scores[idx] > 0.6 else \
                 "🟡 WATCH" if combined_scores[idx] > 0.4 else "🟢 NORMAL"

        print(f"{rank:<5} {emp_id:<12} {info['name']:<22} {info['department']:<20} "
              f"{iso_scores[idx]:<10.3f} {lof_scores[idx]:<10.3f} "
              f"{combined_scores[idx]:<10.3f} {info['risk_score']:<6}")

        if combined_scores[idx] > 0.5:
            scaler = StandardScaler()
            scaler.fit(features)
            risk_factors = compute_risk_factors(
                features[idx], feature_names, threshold=0.5
            )
            if risk_factors:
                for rf in risk_factors[:3]:
                    print(f"      ↳ {rf['description']} "
                          f"(z={rf['z_score']:+.2f}, value={rf['raw_value']})")

    # Summary statistics
    anomaly_count = sum(1 for s in combined_scores if s > 0.6)
    watch_count = sum(1 for s in combined_scores if 0.4 < s <= 0.6)
    normal_count = len(combined_scores) - anomaly_count - watch_count

    print(f"\n{'─' * 40}")
    print(f"  Summary:")
    print(f"    🔴 Anomalous:  {anomaly_count} employees")
    print(f"    🟡 Watch List: {watch_count} employees")
    print(f"    🟢 Normal:     {normal_count} employees")
    print(f"    Contamination: {CONTAMINATION * 100:.0f}%")
    print(f"    IF Estimators: {N_ESTIMATORS}")
    print(f"{'─' * 40}")

    return {
        'anomalous': anomaly_count,
        'watch': watch_count,
        'normal': normal_count,
        'total': len(emp_ids),
    }


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    parser = argparse.ArgumentParser(description='SurakshaAI ML Anomaly Detector')
    parser.add_argument('--report', action='store_true',
                        help='Print report only, do not update database')
    parser.add_argument('--visualize', action='store_true',
                        help='Print ASCII risk visualization')
    parser.add_argument('--json', action='store_true',
                        help='Output results as JSON')
    args = parser.parse_args()

    print("🔍 SurakshaAI ML Anomaly Detection Engine")
    print("─" * 45)

    # Step 1: Connect and extract
    print("📂 Connecting to database...")
    conn = get_db_connection()

    print("📊 Extracting behavioral features...")
    emp_ids, features, feature_names, employees = extract_features(conn)
    print(f"   → {len(emp_ids)} employees, {len(feature_names)} features each")

    if len(emp_ids) < 3:
        print("ERROR: Not enough employees for anomaly detection (minimum 3)")
        sys.exit(1)

    # Step 2: Run ML models
    print("🤖 Running Isolation Forest...")
    iso_scores, iso_labels = run_isolation_forest(features)
    iso_anomalies = sum(1 for l in iso_labels if l == -1)
    print(f"   → Detected {iso_anomalies} anomalies")

    print("🤖 Running Local Outlier Factor...")
    lof_scores, lof_labels = run_lof(features)
    lof_anomalies = sum(1 for l in lof_labels if l == -1)
    print(f"   → Detected {lof_anomalies} anomalies")

    # Step 3: Combine
    print("🔗 Computing ensemble scores...")
    combined_scores = compute_combined_scores(iso_scores, lof_scores)

    # Step 4: Report
    summary = print_report(emp_ids, combined_scores, iso_scores, lof_scores,
                           features, feature_names, employees)

    # Step 5: JSON output
    if args.json:
        results = []
        indices = np.argsort(-combined_scores)
        for idx in indices:
            emp_id = emp_ids[idx]
            info = employees[emp_id]
            scaler = StandardScaler()
            scaler.fit(features)
            risk_factors = compute_risk_factors(features[idx], feature_names)
            results.append({
                'employeeId': emp_id,
                'name': info['name'],
                'department': info['department'],
                'originalRisk': info['risk_score'],
                'iforestScore': round(float(iso_scores[idx]), 3),
                'lofScore': round(float(lof_scores[idx]), 3),
                'combinedScore': round(float(combined_scores[idx]), 3),
                'classification': 'anomaly' if combined_scores[idx] > 0.6
                                  else 'watch' if combined_scores[idx] > 0.4
                                  else 'normal',
                'topRiskFactors': risk_factors,
            })
        print("\n" + json.dumps({'results': results, 'summary': summary}, indent=2))

    # Step 6: Update DB (unless --report flag)
    if not args.report and not args.json:
        print("\n💾 Updating database with ML-computed scores...")
        updated = update_database(conn, emp_ids, combined_scores,
                                  features, feature_names, employees)
        print(f"   → Updated {updated} employee records")
        print("✅ Database updated successfully!")
    else:
        print("\n📋 Report-only mode. Database not modified.")

    conn.close()
    print("\n✨ Anomaly detection complete.")


if __name__ == '__main__':
    main()
