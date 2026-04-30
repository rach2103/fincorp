from fastapi.testclient import TestClient

from serving.api.main import app


def test_predict_returns_core_views():
    client = TestClient(app)
    response = client.post("/predict", json={"student_id": "STU001"})

    assert response.status_code == 200
    payload = response.json()
    assert 0 <= payload["placement_probability"] <= 1
    assert 0 <= payload["risk_score"] <= 1
    assert payload["predicted_salary_inr"] >= 0
    assert payload["shap_explanation"]["features"]
    assert payload["career_recommendations"]


def test_loan_assessment():
    client = TestClient(app)
    response = client.post(
        "/loan/assess",
        json={
            "predicted_salary_inr": 900000,
            "family_income_lpa": 6,
            "requested_amount_inr": 400000,
        },
    )

    assert response.status_code == 200
    assert "eligible" in response.json()
