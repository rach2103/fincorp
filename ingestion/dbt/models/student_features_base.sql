-- ingestion/dbt/models/student_features_base.sql
-- Joins student, institute, and signals data into a single feature table

{{ config(materialized='table', schema='features') }}

WITH students AS (
    SELECT
        student_id,
        age,
        gender,
        course,
        cgpa,
        backlogs,
        communication_score,
        aptitude_score,
        institute_id,
        state,
        family_income_lpa,
        loan_required,
        ingested_at
    FROM {{ source('raw', 'raw_student_profiles') }}
    QUALIFY ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY ingested_at DESC) = 1
),

signals AS (
    SELECT
        student_id,
        linkedin_connections,
        github_repos,
        github_commits_30d,
        certifications_count,
        hackathon_participations,
        internship_count
    FROM {{ source('raw', 'raw_realtime_signals') }}
    QUALIFY ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY last_updated DESC) = 1
),

institute_stats AS (
    SELECT
        institute_id,
        AVG(placement_rate_pct) AS avg_placement_rate,
        AVG(avg_salary_inr) AS avg_institute_salary,
        COUNT(*) AS years_of_data
    FROM {{ source('raw', 'raw_institute_placements') }}
    GROUP BY institute_id
)

SELECT
    s.student_id,
    s.age,
    s.gender,
    s.course,
    s.cgpa,
    s.backlogs,
    s.communication_score,
    s.aptitude_score,
    s.state,
    s.family_income_lpa,
    s.loan_required,

    -- Signal features (coalesce to 0 if no signals yet)
    COALESCE(sig.linkedin_connections, 0)      AS linkedin_connections,
    COALESCE(sig.github_repos, 0)              AS github_repos,
    COALESCE(sig.github_commits_30d, 0)        AS github_commits_30d,
    COALESCE(sig.certifications_count, 0)      AS certifications_count,
    COALESCE(sig.hackathon_participations, 0)  AS hackathon_participations,
    COALESCE(sig.internship_count, 0)          AS internship_count,

    -- Institute features
    COALESCE(i.avg_placement_rate, 75.0)  AS institute_avg_placement_rate,
    COALESCE(i.avg_institute_salary, 600000) AS institute_avg_salary,

    -- Derived features
    CASE WHEN s.cgpa >= 8.0 THEN 1 ELSE 0 END              AS is_high_achiever,
    CASE WHEN s.backlogs = 0 THEN 1 ELSE 0 END              AS has_no_backlogs,
    CASE WHEN sig.internship_count >= 1 THEN 1 ELSE 0 END   AS has_internship,
    (s.cgpa * 0.4 + s.aptitude_score * 0.003 + s.communication_score * 0.06) AS composite_score,

    NOW() AS feature_computed_at

FROM students s
LEFT JOIN signals sig USING (student_id)
LEFT JOIN institute_stats i USING (institute_id)
