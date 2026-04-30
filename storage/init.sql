CREATE DATABASE airflow_db;
CREATE DATABASE mlflow_db;

\connect placement_db;

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS features;

CREATE TABLE IF NOT EXISTS raw_student_profiles (
    student_id TEXT,
    age INTEGER,
    gender TEXT,
    course TEXT,
    cgpa NUMERIC,
    backlogs INTEGER,
    communication_score NUMERIC,
    aptitude_score NUMERIC,
    institute_id TEXT,
    state TEXT,
    family_income_lpa NUMERIC,
    loan_required BOOLEAN,
    ingested_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_industry_trends (
    sector TEXT,
    month TEXT,
    job_openings INTEGER,
    avg_salary_inr INTEGER,
    yoy_growth_pct NUMERIC,
    demand_score NUMERIC,
    ingested_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_institute_placements (
    institute_id TEXT,
    year INTEGER,
    total_students INTEGER,
    placed_students INTEGER,
    avg_salary_inr INTEGER,
    top_recruiters TEXT,
    placement_rate_pct NUMERIC,
    ingested_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_realtime_signals (
    student_id TEXT,
    linkedin_connections INTEGER,
    github_repos INTEGER,
    github_commits_30d INTEGER,
    certifications_count INTEGER,
    hackathon_participations INTEGER,
    internship_count INTEGER,
    last_updated TIMESTAMP,
    ingested_at TIMESTAMP DEFAULT NOW()
);
