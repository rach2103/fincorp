"""
data_sources/connectors.py
Connectors for all data sources: Industry, Institute, Real-time Signals, Student Data
"""
import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
from loguru import logger
from dotenv import load_dotenv

load_dotenv()


class IndustryDataConnector:
    """Fetches industry-level hiring trends, salary benchmarks, sector growth data."""

    def __init__(self):
        self.api_url = os.getenv("JOB_MARKET_API_URL", "")
        self.api_key = os.getenv("JOB_MARKET_API_KEY", "")

    def fetch_sector_trends(self, sectors: list[str], months_back: int = 6) -> pd.DataFrame:
        """Fetch hiring trends per sector for the past N months."""
        logger.info(f"Fetching sector trends for {len(sectors)} sectors")
        # In production: call real API. Here we generate synthetic data.
        records = []
        for sector in sectors:
            for month_offset in range(months_back):
                date = datetime.now() - timedelta(days=30 * month_offset)
                records.append({
                    "sector": sector,
                    "month": date.strftime("%Y-%m"),
                    "job_openings": int(np.random.poisson(200 + hash(sector) % 100)),
                    "avg_salary_inr": int(np.random.normal(700000, 150000)),
                    "yoy_growth_pct": round(np.random.normal(8, 4), 2),
                    "demand_score": round(np.random.uniform(0.3, 1.0), 3),
                })
        df = pd.DataFrame(records)
        logger.info(f"Fetched {len(df)} industry records")
        return df

    def fetch_salary_benchmarks(self, role: str, location: str) -> dict:
        """Get salary percentiles for a role/location."""
        base = {"Software Engineer": 900000, "Data Analyst": 700000, "Marketing": 500000}.get(role, 600000)
        return {
            "role": role,
            "location": location,
            "p25": int(base * 0.75),
            "p50": int(base),
            "p75": int(base * 1.30),
            "p90": int(base * 1.70),
        }


class InstituteDataConnector:
    """Fetches institutional data: historical placements, course offerings, rankings."""

    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.getenv("DATABASE_URL")

    def fetch_historical_placements(self, institute_id: str, years: int = 5) -> pd.DataFrame:
        """Fetch historical placement rates and salary data."""
        logger.info(f"Fetching historical placements for institute {institute_id}")
        np.random.seed(int(institute_id[-2:]) if institute_id[-2:].isdigit() else 42)
        records = []
        for year in range(2019, 2019 + years):
            records.append({
                "institute_id": institute_id,
                "year": year,
                "total_students": np.random.randint(200, 600),
                "placed_students": np.random.randint(150, 550),
                "avg_salary_inr": int(np.random.normal(650000, 100000)),
                "top_recruiters": ["TCS", "Infosys", "Wipro", "Amazon", "Google"][:np.random.randint(2, 6)],
                "placement_rate_pct": round(np.random.uniform(65, 95), 1),
            })
        return pd.DataFrame(records)

    def fetch_course_catalog(self, institute_id: str) -> pd.DataFrame:
        """Fetch available courses and their placement correlations."""
        courses = [
            {"course_id": "CSE", "course_name": "Computer Science Engineering", "duration_years": 4},
            {"course_id": "MBA", "course_name": "Master of Business Administration", "duration_years": 2},
            {"course_id": "ECE", "course_name": "Electronics & Communication", "duration_years": 4},
            {"course_id": "DS", "course_name": "Data Science", "duration_years": 2},
        ]
        df = pd.DataFrame(courses)
        df["institute_id"] = institute_id
        return df


class RealTimeSignalsConnector:
    """Fetches real-time signals: LinkedIn activity, GitHub commits, competitive exam scores."""

    def fetch_student_activity(self, student_ids: list[str]) -> pd.DataFrame:
        """Fetch real-time activity signals for students."""
        logger.info(f"Fetching real-time signals for {len(student_ids)} students")
        records = []
        for sid in student_ids:
            np.random.seed(hash(sid) % 1000)
            records.append({
                "student_id": sid,
                "linkedin_connections": np.random.randint(50, 500),
                "github_repos": np.random.randint(0, 30),
                "github_commits_30d": np.random.randint(0, 200),
                "certifications_count": np.random.randint(0, 10),
                "hackathon_participations": np.random.randint(0, 5),
                "internship_count": np.random.randint(0, 3),
                "last_updated": datetime.now().isoformat(),
            })
        return pd.DataFrame(records)


class StudentDataConnector:
    """Fetches core student academic and demographic data."""

    def fetch_student_profiles(self, student_ids: Optional[list[str]] = None, n: int = 1000) -> pd.DataFrame:
        """Fetch student profiles."""
        logger.info(f"Fetching student profiles (n={n})")
        np.random.seed(42)
        ids = student_ids or [f"STU{i:05d}" for i in range(n)]
        n = len(ids)

        courses = ["CSE", "MBA", "ECE", "DS", "Mechanical", "Civil"]
        genders = ["M", "F", "Other"]

        df = pd.DataFrame({
            "student_id": ids,
            "age": np.random.randint(18, 28, n),
            "gender": np.random.choice(genders, n, p=[0.55, 0.40, 0.05]),
            "course": np.random.choice(courses, n),
            "cgpa": np.round(np.random.beta(7, 3, n) * 10, 2).clip(4, 10),
            "backlogs": np.random.poisson(0.5, n),
            "communication_score": np.round(np.random.beta(5, 3, n) * 10, 2),
            "aptitude_score": np.round(np.random.beta(5, 3, n) * 100, 1),
            "institute_id": np.random.choice(["INST001", "INST002", "INST003"], n),
            "state": np.random.choice(["Karnataka", "Maharashtra", "Tamil Nadu", "Delhi", "UP"], n),
            "family_income_lpa": np.round(np.random.lognormal(12, 0.8, n) / 100000, 2),
            "loan_required": np.random.choice([True, False], n, p=[0.4, 0.6]),
        })
        return df
