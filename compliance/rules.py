"""Country loan criteria, career guidance, and loan calculations."""

from dataclasses import dataclass


@dataclass(frozen=True)
class LoanCalculator:
    annual_interest_rate: float = 0.105
    tenure_years: int = 7

    def emi(self, principal: float) -> float:
        monthly_rate = self.annual_interest_rate / 12
        months = self.tenure_years * 12
        if principal <= 0:
            return 0.0
        return principal * monthly_rate * (1 + monthly_rate) ** months / ((1 + monthly_rate) ** months - 1)

    def affordability_ratio(self, principal: float, predicted_salary_inr: float) -> float:
        monthly_salary = predicted_salary_inr / 12
        if monthly_salary <= 0:
            return 1.0
        return self.emi(principal) / monthly_salary


@dataclass(frozen=True)
class CareerSectorGuidance:
    sector: str
    fit_score: float
    reason: str


def assess_loan_eligibility(
    predicted_salary_inr: float,
    family_income_lpa: float,
    requested_amount_inr: float,
) -> dict:
    calculator = LoanCalculator()
    ratio = calculator.affordability_ratio(requested_amount_inr, predicted_salary_inr)
    income_ok = family_income_lpa >= 2.5
    affordable = ratio <= 0.35
    eligible = income_ok and affordable
    return {
        "eligible": eligible,
        "emi_inr": round(calculator.emi(requested_amount_inr), 2),
        "affordability_ratio": round(ratio, 3),
        "criteria": {
            "minimum_family_income_lpa": 2.5,
            "maximum_emi_to_income_ratio": 0.35,
            "income_ok": income_ok,
            "affordable": affordable,
        },
    }


def recommend_career_sectors(course: str, cgpa: float, aptitude_score: float) -> list[CareerSectorGuidance]:
    course = course.upper()
    base = {
        "CSE": ["Software Engineering", "Cloud & DevOps", "Cybersecurity"],
        "DS": ["Data Science", "Analytics Consulting", "AI Engineering"],
        "ECE": ["Embedded Systems", "Telecom", "Semiconductor Design"],
        "MBA": ["Business Analytics", "Product Management", "Financial Services"],
        "MECHANICAL": ["Manufacturing", "EV Design", "Operations"],
        "CIVIL": ["Infrastructure", "Urban Planning", "Construction Tech"],
    }.get(course, ["Technology Services", "Operations", "Business Analytics"])

    academic_boost = min(max((cgpa - 6.0) / 4.0, 0), 1)
    aptitude_boost = min(max(aptitude_score / 100, 0), 1)
    combined = 0.55 * academic_boost + 0.45 * aptitude_boost

    return [
        CareerSectorGuidance(
            sector=sector,
            fit_score=round(max(0.35, combined - idx * 0.08), 3),
            reason=f"Aligned with {course} profile and current readiness signals.",
        )
        for idx, sector in enumerate(base)
    ]
