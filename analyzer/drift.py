"""
Behavioral Drift Detection Algorithm.

Uses sliding-window analysis to detect gradual sentiment shifts
and predict toxicity escalation.
"""

import numpy as np


def compute_drift(sentiment_scores, window_size=10):
    """
    Compute behavioral drift from a sequence of compound sentiment scores.

    Uses a sliding window to compare recent behavior against baseline.

    Args:
        sentiment_scores: list of float, compound sentiment values [-1, 1]
        window_size: int, number of comments per analysis window

    Returns:
        dict with:
            - drift_scores: list of float, drift value at each window
            - current_drift: float, latest drift value
            - risk_level: str ('normal', 'drifting', 'warning', 'escalating')
            - trend: str ('improving', 'stable', 'declining')
            - escalation_probability: float [0, 1]
            - windows: list of window analysis dicts
    """
    if len(sentiment_scores) < window_size * 2:
        return {
            'drift_scores': [],
            'current_drift': 0.0,
            'risk_level': 'normal',
            'trend': 'stable',
            'escalation_probability': 0.0,
            'windows': [],
        }

    scores = np.array(sentiment_scores, dtype=float)
    num_windows = len(scores) // window_size
    windows = []
    drift_scores = []

    # Baseline = first window
    baseline = np.mean(scores[:window_size])
    baseline_std = max(np.std(scores[:window_size]), 0.05)

    for i in range(num_windows):
        start = i * window_size
        end = start + window_size
        window_data = scores[start:end]

        window_mean = float(np.mean(window_data))
        window_std = float(np.std(window_data))
        window_min = float(np.min(window_data))

        # Drift: difference from baseline, normalized
        drift = (baseline - window_mean) / baseline_std
        drift_scores.append(round(drift, 4))

        windows.append({
            'index': i,
            'start': start,
            'end': end,
            'mean_sentiment': round(window_mean, 4),
            'std': round(window_std, 4),
            'min': round(window_min, 4),
            'drift': round(drift, 4),
        })

    # Analyze recent trend (last 3 windows)
    recent_drifts = drift_scores[-3:] if len(drift_scores) >= 3 else drift_scores
    current_drift = drift_scores[-1] if drift_scores else 0.0

    # Trend detection
    if len(recent_drifts) >= 2:
        trend_slope = recent_drifts[-1] - recent_drifts[0]
        if trend_slope > 0.3:
            trend = 'declining'
        elif trend_slope < -0.3:
            trend = 'improving'
        else:
            trend = 'stable'
    else:
        trend = 'stable'

    # Risk level based on drift magnitude and consistency
    consecutive_negative = sum(1 for d in recent_drifts if d > 1.0)

    if current_drift > 2.0 and consecutive_negative >= 2:
        risk_level = 'escalating'
    elif current_drift > 1.5 or consecutive_negative >= 2:
        risk_level = 'warning'
    elif current_drift > 0.7:
        risk_level = 'drifting'
    else:
        risk_level = 'normal'

    # Escalation probability
    escalation_prob = min(1.0, max(0.0,
        (current_drift / 3.0) * 0.5 + (consecutive_negative / 3) * 0.3 +
        (1 if trend == 'declining' else 0) * 0.2
    ))

    return {
        'drift_scores': drift_scores,
        'current_drift': round(current_drift, 4),
        'risk_level': risk_level,
        'trend': trend,
        'escalation_probability': round(escalation_prob, 4),
        'windows': windows,
    }


def compute_toxicity_trend(toxicity_scores, window_size=10):
    """
    Compute rolling average of toxicity scores.

    Returns list of (window_index, avg_toxicity) tuples.
    """
    if len(toxicity_scores) < window_size:
        return []

    scores = np.array(toxicity_scores)
    result = []
    for i in range(len(scores) - window_size + 1):
        window = scores[i:i + window_size]
        result.append({
            'index': i,
            'avg_toxicity': round(float(np.mean(window)), 4),
            'max_toxicity': round(float(np.max(window)), 4),
        })
    return result
