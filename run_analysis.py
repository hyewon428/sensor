import pandas as pd
import numpy as np
import json
from scipy import stats, signal

df = pd.read_excel('센서 스무딩.xlsx', sheet_name='센서_시계열')

raw_temp = df['온도센서 원시값(°C)'].values
true_temp = df['온도 참값·비교용(°C)'].values
vib = df['진동 RMS(mm/s)'].values
press = df['압력(kPa)'].values
events = df['이벤트'].values
minutes = df['경과시간(분)'].values

results = {}

# 1. Descriptive stats
results['descriptive'] = {
    'raw_temp': {
        'mean': float(np.mean(raw_temp)),
        'std': float(np.std(raw_temp)),
        'median': float(np.median(raw_temp)),
        'min': float(np.min(raw_temp)),
        'max': float(np.max(raw_temp)),
        'q25': float(np.percentile(raw_temp, 25)),
        'q75': float(np.percentile(raw_temp, 75)),
        'skew': float(stats.skew(raw_temp)),
        'kurtosis': float(stats.kurtosis(raw_temp))
    },
    'true_temp': {
        'mean': float(np.mean(true_temp)),
        'std': float(np.std(true_temp)),
        'median': float(np.median(true_temp)),
        'min': float(np.min(true_temp)),
        'max': float(np.max(true_temp)),
        'skew': float(stats.skew(true_temp)),
        'kurtosis': float(stats.kurtosis(true_temp))
    },
    'vibration': {
        'mean': float(np.mean(vib)),
        'std': float(np.std(vib)),
        'median': float(np.median(vib)),
        'min': float(np.min(vib)),
        'max': float(np.max(vib))
    },
    'pressure': {
        'mean': float(np.mean(press)),
        'std': float(np.std(press)),
        'median': float(np.median(press)),
        'min': float(np.min(press)),
        'max': float(np.max(press))
    }
}

# 4. SMA
def calc_sma(arr, w):
    s = pd.Series(arr)
    return s.rolling(window=w, min_periods=1, center=False).mean().values

# 5. EMA
def calc_ema(arr, alpha):
    s = pd.Series(arr)
    return s.ewm(alpha=alpha, adjust=False).mean().values

# 6. Savitzky-Golay
sg_15_2 = signal.savgol_filter(raw_temp, window_length=15, polyorder=2)
sg_31_3 = signal.savgol_filter(raw_temp, window_length=31, polyorder=3)

# 8. Kalman Filter (1D)
def kalman_filter(z, Q=1e-3, R=0.5):
    n = len(z)
    xhat = np.zeros(n)
    P = np.zeros(n)
    xhatminus = np.zeros(n)
    Pminus = np.zeros(n)
    K = np.zeros(n)
    
    xhat[0] = z[0]
    P[0] = 1.0
    
    for k in range(1, n):
        # Time update
        xhatminus[k] = xhat[k-1]
        Pminus[k] = P[k-1] + Q
        # Measurement update
        K[k] = Pminus[k] / (Pminus[k] + R)
        xhat[k] = xhatminus[k] + K[k] * (z[k] - xhatminus[k])
        P[k] = (1 - K[k]) * Pminus[k]
        
    return xhat

kalman = kalman_filter(raw_temp, Q=0.01, R=0.4)

# 9. Benchmarking Metrics vs True Temp
filters = {
    'Raw (No Filter)': raw_temp,
    'SMA (w=5)': calc_sma(raw_temp, 5),
    'SMA (w=15)': calc_sma(raw_temp, 15),
    'SMA (w=30)': calc_sma(raw_temp, 30),
    'EMA (alpha=0.1)': calc_ema(raw_temp, 0.1),
    'EMA (alpha=0.2)': calc_ema(raw_temp, 0.2),
    'Savitzky-Golay (w=15, p=2)': sg_15_2,
    'Savitzky-Golay (w=31, p=3)': sg_31_3,
    'Kalman Filter': kalman
}

benchmarks = []
for name, f_vals in filters.items():
    err = f_vals - true_temp
    rmse = np.sqrt(np.mean(err**2))
    mae = np.mean(np.abs(err))
    mape = np.mean(np.abs(err / true_temp)) * 100
    max_err = np.max(np.abs(err))
    corr = np.corrcoef(f_vals, true_temp)[0, 1]
    # SNR (Signal to Noise Ratio): 10 * log10(var(signal) / var(noise))
    signal_power = np.var(true_temp)
    noise_power = np.var(err)
    snr = 10 * np.log10(signal_power / noise_power) if noise_power > 0 else 999
    
    benchmarks.append({
        'name': name,
        'rmse': round(float(rmse), 4),
        'mae': round(float(mae), 4),
        'mape': round(float(mape), 3),
        'max_err': round(float(max_err), 4),
        'corr': round(float(corr), 4),
        'snr_db': round(float(snr), 2)
    })

results['benchmark'] = benchmarks

# Correlation
corr_matrix = df[['온도센서 원시값(°C)', '온도 참값·비교용(°C)', '진동 RMS(mm/s)', '압력(kPa)']].corr().to_dict()
results['corr_matrix'] = corr_matrix

# Lag correlation between vibration and temp
lags = range(-30, 31)
cross_corr = []
for l in lags:
    if l < 0:
        c = np.corrcoef(vib[:l], raw_temp[-l:])[0, 1]
    elif l > 0:
        c = np.corrcoef(vib[l:], raw_temp[:-l])[0, 1]
    else:
        c = np.corrcoef(vib, raw_temp)[0, 1]
    cross_corr.append({'lag': l, 'corr': round(float(c), 4)})
results['cross_corr'] = cross_corr

with open('calc_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Calculation finished successfully.")
for b in benchmarks:
    print(b)
