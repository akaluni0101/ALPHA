"""
Explainable signal diagnostics for fault hints and machine acoustic fingerprints.

The shipped classifier is trained for normal/irregular health only. These
additional labels are intentionally confidence-scored signal heuristics until
dedicated fault-type and machine-type training artifacts are available.
"""

from typing import Any, Dict

import librosa
import numpy as np


FAULT_LABELS = {
    "cavitation": "Cavitation-like bursts",
    "bearing_flutter": "Bearing flutter-like modulation",
    "friction": "Friction-like high-frequency energy",
    "none_detected": "No specific fault signature detected",
    "unknown": "Fault type needs more training data",
}


def _confidence(value: float) -> float:
    return round(float(np.clip(value, 0.0, 1.0)), 4)


def _machine_fingerprint(y: np.ndarray, sr: int) -> Dict[str, Any]:
    """Estimates a machine family from broad acoustic characteristics."""
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=y)))
    rms = librosa.feature.rms(y=y)[0]
    rms_variation = float(np.std(rms) / (np.mean(rms) + 1e-6))

    if centroid < 900 and zcr < 0.12:
        machine_type = "pump"
        confidence = 0.78
        evidence = "Low-frequency, steady cyclic energy"
    elif centroid > 1800 and zcr > 0.16:
        machine_type = "slider"
        confidence = 0.62
        evidence = "Broad high-frequency movement profile"
    elif rms_variation > 0.75:
        machine_type = "valve"
        confidence = 0.58
        evidence = "Strong transient on/off envelope"
    elif centroid >= 900:
        machine_type = "fan"
        confidence = 0.7
        evidence = "Continuous airflow-like spectral profile"
    else:
        machine_type = "unknown"
        confidence = 0.35
        evidence = "Acoustic profile overlaps multiple machine families"

    return {
        "machine_type": machine_type,
        "confidence": _confidence(confidence),
        "fingerprint": {
            "spectral_centroid_hz": round(centroid, 2),
            "zero_crossing_rate": round(zcr, 4),
            "envelope_variation": round(rms_variation, 4),
        },
        "evidence": evidence,
        "method": "acoustic fingerprint heuristic",
    }


def _fault_diagnostics(y: np.ndarray, sr: int, health_class: str) -> Dict[str, Any]:
    """Returns an explainable fault hint without overstating a diagnosis."""
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))
    rms = librosa.feature.rms(y=y)[0]
    envelope_variation = float(np.std(rms) / (np.mean(rms) + 1e-6))

    if health_class == "normal":
        label = "none_detected"
        confidence = 0.9
        evidence = "Signal stayed inside the normal operating profile"
    elif envelope_variation > 0.8:
        label = "cavitation"
        confidence = min(0.88, 0.58 + envelope_variation * 0.2)
        evidence = "Strong intermittent energy bursts"
    elif centroid > 2200 and flatness > 0.018:
        label = "friction"
        confidence = 0.76
        evidence = "Elevated broadband high-frequency energy"
    elif centroid > 1500 or flatness > 0.012:
        label = "bearing_flutter"
        confidence = 0.67
        evidence = "High-frequency modulation inconsistent with steady operation"
    else:
        label = "unknown"
        confidence = 0.42
        evidence = "Irregularity detected, but no specific signature is decisive"

    return {
        "fault_type": label,
        "label": FAULT_LABELS[label],
        "confidence": _confidence(confidence),
        "evidence": evidence,
        "method": "explainable acoustic signature heuristic",
    }


def analyze_signal(y: np.ndarray, sr: int, health_class: str) -> Dict[str, Any]:
    """Builds machine fingerprint and fault-type diagnostics for an analysis."""
    return {
        "fault_diagnostics": _fault_diagnostics(y, sr, health_class),
        "machine_fingerprint": _machine_fingerprint(y, sr),
    }
