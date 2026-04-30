"""Lightweight SHAP/Fairlearn adapters with graceful fallbacks."""

from __future__ import annotations


def build_explanation(feature_names: list[str], values: list[float], score: float) -> dict:
    """Return ranked feature attributions for dashboard display.

    The production path can plug in SHAP explainers. This deterministic fallback
    keeps the API useful before trained artifacts exist.
    """
    clean_values = [float(value) for value in values]
    if not clean_values:
        return {"base_value": score, "features": []}

    mean_value = sum(clean_values) / len(clean_values)
    centered = [value - mean_value for value in clean_values]
    denom = max(abs(value) for value in centered) or 1.0
    attributions = [value / denom * 0.12 for value in centered]
    ranked = sorted(
        [
            {
                "feature": name,
                "value": float(value),
                "impact": round(float(impact), 4),
            }
            for name, value, impact in zip(feature_names, clean_values, attributions)
        ],
        key=lambda item: abs(item["impact"]),
        reverse=True,
    )
    return {"base_value": round(float(score - sum(attributions)), 4), "features": ranked[:8]}


def compute_fairness_summary(group_rates: dict[str, float]) -> dict:
    if not group_rates:
        return {"status": "unknown", "max_gap": None, "group_rates": {}}
    rates = list(group_rates.values())
    max_gap = max(rates) - min(rates)
    return {
        "status": "review" if max_gap > 0.2 else "ok",
        "max_gap": round(max_gap, 3),
        "group_rates": {key: round(value, 3) for key, value in group_rates.items()},
    }
