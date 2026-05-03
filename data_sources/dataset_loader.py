"""
data_sources/dataset_loader.py
Loads, harmonises, and merges both Kaggle datasets into a single
training-ready DataFrame compatible with feature_engineering/pipeline.py
"""
import os
import numpy as np
import pandas as pd
from loguru import logger

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")

PLACEMENT_DATA   = os.path.join(RAW_DIR, "placementdata.csv")                          # ruchikakumbhar
JOB_PLACEMENT    = os.path.join(RAW_DIR, "Job_Placement_Data.csv")                     # ahsan81
COLLEGE_FACTORS  = os.path.join(RAW_DIR, "college_student_placement_dataset.csv")      # sahilislam007


# ── Dataset 1: ruchikakumbhar/placement-prediction-dataset ──────────────────
def _load_ruchika() -> pd.DataFrame:
    """
    Columns: StudentID, CGPA, Internships, Projects,
             Workshops/Certifications, AptitudeTestScore, SoftSkillsRating,
             ExtracurricularActivities, PlacementTraining, SSC_Marks,
             HSC_Marks, PlacementStatus
    """
    df = pd.read_csv(PLACEMENT_DATA)
    df = df.rename(columns={
        "StudentID":                "student_id",
        "CGPA":                     "cgpa",
        "Internships":              "internship_count",
        "Projects":                 "github_repos",
        "Workshops/Certifications": "certifications_count",
        "AptitudeTestScore":        "aptitude_score",
        "SoftSkillsRating":         "communication_score",
        "ExtracurricularActivities":"hackathon_participations",
        "PlacementTraining":        "placement_training",
        "SSC_Marks":                "ssc_marks",
        "HSC_Marks":                "hsc_marks",
        "PlacementStatus":          "is_placed",
    })
    df["student_id"]              = df["student_id"].apply(lambda x: f"RK{int(x):05d}")
    df["is_placed"]               = (df["is_placed"] == "Placed").astype(int)
    df["hackathon_participations"] = (df["hackathon_participations"] == "Yes").astype(int)
    df["placement_training"]      = (df["placement_training"] == "Yes").astype(int)

    # Derive missing columns with sensible defaults
    df["gender"]                  = "M"          # not in dataset
    df["course"]                  = "CSE"        # not in dataset
    df["backlogs"]                = 0
    df["age"]                     = 21
    df["state"]                   = "Karnataka"
    df["family_income_lpa"]       = 5.0
    df["loan_required"]           = False
    df["linkedin_connections"]    = 100
    df["github_commits_30d"]      = df["github_repos"] * 8
    df["institute_avg_placement_rate"] = 75.0
    df["institute_avg_salary"]    = 650000
    df["institute_id"]            = "INST001"
    df["source"]                  = "ruchika"
    logger.info(f"[ruchika] Loaded {len(df)} rows, placement rate: {df['is_placed'].mean():.2%}")
    return df


# ── Dataset 2: ahsan81/job-placement-dataset ─────────────────────────────────
def _load_ahsan() -> pd.DataFrame:
    """
    Columns: gender, ssc_percentage, ssc_board, hsc_percentage, hsc_board,
             hsc_subject, degree_percentage, undergrad_degree, work_experience,
             emp_test_percentage, specialisation, mba_percent, status
    """
    df = pd.read_csv(JOB_PLACEMENT)
    df = df.rename(columns={
        "gender":             "gender",
        "ssc_percentage":     "ssc_marks",
        "hsc_percentage":     "hsc_marks",
        "degree_percentage":  "degree_pct",
        "undergrad_degree":   "course_raw",
        "work_experience":    "work_experience",
        "emp_test_percentage":"aptitude_score",
        "specialisation":     "specialisation",
        "mba_percent":        "mba_pct",
        "status":             "is_placed",
    })

    df["is_placed"]    = (df["is_placed"] == "Placed").astype(int)
    df["gender"]       = df["gender"].str.upper().map({"M": "M", "F": "F"}).fillna("M")

    # Map undergrad degree to project course codes
    course_map = {
        "Sci&Tech":  "CSE",
        "Comm&Mgmt": "MBA",
        "Others":    "ECE",
    }
    df["course"] = df["course_raw"].map(course_map).fillna("CSE")

    # Derive CGPA from degree percentage (scale 0-100 → 0-10)
    df["cgpa"] = (df["degree_pct"] / 10).clip(4, 10).round(2)

    # Aptitude already 0-100
    df["aptitude_score"] = df["aptitude_score"].fillna(df["aptitude_score"].median())

    # Communication score: derive from mba_pct or degree_pct (scale to 0-10)
    df["communication_score"] = (df.get("mba_pct", df["degree_pct"]) / 10).clip(0, 10).round(2)

    # Work experience → internship_count proxy
    df["internship_count"] = (df["work_experience"] == "Yes").astype(int)

    # Generate student IDs
    df["student_id"] = [f"AH{i:05d}" for i in range(len(df))]

    # Fill missing columns
    df["backlogs"]                     = 0
    df["age"]                          = 22
    df["state"]                        = "Maharashtra"
    df["family_income_lpa"]            = 6.0
    df["loan_required"]                = False
    df["linkedin_connections"]         = 150
    df["github_repos"]                 = 3
    df["github_commits_30d"]           = 20
    df["certifications_count"]         = 1
    df["hackathon_participations"]     = 0
    df["institute_avg_placement_rate"] = 72.0
    df["institute_avg_salary"]         = 620000
    df["institute_id"]                 = "INST002"
    df["source"]                       = "ahsan"

    logger.info(f"[ahsan81] Loaded {len(df)} rows, placement rate: {df['is_placed'].mean():.2%}")
    return df


# ── Dataset 3: sahilislam007/college-student-placement-factors-dataset ──────
def _load_sahil() -> pd.DataFrame:
    """
    Columns: College_ID, IQ, Prev_Sem_Result, CGPA, Academic_Performance,
             Internship_Experience, Extra_Curricular_Score, Communication_Skills,
             Projects_Completed, Placement
    """
    df = pd.read_csv(COLLEGE_FACTORS)
    df = df.rename(columns={
        "College_ID":             "institute_id",
        "IQ":                     "iq_score",
        "Prev_Sem_Result":        "prev_sem_result",
        "CGPA":                   "cgpa",
        "Academic_Performance":   "academic_performance",
        "Internship_Experience":  "internship_count",
        "Extra_Curricular_Score": "hackathon_participations",
        "Communication_Skills":   "communication_score",
        "Projects_Completed":     "github_repos",
        "Placement":              "is_placed",
    })

    df["is_placed"]         = (df["is_placed"] == "Yes").astype(int)
    df["internship_count"]  = (df["internship_count"] == "Yes").astype(int)

    # Derive aptitude from IQ (IQ ~100 mean → scale to 0-100 aptitude)
    df["aptitude_score"]    = ((df["iq_score"] - 70) / 60 * 100).clip(0, 100).round(1)

    # communication_score is already 1-10
    df["communication_score"] = df["communication_score"].clip(0, 10).astype(float)

    # Generate student IDs
    df["student_id"]        = [f"SH{i:05d}" for i in range(len(df))]

    # Fill missing columns
    df["gender"]                       = "M"
    df["course"]                       = "CSE"
    df["backlogs"]                     = 0
    df["age"]                          = 21
    df["state"]                        = "Tamil Nadu"
    df["family_income_lpa"]            = 5.5
    df["loan_required"]                = False
    df["linkedin_connections"]         = 120
    df["github_commits_30d"]           = df["github_repos"] * 6
    df["certifications_count"]         = 1
    df["institute_avg_placement_rate"] = 65.0
    df["institute_avg_salary"]         = 600000
    df["ssc_marks"]                    = df["prev_sem_result"] * 10
    df["hsc_marks"]                    = df["prev_sem_result"] * 10
    df["source"]                       = "sahil"

    logger.info(f"[sahil] Loaded {len(df)} rows, placement rate: {df['is_placed'].mean():.2%}")
    return df


# ── Merge & harmonise ────────────────────────────────────────────────────────
FINAL_COLUMNS = [
    "student_id", "age", "gender", "course", "cgpa", "backlogs",
    "communication_score", "aptitude_score", "state", "family_income_lpa",
    "loan_required", "linkedin_connections", "github_repos", "github_commits_30d",
    "certifications_count", "hackathon_participations", "internship_count",
    "institute_avg_placement_rate", "institute_avg_salary", "institute_id",
    "ssc_marks", "hsc_marks", "is_placed", "source",
]


def load_combined_dataset(augment: bool = True) -> pd.DataFrame:
    """
    Load and merge both Kaggle datasets into a single training-ready DataFrame.

    Args:
        augment: If True, augment with synthetic rows to balance the dataset
                 and fill gaps in underrepresented courses.

    Returns:
        DataFrame with all FINAL_COLUMNS + target column `is_placed`.
    """
    frames = []

    if os.path.exists(PLACEMENT_DATA):
        frames.append(_load_ruchika())
    else:
        logger.warning(f"Missing: {PLACEMENT_DATA}")

    if os.path.exists(JOB_PLACEMENT):
        frames.append(_load_ahsan())
    else:
        logger.warning(f"Missing: {JOB_PLACEMENT}")

    if os.path.exists(COLLEGE_FACTORS):
        frames.append(_load_sahil())
    else:
        logger.warning(f"Missing: {COLLEGE_FACTORS}")

    if not frames:
        raise FileNotFoundError("No datasets found in data_sources/raw/. Run the Kaggle download commands.")

    df = pd.concat(frames, ignore_index=True)

    # Keep only final columns that exist
    available = [c for c in FINAL_COLUMNS if c in df.columns]
    df = df[available].copy()

    # Fill any remaining NaNs
    df["ssc_marks"]  = df.get("ssc_marks",  pd.Series(dtype=float)).fillna(65.0)
    df["hsc_marks"]  = df.get("hsc_marks",  pd.Series(dtype=float)).fillna(70.0)
    df = df.fillna(0)

    if augment:
        df = _augment(df)

    logger.info(f"Combined dataset: {len(df)} rows | placement rate: {df['is_placed'].mean():.2%}")
    logger.info(f"Course distribution:\n{df['course'].value_counts().to_string()}")
    return df


def _augment(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """
    Add synthetic rows for underrepresented courses (DS, ECE, Mechanical, Civil)
    so the model trains on all course types.
    """
    np.random.seed(seed)
    n = 200  # rows per underrepresented course

    extra_courses = {
        "DS":         {"institute_avg_salary": 720000, "institute_avg_placement_rate": 80},
        "ECE":        {"institute_avg_salary": 580000, "institute_avg_placement_rate": 68},
        "MECHANICAL": {"institute_avg_salary": 540000, "institute_avg_placement_rate": 62},
        "CIVIL":      {"institute_avg_salary": 500000, "institute_avg_placement_rate": 58},
    }

    rows = []
    for course, meta in extra_courses.items():
        cgpa            = np.round(np.random.beta(7, 3, n) * 10, 2).clip(4, 10)
        aptitude        = np.round(np.random.beta(5, 3, n) * 100, 1)
        comm            = np.round(np.random.beta(5, 3, n) * 10, 2)
        internships     = np.random.poisson(0.8, n).clip(0, 4)
        backlogs        = np.random.poisson(0.4, n).clip(0, 5)
        certs           = np.random.poisson(1.5, n).clip(0, 8)

        logit = (0.5*(cgpa-6) + 0.03*(aptitude-60) + 0.15*(comm-6)
                 + 0.4*internships - 0.4*backlogs + np.random.normal(0, 0.8, n))
        prob  = 1 / (1 + np.exp(-logit))
        placed = (np.random.uniform(0, 1, n) < prob).astype(int)

        for i in range(n):
            rows.append({
                "student_id":                  f"SYN_{course}_{i:04d}",
                "age":                         np.random.randint(20, 25),
                "gender":                      np.random.choice(["M", "F"]),
                "course":                      course,
                "cgpa":                        cgpa[i],
                "backlogs":                    int(backlogs[i]),
                "communication_score":         comm[i],
                "aptitude_score":              aptitude[i],
                "state":                       np.random.choice(["Karnataka", "Maharashtra", "Tamil Nadu", "Delhi"]),
                "family_income_lpa":           round(np.random.lognormal(1.6, 0.5), 2),
                "loan_required":               bool(np.random.choice([True, False])),
                "linkedin_connections":        int(np.random.randint(50, 400)),
                "github_repos":                int(np.random.randint(0, 15)),
                "github_commits_30d":          int(np.random.randint(0, 100)),
                "certifications_count":        int(certs[i]),
                "hackathon_participations":    int(np.random.randint(0, 4)),
                "internship_count":            int(internships[i]),
                "institute_avg_placement_rate":meta["institute_avg_placement_rate"],
                "institute_avg_salary":        meta["institute_avg_salary"],
                "institute_id":                "INST003",
                "ssc_marks":                   round(float(np.random.uniform(55, 90)), 1),
                "hsc_marks":                   round(float(np.random.uniform(55, 90)), 1),
                "is_placed":                   int(placed[i]),
                "source":                      "synthetic",
            })

    synth = pd.DataFrame(rows)
    combined = pd.concat([df, synth], ignore_index=True)
    logger.info(f"Augmented with {len(synth)} synthetic rows for underrepresented courses")
    return combined


if __name__ == "__main__":
    df = load_combined_dataset()
    print(df.head())
    print(df.dtypes)
    print(f"\nShape: {df.shape}")
    print(f"Placement rate: {df['is_placed'].mean():.2%}")
