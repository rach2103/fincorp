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

CREATE TABLE IF NOT EXISTS placement_suggestions (
    id SERIAL PRIMARY KEY,
    course TEXT NOT NULL,
    cgpa_min NUMERIC NOT NULL,
    cgpa_max NUMERIC NOT NULL,
    skill TEXT NOT NULL,
    exercise TEXT NOT NULL,
    priority INTEGER DEFAULT 1,  -- 1=high, 2=medium, 3=low
    category TEXT NOT NULL        -- 'technical', 'soft_skill', 'activity'
);

-- Seed suggestions per course and CGPA band
INSERT INTO placement_suggestions (course, cgpa_min, cgpa_max, skill, exercise, priority, category) VALUES
-- CSE high achievers
('CSE', 8.0, 10.0, 'System Design',         'Solve 2 system design problems/week on Educative.io',         1, 'technical'),
('CSE', 8.0, 10.0, 'DSA - Advanced',         'Practice Hard LeetCode problems daily (trees, graphs, DP)',    1, 'technical'),
('CSE', 8.0, 10.0, 'Cloud Certifications',   'Pursue AWS Solutions Architect or GCP Associate cert',        1, 'technical'),
('CSE', 8.0, 10.0, 'Open Source',            'Contribute to 1 GitHub open source project per month',        2, 'activity'),
-- CSE mid
('CSE', 6.0, 8.0,  'DSA - Intermediate',     'Solve 3 Medium LeetCode problems daily',                      1, 'technical'),
('CSE', 6.0, 8.0,  'Web Development',        'Build and deploy a full-stack project (React + Node/Django)',  1, 'technical'),
('CSE', 6.0, 8.0,  'Communication Skills',   'Join Toastmasters or practice mock GDs weekly',               2, 'soft_skill'),
('CSE', 6.0, 8.0,  'Aptitude',               'Solve 20 IndiaBix aptitude questions daily',                  2, 'technical'),
-- CSE low
('CSE', 0.0, 6.0,  'DSA - Basics',           'Complete NeetCode 150 roadmap from scratch',                  1, 'technical'),
('CSE', 0.0, 6.0,  'Backlog Clearance',      'Dedicate 2 hrs/day to clear pending backlogs first',          1, 'activity'),
('CSE', 0.0, 6.0,  'Resume Building',        'Build a project-based resume with at least 2 live projects',  2, 'activity'),
-- DS high
('DS',  8.0, 10.0, 'ML Engineering',         'Build end-to-end ML pipelines using MLflow + FastAPI',        1, 'technical'),
('DS',  8.0, 10.0, 'Kaggle Competitions',    'Participate in 1 Kaggle competition per month',               1, 'activity'),
('DS',  8.0, 10.0, 'Deep Learning',          'Complete fast.ai or deeplearning.ai specialization',          1, 'technical'),
-- DS mid
('DS',  6.0, 8.0,  'Python & Pandas',        'Complete 30 days of Pandas challenges on Kaggle',             1, 'technical'),
('DS',  6.0, 8.0,  'Statistics',             'Revise hypothesis testing, distributions, regression daily',  1, 'technical'),
('DS',  6.0, 8.0,  'SQL',                    'Solve 50 SQL problems on Mode Analytics or LeetCode',         2, 'technical'),
-- MBA high
('MBA', 8.0, 10.0, 'Case Interviews',        'Practice 3 McKinsey/BCG case studies per week',               1, 'technical'),
('MBA', 8.0, 10.0, 'Financial Modelling',    'Build DCF and LBO models in Excel/Google Sheets',             1, 'technical'),
('MBA', 8.0, 10.0, 'Leadership',             'Lead a college club or organise an industry event',           2, 'activity'),
-- MBA mid
('MBA', 6.0, 8.0,  'Group Discussion',       'Practice GD topics daily — economy, policy, business news',   1, 'soft_skill'),
('MBA', 6.0, 8.0,  'Excel & PowerPoint',     'Complete Excel Skills for Business on Coursera',              1, 'technical'),
('MBA', 6.0, 8.0,  'Networking',             'Connect with 5 alumni on LinkedIn per week',                  2, 'soft_skill'),
-- ECE high
('ECE', 8.0, 10.0, 'VLSI Design',            'Practice Verilog/VHDL on Xilinx Vivado with mini projects',   1, 'technical'),
('ECE', 8.0, 10.0, 'Embedded C',             'Build 3 Arduino/Raspberry Pi projects and publish on GitHub', 1, 'technical'),
-- ECE mid
('ECE', 6.0, 8.0,  'Core Electronics',       'Revise op-amps, microcontrollers, communication protocols',   1, 'technical'),
('ECE', 6.0, 8.0,  'Aptitude & Reasoning',   'Solve 20 quantitative aptitude questions daily',              2, 'technical'),
-- MECHANICAL high
('MECHANICAL', 8.0, 10.0, 'CAD/CAM',         'Master SolidWorks or CATIA with 2 design projects',           1, 'technical'),
('MECHANICAL', 8.0, 10.0, 'Six Sigma',       'Pursue Six Sigma Green Belt certification',                   1, 'technical'),
-- MECHANICAL mid
('MECHANICAL', 6.0, 8.0,  'AutoCAD',         'Complete AutoCAD 2D/3D certification course',                 1, 'technical'),
('MECHANICAL', 6.0, 8.0,  'Core Subjects',   'Revise Thermodynamics, FM, SOM daily for 1 hr',               1, 'technical'),
-- CIVIL high
('CIVIL', 8.0, 10.0, 'STAAD Pro / ETABS',   'Model and analyse 2 structural projects using STAAD Pro',     1, 'technical'),
('CIVIL', 8.0, 10.0, 'Project Management',  'Pursue PMP or PRINCE2 Foundation certification',              1, 'technical'),
-- CIVIL mid
('CIVIL', 6.0, 8.0,  'AutoCAD Civil 3D',    'Complete AutoCAD Civil 3D certification',                     1, 'technical'),
('CIVIL', 6.0, 8.0,  'Estimation & Costing','Practice quantity surveying problems daily',                   2, 'technical'),
-- Universal soft skills (all courses, all bands)
('ALL',  0.0, 10.0, 'Mock Interviews',       'Do 2 mock interviews per week on Pramp or Interviewing.io',   1, 'soft_skill'),
('ALL',  0.0, 10.0, 'LinkedIn Profile',      'Optimise LinkedIn with projects, skills, and recommendations', 1, 'activity'),
('ALL',  0.0, 10.0, 'Communication',         'Read 1 business article daily and summarise it in writing',   2, 'soft_skill'),
('ALL',  0.0, 10.0, 'Aptitude Practice',     'Solve 15 aptitude + 5 logical reasoning questions daily',     2, 'technical');
