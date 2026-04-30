"""
models/train_all.py
Trains all three models: Regression (salary), Survival Model (time-to-placement),
LightGBM/XGBoost (placement classification). Logs all experiments to MLflow.
"""
import os
import pickle
import argparse
import numpy as np
import pandas as pd
import mlflow
import mlflow.sklearn
import mlflow.lightgbm
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import (
    mean_absolute_error, r2_score,
    roc_auc_score, accuracy_score, classification_report
)
from lightgbm import LGBMClassifier, LGBMRegressor
from xgboost import XGBClassifier
from lifelines import CoxPHFitter, KaplanMeierFitter
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

MODEL_SAVE_DIR = "models/artifacts"
os.makedirs(MODEL_SAVE_DIR, exist_ok=True)


# ─── 1. REGRESSION MODEL (Salary Prediction) ───────────────────────────────

def train_salary_regression(X_train, X_test, y_train, y_test, log_mlflow: bool = True):
    """Train Ridge regression for salary prediction."""
    logger.info("Training salary regression model...")

    model = Ridge(alpha=1.0)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    logger.info(f"Salary Regression — MAE: ₹{mae:,.0f}, R²: {r2:.4f}")

    if log_mlflow:
        with mlflow.start_run(run_name="salary_regression"):
            mlflow.log_param("model_type", "Ridge")
            mlflow.log_param("alpha", 1.0)
            mlflow.log_metric("mae_inr", mae)
            mlflow.log_metric("r2_score", r2)
            mlflow.sklearn.log_model(model, "salary_regression_model")

    path = f"{MODEL_SAVE_DIR}/salary_regression.pkl"
    with open(path, "wb") as f:
        pickle.dump(model, f)
    logger.info(f"Saved salary regression to {path}")
    return model, {"mae": mae, "r2": r2}


# ─── 2. SURVIVAL MODEL (Time-to-Placement) ─────────────────────────────────

def train_survival_model(df_raw: pd.DataFrame, log_mlflow: bool = True):
    """Train Cox Proportional Hazards survival model for time-to-placement."""
    logger.info("Training survival model (Cox PH)...")

    survival_df = df_raw.dropna(subset=["days_to_placement"]).copy()
    if len(survival_df) < 50:
        logger.warning("Not enough survival data, skipping survival model")
        return None, {}

    feature_cols = ["cgpa", "aptitude_score", "communication_score",
                    "internship_count", "certifications_count", "backlogs"]
    available = [c for c in feature_cols if c in survival_df.columns]

    cox_df = survival_df[available + ["days_to_placement", "placement_event_observed"]].copy()
    cox_df = cox_df.fillna(cox_df.median(numeric_only=True))

    cph = CoxPHFitter(penalizer=0.1)
    cph.fit(
        cox_df,
        duration_col="days_to_placement",
        event_col="placement_event_observed"
    )

    concordance = cph.concordance_index_
    logger.info(f"Survival Model — Concordance Index: {concordance:.4f}")
    cph.print_summary()

    if log_mlflow:
        with mlflow.start_run(run_name="survival_cox_ph"):
            mlflow.log_param("model_type", "CoxPH")
            mlflow.log_param("penalizer", 0.1)
            mlflow.log_metric("concordance_index", concordance)

    path = f"{MODEL_SAVE_DIR}/survival_cox.pkl"
    with open(path, "wb") as f:
        pickle.dump(cph, f)
    logger.info(f"Saved survival model to {path}")
    return cph, {"concordance_index": concordance}


# ─── 3. LIGHTGBM/XGBOOST CLASSIFIER (Placement Prediction) ─────────────────

def train_placement_classifier(X_train, X_test, y_train, y_test, log_mlflow: bool = True):
    """Train LightGBM + XGBoost ensemble for placement prediction."""
    logger.info("Training placement classifiers (LightGBM + XGBoost)...")

    # LightGBM
    lgbm = LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        num_leaves=31,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbose=-1,
    )
    lgbm.fit(X_train, y_train, eval_set=[(X_test, y_test)])
    lgbm_preds = lgbm.predict(X_test)
    lgbm_proba = lgbm.predict_proba(X_test)[:, 1]
    lgbm_auc = roc_auc_score(y_test, lgbm_proba)
    lgbm_acc = accuracy_score(y_test, lgbm_preds)
    logger.info(f"LightGBM — AUC: {lgbm_auc:.4f}, Accuracy: {lgbm_acc:.4f}")

    # XGBoost
    xgb = XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        verbosity=0,
    )
    xgb.fit(X_train, y_train)
    xgb_proba = xgb.predict_proba(X_test)[:, 1]
    xgb_auc = roc_auc_score(y_test, xgb_proba)
    logger.info(f"XGBoost — AUC: {xgb_auc:.4f}")

    # Ensemble (simple average)
    ensemble_proba = (lgbm_proba + xgb_proba) / 2
    ensemble_auc = roc_auc_score(y_test, ensemble_proba)
    logger.info(f"Ensemble — AUC: {ensemble_auc:.4f}")

    if log_mlflow:
        mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT_NAME", "placement_prediction"))
        with mlflow.start_run(run_name="placement_lgbm_xgb_ensemble"):
            mlflow.log_params({
                "lgbm_n_estimators": 300, "lgbm_lr": 0.05,
                "xgb_n_estimators": 300, "xgb_lr": 0.05,
            })
            mlflow.log_metrics({
                "lgbm_auc": lgbm_auc, "lgbm_accuracy": lgbm_acc,
                "xgb_auc": xgb_auc, "ensemble_auc": ensemble_auc,
            })
            mlflow.lightgbm.log_model(lgbm, "lgbm_model")
            mlflow.sklearn.log_model(xgb, "xgb_model")
            logger.info("Models logged to MLflow")

    # Save models
    for name, model in [("lgbm", lgbm), ("xgb", xgb)]:
        path = f"{MODEL_SAVE_DIR}/placement_{name}.pkl"
        with open(path, "wb") as f:
            pickle.dump(model, f)

    # Save ensemble weights
    with open(f"{MODEL_SAVE_DIR}/ensemble_config.pkl", "wb") as f:
        pickle.dump({"lgbm_weight": 0.5, "xgb_weight": 0.5}, f)

    return lgbm, xgb, {
        "lgbm_auc": lgbm_auc, "xgb_auc": xgb_auc, "ensemble_auc": ensemble_auc
    }


def load_model(name: str):
    """Load a trained model by name."""
    path = f"{MODEL_SAVE_DIR}/{name}.pkl"
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}. Run train_all.py first.")
    with open(path, "rb") as f:
        return pickle.load(f)


def train_all(log_mlflow: bool = True):
    """Run full training pipeline."""
    logger.info("Starting full model training pipeline...")

    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000"))
    mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT_NAME", "placement_prediction"))

    from feature_engineering.pipeline import run_pipeline
    X_train, X_test, y_p_train, y_p_test, y_s_train, y_s_test, preprocessor, df_raw = run_pipeline()

    results = {}
    results["salary"] = train_salary_regression(X_train, X_test, y_s_train, y_s_test, log_mlflow)
    results["survival"] = train_survival_model(df_raw, log_mlflow)
    results["placement"] = train_placement_classifier(X_train, X_test, y_p_train, y_p_test, log_mlflow)

    logger.info("All models trained successfully!")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--log-mlflow", action="store_true", default=True)
    parser.add_argument("--no-mlflow", dest="log_mlflow", action="store_false")
    args = parser.parse_args()

    train_all(log_mlflow=args.log_mlflow)
