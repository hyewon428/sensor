import pandas as pd
import numpy as np
import json
from scipy import stats, signal

# 1. Load Data
df = pd.read_excel('센서 스무딩.xlsx', sheet_name='센서_시계열')
time_str = df['측정시각'].dt.strftime('%H:%M').tolist()
time_full = df['측정시각'].dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
elapsed_min = df['경과시간(분)'].tolist()
elapsed_hr = df['경과시간(시간)'].tolist()
raw_temp = df['온도센서 원시값(°C)'].values
true_temp = df['온도 참값·비교용(°C)'].values
vib = df['진동 RMS(mm/s)'].values
press = df['압력(kPa)'].values
events = df['이벤트'].tolist()

n = len(raw_temp)

# Output structure
payload = {
    'meta': {
        'total_records': n,
        'start_time': time_full[0],
        'end_time': time_full[-1],
        'interval_min': 1,
        'columns': ['측정시각', '경과시간(분)', '온도센서 원시값(°C)', '온도 참값·비교용(°C)', '진동 RMS(mm/s)', '압력(kPa)', '이벤트']
    },
    'raw_data': {
        'time_str': time_str,
        'elapsed_min': elapsed_min,
        'raw_temp': [round(float(v), 3) for v in raw_temp],
        'true_temp': [round(float(v), 3) for v in true_temp],
        'vib': [round(float(v), 3) for v in vib],
        'press': [round(float(v), 3) for v in press],
        'events': events
    },
    'analytics': {}
}

# -------------------------------------------------------------
# Technique 1: Descriptive Stats
# -------------------------------------------------------------
def get_stats(arr):
    q25, q50, q75 = np.percentile(arr, [25, 50, 75])
    iqr = q75 - q25
    mean = np.mean(arr)
    std = np.std(arr, ddof=1)
    return {
        'count': len(arr),
        'mean': round(float(mean), 3),
        'median': round(float(q50), 3),
        'std': round(float(std), 3),
        'variance': round(float(std**2), 3),
        'min': round(float(np.min(arr)), 3),
        'max': round(float(np.max(arr)), 3),
        'range': round(float(np.max(arr) - np.min(arr)), 3),
        'q25': round(float(q25), 3),
        'q75': round(float(q75), 3),
        'iqr': round(float(iqr), 3),
        'skew': round(float(stats.skew(arr)), 3),
        'kurtosis': round(float(stats.kurtosis(arr)), 3),
        'cv_percent': round(float((std / mean) * 100), 2)
    }

payload['analytics']['m01_descriptive'] = {
    'raw_temp': get_stats(raw_temp),
    'true_temp': get_stats(true_temp),
    'vibration': get_stats(vib),
    'pressure': get_stats(press),
    'event_counts': df['이벤트'].value_counts().to_dict()
}

# -------------------------------------------------------------
# Technique 2: Histogram & KDE
# -------------------------------------------------------------
def calc_hist_kde(arr, bins=30):
    hist, bin_edges = np.histogram(arr, bins=bins, density=True)
    counts, _ = np.histogram(arr, bins=bins, density=False)
    kde = stats.gaussian_kde(arr)
    x_grid = np.linspace(np.min(arr), np.max(arr), 100)
    kde_vals = kde(x_grid)
    bin_centers = [(bin_edges[i] + bin_edges[i+1])/2 for i in range(len(bin_edges)-1)]
    return {
        'bin_centers': [round(float(v), 2) for v in bin_centers],
        'counts': [int(v) for v in counts],
        'density': [round(float(v), 5) for v in hist],
        'x_grid': [round(float(v), 2) for v in x_grid],
        'kde_vals': [round(float(v), 5) for v in kde_vals]
    }

payload['analytics']['m02_hist_kde'] = {
    'raw_temp': calc_hist_kde(raw_temp),
    'true_temp': calc_hist_kde(true_temp),
    'vibration': calc_hist_kde(vib),
    'pressure': calc_hist_kde(press)
}

# -------------------------------------------------------------
# Technique 3: Box & Whisker by Event
# -------------------------------------------------------------
event_list = list(df['이벤트'].unique())
box_data = {}
for ev in event_list:
    sub = df[df['이벤트'] == ev]
    t = sub['온도센서 원시값(°C)'].values
    v = sub['진동 RMS(mm/s)'].values
    p = sub['압력(kPa)'].values
    
    def box_stats(arr):
        q1, q2, q3 = np.percentile(arr, [25, 50, 75])
        iqr = q3 - q1
        low_w = max(np.min(arr), q1 - 1.5 * iqr)
        high_w = min(np.max(arr), q3 + 1.5 * iqr)
        outliers = arr[(arr < low_w) | (arr > high_w)]
        return {
            'count': len(arr),
            'min': round(float(np.min(arr)), 3),
            'q1': round(float(q1), 3),
            'median': round(float(q2), 3),
            'q3': round(float(q3), 3),
            'max': round(float(np.max(arr)), 3),
            'lower_whisker': round(float(low_w), 3),
            'upper_whisker': round(float(high_w), 3),
            'outlier_count': len(outliers)
        }
    box_data[ev] = {
        'temp': box_stats(t),
        'vib': box_stats(v),
        'press': box_stats(p)
    }
payload['analytics']['m03_box_whisker'] = box_data

# -------------------------------------------------------------
# Technique 4: Simple Moving Average (SMA)
# -------------------------------------------------------------
s_series = pd.Series(raw_temp)
sma_5 = s_series.rolling(5, min_periods=1).mean().values
sma_15 = s_series.rolling(15, min_periods=1).mean().values
sma_30 = s_series.rolling(30, min_periods=1).mean().values
sma_60 = s_series.rolling(60, min_periods=1).mean().values

payload['analytics']['m04_sma'] = {
    'sma_5': [round(float(v), 3) for v in sma_5],
    'sma_15': [round(float(v), 3) for v in sma_15],
    'sma_30': [round(float(v), 3) for v in sma_30],
    'sma_60': [round(float(v), 3) for v in sma_60]
}

# -------------------------------------------------------------
# Technique 5: Exponential Moving Average (EMA)
# -------------------------------------------------------------
ema_005 = s_series.ewm(alpha=0.05, adjust=False).mean().values
ema_01 = s_series.ewm(alpha=0.1, adjust=False).mean().values
ema_02 = s_series.ewm(alpha=0.2, adjust=False).mean().values
ema_04 = s_series.ewm(alpha=0.4, adjust=False).mean().values

payload['analytics']['m05_ema'] = {
    'ema_005': [round(float(v), 3) for v in ema_005],
    'ema_01': [round(float(v), 3) for v in ema_01],
    'ema_02': [round(float(v), 3) for v in ema_02],
    'ema_04': [round(float(v), 3) for v in ema_04]
}

# -------------------------------------------------------------
# Technique 6: Savitzky-Golay Filter
# -------------------------------------------------------------
sg_15_2 = signal.savgol_filter(raw_temp, window_length=15, polyorder=2)
sg_31_3 = signal.savgol_filter(raw_temp, window_length=31, polyorder=3)
sg_45_3 = signal.savgol_filter(raw_temp, window_length=45, polyorder=3)

payload['analytics']['m06_savgol'] = {
    'sg_15_2': [round(float(v), 3) for v in sg_15_2],
    'sg_31_3': [round(float(v), 3) for v in sg_31_3],
    'sg_45_3': [round(float(v), 3) for v in sg_45_3]
}

# -------------------------------------------------------------
# Technique 7: Peak Envelope (Upper / Lower)
# -------------------------------------------------------------
# Compute local max & min over rolling window 30
roll_max = s_series.rolling(30, min_periods=1, center=True).max().values
roll_min = s_series.rolling(30, min_periods=1, center=True).min().values
bandwidth = roll_max - roll_min

payload['analytics']['m07_envelope'] = {
    'upper': [round(float(v), 3) for v in roll_max],
    'lower': [round(float(v), 3) for v in roll_min],
    'bandwidth': [round(float(v), 3) for v in bandwidth],
    'mean_bandwidth': round(float(np.mean(bandwidth)), 3),
    'max_bandwidth': round(float(np.max(bandwidth)), 3)
}

# -------------------------------------------------------------
# Technique 8: 1D Kalman Filter
# -------------------------------------------------------------
def run_kalman(z, Q=0.01, R=0.4):
    n_k = len(z)
    xhat = np.zeros(n_k)
    P = np.zeros(n_k)
    K_gains = np.zeros(n_k)
    xhat[0] = z[0]
    P[0] = 1.0
    for k in range(1, n_k):
        xhatminus = xhat[k-1]
        Pminus = P[k-1] + Q
        K_gains[k] = Pminus / (Pminus + R)
        xhat[k] = xhatminus + K_gains[k] * (z[k] - xhatminus)
        P[k] = (1 - K_gains[k]) * Pminus
    return xhat, K_gains

kalman_est, k_gains = run_kalman(raw_temp, Q=0.01, R=0.4)
payload['analytics']['m08_kalman'] = {
    'estimate': [round(float(v), 3) for v in kalman_est],
    'kalman_gain': [round(float(v), 4) for v in k_gains],
    'steady_gain': round(float(k_gains[-1]), 4)
}

# -------------------------------------------------------------
# Technique 9: Filter Benchmark vs True Temp
# -------------------------------------------------------------
bench_filters = {
    '원시 측정값 (Raw)': raw_temp,
    '이동평균 SMA (w=5)': sma_5,
    '이동평균 SMA (w=15)': sma_15,
    '이동평균 SMA (w=30)': sma_30,
    '이동평균 SMA (w=60)': sma_60,
    '지수평활 EMA (α=0.1)': ema_01,
    '지수평활 EMA (α=0.2)': ema_02,
    '지수평활 EMA (α=0.4)': ema_04,
    'Savitzky-Golay (w=15, p=2)': sg_15_2,
    'Savitzky-Golay (w=31, p=3)': sg_31_3,
    'Savitzky-Golay (w=45, p=3)': sg_45_3,
    '칼만 필터 (Kalman 1D)': kalman_est
}

bench_results = []
var_true = np.var(true_temp)

for name, f_vals in bench_filters.items():
    diff = f_vals - true_temp
    rmse = np.sqrt(np.mean(diff**2))
    mae = np.mean(np.abs(diff))
    mape = np.mean(np.abs(diff / true_temp)) * 100
    max_e = np.max(np.abs(diff))
    corr = np.corrcoef(f_vals, true_temp)[0, 1]
    r2 = 1 - (np.sum(diff**2) / np.sum((true_temp - np.mean(true_temp))**2))
    var_noise = np.var(diff)
    snr = 10 * np.log10(var_true / var_noise) if var_noise > 0 else 999.0
    
    bench_results.append({
        'name': name,
        'rmse': round(float(rmse), 4),
        'mae': round(float(mae), 4),
        'mape': round(float(mape), 3),
        'max_err': round(float(max_e), 4),
        'corr': round(float(corr), 4),
        'r2': round(float(r2), 4),
        'snr_db': round(float(snr), 2)
    })

# Sort by RMSE ascending
bench_results.sort(key=lambda x: x['rmse'])
payload['analytics']['m09_benchmark'] = bench_results

# -------------------------------------------------------------
# Technique 10: Statistical Process Control (SPC 3-Sigma)
# -------------------------------------------------------------
# Base on normal operation data
normal_mask = (df['이벤트'] == '정상')
cl_temp = float(np.mean(raw_temp[normal_mask]))
sigma_temp = float(np.std(raw_temp[normal_mask], ddof=1))

ucl = cl_temp + 3 * sigma_temp
lcl = cl_temp - 3 * sigma_temp
uwl = cl_temp + 2 * sigma_temp
lwl = cl_temp - 2 * sigma_temp

spc_violations_3sigma = [i for i, v in enumerate(raw_temp) if v > ucl or v < lcl]
spc_violations_2sigma = [i for i, v in enumerate(raw_temp) if v > uwl or v < lwl]

payload['analytics']['m10_spc'] = {
    'center_line': round(cl_temp, 3),
    'sigma': round(sigma_temp, 3),
    'ucl': round(ucl, 3),
    'lcl': round(lcl, 3),
    'uwl': round(uwl, 3),
    'lwl': round(lwl, 3),
    'violation_count_3sigma': len(spc_violations_3sigma),
    'violation_indices_3sigma': spc_violations_3sigma,
    'violation_count_2sigma': len(spc_violations_2sigma)
}

# -------------------------------------------------------------
# Technique 11: Hampel Filter (Robust Outlier Detection)
# -------------------------------------------------------------
def hampel_filter(vals, k=7, n_sigmas=3):
    n_pts = len(vals)
    y = np.copy(vals)
    ind = []
    L = 1.4826
    for i in range(n_pts):
        start = max(0, i - k)
        end = min(n_pts, i + k + 1)
        w = vals[start:end]
        med = np.median(w)
        mad = L * np.median(np.abs(w - med))
        if mad == 0:
            mad = 1e-6
        if np.abs(vals[i] - med) > n_sigmas * mad:
            ind.append(i)
            y[i] = med
    return y, ind

hampel_reconstructed, hampel_outliers = hampel_filter(raw_temp, k=7, n_sigmas=3)
spike_labeled_indices = [i for i, e in enumerate(events) if e == '스파이크 이상치']

payload['analytics']['m11_hampel'] = {
    'detected_indices': hampel_outliers,
    'detected_count': len(hampel_outliers),
    'spike_labeled_indices': spike_labeled_indices,
    'reconstructed': [round(float(v), 3) for v in hampel_reconstructed]
}

# -------------------------------------------------------------
# Technique 12: Local Outlier Factor (LOF) / Anomaly Score
# -------------------------------------------------------------
# Standardize raw_temp and vib
z_t = (raw_temp - np.mean(raw_temp)) / np.std(raw_temp)
z_v = (vib - np.mean(vib)) / np.std(vib)
coords = np.column_stack([z_t, z_v])

# Distance-based anomaly score: average distance to k=15 nearest neighbors
from scipy.spatial.distance import cdist
dist_matrix = cdist(coords, coords)
k_nn = 15
sorted_dists = np.sort(dist_matrix, axis=1)
knn_scores = np.mean(sorted_dists[:, 1:k_nn+1], axis=1)
lof_threshold = float(np.percentile(knn_scores, 95))
lof_anomalies = [i for i, s in enumerate(knn_scores) if s > lof_threshold]

payload['analytics']['m12_lof'] = {
    'knn_scores': [round(float(s), 4) for s in knn_scores],
    'threshold': round(lof_threshold, 4),
    'anomaly_count': len(lof_anomalies),
    'anomaly_indices': lof_anomalies
}

# -------------------------------------------------------------
# Technique 13: Correlation Matrix & Scatter
# -------------------------------------------------------------
df_sub = df[['온도센서 원시값(°C)', '온도 참값·비교용(°C)', '진동 RMS(mm/s)', '압력(kPa)']]
cols = ['원시온도', '참값온도', '진동RMS', '압력']
df_sub.columns = cols

pearson_corr = df_sub.corr(method='pearson').round(4).to_dict()
spearman_corr = df_sub.corr(method='spearman').round(4).to_dict()

payload['analytics']['m13_correlation'] = {
    'columns': cols,
    'pearson': pearson_corr,
    'spearman': spearman_corr
}

# -------------------------------------------------------------
# Technique 14: Cross-Correlation & Time Lag Analysis
# -------------------------------------------------------------
lag_range = list(range(-40, 41))
ccf_vib_temp = []
for l in lag_range:
    if l < 0:
        c = np.corrcoef(vib[:l], raw_temp[-l:])[0, 1]
    elif l > 0:
        c = np.corrcoef(vib[l:], raw_temp[:-l])[0, 1]
    else:
        c = np.corrcoef(vib, raw_temp)[0, 1]
    ccf_vib_temp.append({'lag': l, 'corr': round(float(c), 4)})

# Find max correlation lag
best_lag = max(ccf_vib_temp, key=lambda x: x['corr'])

payload['analytics']['m14_cross_corr'] = {
    'lags': ccf_vib_temp,
    'best_lag': best_lag
}

# -------------------------------------------------------------
# Technique 15: Multivariate Z-Score Trend
# -------------------------------------------------------------
z_temp = [(v - np.mean(raw_temp)) / np.std(raw_temp) for v in raw_temp]
z_vib = [(v - np.mean(vib)) / np.std(vib) for v in vib]
z_press = [(v - np.mean(press)) / np.std(press) for v in press]

payload['analytics']['m15_multivariate_zscore'] = {
    'z_temp': [round(float(v), 3) for v in z_temp],
    'z_vib': [round(float(v), 3) for v in z_vib],
    'z_press': [round(float(v), 3) for v in z_press]
}

# -------------------------------------------------------------
# Technique 16: Additive Time Series Decomposition
# -------------------------------------------------------------
# Trend using rolling mean 60
trend = pd.Series(raw_temp).rolling(60, min_periods=1, center=True).mean().values
detrended = raw_temp - trend
# Seasonal pattern (e.g. 180 min sub-cycle or daily average)
# Let's estimate seasonal as rolling periodic mean of 120-min window
seasonal = pd.Series(detrended).rolling(30, min_periods=1, center=True).mean().values
residual = detrended - seasonal

payload['analytics']['m16_decomposition'] = {
    'trend': [round(float(v), 3) for v in trend],
    'seasonal': [round(float(v), 3) for v in seasonal],
    'residual': [round(float(v), 3) for v in residual],
    'residual_std': round(float(np.std(residual)), 3)
}

# -------------------------------------------------------------
# Technique 17: FFT Frequency Spectrum Analysis
# -------------------------------------------------------------
fft_raw = np.fft.rfft(raw_temp - np.mean(raw_temp))
fft_true = np.fft.rfft(true_temp - np.mean(true_temp))
freqs = np.fft.rfftfreq(n, d=1.0) # cycles per minute

psd_raw = (np.abs(fft_raw) ** 2) / n
psd_true = (np.abs(fft_true) ** 2) / n

# Keep top 60 frequency points for visualization
payload['analytics']['m17_fft'] = {
    'frequencies': [round(float(f), 5) for f in freqs[:60]],
    'period_min': [round(float(1.0/f), 1) if f > 0 else 0 for f in freqs[:60]],
    'psd_raw': [round(float(p), 2) for p in psd_raw[:60]],
    'psd_true': [round(float(p), 2) for p in psd_true[:60]]
}

# -------------------------------------------------------------
# Technique 18: Radar Chart Profiling by Event
# -------------------------------------------------------------
# Compute normalized feature vector for each of the 7 events:
# [Mean Temp, Mean Vib, Mean Press, Temp Std, Vib Std]
radar_data = {}
all_temp_m = np.mean(raw_temp)
all_vib_m = np.mean(vib)
all_press_m = np.mean(press)

for ev in event_list:
    s = df[df['이벤트'] == ev]
    radar_data[ev] = {
        'count': int(len(s)),
        'temp_mean': round(float(s['온도센서 원시값(°C)'].mean()), 2),
        'vib_mean': round(float(s['진동 RMS(mm/s)'].mean()), 3),
        'press_mean': round(float(s['압력(kPa)'].mean()), 2),
        'temp_std': round(float(s['온도센서 원시값(°C)'].std()), 2) if len(s) > 1 else 0.0,
        'vib_std': round(float(s['진동 RMS(mm/s)'].std()), 3) if len(s) > 1 else 0.0
    }
payload['analytics']['m18_radar'] = radar_data

# -------------------------------------------------------------
# Technique 19: Unsupervised K-Means Clustering (k=4)
# -------------------------------------------------------------
# Feature matrix: normalized temp, vib, press
X = np.column_stack([z_temp, z_vib, z_press])

# Manual/scipy kmeans
from scipy.cluster.vq import kmeans2
centroid, label = kmeans2(X, 4, minit='points', iter=30, seed=42)

# Analyze clusters
clusters_info = []
for c_idx in range(4):
    c_mask = (label == c_idx)
    clusters_info.append({
        'cluster_id': c_idx,
        'size': int(np.sum(c_mask)),
        'mean_temp': round(float(np.mean(raw_temp[c_mask])), 2),
        'mean_vib': round(float(np.mean(vib[c_mask])), 3),
        'mean_press': round(float(np.mean(press[c_mask])), 2),
        'dominant_event': pd.Series(np.array(events)[c_mask]).mode()[0]
    })

payload['analytics']['m19_kmeans'] = {
    'clusters': clusters_info,
    'labels': [int(l) for l in label]
}

# -------------------------------------------------------------
# Technique 20: Markov State Transition Matrix
# -------------------------------------------------------------
unique_events = sorted(list(set(events)))
ev_to_id = {e: i for i, e in enumerate(unique_events)}
m_counts = np.zeros((len(unique_events), len(unique_events)), dtype=int)

for i in range(len(events) - 1):
    src = ev_to_id[events[i]]
    dst = ev_to_id[events[i+1]]
    m_counts[src, dst] += 1

m_prob = np.zeros_like(m_counts, dtype=float)
for r in range(len(unique_events)):
    row_sum = np.sum(m_counts[r, :])
    if row_sum > 0:
        m_prob[r, :] = m_counts[r, :] / row_sum

payload['analytics']['m20_markov'] = {
    'states': unique_events,
    'transition_counts': m_counts.tolist(),
    'transition_matrix': [[round(float(p), 4) for p in row] for row in m_prob]
}

# Save complete payload
with open('complete_analytics.json', 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print("All 20 analytics techniques calculated and saved to complete_analytics.json successfully!")
