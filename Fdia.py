import pandas as pd
import random
import numpy as np
import logging
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

random.seed(42)
np.random.seed(42)

logging.basicConfig(
    filename="fdia_attacks.log",
    level=logging.INFO,
    format="%(asctime)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)


def inject_fdia(real_value, attack_type):
    if attack_type == "stealth_reduce":
        return round(real_value * 0.85, 4)
    elif attack_type == "spike":
        return round(real_value * 1.8, 4)
    elif attack_type == "noise":
        noise = random.uniform(-0.10, 0.10)
        return round(real_value * (1 + noise), 4)
    return real_value


if __name__ == "__main__":

    try:
        df = pd.read_csv(r"E:\project1\meter_data.csv")
        print(f"meter_data.csv loaded — {len(df)} readings")
        print(f"Meters: {list(df['meter_id'].unique())}")
    except FileNotFoundError:
        print("meter_data.csv file not found in E:\\project\\")
        exit()

    attack_map = {
        "M001": "stealth_reduce",
        "M002": "spike",
        "M003": "noise",
        "M004": "stealth_reduce",
        "M005": "spike",
    }

    attacked_kwh     = []
    is_attack_list   = []
    attack_type_list = []
    diff_pct_list    = []

    for _, row in df.iterrows():
        meter    = row["meter_id"]
        real_val = float(row["energy_kwh"])
        atype    = attack_map.get(meter, "stealth_reduce")
        do_attack = random.random() < 0.30

        if do_attack:
            fake_val = inject_fdia(real_val, atype)
            diff     = round(((fake_val - real_val) / real_val) * 100, 2) \
                       if real_val != 0 else 0.0
            attacked_kwh.append(fake_val)
            is_attack_list.append(True)
            attack_type_list.append(atype)
            diff_pct_list.append(diff)
            logging.info(
                f"ATTACK | meter={meter} | type={atype} | "
                f"real={real_val} | fake={fake_val} | diff={diff:+.2f}%"
            )
        else:
            attacked_kwh.append(real_val)
            is_attack_list.append(False)
            attack_type_list.append("")
            diff_pct_list.append(0.0)

    df["attacked_kwh"] = attacked_kwh
    df["is_attack"]    = is_attack_list
    df["attack_type"]  = attack_type_list
    df["diff_pct"]     = diff_pct_list
    df["status"]       = df["is_attack"].apply(lambda x: "attack" if x else "normal")

    df.to_csv(r"E:\project1\attacked_meter_data.csv", index=False)

    print(f"\nAttack Summary by Meter")
    print(f"{'Meter':<8} {'Attack Type':<18} {'Attacked':>9} {'Normal':>8} {'Total':>7}")
    print("-" * 55)
    for meter in df["meter_id"].unique():
        m     = df[df["meter_id"] == meter]
        atk   = m["is_attack"].sum()
        norm  = (~m["is_attack"]).sum()
        atype = attack_map.get(meter, "")
        print(f"{meter:<8} {atype:<18} {atk:>9} {norm:>8} {len(m):>7}")

    print(f"\nTotal attacked : {df['is_attack'].sum()}")
    print(f"Total normal   : {(~df['is_attack']).sum()}")

    print(f"\nSample Results (first 6 attacked rows)")
    print(f"{'Meter':<8} {'Timestamp':<22} {'Real kWh':>9} {'Attacked kWh':>13} {'Type':<16} {'Diff':>7}")
    print("-" * 80)
    for _, row in df[df["is_attack"] == True].head(6).iterrows():
        print(f"{row['meter_id']:<8} {row['timestamp']:<22} "
              f"{row['energy_kwh']:>9.4f} {row['attacked_kwh']:>13.4f} "
              f"{row['attack_type']:<16} {row['diff_pct']:>+6.2f}%")

    plt.style.use("dark_background")
    fig = plt.figure(figsize=(16, 12), facecolor="#0D1117")
    fig.suptitle("EcoMeter Integrity — FDIA Attack Simulation",
                 fontsize=16, fontweight="bold", color="#00FFAA",
                 fontfamily="monospace", y=0.98)

    gs = gridspec.GridSpec(3, 2, figure=fig, hspace=0.6, wspace=0.35)

    meter_config = {
        "M001": {"nc": "#00BFFF", "ac": "#FF4444", "pos": (0, 0)},
        "M002": {"nc": "#00E676", "ac": "#FF9100", "pos": (0, 1)},
        "M003": {"nc": "#CE93D8", "ac": "#FF4081", "pos": (1, 0)},
        "M004": {"nc": "#4DD0E1", "ac": "#EF5350", "pos": (1, 1)},
        "M005": {"nc": "#A5D6A7", "ac": "#FFA726", "pos": (2, 0)},
    }

    for meter, cfg in meter_config.items():
        r, c  = cfg["pos"]
        ax    = fig.add_subplot(gs[r, c])
        ax.set_facecolor("#161B22")
        m_data   = df[df["meter_id"] == meter]
        x        = np.arange(len(m_data))
        normal   = m_data["energy_kwh"].values
        attacked = m_data["attacked_kwh"].values
        atype    = attack_map.get(meter, "")

        ax.fill_between(x, normal,   alpha=0.10, color=cfg["nc"])
        ax.fill_between(x, attacked, alpha=0.08, color=cfg["ac"])
        ax.plot(x, normal,   color=cfg["nc"], linewidth=1.5, label="Normal",    zorder=3)
        ax.plot(x, attacked, color=cfg["ac"], linewidth=1.5, label=f"FDIA ({atype})",
                linestyle="--", alpha=0.85, zorder=4)

        ax.set_title(f"{meter}  ·  {atype}", fontsize=10, color="#AAAAAA",
                     fontfamily="monospace", loc="left", pad=6)
        ax.set_ylabel("Energy (kWh)", fontsize=8, color="#666666")
        ax.tick_params(colors="#555555", labelsize=7)
        for sp in ax.spines.values():
            sp.set_edgecolor("#30363D")
        ax.grid(True, color="#21262D", linewidth=0.5, linestyle="--", alpha=0.7)
        ax.legend(loc="upper right", fontsize=7, facecolor="#161B22",
                  edgecolor="#30363D", labelcolor="white", framealpha=0.9)

    ax_info = fig.add_subplot(gs[2, 1])
    ax_info.set_facecolor("#161B22")
    ax_info.axis("off")
    for sp in ax_info.spines.values():
        sp.set_edgecolor("#30363D")

    total_atk  = df["is_attack"].sum()
    total_norm = (~df["is_attack"]).sum()
    info_text  = (
        f"Attack Statistics\n\n"
        f"Total Readings  : {len(df):,}\n"
        f"Attacked        : {total_atk:,}  (~30%)\n"
        f"Normal          : {total_norm:,}  (~70%)\n\n"
        f"Attack Types\n"
        f"  stealth_reduce : -15%  (M001, M004)\n"
        f"  spike          : +80%  (M002, M005)\n"
        f"  noise          : ±10%  (M003)\n\n"
        f"Date Range\n"
        f"  {df['timestamp'].min()[:10]}\n"
        f"  {df['timestamp'].max()[:10]}"
    )
    ax_info.text(0.08, 0.95, info_text, transform=ax_info.transAxes,
                 fontsize=9, color="#CCCCCC", fontfamily="monospace",
                 verticalalignment="top", linespacing=1.6)

    fig.text(0.5, 0.01, "Reading Index (every 15 mins)",
             ha="center", fontsize=9, color="#555555")

    plt.savefig(r"E:\project1\comparison_chart.png",
                dpi=150, bbox_inches="tight", facecolor="#0D1117")
    plt.show(block=True)
