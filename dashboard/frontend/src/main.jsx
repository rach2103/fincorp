import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  GraduationCap,
  LineChart,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || "http://localhost:8000";

const initialProfile = {
  student_id: "STU-DEMO",
  age: 21,
  gender: "F",
  course: "CSE",
  cgpa: 8.1,
  backlogs: 0,
  communication_score: 7.6,
  aptitude_score: 78,
  state: "Karnataka",
  family_income_lpa: 6.5,
  loan_required: false,
  linkedin_connections: 220,
  github_repos: 8,
  github_commits_30d: 45,
  certifications_count: 3,
  hackathon_participations: 1,
  internship_count: 1,
  institute_avg_placement_rate: 78,
  institute_avg_salary: 650000,
};

function fallbackPrediction(profile) {
  const logit =
    0.55 * (profile.cgpa - 6) +
    0.04 * (profile.aptitude_score - 60) +
    0.18 * (profile.communication_score - 6) +
    0.4 * profile.internship_count +
    0.12 * profile.certifications_count -
    0.45 * profile.backlogs +
    0.01 * (profile.institute_avg_placement_rate - 75);
  const placement_probability = 1 / (1 + Math.exp(-logit));
  const salary =
    profile.institute_avg_salary * (0.82 + profile.cgpa / 10) +
    profile.aptitude_score * 2200 +
    profile.internship_count * 60000;

  return {
    placement_probability,
    risk_score: 1 - placement_probability,
    predicted_salary_inr: salary,
    early_risk_alert: 1 - placement_probability >= 0.45,
    model_source: "local-preview",
    shap_explanation: {
      features: [
        { feature: "cgpa", impact: 0.11 },
        { feature: "aptitude_score", impact: 0.08 },
        { feature: "internship_count", impact: 0.06 },
        { feature: "backlogs", impact: -0.05 },
      ],
    },
    career_recommendations: [
      { sector: "Software Engineering", fit_score: 0.82 },
      { sector: "Cloud & DevOps", fit_score: 0.74 },
      { sector: "Cybersecurity", fit_score: 0.66 },
    ],
  };
}

function App() {
  const [profile, setProfile] = useState(initialProfile);
  const [result, setResult] = useState(fallbackPrediction(initialProfile));
  const [role, setRole] = useState("Institute Staff");
  const [status, setStatus] = useState("Ready");

  const metrics = useMemo(
    () => [
      {
        label: "Placement Probability",
        value: `${Math.round(result.placement_probability * 100)}%`,
        icon: BarChart3,
      },
      {
        label: "Risk Score",
        value: `${Math.round(result.risk_score * 100)}%`,
        icon: AlertTriangle,
      },
      {
        label: "Salary Prediction",
        value: `₹${Math.round(result.predicted_salary_inr).toLocaleString("en-IN")}`,
        icon: Banknote,
      },
    ],
    [result],
  );

  async function runPrediction(event) {
    event.preventDefault();
    setStatus("Scoring");
    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("API unavailable");
      setResult(await response.json());
      setStatus("Live API");
    } catch {
      setResult(fallbackPrediction(profile));
      setStatus("Local preview");
    }
  }

  function updateField(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <GraduationCap size={28} />
          <div>
            <strong>Placement IQ</strong>
            <span>Model operations dashboard</span>
          </div>
        </div>
        <nav>
          {["Data Scientist", "Institute Staff", "Student User", "Loan Officer"].map((item) => (
            <button
              key={item}
              className={role === item ? "active" : ""}
              onClick={() => setRole(item)}
              type="button"
            >
              <UserRoundCog size={18} />
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{role}</p>
            <h1>Student placement intelligence</h1>
          </div>
          <div className="status">
            <ShieldCheck size={18} />
            {status}
          </div>
        </header>

        <section className="metrics">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article className="metric-card" key={metric.label}>
                <Icon size={22} />
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            );
          })}
        </section>

        <section className="content-grid">
          <form className="panel controls" onSubmit={runPrediction}>
            <div className="panel-heading">
              <SlidersHorizontal size={20} />
              <h2>Student signals</h2>
            </div>
            <label>
              Course
              <select value={profile.course} onChange={(event) => updateField("course", event.target.value)}>
                {["CSE", "DS", "ECE", "MBA", "Mechanical", "Civil"].map((course) => (
                  <option key={course}>{course}</option>
                ))}
              </select>
            </label>
            <label>
              CGPA
              <input
                type="range"
                min="4"
                max="10"
                step="0.1"
                value={profile.cgpa}
                onChange={(event) => updateField("cgpa", Number(event.target.value))}
              />
              <b>{profile.cgpa}</b>
            </label>
            <label>
              Aptitude
              <input
                type="range"
                min="0"
                max="100"
                value={profile.aptitude_score}
                onChange={(event) => updateField("aptitude_score", Number(event.target.value))}
              />
              <b>{profile.aptitude_score}</b>
            </label>
            <label>
              Communication
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={profile.communication_score}
                onChange={(event) => updateField("communication_score", Number(event.target.value))}
              />
              <b>{profile.communication_score}</b>
            </label>
            <label>
              Backlogs
              <input
                type="number"
                min="0"
                value={profile.backlogs}
                onChange={(event) => updateField("backlogs", Number(event.target.value))}
              />
            </label>
            <label>
              Internships
              <input
                type="number"
                min="0"
                value={profile.internship_count}
                onChange={(event) => updateField("internship_count", Number(event.target.value))}
              />
            </label>
            <button className="primary" type="submit">
              <LineChart size={18} />
              Score student
            </button>
          </form>

          <section className="panel insight-panel">
            <div className="panel-heading">
              <AlertTriangle size={20} />
              <h2>Risk and explanations</h2>
            </div>
            <div className={result.early_risk_alert ? "risk high" : "risk"}>
              <strong>{result.early_risk_alert ? "Early risk alert" : "On-track profile"}</strong>
              <span>Source: {result.model_source}</span>
            </div>
            <div className="bars">
              {result.shap_explanation.features.map((feature) => (
                <div className="bar-row" key={feature.feature}>
                  <span>{feature.feature.replaceAll("_", " ")}</span>
                  <div>
                    <i style={{ width: `${Math.min(Math.abs(feature.impact) * 500, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel recommendations">
            <div className="panel-heading">
              <BriefcaseBusiness size={20} />
              <h2>Career recommendations</h2>
            </div>
            {result.career_recommendations.map((item) => (
              <article key={item.sector}>
                <span>{item.sector}</span>
                <strong>{Math.round(item.fit_score * 100)}%</strong>
              </article>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
