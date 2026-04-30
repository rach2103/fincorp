"""FastAPI serving layer for the placement intelligence platform."""

from __future__ import annotations

import math
import os
import pickle
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from compliance.rules import assess_loan_eligibility, recommend_career_sectors
from explainability.service import build_explanation, compute_fairness_summary
from serving.api.schemas import LoanAssessmentRequest, StudentProfile

NUMERIC_FEATURES = [
    "age",
    "cgpa",
    "backlogs",
    "communication_score",
    "aptitude_score",
    "family_income_lpa",
    "linkedin_connections",
    "github_repos",
    "github_commits_30d",
    "certifications_count",
    "hackathon_participations",
    "internship_count",
    "institute_avg_placement_rate",
    "institute_avg_salary",
    "composite_score",
]
CATEGORICAL_FEATURES = ["gender", "course", "state"]
BINARY_FEATURES = ["loan_required", "is_high_achiever", "has_no_backlogs", "has_internship"]

app = FastAPI(
    title="Student Placement Intelligence API",
    version="1.0.0",
    description="Placement probability, salary, explainability, career, and loan services.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ARTIFACT_DIR = Path(os.getenv("MODEL_ARTIFACT_DIR", "models/artifacts"))
PREPROCESSOR_PATH = Path(os.getenv("PREPROCESSOR_PATH", "feature_engineering/artifacts/preprocessor.pkl"))


def _load_pickle(path: Path):
    if not path.exists():
        return None
    with path.open("rb") as handle:
        return pickle.load(handle)


def _profile_features(profile: StudentProfile) -> dict:
    data = profile.model_dump()
    data["composite_score"] = (
        profile.cgpa * 0.4 + profile.aptitude_score * 0.003 + profile.communication_score * 0.06
    )
    data["is_high_achiever"] = int(profile.cgpa >= 8.0)
    data["has_no_backlogs"] = int(profile.backlogs == 0)
    data["has_internship"] = int(profile.internship_count >= 1)
    return data


def _fallback_prediction(features: dict) -> tuple[float, float, int]:
    logit = (
        0.55 * (features["cgpa"] - 6)
        + 0.04 * (features["aptitude_score"] - 60)
        + 0.18 * (features["communication_score"] - 6)
        + 0.4 * features["internship_count"]
        + 0.12 * features["certifications_count"]
        - 0.45 * features["backlogs"]
        + 0.01 * (features["institute_avg_placement_rate"] - 75)
    )
    placement_probability = 1 / (1 + math.exp(-logit))
    salary = (
        features["institute_avg_salary"] * (0.82 + features["cgpa"] / 10)
        + features["aptitude_score"] * 2200
        + features["internship_count"] * 60000
    )
    risk_score = round(float(1 - placement_probability), 4)
    return round(float(placement_probability), 4), round(float(salary), 2), risk_score


def _artifact_prediction(features: dict) -> tuple[float, float] | None:
    preprocessor = _load_pickle(PREPROCESSOR_PATH)
    lgbm = _load_pickle(ARTIFACT_DIR / "placement_lgbm.pkl")
    salary_model = _load_pickle(ARTIFACT_DIR / "salary_regression.pkl")
    if preprocessor is None or lgbm is None or salary_model is None:
        return None

    import pandas as pd

    cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES + BINARY_FEATURES
    row = pd.DataFrame([{col: features.get(col, 0) for col in cols}])
    transformed = preprocessor.transform(row)
    placement_probability = float(lgbm.predict_proba(transformed)[0, 1])
    salary = float(salary_model.predict(transformed)[0])
    return placement_probability, salary


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "placement-intelligence-api"}


@app.post("/predict")
def predict(profile: StudentProfile) -> dict:
    features = _profile_features(profile)
    artifact_prediction = _artifact_prediction(features)
    if artifact_prediction is None:
        placement_probability, salary, risk_score = _fallback_prediction(features)
        model_source = "heuristic-fallback"
    else:
        placement_probability, salary = artifact_prediction
        risk_score = round(float(1 - placement_probability), 4)
        model_source = "trained-artifacts"

    numeric_values = [features[name] for name in NUMERIC_FEATURES if name in features]
    explanation = build_explanation(
        [name for name in NUMERIC_FEATURES if name in features],
        numeric_values,
        placement_probability,
    )

    return {
        "student_id": profile.student_id,
        "placement_probability": round(float(placement_probability), 4),
        "risk_score": risk_score,
        "predicted_salary_inr": round(float(min(max(salary, 0), 10000000)), 2),
        "early_risk_alert": risk_score >= 0.45,
        "model_source": model_source,
        "shap_explanation": explanation,
        "career_recommendations": [item.__dict__ for item in recommend_career_sectors(
            profile.course, profile.cgpa, profile.aptitude_score
        )],
    }


@app.post("/loan/assess")
def loan_assessment(payload: LoanAssessmentRequest) -> dict:
    return assess_loan_eligibility(
        payload.predicted_salary_inr,
        payload.family_income_lpa,
        payload.requested_amount_inr,
    )


@app.get("/fairness/summary")
def fairness_summary() -> dict:
    return compute_fairness_summary({"M": 0.74, "F": 0.77, "Other": 0.71})
