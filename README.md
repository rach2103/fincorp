# 🎓 Placement IQ — Student Placement Intelligence Platform

A full-stack ML platform for predicting student placement outcomes, salary forecasting, career recommendations, loan risk assessment, and AI-driven placement coaching. Built with FastAPI, React 18, LightGBM/XGBoost, and trained on 21,015 real student records from three Kaggle datasets.

---

## Table of Contents

- [Architecture](#architecture)
- [Datasets](#datasets)
- [ML Models](#ml-models)
- [Feature Engineering](#feature-engineering)
- [API Endpoints](#api-endpoints)
- [Dashboard & User Roles](#dashboard--user-roles)
- [Student Onboarding Flow](#student-onboarding-flow)
- [Loan Application Flow](#loan-application-flow)
- [Meeting Scheduling](#meeting-scheduling)
- [Issue Reporting](#issue-reporting)
- [Loan Calculator](#loan-calculator)
- [AI Placement Suggestions](#ai-placement-suggestions)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Training the Models](#training-the-models)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)

---

## Architecture

```
Kaggle Datasets (3 sources, 21,015 rows)
        │
        ▼
data_sources/dataset_loader.py  ──►  feature_engineering/pipeline.py
                                              │
                                   ┌──────────▼──────────┐
                                   │    Preprocessor      │
                                   │  StandardScaler +    │
                                   │  OrdinalEncoder      │
                                   └──────────┬──────────┘
                                              │
              ┌───────────────────────────────┼──────────────────────┐
              ▼                               ▼                      ▼
   LightGBM + XGBoost               Ridge Regression          Cox PH Survival
   Placement Classifier             Salary Prediction         Time-to-Placement
   AUC: 0.9529                      MAE: ₹2,07,162            CI: 0.50
              │                               │                      │
              └───────────────────────────────┼──────────────────────┘
                                              │
                                   FastAPI (serving/api/main.py)
                                   /predict  /suggestions  /loan/assess
                                              │
                                   React 18 Dashboard
                                   Role-locked · 4 user views
```

---

## Datasets

Three real Kaggle datasets merged and used for training:

| Dataset | Kaggle Slug | Rows | Placement Rate | Key Features |
|---|---|---|---|---|
| Placement Prediction Dataset | ruchikakumbhar | 10,000 | 41.97% | CGPA, internships, aptitude, soft skills, certifications |
| Job Placement Dataset | ahsan81 | 215 | 68.84% | Degree %, work experience, specialisation, gender |
| College Student Placement Factors | sahilislam007 | 10,000 | 16.59% | IQ, prev sem result, communication, extracurriculars, projects |
| Synthetic Augmentation | — | 800 | ~44% | DS, ECE, Mechanical, Civil course coverage |
| **Combined** | | **21,015** | **30.94%** | |

### Download Datasets
```bash
# Set up Kaggle API key: https://www.kaggle.com/settings → API → Create New Token
mkdir -p ~/.kaggle && mv ~/Downloads/kaggle.json ~/.kaggle/ && chmod 600 ~/.kaggle/kaggle.json

kaggle datasets download -d ruchikakumbhar/placement-prediction-dataset -p data_sources/raw --unzip
kaggle datasets download -d ahsan81/job-placement-dataset -p data_sources/raw --unzip
kaggle datasets download -d sahilislam007/college-student-placement-factors-dataset -p data_sources/raw --unzip
```

---

## ML Models

All models trained via `models/train_all.py` and saved to `models/artifacts/`.

### 1. Placement Classifier — LightGBM + XGBoost Ensemble
- Predicts whether a student will be placed (binary classification)
- Simple average ensemble of LightGBM and XGBoost probabilities
- **AUC: 0.9529 | Accuracy: 87.98%**
- Artifacts: `placement_lgbm.pkl`, `placement_xgb.pkl`, `ensemble_config.pkl`

### 2. Salary Regression — Ridge
- Predicts expected annual salary in INR
- **MAE: ₹2,07,162 | R²: 0.18**
- Artifact: `salary_regression.pkl`

### 3. Survival Model — Cox Proportional Hazards
- Estimates time-to-placement in days
- **Concordance Index: 0.50**
- Artifact: `survival_cox.pkl`

### Heuristic Fallback
When trained artifacts are not available, the API uses a logistic regression heuristic:
```
logit = 0.55×(cgpa−6) + 0.04×(aptitude−60) + 0.18×(comm−6) + 0.4×internships − 0.45×backlogs
salary = base ₹3L + CGPA bonus + aptitude bonus + internship bonus − backlog penalty
```

---

## Feature Engineering

`feature_engineering/pipeline.py` — full pipeline:

**22 features used for training:**

| Type | Features |
|---|---|
| Numeric (15) | age, cgpa, backlogs, communication_score, aptitude_score, family_income_lpa, linkedin_connections, github_repos, github_commits_30d, certifications_count, hackathon_participations, internship_count, institute_avg_placement_rate, institute_avg_salary, composite_score |
| Categorical (3) | gender, course, state |
| Binary (4) | loan_required, is_high_achiever, has_no_backlogs, has_internship |

**Derived features:**
- `composite_score` = cgpa × 0.4 + aptitude × 0.003 + communication × 0.06
- `is_high_achiever` = 1 if cgpa ≥ 8.0
- `has_no_backlogs` = 1 if backlogs == 0
- `has_internship` = 1 if internship_count ≥ 1

**Data loading priority:** PostgreSQL DB → Kaggle datasets → Synthetic fallback (2,000 rows)

**Label handling:** Uses real `is_placed` labels from datasets; synthetic labels only generated if missing.

---

## API Endpoints

```bash
PYTHONPATH=$(pwd) uvicorn serving.api.main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/predict` | Placement probability, salary, risk, SHAP, career recommendations |
| POST | `/suggestions` | AI skill and exercise suggestions personalised to student profile |
| POST | `/loan/assess` | Loan eligibility, EMI, affordability ratio |
| GET | `/fairness/summary` | Fairness metrics by gender group |

### POST `/predict` — Sample Request
```json
{
  "student_id": "STU-DEMO",
  "course": "CSE",
  "cgpa": 8.1,
  "backlogs": 0,
  "communication_score": 7.6,
  "aptitude_score": 78.0,
  "internship_count": 1,
  "certifications_count": 3,
  "institute_avg_placement_rate": 78.0,
  "institute_avg_salary": 650000
}
```

### POST `/predict` — Sample Response
```json
{
  "placement_probability": 0.82,
  "months_to_placement": 5,
  "risk_score": 0.18,
  "predicted_salary_inr": 720000,
  "early_risk_alert": false,
  "model_source": "trained-artifacts",
  "career_recommendations": [
    { "sector": "Software Engineering", "fit_score": 0.78 },
    { "sector": "Cloud & DevOps", "fit_score": 0.70 }
  ]
}
```

---

## Dashboard & User Roles

The React dashboard is **role-locked** — each user sees only their own view after login. No role switching is possible after authentication.

### Demo Credentials

| Email | Password | Role |
|---|---|---|
| student@fincorp.com | student123 | Student User |
| institute@fincorp.com | institute123 | Institute Staff |
| scientist@fincorp.com | science123 | Data Scientist |
| loan@fincorp.com | loan123 | Loan Officer |

---

### Student User

New students go through a **one-time onboarding form** before seeing their dashboard.

**Onboarding form collects:**
- Full name, roll number, college name, course
- Resume headline, skills (comma-separated), projects (one per line)
- Semester-wise CGPA (8 semesters) — auto-averaged to compute CGPA
- Internships, certifications, aptitude score, communication score, backlogs
- College placement rate, family income, loan amount
- Resume and transcript document uploads

**After onboarding, the student dashboard shows:**
- 4 metric cards: Placement Probability %, Estimated Months to Placement, Risk Score %, Salary Prediction
- Profile sliders (course, CGPA, aptitude, communication, backlogs, internships) — all update live
- Risk explanation with tiered labels: High risk / Early risk alert / Watchlist / On-track
- SHAP-style feature impact bars (positive = blue, negative = red)
- Career recommendations by course with fit score %
- Student profile summary (name, roll number, college, skills, projects, documents)
- Loan calculator with "Avail loan" button
- AI placement suggestions panel
- "Report issue" button on profile summary

---

### Institute Staff

- Full cohort table of all students (submitted profiles + demo data)
- Columns: Student ID, Roll No., Name, College, Course, CGPA, Internships, Backlogs, Skills, Documents, Placement %, Predicted Salary, Risk badge
- "Report issue" button to flag cohort data problems to the Data Scientist

---

### Loan Officer

- Left panel: list of all loan applications with status badges (Pending / Approved / Rejected) and meeting indicators
- Right panel: full student profile with:
  - CGPA, backlogs, internships, family income, loan amount, application status
  - Predicted salary, placement probability, monthly EMI, EMI/salary ratio, auto-eligibility
- Action buttons: **Approve Loan**, **Reject Loan**, **Request Meeting**, **Report Issue**
- Meeting request flow: officer requests → student accepts → student schedules → meeting link generated

---

### Data Scientist

- 4 metric cards: Open Issues, Solved Issues, High Priority, Model Source
- Issue board showing all issues reported by Student, Institute Staff, and Loan Officer
- Each issue card shows: priority badge, source role, title, detail, category, timestamp
- "Mark solved" button per issue
- Role workflow guide panel (validate data, investigate model, close issues)

---

## Student Onboarding Flow

```
Student logs in (new account)
        │
        ▼
StudentOnboarding form
  - Personal details, course, resume headline
  - Skills, projects, semester marks (8 semesters)
  - Aptitude, communication, backlogs, certifications
  - Family income, loan amount
  - Resume + transcript upload
        │
        ▼
Profile submitted → ScoringView with full dashboard
  - Profile visible in Institute Staff cohort table
  - Loan request visible to Loan Officer (if loan amount > 0)
```

---

## Loan Application Flow

```
Student fills loan amount in onboarding or loan calculator
        │
        ▼
"Avail loan" button → loan request created (status: Pending)
        │
        ▼
Loan Officer sees request in applications list
  - Reviews profile, EMI ratio, auto-eligibility
  - Can: Approve / Reject / Request Meeting / Report Issue
        │
        ▼
If "Request Meeting":
  Student sees "Loan officer requested a meeting" banner
  Student clicks "Accept request"
        │
        ▼
Student picks platform (Google Meet / Zoom) + date/time
  Meeting link auto-generated
        │
        ▼
Both Loan Officer and Student see meeting card with link + time
```

---

## Meeting Scheduling

- Loan Officer clicks "Request meeting" on a student's loan application
- Student sees a meeting request banner in their loan calculator section
- Student accepts → scheduling form appears (platform + datetime picker)
- On confirm: meeting link generated (`meet.google.com/...` or `zoom.us/j/...`)
- Meeting card shown to both parties with platform, time, and link

---

## Issue Reporting

Any role can report issues to the Data Scientist:

| Source | Trigger | Auto-filled detail |
|---|---|---|
| Student User | "Report issue" on profile summary | Student name, roll number |
| Institute Staff | "Report issue" on cohort table | Cohort data validation note |
| Loan Officer | "Report issue" on loan detail | EMI ratio, placement probability |

Issues appear in the Data Scientist's issue board with:
- Priority: High (loan/risk issues) or Medium (others)
- Status: Open → Solved
- Source role, category, title, detail, timestamp

---

## Loan Calculator

Available on the Student User page. Calculates repayment based on predicted salary.

**Inputs:** Study destination, lender/scheme, loan amount slider (₹50K–₹20L)

**Outputs:** Monthly EMI, Repayment period (up to 150 months), Interest rate, Total payable, Total interest, Best career path to repay faster

**EMI logic:** Capped at 40% of predicted monthly salary. Minimum tenure selected from: 12, 24, 36, 48, 60, 84, 120, 150 months.

### Lenders by Country

| Country | Lender | Rate |
|---|---|---|
| India | SBI Scholar Loan | 8.15% |
| India | Bank of Baroda Baroda Vidya | 9.70% |
| India | HDFC Credila | 10.50% |
| India | Axis Bank | 11.50% |
| USA | Federal Stafford Loan | 6.53% |
| USA | Sallie Mae Private | 11.99% |
| USA | College Ave | 13.99% |
| UK | UK Student Finance (Govt) | 7.90% |
| UK | HSBC UK Education | 9.50% |
| Canada | Canada Student Loan (Govt) | 7.05% |
| Canada | TD Bank Education | 9.25% |
| Australia | HECS-HELP (Govt) | 3.90% |
| Australia | ANZ Education Loan | 9.49% |
| Germany | KfW Student Loan | 6.29% |
| Germany | Deutsche Bank | 8.50% |

---

## AI Placement Suggestions

Available on the Student User page. Personalised 8-card grid based on course + CGPA band + weak signal detection.

### CGPA Bands
| Band | CGPA Range | Focus |
|---|---|---|
| High | ≥ 8.0 | Advanced skills, competitive certs, open source, leadership |
| Mid | 6.0–8.0 | Core skill building, projects, communication, aptitude |
| Low | < 6.0 | Fundamentals, backlog clearance, resume building |

### Weak Signal Auto-Detection
| Condition | Suggestion Added |
|---|---|
| internship_count == 0 | Apply to internships on Internshala / LinkedIn |
| certifications_count < 2 | Complete 1 free cert on Coursera / Google |
| communication_score < 6 | Daily speaking practice — record and review |
| backlogs > 0 | Dedicate 3 hrs/day to exam prep |
| aptitude_score < 60 | RS Aggarwal aptitude chapters daily |

### Card Categories
- 🔵 Technical — DSA, system design, tools, certifications, domain skills
- 🟢 Soft Skill — communication, GD practice, mock interviews, networking
- 🟡 Activity — internships, open source, LinkedIn optimisation, hackathons

---

## Project Structure

```
fincorp/
├── data_sources/
│   ├── raw/                               # Kaggle CSVs (gitignored)
│   │   ├── placementdata.csv              # ruchikakumbhar — 10,000 rows
│   │   ├── Job_Placement_Data.csv         # ahsan81 — 215 rows
│   │   └── college_student_placement_dataset.csv  # sahilislam007 — 10,000 rows
│   ├── connectors.py                      # StudentDataConnector (loads real CSV)
│   └── dataset_loader.py                 # Merges all 3 datasets + augmentation
│
├── feature_engineering/
│   ├── artifacts/
│   │   ├── preprocessor.pkl              # Fitted ColumnTransformer
│   │   └── feature_cols.txt             # 22 feature column names
│   ├── pipeline.py                       # Full feature engineering pipeline
│   └── drift_detector.py               # Data drift detection
│
├── models/
│   ├── artifacts/
│   │   ├── placement_lgbm.pkl           # LightGBM classifier
│   │   ├── placement_xgb.pkl            # XGBoost classifier
│   │   ├── ensemble_config.pkl          # Ensemble weights (50/50)
│   │   ├── salary_regression.pkl        # Ridge salary model
│   │   └── survival_cox.pkl             # Cox PH survival model
│   └── train_all.py                     # Trains all 3 models
│
├── serving/
│   └── api/
│       ├── main.py                      # FastAPI: /predict /suggestions /loan/assess /fairness
│       └── schemas.py                   # Pydantic StudentProfile, LoanAssessmentRequest
│
├── compliance/
│   └── rules.py                         # LoanCalculator, CareerSectorGuidance, assess_loan_eligibility
│
├── explainability/
│   └── service.py                       # SHAP explanations, fairness summaries
│
├── ingestion/
│   ├── airflow/dags/
│   │   └── placement_pipeline_dag.py    # Daily ETL DAG
│   ├── dbt/models/
│   │   └── student_features_base.sql    # dbt feature table
│   └── loaders.py                       # PostgreSQL upsert + MinIO upload
│
├── storage/
│   └── init.sql                         # DB schema + placement_suggestions seed (50+ rows)
│
├── dashboard/
│   └── frontend/
│       ├── src/
│       │   ├── main.jsx                 # All role views, onboarding, loan flow, meeting, issues
│       │   ├── Login.jsx                # Role-locked login with demo credentials
│       │   ├── styles.css               # Full UI styles
│       │   └── login.css               # Login page styles
│       ├── index.html
│       └── package.json                # Vite 5 + React 18 + lucide-react
│
├── scripts/
│   ├── init_db.py                       # Database initialisation
│   └── trigger_pipeline.py             # Manual pipeline trigger
│
├── docker-compose.yml                   # PostgreSQL, MinIO, MLflow, Airflow
├── requirements.txt                     # Python dependencies
└── .env.example                         # Environment variable template
```

---

## Quick Start

### 1. Install Python dependencies
```bash
pip3 install mlflow lightgbm xgboost scikit-learn lifelines loguru python-dotenv fastapi uvicorn pandas numpy
```

### 2. Install libomp (macOS — required for LightGBM)
```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv zsh)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv zsh)"

brew install libomp
```

### 3. Download Kaggle datasets
```bash
mkdir -p ~/.kaggle && mv ~/Downloads/kaggle.json ~/.kaggle/ && chmod 600 ~/.kaggle/kaggle.json

kaggle datasets download -d ruchikakumbhar/placement-prediction-dataset -p data_sources/raw --unzip
kaggle datasets download -d ahsan81/job-placement-dataset -p data_sources/raw --unzip
kaggle datasets download -d sahilislam007/college-student-placement-factors-dataset -p data_sources/raw --unzip
```

### 4. Train the models
```bash
PYTHONPATH=$(pwd) python3 models/train_all.py --no-mlflow
```

### 5. Start the API
```bash
PYTHONPATH=$(pwd) uvicorn serving.api.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### 6. Start the dashboard
```bash
cd dashboard/frontend
npm install
npm start
# Opens at http://localhost:5173
```

---

## Training the Models

```bash
# Without MLflow (local training)
PYTHONPATH=$(pwd) python3 models/train_all.py --no-mlflow

# With MLflow tracking server running
PYTHONPATH=$(pwd) python3 models/train_all.py
```

**Training data priority:**
1. PostgreSQL DB (`features.student_features_base`)
2. All 3 Kaggle datasets merged via `data_sources/dataset_loader.py`
3. Synthetic fallback (2,000 rows)

**Training results (last run):**

| Model | Metric | Value |
|---|---|---|
| LightGBM Classifier | AUC | 0.9523 |
| XGBoost Classifier | AUC | 0.9526 |
| Ensemble | AUC | **0.9529** |
| LightGBM | Accuracy | 87.98% |
| Salary Regression | MAE | ₹2,07,162 |
| Salary Regression | R² | 0.18 |
| Survival Model | Concordance Index | 0.50 |

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
DATABASE_URL=postgresql://placement_user:placement_pass@localhost:5432/placement_db
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MLFLOW_TRACKING_URI=mlruns
MLFLOW_EXPERIMENT_NAME=placement_prediction
JOB_MARKET_API_URL=
JOB_MARKET_API_KEY=
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MODEL_ARTIFACT_DIR=models/artifacts
PREPROCESSOR_PATH=feature_engineering/artifacts/preprocessor.pkl
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML Models | LightGBM 4.6, XGBoost, scikit-learn Ridge, lifelines CoxPH |
| Feature Engineering | pandas, scikit-learn ColumnTransformer, StandardScaler, OrdinalEncoder |
| API | FastAPI 0.110, Pydantic v2, Uvicorn |
| Explainability | SHAP, Fairlearn |
| Dashboard | React 18, Vite 5, lucide-react |
| Database | PostgreSQL, SQLAlchemy |
| Storage | MinIO (S3-compatible) |
| Orchestration | Apache Airflow |
| Data Transformation | dbt-postgres |
| MLOps | MLflow |
| Containerisation | Docker, docker-compose |
| Datasets | 3 Kaggle datasets — 21,015 rows combined |
| Python | 3.9+ |
