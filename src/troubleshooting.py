"""
Runtime troubleshooting checks for failures outside the acoustic classifier.
"""

import importlib.util
import shutil
from pathlib import Path
from typing import Any, Dict

from sqlalchemy import text

from src.config import MODEL_PATH, SCALER_PATH
from src.database import engine


def _check_dependency(name: str) -> Dict[str, str]:
    """Checks whether a required Python dependency can be imported."""
    available = importlib.util.find_spec(name) is not None
    return {
        "status": "pass" if available else "fail",
        "detail": f"{name} is available." if available else f"{name} is not installed."
    }


def _check_database() -> Dict[str, str]:
    """Checks that SQLite can accept a lightweight query."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "pass", "detail": "SQLite connection is responding."}
    except Exception as exc:
        return {"status": "fail", "detail": f"SQLite check failed: {exc}"}


def run_software_troubleshooting(model_loaded: bool) -> Dict[str, Any]:
    """Returns actionable checks for software-side failures."""
    checks = {
        "api": {"status": "pass", "detail": "FastAPI service is responding."},
        "model_artifacts": {
            "status": "pass" if model_loaded and MODEL_PATH.exists() and SCALER_PATH.exists() else "fail",
            "detail": "Classifier and scaler artifacts are loaded."
            if model_loaded and MODEL_PATH.exists() and SCALER_PATH.exists()
            else "Model artifacts are missing or could not be loaded."
        },
        "database": _check_database(),
        "ffmpeg": {
            "status": "pass" if shutil.which("ffmpeg") else "warning",
            "detail": "FFmpeg is available for browser audio decoding."
            if shutil.which("ffmpeg")
            else "FFmpeg was not found; WebM/MP3 decoding may fail."
        },
        "audio_dependencies": _check_dependency("librosa"),
    }
    failures = [name for name, check in checks.items() if check["status"] == "fail"]
    warnings = [name for name, check in checks.items() if check["status"] == "warning"]
    overall = "fail" if failures else "warning" if warnings else "pass"
    summary = (
        "Software failure detected. Resolve the failed checks before relying on analysis."
        if failures else
        "Software is operational, but some audio formats may need attention."
        if warnings else
        "Software checks passed; hardware results are ready to use."
    )
    return {
        "overall_status": overall,
        "summary": summary,
        "checks": checks,
        "failures": failures,
        "warnings": warnings,
    }