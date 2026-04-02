# ============================================================
# run_pipeline.py
# EcoMeter Integrity — Full System Pipeline
# Group 24 | CSG3101 | ECU
#
# Usage: python run_pipeline.py
#
# This script runs all five modules in sequence:
# 1. Smart Meter Simulator    (Verginiya)
# 2. FDIA Attack Module       (Treveen)
# 3. Anomaly Detection Engine (Thisari)
# 4. Database Import          (Shehani)
# 5. Flask API                (Shehani)
# ============================================================

import subprocess
import sys
import os
from datetime import datetime

def log(step, label):
    print(f"\n{'='*55}")
    print(f"  STEP {step}: {label}")
    print(f"  Time: {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*55}")

def run_script(script_path, label, step):
    log(step, label)
    if not os.path.exists(script_path):
        print(f"  ERROR: {script_path} not found.")
        print(f"  Make sure all files are in the correct folders.")
        sys.exit(1)
    result = subprocess.run(
        [sys.executable, script_path],
        capture_output=False
    )
    if result.returncode != 0:
        print(f"\n  FAILED: {label}")
        print(f"  Fix the error above and re-run the pipeline.")
        sys.exit(1)
    print(f"\n  DONE: {label} completed successfully.")

def check_file_exists(filepath, description):
    if not os.path.exists(filepath):
        print(f"  ERROR: {description} not found at {filepath}")
        sys.exit(1)
    print(f"  OK: {description} found.")

if __name__ == '__main__':

    print("\n" + "="*55)
    print("  ECOMETER INTEGRITY — FULL PIPELINE")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*55)

    # Create data folder if it doesn't exist
    os.makedirs("data", exist_ok=True)

    # ── STEP 1: Smart Meter Simulator ─────────────────────
    run_script("simulator/Simulation.py", "Smart Meter Simulator", 1)
    check_file_exists("data/meter_data.csv", "meter_data.csv")

    # ── STEP 2: FDIA Attack Module ─────────────────────────
    run_script("attack/Fdia.py", "FDIA Attack Simulation", 2)
    check_file_exists("data/attacked_meter_data.csv", "attacked_meter_data.csv")

    # ── STEP 3: Anomaly Detection Engine ──────────────────
    run_script("detection/detection_engine.py", "Anomaly Detection Engine", 3)
    check_file_exists("data/detection_results.csv", "detection_results.csv")
    check_file_exists("data/api_summary.json", "api_summary.json")

    # ── STEP 4: Database Import ────────────────────────────
    run_script("backend/import_data.py", "Database Import", 4)

    # ── STEP 5: Flask API ──────────────────────────────────
    log(5, "Flask REST API")
    print("  Starting Flask API...")
    print("\n" + "="*55)
    print("  PIPELINE COMPLETE")
    print(f"  Finished: {datetime.now().strftime('%H:%M:%S')}")
    print("="*55)
    print("\n  Open your browser and go to:")
    print("  http://localhost:5000")
    print("\n  Available endpoints:")
    print("  http://localhost:5000/api/meter-data")
    print("  http://localhost:5000/api/attacked-data")
    print("  http://localhost:5000/api/detection-results")
    print("  http://localhost:5000/api/anomalies")
    print("  http://localhost:5000/api/risk-summary")
    print("  http://localhost:5000/api/stats")
    print("\n  Press Ctrl+C to stop.\n")

    subprocess.run([sys.executable, "backend/app.py"])
```
