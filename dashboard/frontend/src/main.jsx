import React, { useMemo, useState } from "react";
import Login from "./Login";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle,
  GraduationCap,
  LineChart,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  XCircle,
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CAREER_SECTORS = {
  CSE: ["Software Engineering", "Cloud & DevOps", "Cybersecurity"],
  DS: ["Data Science", "Analytics Consulting", "AI Engineering"],
  ECE: ["Embedded Systems", "Telecom", "Semiconductor Design"],
  MBA: ["Business Analytics", "Product Management", "Financial Services"],
  MECHANICAL: ["Manufacturing", "EV Design", "Operations"],
  CIVIL: ["Infrastructure", "Urban Planning", "Construction Tech"],
};

// Convert placement probability (0–1) to estimated months to placement
// High probability (0.9) → ~2 months, Low probability (0.1) → ~18 months
function probabilityToMonths(prob) {
  const clamped = Math.min(Math.max(prob, 0.05), 0.99);
  // Inverse mapping: months = round(2 + (1 - prob) * 16)
  return Math.round(2 + (1 - clamped) * 16);
}

function fallbackPrediction(profile) {
  const logit =
    0.55 * (profile.cgpa - 6) +
    0.04 * (profile.aptitude_score - 60) +
    0.18 * (profile.communication_score - 6) +
    0.4 * profile.internship_count -
    0.45 * profile.backlogs +
    0.01 * (profile.institute_avg_placement_rate - 75);
  const placement_probability = 1 / (1 + Math.exp(-logit));

  // Realistic fresh-graduate salary: base 3 LPA + CGPA/aptitude/internship bonuses
  const baseSalary = 300000; // ₹3 LPA base
  const cgpaBonus = (profile.cgpa - 6) * 60000;         // up to ₹2.4L for 10 CGPA
  const aptitudeBonus = (profile.aptitude_score - 50) * 1200; // up to ₹0.6L
  const internshipBonus = profile.internship_count * 50000;   // ₹0.5L per internship
  const certBonus = profile.certifications_count * 15000;     // ₹0.15L per cert
  const backlogPenalty = profile.backlogs * 40000;            // penalty for backlogs
  const salary = Math.max(
    baseSalary + cgpaBonus + aptitudeBonus + internshipBonus + certBonus - backlogPenalty,
    200000 // floor at ₹2 LPA
  );

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
    career_recommendations: sectors.map((sector, idx) => ({
      sector,
      fit_score: Math.round(Math.max(0.35, combined - idx * 0.08) * 100) / 100,
    })),
  };
}

// ── Institute Staff: cohort table ────────────────────────────────────────────
function InstituteView() {
  const rows = MOCK_STUDENTS.map((s) => {
    const pred = fallbackPrediction(s);
    return { ...s, placement_probability: pred.placement_probability, predicted_salary: pred.predicted_salary_inr };
  });

  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <div className="panel-heading">
        <GraduationCap size={20} />
        <h2>Student cohort overview</h2>
      </div>
      <table className="cohort-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Course</th>
            <th>CGPA</th>
            <th>Internships</th>
            <th>Backlogs</th>
            <th>Placement %</th>
            <th>Predicted Salary</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.student_id}>
              <td>{s.student_id}</td>
              <td>{s.name}</td>
              <td>{s.course}</td>
              <td>{s.cgpa}</td>
              <td>{s.internship_count}</td>
              <td>{s.backlogs}</td>
              <td>{Math.round(s.placement_probability * 100)}%</td>
              <td>₹{Math.round(s.predicted_salary).toLocaleString("en-IN")}</td>
              <td>
                <span className={s.placement_probability < 0.55 ? "badge danger" : "badge safe"}>
                  {s.placement_probability < 0.55 ? "At Risk" : "On Track"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Loan Officer: per-student loan decision ──────────────────────────────────
function LoanOfficerView() {
  const loanStudents = MOCK_STUDENTS.filter((s) => s.loan_required);
  const [decisions, setDecisions] = useState({});
  const [selected, setSelected] = useState(loanStudents[0].student_id);

  const student = loanStudents.find((s) => s.student_id === selected);
  const pred = fallbackPrediction(student);
  const monthlySalary = pred.predicted_salary_inr / 12;
  const monthlyRate = 0.105 / 12;
  const months = 84;
  const emi = student.loan_amount > 0
    ? (student.loan_amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : 0;
  const ratio = monthlySalary > 0 ? emi / monthlySalary : 1;
  const autoEligible = student.family_income_lpa >= 2.5 && ratio <= 0.35;

  function decide(id, decision) {
    setDecisions((prev) => ({ ...prev, [id]: decision }));
  }

  return (
    <div className="loan-layout">
      <div className="panel loan-list">
        <div className="panel-heading"><Banknote size={20} /><h2>Loan applications</h2></div>
        {loanStudents.map((s) => (
          <button
            key={s.student_id}
            className={`loan-item ${selected === s.student_id ? "active" : ""}`}
            onClick={() => setSelected(s.student_id)}
            type="button"
          >
            <span>{s.name}</span>
            <span className="loan-course">{s.course}</span>
            {decisions[s.student_id] && (
              <span className={`badge ${decisions[s.student_id] === "approved" ? "safe" : "danger"}`}>
                {decisions[s.student_id] === "approved" ? "Approved" : "Rejected"}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="panel loan-detail">
        <div className="panel-heading"><UserRoundCog size={20} /><h2>Student profile — {student.name}</h2></div>

        <div className="profile-grid">
          <div className="profile-field"><span>Student ID</span><strong>{student.student_id}</strong></div>
          <div className="profile-field"><span>Course</span><strong>{student.course}</strong></div>
          <div className="profile-field"><span>CGPA</span><strong>{student.cgpa}</strong></div>
          <div className="profile-field"><span>Backlogs</span><strong>{student.backlogs}</strong></div>
          <div className="profile-field"><span>Internships</span><strong>{student.internship_count}</strong></div>
          <div className="profile-field"><span>Family Income</span><strong>₹{student.family_income_lpa} LPA</strong></div>
          <div className="profile-field"><span>Loan Requested</span><strong>₹{student.loan_amount.toLocaleString("en-IN")}</strong></div>
          <div className="profile-field"><span>Predicted Salary</span><strong>₹{Math.round(pred.predicted_salary_inr).toLocaleString("en-IN")} / yr</strong></div>
          <div className="profile-field"><span>Placement Probability</span><strong>{Math.round(pred.placement_probability * 100)}%</strong></div>
          <div className="profile-field"><span>Monthly EMI</span><strong>₹{Math.round(emi).toLocaleString("en-IN")}</strong></div>
          <div className="profile-field"><span>EMI / Salary Ratio</span><strong>{(ratio * 100).toFixed(1)}%</strong></div>
          <div className="profile-field">
            <span>Auto Assessment</span>
            <strong className={autoEligible ? "text-safe" : "text-danger"}>
              {autoEligible ? "Eligible" : "Not Eligible"}
            </strong>
          </div>
        </div>

  const metrics = useMemo(
    () => [
      {
        label: "Months to Placement",
        value: `${probabilityToMonths(result.placement_probability)} mo`,
        icon: BarChart3,
      },
      {
        label: "Risk Score",
        value: `${Math.round(result.risk_score * 100)}%`,
        icon: AlertTriangle,
      },
      {
        label: "Salary Prediction",
        value: `₹${Math.round(result.predicted_salary_inr / 100000).toLocaleString("en-IN")} LPA`,
        icon: Banknote,
      },
        {decisions[student.student_id] ? (
          <div className={`decision-banner ${decisions[student.student_id] === "approved" ? "safe" : "danger"}`}>
            {decisions[student.student_id] === "approved"
              ? "✓ Loan Approved"
              : "✗ Loan Rejected"}
          </div>
        ) : (
          <div className="decision-actions">
            <button className="btn-approve" onClick={() => decide(student.student_id, "approved")} type="button">
              <CheckCircle size={18} /> Approve Loan
            </button>
            <button className="btn-reject" onClick={() => decide(student.student_id, "rejected")} type="button">
              <XCircle size={18} /> Reject Loan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loan Calculator (Student only) ─────────────────────────────────────────
function LoanCalculator({ predictedSalary, careerRecommendations }) {
  const LOAN_OPTIONS = {
    India: [
      { label: "SBI Scholar Loan",           rate: 0.0815 },
      { label: "Bank of Baroda Baroda Vidya", rate: 0.0970 },
      { label: "HDFC Credila",               rate: 0.1050 },
      { label: "Axis Bank",                  rate: 0.1150 },
    ],
    USA: [
      { label: "Federal Stafford Loan", rate: 0.0653 },
      { label: "Sallie Mae Private",    rate: 0.1199 },
      { label: "College Ave",           rate: 0.1399 },
    ],
    UK: [
      { label: "UK Student Finance (Govt)", rate: 0.0790 },
      { label: "HSBC UK Education",         rate: 0.0950 },
    ],
    Canada: [
      { label: "Canada Student Loan (Govt)", rate: 0.0705 },
      { label: "TD Bank Education",          rate: 0.0925 },
    ],
    Australia: [
      { label: "HECS-HELP (Govt)",   rate: 0.0390 },
      { label: "ANZ Education Loan", rate: 0.0949 },
    ],
    Germany: [
      { label: "KfW Student Loan", rate: 0.0629 },
      { label: "Deutsche Bank",    rate: 0.0850 },
    ],
  };

  const [destination, setDestination] = useState("India");
  const [loanAmount,  setLoanAmount]  = useState(300000);
  const [rateIndex,   setRateIndex]   = useState(0);

  const rates = LOAN_OPTIONS[destination];
  const safeIndex = Math.min(rateIndex, rates.length - 1);
  const { rate, label } = rates[safeIndex];
  const monthlyRate   = rate / 12;
  const monthlySalary = predictedSalary / 12;
  const maxEmiAmount  = monthlySalary * 0.40;

  function emi(months) {
    if (loanAmount <= 0 || monthlyRate === 0) return loanAmount / months;
    return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
           (Math.pow(1 + monthlyRate, months) - 1);
  }

  const tenureOptions  = [12, 24, 36, 48, 60, 84, 120, 150];
  const recommended    = tenureOptions.find((m) => emi(m) <= maxEmiAmount) || 150;
  const recommendedEmi = emi(recommended);
  const totalPayable   = recommendedEmi * recommended;
  const totalInterest  = totalPayable - loanAmount;
  const bestCareer     = careerRecommendations[0];

  return (
    <section className="panel loan-calc">
      <div className="panel-heading"><Banknote size={20} /><h2>Loan calculator</h2></div>

      <div className="loan-calc-inputs">
        <label>
          Study destination
          <select value={destination} onChange={(e) => { setDestination(e.target.value); setRateIndex(0); }}>
            {Object.keys(LOAN_OPTIONS).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <label>
          Lender / scheme
          <select value={safeIndex} onChange={(e) => setRateIndex(Number(e.target.value))}>
            {rates.map((r, i) => (
              <option key={i} value={i}>{r.label} — {(r.rate * 100).toFixed(2)}%</option>
            ))}
          </select>
        </label>

        <label style={{ gridColumn: "span 2" }}>
          Loan amount (₹)
          <input
            type="range" min="50000" max="2000000" step="50000"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
          />
          <b>₹{loanAmount.toLocaleString("en-IN")}</b>
        </label>
      </div>

      <div className="loan-calc-results">
        <div className="calc-card">
          <span>Monthly EMI</span>
          <strong>₹{Math.round(recommendedEmi).toLocaleString("en-IN")}</strong>
        </div>
        <div className="calc-card">
          <span>Repayment period</span>
          <strong>{recommended} months ({(recommended / 12).toFixed(1)} yrs)</strong>
        </div>
        <div className="calc-card">
          <span>Interest rate</span>
          <strong>{(rate * 100).toFixed(2)}% p.a.</strong>
        </div>
        <div className="calc-card">
          <span>Total payable</span>
          <strong>₹{Math.round(totalPayable).toLocaleString("en-IN")}</strong>
        </div>
        <div className="calc-card">
          <span>Total interest</span>
          <strong>₹{Math.round(totalInterest).toLocaleString("en-IN")}</strong>
        </div>
        <div className="calc-card highlight">
          <span>Best career path to repay faster</span>
          <strong>{bestCareer?.sector} — {Math.round((bestCareer?.fit_score || 0) * 100)}% fit</strong>
        </div>
      </div>

      <div className="loan-calc-note">
        Based on predicted salary of ₹{Math.round(predictedSalary).toLocaleString("en-IN")} / yr.
        EMI capped at 40% of monthly income (₹{Math.round(maxEmiAmount).toLocaleString("en-IN")}).
        Rates sourced from {destination} lenders.
      </div>
    </section>
  );
}

// ── Data Scientist / Student: existing scoring view ──────────────────────────
function ScoringView({ role }) {
  const initial = MOCK_STUDENTS[0];
  const [profile, setProfile] = useState(initial);
  const [result, setResult] = useState(fallbackPrediction(initial));
  const [status, setStatus] = useState("Ready");

  async function runPrediction(event) {
    event.preventDefault();
    setStatus("Scoring");
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
      setStatus("Live API");
    } catch {
      setResult(fallbackPrediction(profile));
      setStatus("Local preview");
    }
  }

  function updateField(field, value) {
    setProfile((cur) => {
      const updated = { ...cur, [field]: value };
      setResult(fallbackPrediction(updated));
      return updated;
    });
  }

  return (
    <>
      <section className="metrics">
        {[
          { label: "Placement Probability", value: `${Math.round(result.placement_probability * 100)}%`, icon: BarChart3 },
          { label: "Risk Score", value: `${Math.round(result.risk_score * 100)}%`, icon: AlertTriangle },
          { label: "Salary Prediction", value: `₹${Math.round(result.predicted_salary_inr).toLocaleString("en-IN")}`, icon: Banknote },
        ].map(({ label, value, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <Icon size={22} /><span>{label}</span><strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <form className="panel controls" onSubmit={runPrediction}>
          <div className="panel-heading"><SlidersHorizontal size={20} /><h2>Student signals</h2></div>
          <label>Course
            <select value={profile.course} onChange={(e) => updateField("course", e.target.value)}>
              {["CSE", "DS", "ECE", "MBA", "Mechanical", "Civil"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>CGPA
            <input type="range" min="4" max="10" step="0.1" value={profile.cgpa} onChange={(e) => updateField("cgpa", Number(e.target.value))} />
            <b>{profile.cgpa}</b>
          </label>
          <label>Aptitude
            <input type="range" min="0" max="100" value={profile.aptitude_score} onChange={(e) => updateField("aptitude_score", Number(e.target.value))} />
            <b>{profile.aptitude_score}</b>
          </label>
          <label>Communication
            <input type="range" min="0" max="10" step="0.1" value={profile.communication_score} onChange={(e) => updateField("communication_score", Number(e.target.value))} />
            <b>{profile.communication_score}</b>
          </label>
          <label>Backlogs
            <input type="number" min="0" value={profile.backlogs} onChange={(e) => updateField("backlogs", Number(e.target.value))} />
          </label>
          <label>Internships
            <input type="number" min="0" value={profile.internship_count} onChange={(e) => updateField("internship_count", Number(e.target.value))} />
          </label>
          <button className="primary" type="submit"><LineChart size={18} />Score student</button>
          <div className="status-inline"><ShieldCheck size={14} />{status}</div>
        </form>

        <section className="panel insight-panel">
          <div className="panel-heading"><AlertTriangle size={20} /><h2>Risk and explanations</h2></div>
          <div className={result.early_risk_alert ? "risk high" : "risk"}>
            <strong>{result.early_risk_alert ? "Early risk alert" : "On-track profile"}</strong>
            <span>Source: {result.model_source}</span>
          </div>
          <div className="bars">
            {result.shap_explanation.features.map((f) => (
              <div className="bar-row" key={f.feature}>
                <span>{f.feature.replaceAll("_", " ")}</span>
                <div><i style={{ width: `${Math.min(Math.abs(f.impact) * 500, 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel recommendations">
          <div className="panel-heading"><BriefcaseBusiness size={20} /><h2>Career recommendations</h2></div>
          {result.career_recommendations.map((item) => (
            <article key={item.sector}>
              <span>{item.sector}</span>
              <strong>{Math.round(item.fit_score * 100)}%</strong>
            </article>
          ))}
        </section>
      </section>

      {role === "Student User" && (
        <LoanCalculator
          predictedSalary={result.predicted_salary_inr}
          careerRecommendations={result.career_recommendations}
        />
      )}
    </>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────
function App() {
  const [role, setRole] = useState(null);

  if (!role) {
    return <Login onLogin={(assignedRole) => setRole(assignedRole)} />;
  }

  const roleContent = {
    "Institute Staff": <InstituteView />,
    "Loan Officer": <LoanOfficerView />,
    "Data Scientist": <ScoringView role="Data Scientist" />,
    "Student User": <ScoringView role="Student User" />,
  };

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
          <button className="active" type="button">
            <UserRoundCog size={18} />{role}
          </button>
        </nav>
        <button className="logout-btn" type="button" onClick={() => setRole(null)}>
          Sign out
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{role}</p>
            <h1>Student placement intelligence</h1>
          </div>
        </header>
        {roleContent[role]}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
