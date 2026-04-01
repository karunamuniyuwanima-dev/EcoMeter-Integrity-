# EcoMeter Integrity — API Contract Document
# Group 24 | CSG3101 | Edith Cowan University
# Date: April 2026

# Purpose

This document defines the shared data fields, file formats, and
API endpoints agreed by all five team members. All modules must
follow this contract to ensure smooth integration.

─────────────────────────────────────────────────────────────
## 1. SHARED DATA FIELDS
─────────────────────────────────────────────────────────────

These fields are used across all modules and must match exactly.

| Field          | Type    | Description                              | Example                  |
|----------------|---------|------------------------------------------|--------------------------|
| meter_id       | string  | Unique meter identifier                  | M001                     |
| timestamp      | string  | Date and time of reading (YYYY-MM-DD HH:MM:SS) | 2026-02-28 06:00:00 |
| energy_kwh     | float   | Original clean energy reading (kWh)      | 0.3512                   |
| voltage        | float   | Voltage in volts                         | 229.85                   |
| current        | float   | Current in amps                          | 1.523                    |
| power_factor   | float   | Power factor (0.85 to 0.98)              | 0.923                    |
| temperature    | float   | Ambient temperature in Celsius           | 28.5                     |
| status         | string  | Reading status                           | normal / attack          |
| is_attack      | boolean | Whether the reading was attacked         | True / False             |
| attack_type    | string  | Type of attack applied                   | stealth_reduce / spike / noise / none |

─────────────────────────────────────────────────────────────
# 2. MODULE OUTPUT FILES
─────────────────────────────────────────────────────────────

## 2.1 Verginiya — Simulator Output
File: meter_data.csv
Columns: meter_id, timestamp, energy_kwh, voltage, current,
         power_factor, temperature, status, is_attack, attack_type

- 5 meters (M001 to M005)
- 15-minute intervals
- 30 days of data (14,400 rows total)
- is_attack is always False
- attack_type is always empty

## 2.2 Treveen — Attack Module Output
File: attacked_meter_data.csv
Columns: all columns from meter_data.csv PLUS:
         attacked_kwh, is_attack, attack_type, diff_pct

- attacked_kwh: the manipulated energy value
- is_attack: True for attacked rows, False for normal rows
- attack_type: stealth_reduce / spike / noise / empty string
- diff_pct: percentage change from real to attacked value
- 30% of readings are attacked (randomly selected)

Attack type per meter:
  M001 → stealth_reduce (-15%)
  M002 → spike (+80%)
  M003 → noise (±10%)
  M004 → stealth_reduce (-15%)
  M005 → spike (+80%)

## 2.3 Thisari — Detection Engine Output
File: detection_results.csv
Columns: meter_id, timestamp, energy_kwh, reading_kwh,
         detected, risk_score, risk_level, rule_triggered,
         attack_type, ground_truth, detection_time

- reading_kwh: the value the detection engine received
- detected: 1 if anomaly flagged, 0 if normal
- risk_score: integer from 0 to 100
- risk_level: NORMAL / LOW / MEDIUM / HIGH / CRITICAL
- rule_triggered: which detection rule fired
- ground_truth: 1 if actually attacked, 0 if normal

Risk level thresholds:
  0        → NORMAL
  1–34     → LOW
  35–49    → MEDIUM
  50–74    → HIGH
  75–100   → CRITICAL

─────────────────────────────────────────────────────────────
# 3. FLASK API ENDPOINTS
─────────────────────────────────────────────────────────────

Base URL: http://localhost:5000

All endpoints return JSON. All responses include labeled fields.

## 3.1 GET /api/meter-data
Returns clean simulator readings.
Response fields: meter_id, timestamp, energy_kwh, voltage,
                 current, power_factor, temperature, status

## 3.2 GET /api/attacked-data
Returns FDIA-modified readings.
Response fields: all meter-data fields plus
                 attacked_kwh, is_attack, attack_type, diff_pct

## 3.3 GET /api/detection-results
Returns anomaly detection results.
Response fields: meter_id, timestamp, energy_kwh, reading_kwh,
                 detected, risk_score, risk_level, rule_triggered,
                 attack_type, ground_truth, detection_time

## 3.4 GET /api/anomalies
Returns only flagged anomaly rows (detected = 1).
Used by: dashboard alert panel
Response fields: meter_id, timestamp, risk_score, risk_level,
                 rule_triggered, attack_type, detection_time

## 3.5 GET /api/risk-summary
Returns current risk level per meter.
Used by: dashboard risk badge
Response fields: meter_id, latest_risk_score, latest_risk_level,
                 total_anomalies, last_updated

## 3.6 GET /api/stats
Returns overall system accuracy metrics.
Used by: dashboard overview panel
Response fields: total_readings, total_attacks, anomalies_found,
                 accuracy, precision, recall, f1_score,
                 critical_count, high_count, medium_count,
                 low_count, normal_count

─────────────────────────────────────────────────────────────
# 4. DATABASE TABLES
─────────────────────────────────────────────────────────────

Database: ecometer (PostgreSQL)

Table 1: meter_data
  → Populated by: import_data.py
  → Source: meter_data.csv (Verginiya)
  → Used by: /api/meter-data endpoint

Table 2: attacked_meter_data
  → Populated by: import_data.py
  → Source: attacked_meter_data.csv (Treveen)
  → Used by: /api/attacked-data endpoint

Table 3: detection_results
  → Populated by: import_data.py
  → Source: detection_results.csv (Thisari)
  → Used by: /api/detection-results, /api/anomalies,
             /api/risk-summary, /api/stats endpoints

─────────────────────────────────────────────────────────────
# 5. INTEGRATION RULES
─────────────────────────────────────────────────────────────

1. Verginiya runs Simulation.py first → produces meter_data.csv
2. Treveen runs Fdia.py using meter_data.csv → produces attacked_meter_data.csv
3. Thisari runs detection_engine.py using both CSVs → produces detection_results.csv
4. Shehani runs import_data.py to load all three CSVs into PostgreSQL
5. Shehani runs app.py to start the Flask API
6. Dashboard connects to Flask API endpoints to display data

Order matters — each step depends on the previous one.

─────────────────────────────────────────────────────────────
# 6. RULES ALL MEMBERS MUST FOLLOW
─────────────────────────────────────────────────────────────

- Field names must match exactly — no renaming columns
- File paths must be relative — no hardcoded paths like C:\Users\...
- CSV files must use comma separator and UTF-8 encoding
- Timestamps must follow format: YYYY-MM-DD HH:MM:SS
- All code must be pushed to the correct GitHub branch
- Do not push directly to main branch
