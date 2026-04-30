"""Pydantic schemas for placement intelligence API."""

from pydantic import BaseModel, Field


class StudentProfile(BaseModel):
    student_id: str = "STU-DEMO"
    age: int = Field(default=21, ge=16, le=60)
    gender: str = "F"
    course: str = "CSE"
    cgpa: float = Field(default=8.1, ge=0, le=10)
    backlogs: int = Field(default=0, ge=0)
    communication_score: float = Field(default=7.6, ge=0, le=10)
    aptitude_score: float = Field(default=78.0, ge=0, le=100)
    state: str = "Karnataka"
    family_income_lpa: float = Field(default=6.5, ge=0)
    loan_required: bool = False
    linkedin_connections: int = Field(default=220, ge=0)
    github_repos: int = Field(default=8, ge=0)
    github_commits_30d: int = Field(default=45, ge=0)
    certifications_count: int = Field(default=3, ge=0)
    hackathon_participations: int = Field(default=1, ge=0)
    internship_count: int = Field(default=1, ge=0)
    institute_avg_placement_rate: float = Field(default=78.0, ge=0, le=100)
    institute_avg_salary: float = Field(default=650000, ge=0)


class LoanAssessmentRequest(BaseModel):
    predicted_salary_inr: float = Field(default=850000, ge=0)
    family_income_lpa: float = Field(default=6.5, ge=0)
    requested_amount_inr: float = Field(default=500000, ge=0)
