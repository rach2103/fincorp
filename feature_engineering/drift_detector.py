"""Drift detection entrypoint used by Airflow."""

from .pipeline import DriftDetector

__all__ = ["DriftDetector"]
