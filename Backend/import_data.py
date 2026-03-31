import psycopg2
import csv
from datetime import datetime

conn = psycopg2.connect(
    host="localhost",
    database="ecometer",
    user="postgres",
    password="ecometer123"  # change to your password
)
cur = conn.cursor()

# Import meter_data.csv
with open('../Database/meter_data.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cur.execute("""
            INSERT INTO meter_data 
            (meter_id, timestamp, energy_kwh, voltage, current, power_factor, temperature, status, is_attack, attack_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            row['meter_id'],
            row['timestamp'],
            float(row['energy_kwh']),
            float(row['voltage']),
            float(row['current']),
            float(row['power_factor']),
            float(row['temperature']),
            row['status'],
            row['is_attack'] == 'True',
            row['attack_type']
        ))

print("meter_data imported ✅")

# Import attacked_meter_data.csv
with open('../Database/attacked_meter_data.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cur.execute("""
            INSERT INTO attacked_meter_data 
            (meter_id, timestamp, energy_kwh, voltage, current, power_factor, temperature, status, is_attack, attack_type, attacked_kwh, diff_pct)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            row['meter_id'],
            row['timestamp'],
            float(row['energy_kwh']),
            float(row['voltage']),
            float(row['current']),
            float(row['power_factor']),
            float(row['temperature']),
            row['status'],
            row['is_attack'] == 'True',
            row['attack_type'],
            float(row['attacked_kwh']),
            float(row['diff_pct'])
        ))

print("attacked_meter_data imported ✅")

# Import detection_results.csv
with open('../Database/detection_results.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        cur.execute("""
            INSERT INTO detection_results 
            (meter_id, timestamp, energy_kwh, reading_kwh, detected, risk_score, risk_level, rule_triggered, ground_truth, detection_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            row['meter_id'],
            row['timestamp'],
            float(row['energy_kwh']),
            float(row['reading_kwh']),
            int(row['detected']),
            float(row['risk_score']),
            row['risk_level'],
            row['rule_triggered'],
            int(row['ground_truth']),
            row['detection_time']
        ))

print("detection_results imported ✅")

conn.commit()
cur.close()
conn.close()
print("All data imported successfully! ✅")