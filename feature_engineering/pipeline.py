"""
feature_engineering/pipeline.py
Complete feature engineering pipeline: preprocessing, encoding, scaling,
feature selection, and training data generation.
"""
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, LabelEncoder, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.feature_selection import SelectKBest, f_classif
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

NUMERIC_FEATURES = [
    "age", "cgpa", "backlogs", "communication_score", "aptitude_score",
    "family_income_lpa", "linkedin_connections", "github_repos",
    "github_commits_30d", "certifications_count", "hackathon_participations",
    "internship_count", "institute_avg_placement_rate", "institute_avg_salary",
    "composite_score",
]

CATEGORICAL_FEATURES = ["gender", "course", "state"]

BINARY_FEATURES = ["loan_required", "is_high_achiever", "has_no_backlogs", "has_internship"]

TARGET_PLACEMENT = "is_placed"
TARGET_SALARY = "expected_salary_inr"
TARGET_TIME_TO_PLACEMENT = "days_to_placement"  # for survival model


def generate_synthetic_labels(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """Generate synthetic target variables for training (replace with real labels in production)."""
    np.random.seed(seed)
    n = len(df)

    # Placement probability influenced by features
    placement_logit = (
        0.5 * (df["cgpa"] - 6) +
        0.3 * df["aptitude_score"] / 10 +
        0.2 * df["communication_score"] +
        0.5 * df.get("internship_count", pd.Series(np.zeros(n))).values +
        0.3 * (df.get("certifications_count", pd.Series(np.zeros(n))).values > 2).astype(int) -
        0.4 * df["backlogs"] +
        np.random.normal(0, 1, n)
    )
    placement_prob = 1 / (1 + np.exp(-placement_logit))
    df[TARGET_PLACEMENT] = (np.random.uniform(0, 1, n) < placement_prob).astype(int)

    # Salary influenced by course, CGPA, placement
    base_salary = pd.Series({
        "CSE": 900000, "MBA": 750000, "DS": 850000,
        "ECE": 700000, "Mechanical": 600000, "Civil": 550000,
    })
    df["_base_salary"] = df["course"].map(base_salary).fillna(650000)
    df[TARGET_SALARY] = (
        df["_base_salary"] * (0.7 + 0.1 * df["cgpa"]) *
        np.random.lognormal(0, 0.2, n)
    ).astype(int)
    df.drop("_base_salary", axis=1, inplace=True)

    # Days to placement (survival model target)
    df[TARGET_TIME_TO_PLACEMENT] = np.where(
        df[TARGET_PLACEMENT] == 1,
        np.random.exponential(90, n).clip(7, 365).astype(int),
        np.nan
    )
    df["placement_event_observed"] = df[TARGET_PLACEMENT]

    return df


def build_preprocessor() -> ColumnTransformer:
    """Build sklearn ColumnTransformer for preprocessing."""
    numeric_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
    ])

    binary_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
    ])

    preprocessor = ColumnTransformer([
        ("num", numeric_pipe, NUMERIC_FEATURES),
        ("cat", categorical_pipe, CATEGORICAL_FEATURES),
        ("bin", binary_pipe, BINARY_FEATURES),
    ], remainder="drop")

    return preprocessor


def load_features_from_db() -> pd.DataFrame:
    """Load features from the database (dbt-materialized table)."""
    from sqlalchemy import create_engine
    engine = create_engine(os.getenv("DATABASE_URL"))
    df = pd.read_sql("SELECT * FROM features.student_features_base", engine)
    logger.info(f"Loaded {len(df)} rows from features.student_features_base")
    return df


def run_pipeline(df: pd.DataFrame = None, save_dir: str = "feature_engineering/artifacts") -> tuple:
    """
    Run the full feature engineering pipeline.
    Returns (X_train, X_test, y_placement_train, y_placement_test, preprocessor)
    """
    os.makedirs(save_dir, exist_ok=True)

    if df is None:
        try:
            df = load_features_from_db()
        except Exception as e:
            logger.warning(f"Could not load from DB ({e}), generating synthetic data")
            from data_sources.connectors import StudentDataConnector
            connector = StudentDataConnector()
            df = connector.fetch_student_profiles(n=2000)
            # Add placeholder signal cols
            for col in ["linkedin_connections", "github_repos", "github_commits_30d",
                        "certifications_count", "hackathon_participations", "internship_count",
                        "institute_avg_placement_rate", "institute_avg_salary", "composite_score",
                        "is_high_achiever", "has_no_backlogs", "has_internship"]:
                if col not in df.columns:
                    df[col] = 0

    df = generate_synthetic_labels(df)
    logger.info(f"Placement rate: {df[TARGET_PLACEMENT].mean():.2%}")

    from sklearn.model_selection import train_test_split
    feature_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES + BINARY_FEATURES

    # Only keep columns that exist
    available_features = [c for c in feature_cols if c in df.columns]
    X = df[available_features]
    y_placement = df[TARGET_PLACEMENT]
    y_salary = df[TARGET_SALARY]

    X_train, X_test, y_p_train, y_p_test, y_s_train, y_s_test = train_test_split(
        X, y_placement, y_salary, test_size=0.2, random_state=42, stratify=y_placement
    )

    preprocessor = build_preprocessor()
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    # Save preprocessor
    with open(f"{save_dir}/preprocessor.pkl", "wb") as f:
        pickle.dump(preprocessor, f)

    # Save feature names
    with open(f"{save_dir}/feature_cols.txt", "w") as f:
        f.write("\n".join(available_features))

    logger.info(f"Feature matrix shape: {X_train_proc.shape}")
    logger.info(f"Preprocessor saved to {save_dir}/preprocessor.pkl")

    return X_train_proc, X_test_proc, y_p_train, y_p_test, y_s_train, y_s_test, preprocessor, df


class DriftDetector:
    """Simple feature drift detection using statistical tests."""

    def check_drift(self, threshold: float = 0.05) -> bool:
        """Check for data drift. Returns True if drift detected."""
        logger.info("Checking for data drift...")
        # In production: compare recent vs historical feature distributions using PSI or KS test
        # Placeholder: randomly return False (no drift)
        import random
        drift = random.random() < 0.1  # 10% chance of drift
        if drift:
            logger.warning("Data drift detected!")
        return drift


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-all", action="store_true")
    args = parser.parse_args()

    if args.run_all:
        results = run_pipeline()
        print(f"Feature engineering complete. Train shape: {results[0].shape}")
