import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

NUM_METERS = 5
INTERVAL_MINUTES = 15
DAYS = 30

METER_SCALE = {1: 1.0, 2: 0.75, 3: 1.2, 4: 0.9, 5: 1.1}

start_time = datetime(2026, 2, 28, 0, 0, 0)
num_readings = (DAYS * 24 * 60) // INTERVAL_MINUTES
timestamps = [start_time + timedelta(minutes=i * INTERVAL_MINUTES)
              for i in range(num_readings)]

rows = []
for meter_num in range(1, NUM_METERS + 1):
    meter_id = f"M{meter_num:03d}"
    scale = METER_SCALE[meter_num]
    for ts in timestamps:
        hour = ts.hour
        is_weekend = ts.weekday() >= 5

        if 7 <= hour <= 9 or 18 <= hour <= 21:
            base_kwh = np.random.uniform(0.35, 0.60) * scale
        elif 10 <= hour <= 17:
            base_kwh = np.random.uniform(0.15, 0.30) * scale
        elif 22 <= hour <= 23 or hour == 0:
            base_kwh = np.random.uniform(0.05, 0.10) * scale
        else:
            base_kwh = np.random.uniform(0.01, 0.05) * scale

        if is_weekend:
            base_kwh = base_kwh * 1.15

        energy_kwh = round(base_kwh, 4)
        voltage = round(np.random.normal(230, 3.5), 2)
        power_factor = round(np.random.uniform(0.85, 0.98), 3)
        watts = energy_kwh * 4 * 1000
        current = round(watts / (voltage * power_factor), 3)
        temperature = round(np.random.normal(28.5, 2), 1)

        rows.append({
            "meter_id": meter_id,
            "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
            "energy_kwh": energy_kwh,
            "voltage": voltage,
            "current": current,
            "power_factor": power_factor,
            "temperature": temperature,
            "status": "normal",
            "is_attack": False,
            "attack_type": None,
        })

df = pd.DataFrame(rows)
df.to_csv("meter_data.csv", index=False)
print(f"Done! Generated {len(df)} readings for {NUM_METERS} meters.")
print(f"Columns: {list(df.columns)}")
print(f"Total columns: {len(df.columns)}")
print(df.head(10))

try:
    import matplotlib.pyplot as plt

    colors = ["steelblue", "green", "purple", "darkorange", "teal"]

    total_energy = df.groupby("meter_id")["energy_kwh"].sum()

    fig, axes = plt.subplots(1, 2, figsize=(14, 7))
    fig.suptitle("EcoMeter Integrity - Normal Smart Meter Data",
                 fontsize=14, fontweight='bold')

    axes[0].pie(
        total_energy.values,
        labels=total_energy.index,
        colors=colors,
        autopct="%1.1f%%",
        startangle=140,
        wedgeprops={"edgecolor": "white", "linewidth": 1.5},
        textprops={"fontsize": 12}
    )
    axes[0].set_title("Total Energy Share Per Meter (30 Days)", fontsize=12)

    axes[1].pie(
        total_energy.values,
        labels=[f"{m}\n{v:.1f} kWh" for m, v in
                zip(total_energy.index, total_energy.values)],
        colors=colors,
        startangle=140,
        wedgeprops={"edgecolor": "white", "linewidth": 1.5},
        textprops={"fontsize": 11}
    )
    axes[1].set_title("Total Energy Amount Per Meter (30 Days)", fontsize=12)

    plt.tight_layout()
    plt.savefig("pie_chart.png", dpi=120)
    plt.show()
    print(f"\n[OK] pie_chart.png saved!")

except ImportError:
    print("\n[INFO] pip install matplotlib")