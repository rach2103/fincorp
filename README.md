# 🎓 Student Placement Intelligence Platform

A full-stack ML platform for predicting student placement outcomes, salary forecasting, career recommendations, and loan risk assessment.

## Architecture Overview

```
DATA SOURCES → INGESTION & STORAGE → FEATURE ENGINEERING → MODEL LAYER → SERVING & MLOps → DASHBOARD
```

### Components

| Layer | Technology |
|---|---|
| Data Sources | Industry Data, Institute Data, Real-time Signals, Student Data |
| Ingestion | Apache Airflow, dbt, S3/MinIO, PostgreSQL |
| Feature Engineering | pandas, scikit-learn |
| Models | Regression, Survival Model, LightGBM/XGBoost |
| Serving | FastAPI, MLflow, Docker |
| Explainability | SHAP, Fairlearn |
| Dashboard | React, Role-based views |
| Compliance | Country Loan Criteria, Career Sector Guidance, Loan Calculator |

## Quick Start

```bash
# 1. Clone and setup environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 2. Start infrastructure
docker-compose up -d

# 3. Initialize database
python scripts/init_db.py

# 4. Run Airflow DAGs
python scripts/trigger_pipeline.py

# 5. Train models
python models/train_all.py

# 6. Start API server
uvicorn serving.api.main:app --reload --port 8000

# 7. Start dashboard
cd dashboard/frontend && npm install && npm start
```

## User Roles

- **Data Scientist** – Full model access, SHAP explanations, training controls
- **Institute Staff** – Risk scores, placement probabilities, cohort views
- **Student User** – Personalized dashboard, career recommendations
- **Loan Officer** – Salary predictions, loan calculator, compliance views

## Project Structure

```
placement_platform/
├── data_sources/          # Data connectors and schemas
├── ingestion/
│   ├── airflow/dags/      # ETL orchestration
│   └── dbt/models/        # SQL transformations
├── storage/               # MinIO & PostgreSQL configs
├── feature_engineering/   # Feature pipelines
├── models/                # ML model training
├── serving/
│   ├── api/               # FastAPI endpoints
│   └── mlflow_setup/      # Experiment tracking
├── explainability/        # SHAP & Fairlearn
├── compliance/            # Regulatory rules
├── dashboard/
│   ├── frontend/          # React app
│   └── backend/           # Dashboard API
├── docker/                # Dockerfiles
├── tests/                 # Test suites
└── scripts/               # Utility scripts
```
