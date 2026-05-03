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
    # Realistic fresh-graduate salary (INR): base 3 LPA + bonuses
    base_salary = 300_000  # ₹3 LPA
    cgpa_bonus = (features["cgpa"] - 6) * 60_000          # up to ₹2.4L at CGPA 10
    aptitude_bonus = max(features["aptitude_score"] - 50, 0) * 1_200
    internship_bonus = features["internship_count"] * 50_000
    cert_bonus = features["certifications_count"] * 15_000
    backlog_penalty = features["backlogs"] * 40_000
    salary = max(
        base_salary + cgpa_bonus + aptitude_bonus + internship_bonus + cert_bonus - backlog_penalty,
        200_000,  # floor at ₹2 LPA
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


@app.post("/suggestions")
def suggestions(profile: StudentProfile) -> dict:
    """Return AI-driven skill and exercise suggestions based on student profile."""
    from compliance.rules import recommend_career_sectors

    course = profile.course.upper()
    cgpa   = profile.cgpa

    # Rule-based suggestion engine (mirrors DB seed data)
    SUGGESTIONS = {
        "CSE": {
            (8.0, 10.0): [
                {"skill": "System Design",       "exercise": "Solve 2 system design problems/week on Educative.io",          "category": "technical",  "priority": 1},
                {"skill": "DSA - Advanced",       "exercise": "Practice Hard LeetCode problems daily (trees, graphs, DP)",    "category": "technical",  "priority": 1},
                {"skill": "Cloud Certifications", "exercise": "Pursue AWS Solutions Architect or GCP Associate cert",         "category": "technical",  "priority": 1},
                {"skill": "Open Source",          "exercise": "Contribute to 1 GitHub open source project per month",         "category": "activity",   "priority": 2},
            ],
            (6.0, 8.0): [
                {"skill": "DSA - Intermediate",   "exercise": "Solve 3 Medium LeetCode problems daily",                       "category": "technical",  "priority": 1},
                {"skill": "Web Development",      "exercise": "Build and deploy a full-stack project (React + Node/Django)",   "category": "technical",  "priority": 1},
                {"skill": "Communication Skills", "exercise": "Join Toastmasters or practice mock GDs weekly",                "category": "soft_skill", "priority": 2},
                {"skill": "Aptitude",             "exercise": "Solve 20 IndiaBix aptitude questions daily",                   "category": "technical",  "priority": 2},
            ],
            (0.0, 6.0): [
                {"skill": "DSA - Basics",         "exercise": "Complete NeetCode 150 roadmap from scratch",                   "category": "technical",  "priority": 1},
                {"skill": "Backlog Clearance",    "exercise": "Dedicate 2 hrs/day to clear pending backlogs first",           "category": "activity",   "priority": 1},
                {"skill": "Resume Building",      "exercise": "Build a project-based resume with at least 2 live projects",   "category": "activity",   "priority": 2},
            ],
        },
        "DS": {
            (8.0, 10.0): [
                {"skill": "ML Engineering",       "exercise": "Build end-to-end ML pipelines using MLflow + FastAPI",         "category": "technical",  "priority": 1},
                {"skill": "Kaggle Competitions",  "exercise": "Participate in 1 Kaggle competition per month",                "category": "activity",   "priority": 1},
                {"skill": "Deep Learning",        "exercise": "Complete fast.ai or deeplearning.ai specialization",           "category": "technical",  "priority": 1},
            ],
            (0.0, 8.0): [
                {"skill": "Python & Pandas",      "exercise": "Complete 30 days of Pandas challenges on Kaggle",              "category": "technical",  "priority": 1},
                {"skill": "Statistics",           "exercise": "Revise hypothesis testing, distributions, regression daily",   "category": "technical",  "priority": 1},
                {"skill": "SQL",                  "exercise": "Solve 50 SQL problems on Mode Analytics or LeetCode",          "category": "technical",  "priority": 2},
            ],
        },
        "MBA": {
            (8.0, 10.0): [
                {"skill": "Case Interviews",      "exercise": "Practice 3 McKinsey/BCG case studies per week",                "category": "technical",  "priority": 1},
                {"skill": "Financial Modelling",  "exercise": "Build DCF and LBO models in Excel/Google Sheets",              "category": "technical",  "priority": 1},
                {"skill": "Leadership",           "exercise": "Lead a college club or organise an industry event",            "category": "activity",   "priority": 2},
            ],
            (0.0, 8.0): [
                {"skill": "Group Discussion",     "exercise": "Practice GD topics daily — economy, policy, business news",   "category": "soft_skill", "priority": 1},
                {"skill": "Excel & PowerPoint",   "exercise": "Complete Excel Skills for Business on Coursera",               "category": "technical",  "priority": 1},
                {"skill": "Networking",           "exercise": "Connect with 5 alumni on LinkedIn per week",                   "category": "soft_skill", "priority": 2},
            ],
        },
        "ECE": {
            (8.0, 10.0): [
                {"skill": "VLSI Design",          "exercise": "Practice Verilog/VHDL on Xilinx Vivado with mini projects",    "category": "technical",  "priority": 1},
                {"skill": "Embedded C",           "exercise": "Build 3 Arduino/Raspberry Pi projects and publish on GitHub",  "category": "technical",  "priority": 1},
            ],
            (0.0, 8.0): [
                {"skill": "Core Electronics",     "exercise": "Revise op-amps, microcontrollers, communication protocols",    "category": "technical",  "priority": 1},
                {"skill": "Aptitude & Reasoning", "exercise": "Solve 20 quantitative aptitude questions daily",               "category": "technical",  "priority": 2},
            ],
        },
        "MECHANICAL": {
            (8.0, 10.0): [
                {"skill": "CAD/CAM",              "exercise": "Master SolidWorks or CATIA with 2 design projects",            "category": "technical",  "priority": 1},
                {"skill": "Six Sigma",            "exercise": "Pursue Six Sigma Green Belt certification",                    "category": "technical",  "priority": 1},
            ],
            (0.0, 8.0): [
                {"skill": "AutoCAD",              "exercise": "Complete AutoCAD 2D/3D certification course",                  "category": "technical",  "priority": 1},
                {"skill": "Core Subjects",        "exercise": "Revise Thermodynamics, FM, SOM daily for 1 hr",                "category": "technical",  "priority": 1},
            ],
        },
        "CIVIL": {
            (8.0, 10.0): [
                {"skill": "STAAD Pro / ETABS",    "exercise": "Model and analyse 2 structural projects using STAAD Pro",     "category": "technical",  "priority": 1},
                {"skill": "Project Management",   "exercise": "Pursue PMP or PRINCE2 Foundation certification",              "category": "technical",  "priority": 1},
            ],
            (0.0, 8.0): [
                {"skill": "AutoCAD Civil 3D",     "exercise": "Complete AutoCAD Civil 3D certification",                     "category": "technical",  "priority": 1},
                {"skill": "Estimation & Costing", "exercise": "Practice quantity surveying problems daily",                  "category": "technical",  "priority": 2},
            ],
        },
    }

    UNIVERSAL = [
        {"skill": "Mock Interviews",   "exercise": "Do 2 mock interviews per week on Pramp or Interviewing.io",    "category": "soft_skill", "priority": 1},
        {"skill": "LinkedIn Profile",  "exercise": "Optimise LinkedIn with projects, skills, and recommendations",  "category": "activity",   "priority": 1},
        {"skill": "Communication",     "exercise": "Read 1 business article daily and summarise it in writing",     "category": "soft_skill", "priority": 2},
        {"skill": "Aptitude Practice", "exercise": "Solve 15 aptitude + 5 logical reasoning questions daily",       "category": "technical",  "priority": 2},
    ]

    # Pick course-specific band
    course_map = SUGGESTIONS.get(course, {})
    course_suggestions = []
    for (lo, hi), items in course_map.items():
        if lo <= cgpa <= hi:
            course_suggestions = items
            break

    # Extra nudges based on weak signals
    extra = []
    if profile.internship_count == 0:
        extra.append({"skill": "Internship", "exercise": "Apply to at least 2 internships on Internshala or LinkedIn this week", "category": "activity", "priority": 1})
    if profile.certifications_count < 2:
        extra.append({"skill": "Certifications", "exercise": "Complete 1 free certification on Coursera or Google Career Certificates", "category": "technical", "priority": 1})
    if profile.communication_score < 6:
        extra.append({"skill": "Verbal Communication", "exercise": "Practice speaking for 10 min daily using Mirror Talk or record yourself", "category": "soft_skill", "priority": 1})
    if profile.backlogs > 0:
        extra.append({"skill": "Academic Recovery", "exercise": f"Clear {profile.backlogs} backlog(s) — dedicate 3 hrs/day to exam prep", "category": "activity", "priority": 1})
    if profile.aptitude_score < 60:
        extra.append({"skill": "Quantitative Aptitude", "exercise": "Solve RS Aggarwal chapters: Time & Work, Percentages, Profit & Loss daily", "category": "technical", "priority": 1})

    all_suggestions = sorted(extra + course_suggestions + UNIVERSAL, key=lambda x: x["priority"])

    top_career = recommend_career_sectors(profile.course, profile.cgpa, profile.aptitude_score)
    best_sector = top_career[0].sector if top_career else "your target sector"

    return {
        "student_id": profile.student_id,
        "best_career_path": best_sector,
        "suggestions": all_suggestions[:8],
    }




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
        "months_to_placement": max(2, round(2 + (1 - float(placement_probability)) * 16)),
        "risk_score": risk_score,
        "predicted_salary_inr": round(float(min(max(salary, 200_000), 2_500_000)), 2),
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
