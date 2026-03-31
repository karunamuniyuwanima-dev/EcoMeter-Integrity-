# ============================================================
# detection_engine.py
# EcoMeter Integrity — Anomaly Detection Module  v4
# Developer  : Thisari Chamathka
# FR3: Energy stream monitoring
# FR4: Anomaly detection — 3 attack types
# FR5: Risk scoring
#
# Week 5 update — Treveen's realistic attack data:
#   - stealth_reduce : -15%  (M001, M004) — 30% of readings
#   - spike          : +80%  (M002, M005) — 30% of readings
#   - noise          : ±10%  (M003)       — 30% of readings
#   - normal         : unchanged          — 70% of readings
# ============================================================

import pandas as pd
import numpy as np
import os
import json
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from datetime import datetime

# ── Detection thresholds ──────────────────────────────────────
# Gantt 1.4.3.2 — Documented thresholds per attack type
THRESHOLDS = {
    'kwh_volt_gap_low' : -10,    # stealth_reduce: energy drops, voltage stays
    'kwh_volt_gap_high':  10,    # spike: energy rises, voltage stays
    'baseline_drop'    : -10,    # % drop from hourly baseline
    'baseline_spike'   :  50,    # % spike from hourly baseline
    'zscore_thresh'    :  1.0,   # noise: statistical outlier
    'min_kwh'          :  0.005, # absolute minimum floor
    'detection_score'  :  35,    # score >= 35 → flagged as anomaly
}


# ─────────────────────────────────────────────────────────────
def load_data(normal_path, attacked_path):
    """
    FR3: Load normal baseline and attacked stream.
    Treveen's new file has 30% attacked rows and 70% normal rows
    already mixed in one CSV — is_attack column is the ground truth.
    """
    df_n = pd.read_csv(normal_path,   parse_dates=['timestamp'])
    df_a = pd.read_csv(attacked_path, parse_dates=['timestamp'])

    df_n = df_n.sort_values(['meter_id','timestamp']).reset_index(drop=True)
    df_a = df_a.sort_values(['meter_id','timestamp']).reset_index(drop=True)

    # Build hourly baseline from clean normal data
    df_n['hour'] = df_n['timestamp'].dt.hour
    baseline = df_n.groupby(['meter_id','hour'])[
        ['energy_kwh','voltage','current','power_factor']
    ].mean().reset_index()
    baseline.columns = ['meter_id','hour',
                        'base_kwh','base_voltage','base_current','base_pf']

    # Use attacked file as the input stream
    # reading_kwh = attacked_kwh (what the system actually receives)
    # ground_truth = is_attack (Treveen's label — True/False)
    df = df_a.copy()
    df['reading_kwh']  = df['attacked_kwh']
    df['ground_truth'] = df['is_attack'].astype(int)
    df['hour']         = df['timestamp'].dt.hour
    df = df.merge(baseline, on=['meter_id','hour'], how='left')

    # Fill empty attack_type for normal rows
    df['attack_type'] = df['attack_type'].fillna('none')

    attack_counts = df[df['ground_truth']==1]['attack_type'].value_counts()

    print("=" * 55)
    print("  ECOMETER INTEGRITY — DETECTION ENGINE v4")
    print("=" * 55)
    print(f"  Total readings  : {len(df):,}")
    print(f"  Normal rows     : {(df['ground_truth']==0).sum():,}  (70%)")
    print(f"  Attacked rows   : {(df['ground_truth']==1).sum():,}  (30%)")
    print(f"  Meters          : {df['meter_id'].nunique()}")
    print(f"\n  Attack type breakdown:")
    for at, cnt in attack_counts.items():
        print(f"    {at:<20}: {cnt:,}")

    return df, baseline


# ─────────────────────────────────────────────────────────────
def engineer_features(df):
    """
    FR3: Gantt 1.4.3.3 — Consistency rules
    Key rule: energy = voltage x current x power_factor
    If energy changes but voltage/current stay normal = FDIA detected
    """
    parts = []
    for meter_id, grp in df.groupby('meter_id'):
        grp = grp.sort_values('timestamp').copy()

        # % deviation from hourly baseline
        grp['kwh_pct']  = (grp['reading_kwh'] - grp['base_kwh'])     / (grp['base_kwh']     + 0.001) * 100
        grp['volt_pct'] = (grp['voltage']      - grp['base_voltage']) / (grp['base_voltage'] + 0.001) * 100
        grp['curr_pct'] = (grp['current']      - grp['base_current']) / (grp['base_current'] + 0.001) * 100

        # Gantt 1.4.3.3 — Voltage/kWh mismatch consistency rule
        # Normal: gap ≈ 0  |  Reduce: gap very negative  |  Spike: gap very positive
        grp['kwh_volt_gap'] = grp['kwh_pct'] - (grp['volt_pct'] + grp['curr_pct'])

        # Rolling stats (8 readings = 2 hours)
        grp['roll_mean'] = grp['reading_kwh'].rolling(8, min_periods=1).mean()
        grp['roll_std']  = grp['reading_kwh'].rolling(8, min_periods=1).std().fillna(0.001)
        grp['zscore']    = (grp['reading_kwh'] - grp['roll_mean']) / (grp['roll_std'] + 0.001)

        parts.append(grp)

    return pd.concat(parts).reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
def score_row(row):
    """
    FR4: Gantt 1.4.3.4 — Three anomaly conditions
    Gantt 1.4.3.6 — Threshold check implementation

    Rule 1 — Threshold breach  : reading below/above safe range
    Rule 2 — Spike detection   : sudden large increase
    Rule 3 — Consistency check : energy vs voltage mismatch (FDIA)
    Rule 4 — Z-score outlier   : noise attack detection
    """
    score = 0
    rules = []
    gap   = row['kwh_volt_gap']

    # Stealth reduce: energy drops but voltage stays
    if gap < THRESHOLDS['kwh_volt_gap_low']:
        score += 50
        rules.append('energy_drop_gap')

    if row['kwh_pct'] < THRESHOLDS['baseline_drop']:
        score += 30
        rules.append('baseline_drop')

    # Spike: energy rises but voltage stays
    if gap > THRESHOLDS['kwh_volt_gap_high']:
        score += 55
        rules.append('energy_spike_gap')

    if row['kwh_pct'] > THRESHOLDS['baseline_spike']:
        score += 40
        rules.append('baseline_spike')

    # Noise: statistical outlier
    if abs(row['zscore']) > THRESHOLDS['zscore_thresh']:
        score += 20
        rules.append('zscore_outlier')

    # Absolute minimum
    if row['reading_kwh'] < THRESHOLDS['min_kwh']:
        score += 25
        rules.append('below_minimum')

    return min(score, 100), ('+'.join(rules) if rules else 'none')


# ─────────────────────────────────────────────────────────────
def risk_label(score):
    """FR5: Risk level for dashboard display."""
    if   score >= 75: return 'CRITICAL'
    elif score >= 50: return 'HIGH'
    elif score >= 35: return 'MEDIUM'
    elif score >  0:  return 'LOW'
    else:             return 'NORMAL'


# ─────────────────────────────────────────────────────────────
def run_detection(df):
    """Gantt 1.4.3.5 — Full detection flow:
    Input → threshold check → gap check → zscore check → risk score → output
    """
    print(f"\n  Engineering features (Gantt 1.4.3.3)...")
    df = engineer_features(df)

    print(f"  Running detection rules (Gantt 1.4.3.4 + 1.4.3.6)...")
    scored = df.apply(score_row, axis=1, result_type='expand')
    scored.columns = ['risk_score', 'rule_triggered']

    df = df.copy()
    df['risk_score']     = scored['risk_score'].values
    df['rule_triggered'] = scored['rule_triggered'].values
    df['risk_level']     = df['risk_score'].apply(risk_label)
    df['detected']       = (df['risk_score'] >= THRESHOLDS['detection_score']).astype(int)
    df['detection_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    n  = len(df)
    nd = int(df['detected'].sum())
    print(f"\n  DETECTION SUMMARY")
    print(f"  Total     : {n:,}")
    print(f"  Anomalies : {nd:,}  ({nd/n*100:.1f}%)")
    print(f"  Normal    : {n-nd:,}  ({(n-nd)/n*100:.1f}%)")
    print(f"\n  Risk breakdown:")
    print(df['risk_level'].value_counts().to_string())

    print(f"\n  Detection rate per attack type:")
    for at in ['stealth_reduce', 'spike', 'noise']:
        sub = df[df['attack_type'] == at]
        if len(sub) > 0:
            rate = sub['detected'].mean() * 100
            print(f"    {at:<20}: {sub['detected'].sum():,}/{len(sub):,} ({rate:.1f}%)")

    return df


# ─────────────────────────────────────────────────────────────
def evaluate_accuracy(df):
    """Gantt 1.4.3.7 — Accuracy metrics against Treveen's ground truth."""
    actual = df['ground_truth']
    pred   = df['detected']

    tp = int(((pred==1) & (actual==1)).sum())
    tn = int(((pred==0) & (actual==0)).sum())
    fp = int(((pred==1) & (actual==0)).sum())
    fn = int(((pred==0) & (actual==1)).sum())

    acc  = (tp+tn) / len(df)      * 100
    prec = tp      / (tp+fp+1e-9) * 100
    rec  = tp      / (tp+fn+1e-9) * 100
    f1   = 2*prec*rec / (prec+rec+1e-9)

    print(f"\n  ACCURACY EVALUATION")
    print(f"  Accuracy  : {acc:.1f}%")
    print(f"  Precision : {prec:.1f}%")
    print(f"  Recall    : {rec:.1f}%")
    print(f"  F1 Score  : {f1:.1f}%")
    print(f"  TP:{tp:,}  TN:{tn:,}  FP:{fp:,}  FN:{fn:,}")
    if fp > 0 and fn > 0:
        print(f"  All 4 confusion matrix cells are non-zero")
    print("=" * 55)

    return {'accuracy':acc, 'precision':prec, 'recall':rec, 'f1':f1,
            'tp':tp, 'tn':tn, 'fp':fp, 'fn':fn}


# ─────────────────────────────────────────────────────────────
def save_results(df, path='output/detection_results.csv'):
    """FR6: Save for Shehani's MySQL database."""
    os.makedirs('output', exist_ok=True)
    cols = ['meter_id','timestamp','energy_kwh','reading_kwh',
            'detected','risk_score','risk_level','rule_triggered',
            'attack_type','ground_truth','detection_time']
    df[[c for c in cols if c in df.columns]].to_csv(path, index=False)
    print(f"\n  CSV saved -> {path}  ({len(df):,} rows)")


# ─────────────────────────────────────────────────────────────
def generate_graphs(df, metrics):
    """FR7: Generate 3 graph files for dashboard."""
    os.makedirs('output', exist_ok=True)
    print("\n  Generating graphs...")

    # ── GRAPH 1: Detection overview ───────────────────────────
    fig1 = plt.figure(figsize=(16, 12))
    fig1.suptitle('EcoMeter Integrity - Detection Results (3 Attack Types)',
                  fontsize=16, fontweight='bold', y=0.98)
    gs1 = gridspec.GridSpec(2, 2, figure=fig1, hspace=0.4, wspace=0.35)

    # Line chart
    ax1 = fig1.add_subplot(gs1[0, :])
    colors_at = {'stealth_reduce':'orange', 'spike':'red', 'noise':'purple'}

    m1_normal = df[(df['meter_id']=='M001') & (df['ground_truth']==0)].head(96).reset_index(drop=True)
    ax1.plot(m1_normal.index, m1_normal['energy_kwh'],
             color='steelblue', lw=1.5, label='Normal reading', alpha=0.9, zorder=3)

    for at, col in colors_at.items():
        sub = df[(df['attack_type']==at) & (df['ground_truth']==1)].head(96).reset_index(drop=True)
        if len(sub) > 0:
            ax1.plot(sub.index, sub['reading_kwh'],
                     color=col, lw=1, label=f'{at} attack', alpha=0.7)
            det = sub[sub['detected']==1]
            if len(det) > 0:
                ax1.scatter(det.index, det['reading_kwh'],
                            color=col, s=18, zorder=5, marker='x')

    ax1.set_title('Energy Readings - Normal vs 3 Attack Types', fontweight='bold')
    ax1.set_ylabel('Energy (kWh)')
    ax1.legend(fontsize=9, loc='upper right')

    # Pie: risk level
    ax2 = fig1.add_subplot(gs1[1, 0])
    rc   = df[df['ground_truth']==1]['risk_level'].value_counts()
    cmap = {'CRITICAL':'#DC2626','HIGH':'#EA580C',
            'MEDIUM':'#D97706','LOW':'#65A30D','NORMAL':'#16A34A'}
    if len(rc) > 0:
        ax2.pie(rc.values, labels=rc.index, autopct='%1.1f%%',
                colors=[cmap.get(r,'#888') for r in rc.index], startangle=90)
    ax2.set_title('Risk Level Distribution', fontweight='bold')

    # Bar: per attack type
    ax3 = fig1.add_subplot(gs1[1, 1])
    at_labels   = []
    at_detected = []
    at_missed   = []
    at_rates    = []
    for at in ['stealth_reduce', 'spike', 'noise']:
        sub = df[df['attack_type'] == at]
        if len(sub) > 0:
            det  = int(sub['detected'].sum())
            miss = int(len(sub) - det)
            at_labels.append(at)
            at_detected.append(det)
            at_missed.append(miss)
            at_rates.append(sub['detected'].mean()*100)

    if len(at_labels) > 0:
        xs = list(range(len(at_labels)))
        ax3.bar(xs, at_detected, color='#DC2626', label='Detected', edgecolor='white')
        ax3.bar(xs, at_missed, bottom=at_detected,
                color='#93C5FD', label='Missed', edgecolor='white')
        ax3.set_xticks(xs)
        ax3.set_xticklabels(at_labels, rotation=10, fontsize=9)
        ax3.set_title('Detection Rate per Attack Type', fontweight='bold')
        ax3.set_ylabel('Number of readings')
        ax3.legend()
        for i in range(len(at_labels)):
            ax3.text(i, at_detected[i]+at_missed[i]+5,
                     f'{at_rates[i]:.0f}%', ha='center', fontsize=9, fontweight='bold')

    plt.savefig('output/detection_overview.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("  Graph 1 -> output/detection_overview.png")

    # ── GRAPH 2: Accuracy metrics + confusion matrix ──────────
    fig2, axes2 = plt.subplots(1, 2, figsize=(14, 5))
    fig2.suptitle('EcoMeter Integrity - Accuracy Metrics', fontsize=14, fontweight='bold')

    names = ['Accuracy','Precision','Recall','F1 Score']
    vals  = [metrics['accuracy'],metrics['precision'],metrics['recall'],metrics['f1']]
    bars  = axes2[0].bar(names, vals,
                         color=['#0D9488' if v>=70 else '#D97706' for v in vals],
                         edgecolor='white', width=0.5)
    for bar, v in zip(bars, vals):
        axes2[0].text(bar.get_x()+bar.get_width()/2,
                      bar.get_height()+0.8, f'{v:.1f}%',
                      ha='center', va='bottom', fontweight='bold', fontsize=12)
    axes2[0].set_ylim(0, 115)
    axes2[0].set_ylabel('Percentage (%)')
    axes2[0].set_title('Performance Metrics', fontweight='bold')
    axes2[0].axhline(70, color='green', linestyle='--', alpha=0.6, label='70% baseline')
    axes2[0].legend()

    cm = np.array([[metrics['tn'],metrics['fp']],[metrics['fn'],metrics['tp']]])
    im = axes2[1].imshow(cm, cmap='Blues')
    axes2[1].set_xticks([0,1])
    axes2[1].set_yticks([0,1])
    axes2[1].set_xticklabels(['Predicted Normal','Predicted Attack'])
    axes2[1].set_yticklabels(['Actual Normal','Actual Attack'])
    axes2[1].set_title('Confusion Matrix', fontweight='bold')
    for i in range(2):
        for j in range(2):
            axes2[1].text(j, i, f'{cm[i,j]:,}',
                          ha='center', va='center', fontsize=13, fontweight='bold',
                          color='white' if cm[i,j]>cm.max()/2 else 'black')
    plt.colorbar(im, ax=axes2[1])
    plt.tight_layout()
    plt.savefig('output/accuracy_metrics.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("  Graph 2 -> output/accuracy_metrics.png")

    # ── GRAPH 3: Risk scores + rules ─────────────────────────
    fig3  = plt.figure(figsize=(14, 5))
    ax3a  = fig3.add_subplot(1, 2, 1)
    ax3b  = fig3.add_subplot(1, 2, 2)
    fig3.suptitle('EcoMeter Integrity - Risk Score Analysis', fontsize=14, fontweight='bold')

    ax3a.hist(df[df['ground_truth']==0]['risk_score'],
              bins=20, color='steelblue', alpha=0.7, label='Normal')
    ax3a.hist(df[df['ground_truth']==1]['risk_score'],
              bins=20, color='#DC2626', alpha=0.6, label='Attack')
    ax3a.axvline(THRESHOLDS['detection_score'], color='black', linestyle='--', lw=2,
                 label=f"Threshold ({THRESHOLDS['detection_score']})")
    ax3a.set_xlabel('Risk Score')
    ax3a.set_ylabel('Count')
    ax3a.set_title('Risk Score Distribution', fontweight='bold')
    ax3a.legend()

    if 'rule_triggered' in df.columns:
        mask        = df['rule_triggered'].notna() & (df['rule_triggered'] != 'none')
        rule_counts = df.loc[mask, 'rule_triggered'].value_counts().head(8)
    else:
        rule_counts = pd.Series([], dtype=int)

    if len(rule_counts) > 0:
        ax3b.barh(rule_counts.index, rule_counts.values, color='#0D9488', edgecolor='white')
        ax3b.set_xlabel('Number of detections')
        ax3b.set_title('Detection Rules Triggered', fontweight='bold')
        for i, val in enumerate(rule_counts.values):
            ax3b.text(val+5, i, f'{val:,}', va='center', fontsize=10)
    else:
        ax3b.text(0.5, 0.5, 'No rule data', ha='center', va='center',
                  transform=ax3b.transAxes, color='gray')
        ax3b.set_title('Detection Rules Triggered', fontweight='bold')

    plt.tight_layout()
    plt.savefig('output/risk_analysis.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("  Graph 3 -> output/risk_analysis.png")
    print("\n  All 3 graphs saved!")


# ─────────────────────────────────────────────────────────────
def get_summary_for_api(df, metrics):
    """Returns summary dict for Shehani's Flask API."""
    attack_breakdown = {}
    for at in ['stealth_reduce', 'spike', 'noise']:
        sub = df[df['attack_type'] == at]
        if len(sub) > 0:
            attack_breakdown[at] = {
                'total'    : int(len(sub)),
                'detected' : int(sub['detected'].sum()),
                'rate_pct' : round(sub['detected'].mean()*100, 1)
            }

    return {
        'total_readings'    : int(len(df)),
        'total_attacks'     : int(df['ground_truth'].sum()),
        'anomalies_found'   : int(df['detected'].sum()),
        'normal_count'      : int((df['detected']==0).sum()),
        'detection_rate'    : round(df['detected'].mean()*100, 2),
        'accuracy'          : round(metrics['accuracy'],  1),
        'precision'         : round(metrics['precision'], 1),
        'recall'            : round(metrics['recall'],    1),
        'f1_score'          : round(metrics['f1'],        1),
        'tp'                : metrics['tp'],
        'tn'                : metrics['tn'],
        'fp'                : metrics['fp'],
        'fn'                : metrics['fn'],
        'critical_count'    : int((df['risk_level']=='CRITICAL').sum()),
        'high_count'        : int((df['risk_level']=='HIGH').sum()),
        'medium_count'      : int((df['risk_level']=='MEDIUM').sum()),
        'low_count'         : int((df['risk_level']=='LOW').sum()),
        'normal_risk_count' : int((df['risk_level']=='NORMAL').sum()),
        'avg_risk_score'    : round(df['risk_score'].mean(), 2),
        'meters_monitored'  : int(df['meter_id'].nunique()),
        'attack_breakdown'  : attack_breakdown,
        'date_range_start'  : str(df['timestamp'].min()),
        'date_range_end'    : str(df['timestamp'].max()),
        'generated_at'      : datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    }


# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':

    NORMAL_FILE   = 'meter_data.csv'
    ATTACKED_FILE = 'attacked_meter_data.csv'
    OUTPUT_CSV    = 'output/detection_results.csv'
    OUTPUT_JSON   = 'output/api_summary.json'

    for f in [NORMAL_FILE, ATTACKED_FILE]:
        if not os.path.exists(f):
            print(f"  ERROR: {f} not found.")
            exit(1)

    df, baseline = load_data(NORMAL_FILE, ATTACKED_FILE)
    df           = run_detection(df)
    metrics      = evaluate_accuracy(df)
    save_results(df, OUTPUT_CSV)
    generate_graphs(df, metrics)

    summary = get_summary_for_api(df, metrics)

    print(f"\n{'='*55}")
    print(f"  SUMMARY FOR SHEHANI'S FLASK API")
    print(f"{'='*55}")
    for k, v in summary.items():
        if k != 'attack_breakdown':
            print(f"   {k:<24} : {v}")
    print(f"   attack_breakdown:")
    for at, info in summary.get('attack_breakdown',{}).items():
        print(f"     {at:<20}: {info}")
    print(f"{'='*55}")

    os.makedirs('output', exist_ok=True)
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(summary, f, indent=4)

    print(f"\n  JSON saved -> {OUTPUT_JSON}")
    print(f"\n  FILES TO SEND TO SHEHANI:")
    print(f"  1. detection_engine.py")
    print(f"  2. output/detection_results.csv")
    print(f"  3. output/api_summary.json")
    print(f"  4. output/detection_overview.png")
    print(f"  5. output/accuracy_metrics.png")
    print(f"  6. output/risk_analysis.png")
    print(f"\n  DONE!")
