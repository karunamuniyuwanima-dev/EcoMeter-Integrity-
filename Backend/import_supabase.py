"""
import_supabase.py — Full database reset and reimport for Supabase
Run: python import_supabase.py
"""

import os, csv, sys
from pathlib import Path

def load_env(path):
    if not Path(path).exists():
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                v = v.strip().strip('"').strip("'")
                os.environ.setdefault(k.strip(), v)

load_env(Path(__file__).parent / '.env')

try:
    import psycopg2
except ImportError:
    print("ERROR: Run: python -m pip install psycopg2-binary")
    sys.exit(1)

# ── Build DIRECT connection (not pooler) ───────────────────────────────────────
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASS = os.environ.get('DB_PASSWORD', '')
DB_NAME = os.environ.get('DB_NAME', 'postgres')

# Extract project ref from username: postgres.lsocyybthldbniksduuf
project_ref = DB_USER.split('.')[-1] if '.' in DB_USER else None
if project_ref:
    DIRECT_HOST = f"db.{project_ref}.supabase.co"
    DIRECT_USER = "postgres"
else:
    DIRECT_HOST = os.environ.get('DB_HOST', 'localhost')
    DIRECT_USER = DB_USER

print(f"\n  Connecting directly to: {DIRECT_HOST}")
print(f"  Database: {DB_NAME}")
print(f"  User: {DIRECT_USER}\n")

try:
    conn = psycopg2.connect(
        host     = DIRECT_HOST,
        database = DB_NAME,
        user     = DIRECT_USER,
        password = DB_PASS,
        port     = 5432,
        sslmode  = 'require',
        connect_timeout = 30,
    )
    conn.autocommit = True
    cur = conn.cursor()
    # Disable statement timeout for this session
    cur.execute("SET statement_timeout = 0")
    cur.execute("SET lock_timeout = 0")
    print("  Connected. Timeout disabled for this session.\n")
except Exception as e:
    print(f"  ERROR connecting: {e}")
    sys.exit(1)

BASE  = Path(__file__).parent.parent / 'Database'
BATCH = 300

# ── Step 1: Drop & recreate tables ────────────────────────────────────────────
print("  Recreating tables...")
cur.execute("""
    DROP TABLE IF EXISTS detection_results;
    DROP TABLE IF EXISTS attacked_meter_data;
    DROP TABLE IF EXISTS meter_data;
""")

cur.execute("""
    CREATE TABLE meter_data (
        id           SERIAL PRIMARY KEY,
        meter_id     VARCHAR(10)   NOT NULL,
        timestamp    TIMESTAMP     NOT NULL,
        energy_kwh   DECIMAL(10,4) NOT NULL,
        voltage      DECIMAL(8,2),
        current      DECIMAL(8,3),
        power_factor DECIMAL(5,3),
        temperature  DECIMAL(5,1),
        status       VARCHAR(20),
        is_attack    BOOLEAN       DEFAULT FALSE,
        attack_type  VARCHAR(30)
    );

    CREATE TABLE attacked_meter_data (
        id           SERIAL PRIMARY KEY,
        meter_id     VARCHAR(10)   NOT NULL,
        timestamp    TIMESTAMP     NOT NULL,
        energy_kwh   DECIMAL(10,4) NOT NULL,
        voltage      DECIMAL(8,2),
        current      DECIMAL(8,3),
        power_factor DECIMAL(5,3),
        temperature  DECIMAL(5,1),
        status       VARCHAR(20),
        is_attack    BOOLEAN       DEFAULT FALSE,
        attack_type  VARCHAR(30),
        attacked_kwh DECIMAL(10,4) NOT NULL,
        diff_pct     DECIMAL(8,2)  NOT NULL
    );

    CREATE TABLE detection_results (
        id             SERIAL PRIMARY KEY,
        meter_id       VARCHAR(10)   NOT NULL,
        timestamp      TIMESTAMP     NOT NULL,
        energy_kwh     DECIMAL(10,4) NOT NULL,
        reading_kwh    DECIMAL(10,4) NOT NULL,
        detected       INTEGER       NOT NULL,
        risk_score     DECIMAL(5,2)  NOT NULL,
        risk_level     VARCHAR(20)   NOT NULL,
        rule_triggered VARCHAR(100),
        attack_type    VARCHAR(30),
        ground_truth   INTEGER       NOT NULL,
        detection_time VARCHAR(20)
    );
""")
print("  Tables created.\n")

# ── Helper: batch insert ───────────────────────────────────────────────────────
def batch_insert(label, sql, csv_path, converter):
    print(f"  Importing {label}...")
    with open(csv_path, newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    total, batch = 0, []
    for row in rows:
        batch.append(converter(row))
        if len(batch) >= BATCH:
            cur.executemany(sql, batch)
            total += len(batch)
            print(f"    {total:,} / {len(rows):,} rows...", end='\r')
            batch = []
    if batch:
        cur.executemany(sql, batch)
        total += len(batch)
    print(f"    {total:,} rows inserted.          ")
    return total

# ── Step 2: Import meter_data ──────────────────────────────────────────────────
n1 = batch_insert(
    'meter_data',
    "INSERT INTO meter_data (meter_id,timestamp,energy_kwh,voltage,current,power_factor,temperature,status,is_attack,attack_type) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    BASE / 'meter_data.csv',
    lambda r: (
        r['meter_id'], r['timestamp'],
        float(r['energy_kwh']), float(r['voltage']),
        float(r['current']),   float(r['power_factor']),
        float(r['temperature']),r['status'],
        r['is_attack'].strip().lower() in ('true','1'),
        r['attack_type'] or None
    )
)
print(f"  meter_data: {n1:,} rows  OK\n")

# ── Step 3: Import attacked_meter_data ─────────────────────────────────────────
n2 = batch_insert(
    'attacked_meter_data',
    "INSERT INTO attacked_meter_data (meter_id,timestamp,energy_kwh,voltage,current,power_factor,temperature,status,is_attack,attack_type,attacked_kwh,diff_pct) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    BASE / 'attacked_meter_data.csv',
    lambda r: (
        r['meter_id'], r['timestamp'],
        float(r['energy_kwh']), float(r['voltage']),
        float(r['current']),   float(r['power_factor']),
        float(r['temperature']),r['status'],
        r['is_attack'].strip().lower() in ('true','1'),
        r['attack_type'] or None,
        float(r['attacked_kwh']), float(r['diff_pct'])
    )
)
cur.execute("SELECT attack_type, COUNT(*) FROM attacked_meter_data GROUP BY attack_type ORDER BY 2 DESC")
print(f"  attacked_meter_data: {n2:,} rows  OK")
for t, c in cur.fetchall():
    print(f"    {str(t or '(normal)'):22} : {c:,}")
print()

# ── Step 4: Import detection_results ──────────────────────────────────────────
n3 = batch_insert(
    'detection_results',
    "INSERT INTO detection_results (meter_id,timestamp,energy_kwh,reading_kwh,detected,risk_score,risk_level,rule_triggered,attack_type,ground_truth,detection_time) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    BASE / 'detection_results.csv',
    lambda r: (
        r['meter_id'], r['timestamp'],
        float(r['energy_kwh']), float(r['reading_kwh']),
        int(r['detected']),     float(r['risk_score']),
        r['risk_level'],        r['rule_triggered'],
        r['attack_type'],       int(r['ground_truth']),
        r['detection_time']
    )
)
cur.execute("SELECT attack_type, COUNT(*) FROM detection_results WHERE detected=1 GROUP BY attack_type ORDER BY 2 DESC")
print(f"  detection_results: {n3:,} rows  OK")
for t, c in cur.fetchall():
    print(f"    {str(t or '(none)'):22} : {c:,}")

cur.close()
conn.close()
print(f"\n  DONE — {n1+n2+n3:,} total rows imported into Supabase.")
print("  Refresh the dashboard — all attack types will now show.\n")
