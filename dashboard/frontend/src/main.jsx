import React, { useState } from "react";
import Login from "./Login";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Database,
  FileText,
  GraduationCap,
  LineChart,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  Video,
  XCircle,
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CAREER_SECTORS = {
  CSE:        ["Software Engineering", "Cloud & DevOps", "Cybersecurity"],
  DS:         ["Data Science", "Analytics Consulting", "AI Engineering"],
  ECE:        ["Embedded Systems", "Telecom", "Semiconductor Design"],
  MBA:        ["Business Analytics", "Product Management", "Financial Services"],
  MECHANICAL: ["Manufacturing", "EV Design", "Operations"],
  CIVIL:      ["Infrastructure", "Urban Planning", "Construction Tech"],
};

const MOCK_STUDENTS = [
  { student_id: "STU00001", name: "Ananya Sharma", course: "CSE",        cgpa: 8.9, internship_count: 2, aptitude_score: 90, communication_score: 4.0, backlogs: 0, certifications_count: 3, institute_avg_placement_rate: 82, institute_avg_salary: 700000, loan_required: true,  family_income_lpa: 4.2, loan_amount: 500000 },
  { student_id: "STU00002", name: "Rahul Verma",   course: "MBA",        cgpa: 7.5, internship_count: 1, aptitude_score: 75, communication_score: 4.4, backlogs: 1, certifications_count: 1, institute_avg_placement_rate: 74, institute_avg_salary: 620000, loan_required: true,  family_income_lpa: 3.1, loan_amount: 300000 },
  { student_id: "STU00003", name: "Priya Nair",    course: "DS",         cgpa: 9.1, internship_count: 3, aptitude_score: 95, communication_score: 4.8, backlogs: 0, certifications_count: 5, institute_avg_placement_rate: 88, institute_avg_salary: 750000, loan_required: false, family_income_lpa: 8.0, loan_amount: 0 },
  { student_id: "STU00004", name: "Karan Mehta",   course: "ECE",        cgpa: 6.8, internship_count: 0, aptitude_score: 60, communication_score: 3.5, backlogs: 3, certifications_count: 0, institute_avg_placement_rate: 65, institute_avg_salary: 550000, loan_required: true,  family_income_lpa: 2.8, loan_amount: 400000 },
  { student_id: "STU00005", name: "Sneha Iyer",    course: "CSE",        cgpa: 8.2, internship_count: 1, aptitude_score: 82, communication_score: 4.2, backlogs: 0, certifications_count: 2, institute_avg_placement_rate: 80, institute_avg_salary: 680000, loan_required: true,  family_income_lpa: 5.5, loan_amount: 250000 },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const emptySemesterMarks = ["", "", "", "", "", "", "", ""];

function averageSemesterMarks(semesterMarks) {
  const values = semesterMarks.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return 7;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function buildStudentProfile(form) {
  const skills = form.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
  const projects = form.projects.split("\n").map((project) => project.trim()).filter(Boolean);
  const semesterMarks = form.semesterMarks.map((mark) => Number(mark) || 0);

  return {
    student_id: form.rollNumber || `NEW-${Date.now().toString().slice(-6)}`,
    roll_number: form.rollNumber,
    name: form.name,
    college_name: form.collegeName,
    course: form.course,
    cgpa: averageSemesterMarks(form.semesterMarks),
    semester_marks: semesterMarks,
    resume_headline: form.resumeHeadline,
    skills,
    projects,
    internship_count: Number(form.internshipCount) || 0,
    aptitude_score: Number(form.aptitudeScore) || 0,
    communication_score: Number(form.communicationScore) || 0,
    backlogs: Number(form.backlogs) || 0,
    certifications_count: Number(form.certificationsCount) || 0,
    institute_avg_placement_rate: Number(form.institutePlacementRate) || 75,
    institute_avg_salary: 650000,
    loan_required: Number(form.loanAmount) > 0,
    family_income_lpa: Number(form.familyIncome) || 0,
    loan_amount: Number(form.loanAmount) || 0,
    documents: {
      resume: form.resumeFileName,
      transcript: form.transcriptFileName,
    },
  };
}

function riskSummary(result) {
  const riskPercent = Math.round(result.risk_score * 100);

  if (result.risk_score >= 0.6) return `High risk profile (${riskPercent}% risk)`;
  if (result.risk_score >= 0.45) return `Early risk alert (${riskPercent}% risk)`;
  if (result.risk_score >= 0.25) return `Watchlist profile (${riskPercent}% risk)`;
  return `On-track profile (${riskPercent}% risk)`;
}

function explainSignals(profile) {
  const impacts = [
    { feature: "cgpa", impact: clamp((profile.cgpa - 6) / 4, -1, 1) * 0.16 },
    { feature: "aptitude_score", impact: clamp((profile.aptitude_score - 60) / 40, -1, 1) * 0.14 },
    { feature: "communication_score", impact: clamp((profile.communication_score - 6) / 4, -1, 1) * 0.1 },
    { feature: "internship_count", impact: clamp(profile.internship_count / 4, 0, 1) * 0.12 },
    { feature: "backlogs", impact: -clamp(profile.backlogs / 5, 0, 1) * 0.16 },
    { feature: "institute_avg_placement_rate", impact: clamp((profile.institute_avg_placement_rate - 75) / 25, -1, 1) * 0.08 },
  ];

  return impacts
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .map((item) => ({ ...item, impact: Math.round(item.impact * 100) / 100 }));
}

function fallbackPrediction(profile) {
  const logit =
    0.55 * (profile.cgpa - 6) +
    0.04 * (profile.aptitude_score - 60) +
    0.18 * (profile.communication_score - 6) +
    0.4  * profile.internship_count -
    0.45 * profile.backlogs +
    0.01 * (profile.institute_avg_placement_rate - 75);
  const placement_probability = 1 / (1 + Math.exp(-logit));

  const baseSalary      = 300000;
  const cgpaBonus       = (profile.cgpa - 6) * 60000;
  const aptitudeBonus   = (profile.aptitude_score - 50) * 1200;
  const internshipBonus = profile.internship_count * 50000;
  const certBonus       = (profile.certifications_count || 0) * 15000;
  const backlogPenalty  = profile.backlogs * 40000;
  const salary = Math.max(baseSalary + cgpaBonus + aptitudeBonus + internshipBonus + certBonus - backlogPenalty, 200000);

  const academicBoost = Math.min(Math.max((profile.cgpa - 6.0) / 4.0, 0), 1);
  const aptitudeBoost = Math.min(Math.max(profile.aptitude_score / 100, 0), 1);
  const combined = 0.55 * academicBoost + 0.45 * aptitudeBoost;
  const sectors = CAREER_SECTORS[profile.course.toUpperCase()] || ["Technology Services", "Operations", "Business Analytics"];

  return {
    placement_probability,
    risk_score: 1 - placement_probability,
    predicted_salary_inr: salary,
    early_risk_alert: 1 - placement_probability >= 0.45,
    model_source: "local-preview",
    shap_explanation: {
      features: explainSignals(profile),
    },
    career_recommendations: sectors.map((sector, idx) => ({
      sector,
      fit_score: Math.round(Math.max(0.35, combined - idx * 0.08) * 100) / 100,
    })),
  };
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isFutureMeeting(meeting) {
  return meeting?.status === "scheduled" && meeting.meetingAt && new Date(meeting.meetingAt).getTime() > Date.now();
}

function meetingLink(platform, meetingId) {
  return platform === "Google Meet"
    ? `https://meet.google.com/${meetingId}`
    : `https://zoom.us/j/${meetingId}`;
}

// ── Institute Staff: cohort table ────────────────────────────────────────────
function InstituteView({ studentProfiles = [], onReportIssue }) {
  const rows = [...studentProfiles, ...MOCK_STUDENTS].map((s) => {
    const pred = fallbackPrediction(s);
    return { ...s, placement_probability: pred.placement_probability, predicted_salary: pred.predicted_salary_inr };
  });

  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <div className="panel-heading">
        <GraduationCap size={20} />
        <h2>Student cohort overview</h2>
        <button
          className="secondary-action"
          type="button"
          onClick={() => onReportIssue({
            source: "Institute Staff",
            category: "Cohort data",
            title: "Review cohort placement predictions",
            detail: "Institute staff flagged that cohort data or placement predictions may need validation.",
          })}
        >
          <Send size={15} /> Report issue
        </button>
      </div>
      <table className="cohort-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Roll No.</th>
            <th>Name</th>
            <th>College</th>
            <th>Course</th>
            <th>CGPA</th>
            <th>Internships</th>
            <th>Backlogs</th>
            <th>Skills</th>
            <th>Documents</th>
            <th>Placement %</th>
            <th>Predicted Salary</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.student_id}>
              <td>{s.student_id}</td>
              <td>{s.roll_number || "—"}</td>
              <td>{s.name}</td>
              <td>{s.college_name || "—"}</td>
              <td>{s.course}</td>
              <td>{s.cgpa}</td>
              <td>{s.internship_count}</td>
              <td>{s.backlogs}</td>
              <td>{s.skills?.slice(0, 3).join(", ") || "—"}</td>
              <td>{[s.documents?.resume, s.documents?.transcript].filter(Boolean).length || "—"}</td>
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

// ── Loan Officer: per-student loan decision ───────────────────────────────────
function LoanOfficerView({ loanRequests, onDecideLoan, onRequestMeeting, onReportIssue }) {
  const loanStudents = [
    ...loanRequests.map((request) => ({ ...request.profile, request })),
    ...MOCK_STUDENTS.filter((s) => s.loan_required).map((student) => ({
      ...student,
      request: {
        id: student.student_id,
        status: "Pending",
        requestedAt: "Demo application",
        amount: student.loan_amount,
        profile: student,
      },
    })),
  ];
  const [decisions, setDecisions] = useState({});
  const [selected, setSelected]   = useState(loanStudents[0].student_id);

  const student      = loanStudents.find((s) => s.student_id === selected) || loanStudents[0];
  const activeMeeting = isFutureMeeting(student.request?.meeting) ? student.request.meeting : null;
  const pred         = fallbackPrediction(student);
  const monthlySalary = pred.predicted_salary_inr / 12;
  const monthlyRate  = 0.105 / 12;
  const months       = 84;
  const emi          = student.loan_amount > 0
    ? (student.loan_amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : 0;
  const ratio        = monthlySalary > 0 ? emi / monthlySalary : 1;
  const autoEligible = student.family_income_lpa >= 2.5 && ratio <= 0.35;

  function decide(id, decision) {
    setDecisions((prev) => ({ ...prev, [id]: decision }));
    if (student.request?.account_identifier) {
      onDecideLoan(student.request.id, decision === "approved" ? "Approved" : "Rejected");
    }
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
            {(s.request?.status !== "Pending" || decisions[s.student_id]) && (
              <span className={`badge ${(s.request?.status === "Approved" || decisions[s.student_id] === "approved") ? "safe" : "danger"}`}>
                {s.request?.status !== "Pending" ? s.request.status : decisions[s.student_id] === "approved" ? "Approved" : "Rejected"}
              </span>
            )}
            {s.request?.meeting?.status === "requested" && <span className="badge warning">Meeting requested</span>}
            {isFutureMeeting(s.request?.meeting) && <span className="badge safe">Meeting fixed</span>}
          </button>
        ))}
      </div>

      <div className="panel loan-detail">
        <div className="panel-heading"><UserRoundCog size={20} /><h2>Student profile — {student.name}</h2></div>
        <div className="profile-grid">
          <div className="profile-field"><span>Student ID</span><strong>{student.student_id}</strong></div>
          <div className="profile-field"><span>Roll Number</span><strong>{student.roll_number || student.student_id}</strong></div>
          <div className="profile-field"><span>Course</span><strong>{student.course}</strong></div>
          <div className="profile-field"><span>CGPA</span><strong>{student.cgpa}</strong></div>
          <div className="profile-field"><span>Backlogs</span><strong>{student.backlogs}</strong></div>
          <div className="profile-field"><span>Internships</span><strong>{student.internship_count}</strong></div>
          <div className="profile-field"><span>Family Income</span><strong>₹{student.family_income_lpa} LPA</strong></div>
          <div className="profile-field"><span>Loan Requested</span><strong>₹{student.loan_amount.toLocaleString("en-IN")}</strong></div>
          <div className="profile-field"><span>Application Status</span><strong>{student.request?.status || "Pending"}</strong></div>
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

        {activeMeeting && (
          <div className="meeting-card">
            <Video size={18} />
            <div>
              <strong>{activeMeeting.platform} meeting scheduled</strong>
              <span>{formatDateTime(activeMeeting.meetingAt)} · {activeMeeting.link}</span>
            </div>
          </div>
        )}

        {(decisions[student.student_id] || ["Approved", "Rejected"].includes(student.request?.status)) ? (
          <div className={`decision-banner ${(decisions[student.student_id] === "approved" || student.request?.status === "Approved") ? "safe" : "danger"}`}>
            {(decisions[student.student_id] === "approved" || student.request?.status === "Approved") ? "✓ Loan Approved" : "✗ Loan Rejected"}
          </div>
        ) : (
          <div className="decision-actions">
            <button className="btn-approve" onClick={() => decide(student.student_id, "approved")} type="button">
              <CheckCircle size={18} /> Approve Loan
            </button>
            <button className="btn-reject" onClick={() => decide(student.student_id, "rejected")} type="button">
              <XCircle size={18} /> Reject Loan
            </button>
            <button
              className="btn-report"
              onClick={() => onRequestMeeting(student.request.id)}
              type="button"
              disabled={!student.request?.account_identifier || student.request?.meeting?.status === "requested"}
            >
              <CalendarDays size={18} /> Request meeting
            </button>
            <button
              className="btn-report"
              onClick={() => onReportIssue({
                source: "Loan Officer",
                category: "Loan risk",
                title: `Validate loan assessment for ${student.name}`,
                detail: `EMI ratio is ${(ratio * 100).toFixed(1)}% and placement probability is ${Math.round(pred.placement_probability * 100)}%.`,
              })}
              type="button"
            >
              <Send size={18} /> Report issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingScheduler({ request, onScheduleMeeting }) {
  const [platform, setPlatform] = useState("Google Meet");
  const [meetingAt, setMeetingAt] = useState(() => {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    nextHour.setMinutes(0, 0, 0);
    return nextHour.toISOString().slice(0, 16);
  });

  return (
    <div className="meeting-scheduler">
      <div>
        <strong>Fix earliest meeting</strong>
        <span>Choose a time and platform for the loan discussion.</span>
      </div>
      <label>Platform
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option>Google Meet</option>
          <option>Zoom</option>
        </select>
      </label>
      <label>Date and time
        <input
          type="datetime-local"
          value={meetingAt}
          min={new Date().toISOString().slice(0, 16)}
          onChange={(e) => setMeetingAt(e.target.value)}
        />
      </label>
      <button className="primary" type="button" onClick={() => onScheduleMeeting(request.id, platform, meetingAt)}>
        <Video size={16} /> Confirm meeting
      </button>
    </div>
  );
}

// ── Loan Calculator (Student only) ───────────────────────────────────────────
function LoanCalculator({ profile, predictedSalary, careerRecommendations, loanRequest, onApplyLoan, onAcceptMeeting, onScheduleMeeting }) {
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

  const rates      = LOAN_OPTIONS[destination];
  const safeIndex  = Math.min(rateIndex, rates.length - 1);
  const { rate, label } = rates[safeIndex];
  const monthlyRate    = rate / 12;
  const monthlySalary  = predictedSalary / 12;
  const maxEmiAmount   = monthlySalary * 0.40;

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
  const activeMeeting  = isFutureMeeting(loanRequest?.meeting) ? loanRequest.meeting : null;

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

      <div className="loan-apply-panel">
        <div>
          <strong>Education loan request</strong>
          <span>{loanRequest ? `Status: ${loanRequest.status}` : "Send this profile to the loan officer for review."}</span>
        </div>
        {!loanRequest ? (
          <button className="primary" type="button" onClick={() => onApplyLoan(profile, loanAmount)}>
            <Banknote size={16} /> Avail loan
          </button>
        ) : (
          <span className={`badge ${loanRequest.status === "Approved" ? "safe" : loanRequest.status === "Rejected" ? "danger" : "warning"}`}>
            {loanRequest.status}
          </span>
        )}
      </div>

      {loanRequest?.meeting?.status === "requested" && (
        <div className="meeting-card">
          <CalendarDays size={18} />
          <div>
            <strong>Loan officer requested a meeting</strong>
            <span>Accept to choose the earliest suitable appointment.</span>
          </div>
          <button className="primary" type="button" onClick={() => onAcceptMeeting(loanRequest.id)}>
            Accept request
          </button>
        </div>
      )}

      {loanRequest?.meeting?.status === "scheduling" && (
        <MeetingScheduler request={loanRequest} onScheduleMeeting={onScheduleMeeting} />
      )}

      {activeMeeting && (
        <div className="meeting-card">
          <Video size={18} />
          <div>
            <strong>{activeMeeting.platform} meeting scheduled</strong>
            <span>{formatDateTime(activeMeeting.meetingAt)} · {activeMeeting.link}</span>
          </div>
        </div>
      )}
    </section>
  );
}

// ── AI Suggestions Panel (Student only) ─────────────────────────────────────
function AISuggestions({ profile }) {
  const SUGGESTIONS_DB = {
    CSE: {
      high: [
        { skill: "System Design",       exercise: "Solve 2 system design problems/week on Educative.io",        category: "technical" },
        { skill: "DSA - Advanced",       exercise: "Practice Hard LeetCode problems daily (trees, graphs, DP)",  category: "technical" },
        { skill: "Cloud Certifications", exercise: "Pursue AWS Solutions Architect or GCP Associate cert",       category: "technical" },
        { skill: "Open Source",          exercise: "Contribute to 1 GitHub open source project per month",       category: "activity"  },
      ],
      mid: [
        { skill: "DSA - Intermediate",   exercise: "Solve 3 Medium LeetCode problems daily",                     category: "technical" },
        { skill: "Web Development",      exercise: "Build and deploy a full-stack project (React + Node/Django)", category: "technical" },
        { skill: "Communication Skills", exercise: "Join Toastmasters or practice mock GDs weekly",              category: "soft_skill"},
        { skill: "Aptitude",             exercise: "Solve 20 IndiaBix aptitude questions daily",                 category: "technical" },
      ],
      low: [
        { skill: "DSA - Basics",         exercise: "Complete NeetCode 150 roadmap from scratch",                 category: "technical" },
        { skill: "Backlog Clearance",    exercise: "Dedicate 2 hrs/day to clear pending backlogs first",         category: "activity"  },
        { skill: "Resume Building",      exercise: "Build a project-based resume with at least 2 live projects",  category: "activity"  },
      ],
    },
    DS: {
      high: [
        { skill: "ML Engineering",      exercise: "Build end-to-end ML pipelines using MLflow + FastAPI",        category: "technical" },
        { skill: "Kaggle Competitions", exercise: "Participate in 1 Kaggle competition per month",               category: "activity"  },
        { skill: "Deep Learning",       exercise: "Complete fast.ai or deeplearning.ai specialization",          category: "technical" },
      ],
      mid: [
        { skill: "Python & Pandas",     exercise: "Complete 30 days of Pandas challenges on Kaggle",             category: "technical" },
        { skill: "Statistics",          exercise: "Revise hypothesis testing, distributions, regression daily",  category: "technical" },
        { skill: "SQL",                 exercise: "Solve 50 SQL problems on Mode Analytics or LeetCode",         category: "technical" },
      ],
      low: [
        { skill: "Python Basics",       exercise: "Complete Python for Everybody on Coursera",                   category: "technical" },
        { skill: "Math Foundations",    exercise: "Revise linear algebra and statistics from Khan Academy",      category: "technical" },
      ],
    },
    MBA: {
      high: [
        { skill: "Case Interviews",     exercise: "Practice 3 McKinsey/BCG case studies per week",               category: "technical" },
        { skill: "Financial Modelling", exercise: "Build DCF and LBO models in Excel/Google Sheets",             category: "technical" },
        { skill: "Leadership",          exercise: "Lead a college club or organise an industry event",           category: "activity"  },
      ],
      mid: [
        { skill: "Group Discussion",    exercise: "Practice GD topics daily — economy, policy, business news",  category: "soft_skill"},
        { skill: "Excel & PowerPoint",  exercise: "Complete Excel Skills for Business on Coursera",              category: "technical" },
        { skill: "Networking",          exercise: "Connect with 5 alumni on LinkedIn per week",                  category: "soft_skill"},
      ],
      low: [
        { skill: "Business Basics",     exercise: "Read one HBR article daily and note key takeaways",           category: "soft_skill"},
        { skill: "Aptitude",            exercise: "Solve 20 CAT-level quant questions daily",                    category: "technical" },
      ],
    },
    ECE: {
      high: [
        { skill: "VLSI Design",         exercise: "Practice Verilog/VHDL on Xilinx Vivado with mini projects",   category: "technical" },
        { skill: "Embedded C",          exercise: "Build 3 Arduino/Raspberry Pi projects and publish on GitHub", category: "technical" },
      ],
      mid: [
        { skill: "Core Electronics",    exercise: "Revise op-amps, microcontrollers, communication protocols",   category: "technical" },
        { skill: "Aptitude & Reasoning",exercise: "Solve 20 quantitative aptitude questions daily",              category: "technical" },
      ],
      low: [
        { skill: "Circuit Basics",      exercise: "Revise KVL, KCL, Thevenin from NPTEL lectures",               category: "technical" },
        { skill: "Backlog Clearance",   exercise: "Dedicate 2 hrs/day to clear pending backlogs first",          category: "activity"  },
      ],
    },
    MECHANICAL: {
      high: [
        { skill: "CAD/CAM",             exercise: "Master SolidWorks or CATIA with 2 design projects",           category: "technical" },
        { skill: "Six Sigma",           exercise: "Pursue Six Sigma Green Belt certification",                   category: "technical" },
      ],
      mid: [
        { skill: "AutoCAD",             exercise: "Complete AutoCAD 2D/3D certification course",                 category: "technical" },
        { skill: "Core Subjects",       exercise: "Revise Thermodynamics, FM, SOM daily for 1 hr",               category: "technical" },
      ],
      low: [
        { skill: "Engineering Drawing", exercise: "Practice 10 engineering drawing problems daily",               category: "technical" },
        { skill: "Backlog Clearance",   exercise: "Dedicate 2 hrs/day to clear pending backlogs first",          category: "activity"  },
      ],
    },
    CIVIL: {
      high: [
        { skill: "STAAD Pro / ETABS",   exercise: "Model and analyse 2 structural projects using STAAD Pro",    category: "technical" },
        { skill: "Project Management",  exercise: "Pursue PMP or PRINCE2 Foundation certification",             category: "technical" },
      ],
      mid: [
        { skill: "AutoCAD Civil 3D",    exercise: "Complete AutoCAD Civil 3D certification",                    category: "technical" },
        { skill: "Estimation & Costing",exercise: "Practice quantity surveying problems daily",                  category: "technical" },
      ],
      low: [
        { skill: "Core Subjects",       exercise: "Revise RCC, Steel Structures, Soil Mechanics from NPTEL",    category: "technical" },
        { skill: "Backlog Clearance",   exercise: "Dedicate 2 hrs/day to clear pending backlogs first",         category: "activity"  },
      ],
    },
  };

  const UNIVERSAL = [
    { skill: "Mock Interviews",    exercise: "Do 2 mock interviews per week on Pramp or Interviewing.io",   category: "soft_skill" },
    { skill: "LinkedIn Profile",   exercise: "Optimise LinkedIn with projects, skills, and recommendations", category: "activity"   },
    { skill: "Communication",      exercise: "Read 1 business article daily and summarise it in writing",    category: "soft_skill" },
    { skill: "Aptitude Practice",  exercise: "Solve 15 aptitude + 5 logical reasoning questions daily",      category: "technical"  },
  ];

  const CATEGORY_COLORS = {
    technical:  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", label: "Technical" },
    soft_skill: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", label: "Soft Skill" },
    activity:   { bg: "#fefce8", border: "#fde68a", text: "#b45309", label: "Activity"   },
  };

  const course = profile.course.toUpperCase();
  const cgpa   = profile.cgpa;
  const band   = cgpa >= 8.0 ? "high" : cgpa >= 6.0 ? "mid" : "low";
  const courseItems = (SUGGESTIONS_DB[course] || SUGGESTIONS_DB["CSE"])[band] || [];

  const extra = [];
  if (profile.internship_count === 0)
    extra.push({ skill: "Internship",          exercise: "Apply to at least 2 internships on Internshala or LinkedIn this week",              category: "activity"   });
  if ((profile.certifications_count || 0) < 2)
    extra.push({ skill: "Certifications",       exercise: "Complete 1 free certification on Coursera or Google Career Certificates",           category: "technical"  });
  if (profile.communication_score < 6)
    extra.push({ skill: "Verbal Communication", exercise: "Practice speaking 10 min daily — record yourself and review",                       category: "soft_skill" });
  if (profile.backlogs > 0)
    extra.push({ skill: "Academic Recovery",    exercise: `Clear ${profile.backlogs} backlog(s) — dedicate 3 hrs/day to exam prep`,            category: "activity"   });
  if (profile.aptitude_score < 60)
    extra.push({ skill: "Quantitative Aptitude",exercise: "Solve RS Aggarwal chapters: Time & Work, Percentages, Profit & Loss daily",         category: "technical"  });

  const all = [...extra, ...courseItems, ...UNIVERSAL].slice(0, 8);

  return (
    <section className="panel ai-suggestions">
      <div className="panel-heading">
        <BriefcaseBusiness size={20} />
        <h2>AI placement suggestions</h2>
        <span className="suggestions-badge">Personalised for {profile.course} · CGPA {profile.cgpa}</span>
      </div>
      <div className="suggestions-grid">
        {all.map((s, i) => {
          const c = CATEGORY_COLORS[s.category] || CATEGORY_COLORS.technical;
          return (
            <div key={i} className="suggestion-card" style={{ background: c.bg, borderColor: c.border }}>
              <div className="suggestion-header">
                <strong>{s.skill}</strong>
                <span className="suggestion-tag" style={{ color: c.text }}>{c.label}</span>
              </div>
              <p>{s.exercise}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StudentOnboarding({ onComplete }) {
  const [form, setForm] = useState({
    name: "",
    rollNumber: "",
    collegeName: "",
    course: "CSE",
    resumeHeadline: "",
    skills: "",
    projects: "",
    semesterMarks: emptySemesterMarks,
    internshipCount: 0,
    certificationsCount: 0,
    aptitudeScore: 70,
    communicationScore: 6,
    backlogs: 0,
    institutePlacementRate: 75,
    familyIncome: 0,
    loanAmount: 0,
    resumeFileName: "",
    transcriptFileName: "",
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateSemester(index, value) {
    setForm((current) => {
      const semesterMarks = [...current.semesterMarks];
      semesterMarks[index] = value;
      return { ...current, semesterMarks };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onComplete(buildStudentProfile(form));
  }

  return (
    <form className="panel onboarding-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <ClipboardList size={20} />
        <h2>Complete student profile</h2>
      </div>

      <div className="onboarding-grid">
        <label>Full name
          <input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
        </label>
        <label>Roll number
          <input value={form.rollNumber} onChange={(e) => updateField("rollNumber", e.target.value)} required />
        </label>
        <label>College name
          <input value={form.collegeName} onChange={(e) => updateField("collegeName", e.target.value)} required />
        </label>
        <label>Course
          <select value={form.course} onChange={(e) => updateField("course", e.target.value)}>
            {["CSE", "DS", "ECE", "MBA", "Mechanical", "Civil"].map((course) => <option key={course}>{course}</option>)}
          </select>
        </label>
        <label>Resume headline
          <input
            value={form.resumeHeadline}
            onChange={(e) => updateField("resumeHeadline", e.target.value)}
            placeholder="Frontend developer, data analyst, product intern..."
            required
          />
        </label>
        <label className="wide-field">Skills
          <input
            value={form.skills}
            onChange={(e) => updateField("skills", e.target.value)}
            placeholder="Python, React, SQL, Excel"
            required
          />
        </label>
        <label className="wide-field">Projects / resume details
          <textarea
            value={form.projects}
            onChange={(e) => updateField("projects", e.target.value)}
            placeholder="Add one project or resume point per line"
            required
          />
        </label>
      </div>

      <div className="semester-section">
        <h3>Semester wise CGPA</h3>
        <div className="semester-grid">
          {form.semesterMarks.map((mark, index) => (
            <label key={index}>Sem {index + 1}
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={mark}
                onChange={(e) => updateSemester(index, e.target.value)}
                required={index < 2}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="onboarding-grid">
        <label>Internships
          <input type="number" min="0" value={form.internshipCount} onChange={(e) => updateField("internshipCount", e.target.value)} />
        </label>
        <label>Certifications
          <input type="number" min="0" value={form.certificationsCount} onChange={(e) => updateField("certificationsCount", e.target.value)} />
        </label>
        <label>Aptitude score
          <input type="number" min="0" max="100" value={form.aptitudeScore} onChange={(e) => updateField("aptitudeScore", e.target.value)} />
        </label>
        <label>Communication score
          <input type="number" min="0" max="10" step="0.1" value={form.communicationScore} onChange={(e) => updateField("communicationScore", e.target.value)} />
        </label>
        <label>Backlogs
          <input type="number" min="0" value={form.backlogs} onChange={(e) => updateField("backlogs", e.target.value)} />
        </label>
        <label>College placement rate
          <input type="number" min="0" max="100" value={form.institutePlacementRate} onChange={(e) => updateField("institutePlacementRate", e.target.value)} />
        </label>
        <label>Family income LPA
          <input type="number" min="0" step="0.1" value={form.familyIncome} onChange={(e) => updateField("familyIncome", e.target.value)} />
        </label>
        <label>Loan amount
          <input type="number" min="0" step="10000" value={form.loanAmount} onChange={(e) => updateField("loanAmount", e.target.value)} />
        </label>
      </div>

      <div className="document-grid">
        <label className="document-upload">
          <FileText size={20} />
          <span>Resume document</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => updateField("resumeFileName", e.target.files?.[0]?.name || "")}
          />
          <strong>{form.resumeFileName || "Upload resume"}</strong>
        </label>
        <label className="document-upload">
          <FileText size={20} />
          <span>Marks transcript</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => updateField("transcriptFileName", e.target.files?.[0]?.name || "")}
          />
          <strong>{form.transcriptFileName || "Upload marksheet"}</strong>
        </label>
      </div>

      <button className="primary onboarding-submit" type="submit">
        <LineChart size={18} /> Analyse profile
      </button>
    </form>
  );
}

function StudentProfileSummary({ profile, onReportIssue }) {
  return (
    <section className="panel student-profile-summary">
      <div className="panel-heading">
        <FileText size={20} />
        <h2>Student documents and profile</h2>
        <button
          className="secondary-action"
          type="button"
          onClick={() => onReportIssue({
            source: "Student User",
            category: "Student profile",
            title: `Review profile analysis for ${profile.name}`,
            detail: `Student reported an issue with profile data, documents, or generated recommendations. Roll number: ${profile.roll_number || profile.student_id}.`,
          })}
        >
          <Send size={15} /> Report issue
        </button>
      </div>
      <div className="summary-grid">
        <div><span>Name</span><strong>{profile.name}</strong></div>
        <div><span>Roll number</span><strong>{profile.roll_number || profile.student_id}</strong></div>
        <div><span>College</span><strong>{profile.college_name}</strong></div>
        <div><span>Resume</span><strong>{profile.resume_headline || "Not added"}</strong></div>
        <div><span>Skills</span><strong>{profile.skills?.join(", ") || "Not added"}</strong></div>
        <div><span>Projects</span><strong>{profile.projects?.length || 0}</strong></div>
        <div><span>Documents</span><strong>{[profile.documents?.resume, profile.documents?.transcript].filter(Boolean).length || 0} uploaded</strong></div>
      </div>
    </section>
  );
}

function DataScientistView({ issues, onResolveIssue }) {
  const openIssues = issues.filter((issue) => issue.status !== "Solved");
  const solvedIssues = issues.length - openIssues.length;
  const highPriority = openIssues.filter((issue) => issue.priority === "High").length;

  return (
    <>
      <section className="metrics ds-metrics">
        {[
          { label: "Open Issues", value: openIssues.length, icon: AlertTriangle },
          { label: "Solved Issues", value: solvedIssues, icon: CheckCircle },
          { label: "High Priority", value: highPriority, icon: ShieldCheck },
          { label: "Model Source", value: "Local/API", icon: Database },
        ].map(({ label, value, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <Icon size={22} /><span>{label}</span><strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="ds-grid">
        <div className="panel issue-board">
          <div className="panel-heading">
            <AlertTriangle size={20} />
            <h2>Reported issues</h2>
          </div>

          {issues.length === 0 ? (
            <div className="empty-state">No issues reported yet.</div>
          ) : (
            <div className="issue-list">
              {issues.map((issue) => (
                <article className={`issue-card ${issue.status === "Solved" ? "solved" : ""}`} key={issue.id}>
                  <div className="issue-header">
                    <span className={`badge ${issue.priority === "High" ? "danger" : "safe"}`}>{issue.priority}</span>
                    <span>{issue.source}</span>
                  </div>
                  <h3>{issue.title}</h3>
                  <p>{issue.detail}</p>
                  <div className="issue-meta">
                    <span>{issue.category}</span>
                    <span>{issue.createdAt}</span>
                  </div>
                  {issue.status === "Solved" ? (
                    <strong className="text-safe">Solved</strong>
                  ) : (
                    <button className="primary resolve-btn" type="button" onClick={() => onResolveIssue(issue.id)}>
                      <CheckCircle size={16} /> Mark solved
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="panel ds-role-panel">
          <div className="panel-heading">
            <Database size={20} />
            <h2>Data scientist role</h2>
          </div>
          <div className="role-workflow">
            <article>
              <strong>Validate data quality</strong>
              <span>Check missing marks, wrong roll numbers, duplicate student rows, and document gaps.</span>
            </article>
            <article>
              <strong>Investigate model behavior</strong>
              <span>Review risk scores, salary estimates, feature impact bars, and unexpected recommendations.</span>
            </article>
            <article>
              <strong>Close reported issues</strong>
              <span>Resolve issues raised by Student, Institute, and Loan Officer users after analysis.</span>
            </article>
          </div>
        </aside>
      </section>
    </>
  );
}

function ScoringView({
  role,
  initialProfile,
  loanRequest,
  onApplyLoan,
  onAcceptMeeting,
  onScheduleMeeting,
  onReportIssue,
}) {
  const initial = initialProfile || MOCK_STUDENTS[0];
  const [profile, setProfile] = useState(initial);
  const [result,  setResult]  = useState(fallbackPrediction(initial));
  const [status,  setStatus]  = useState("Ready");

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
          { label: "Est. Months to Placement", value: `~${Math.round(2 + (1 - Math.min(Math.max(result.placement_probability, 0.05), 0.99)) * 16)} mo`, icon: LineChart },
          { label: "Risk Score",            value: `${Math.round(result.risk_score * 100)}%`,            icon: AlertTriangle },
          { label: "Salary Prediction",     value: `₹${Math.round(result.predicted_salary_inr).toLocaleString("en-IN")}`, icon: Banknote },
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
            <strong>{riskSummary(result)}</strong>
            <span>Source: {result.model_source}</span>
          </div>
          <div className="bars">
            {result.shap_explanation.features.map((f) => (
              <div className="bar-row" key={f.feature}>
                <span>{f.feature.replaceAll("_", " ")}</span>
                <div><i className={f.impact < 0 ? "negative" : ""} style={{ width: `${Math.min(Math.abs(f.impact) * 500, 100)}%` }} /></div>
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

      {role === "Student User" && profile.college_name && (
        <StudentProfileSummary profile={profile} onReportIssue={onReportIssue} />
      )}

      {role === "Student User" && (
        <LoanCalculator
          profile={profile}
          predictedSalary={result.predicted_salary_inr}
          careerRecommendations={result.career_recommendations}
          loanRequest={loanRequest}
          onApplyLoan={onApplyLoan}
          onAcceptMeeting={onAcceptMeeting}
          onScheduleMeeting={onScheduleMeeting}
        />
      )}

      {role === "Student User" && (
        <AISuggestions profile={profile} />
      )}
    </>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
function App() {
  const [role, setRole] = useState(null);
  const [session, setSession] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentProfiles, setStudentProfiles] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);
  const [notice, setNotice] = useState("");

  if (!role) {
    return <Login onLogin={(loginSession) => {
      setSession(loginSession);
      setRole(loginSession.role);
    }} />;
  }

  const needsStudentOnboarding =
    role === "Student User" &&
    session?.isNewAccount &&
    !session?.profileComplete &&
    !studentProfiles.some((profile) => profile.account_identifier === session.identifier);
  const currentStudentProfile =
    studentProfiles.find((profile) => profile.account_identifier === session?.identifier) ||
    studentProfile;
  const currentLoanRequest =
    loanRequests.find((request) => request.account_identifier === session?.identifier) ||
    loanRequests.find((request) => request.profile.student_id === currentStudentProfile?.student_id);

  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 2200);
  }

  function reportIssue(issue) {
    setIssues((current) => [
      {
        id: `ISS-${Date.now()}`,
        priority: issue.category?.includes("risk") || issue.category?.includes("Loan") ? "High" : "Medium",
        status: "Open",
        createdAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        ...issue,
      },
      ...current,
    ]);
    showNotice("Issue reported to Data Scientist.");
  }

  function resolveIssue(issueId) {
    setIssues((current) => current.map((issue) => (
      issue.id === issueId ? { ...issue, status: "Solved" } : issue
    )));
    showNotice("Issue marked solved.");
  }

  function applyLoan(profile, amount) {
    const loanProfile = {
      ...profile,
      loan_required: true,
      loan_amount: amount,
      account_identifier: session?.identifier,
    };
    const request = {
      id: `LOAN-${Date.now()}`,
      account_identifier: session?.identifier,
      profile: loanProfile,
      amount,
      status: "Pending",
      requestedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      meeting: null,
    };

    setStudentProfile(loanProfile);
    setStudentProfiles((current) => [
      loanProfile,
      ...current.filter((student) => student.account_identifier !== session?.identifier),
    ]);
    setLoanRequests((current) => [
      request,
      ...current.filter((item) => item.account_identifier !== session?.identifier),
    ]);
    showNotice("Loan request sent to Loan Officer.");
  }

  function decideLoan(requestId, status) {
    setLoanRequests((current) => current.map((request) => (
      request.id === requestId ? { ...request, status } : request
    )));
    showNotice(`Loan ${status.toLowerCase()}.`);
  }

  function requestMeeting(requestId) {
    setLoanRequests((current) => current.map((request) => (
      request.id === requestId
        ? { ...request, meeting: { status: "requested", requestedAt: new Date().toISOString() } }
        : request
    )));
    showNotice("Meeting request sent to student.");
  }

  function acceptMeeting(requestId) {
    setLoanRequests((current) => current.map((request) => (
      request.id === requestId
        ? { ...request, meeting: { ...request.meeting, status: "scheduling", acceptedAt: new Date().toISOString() } }
        : request
    )));
    showNotice("Meeting request accepted.");
  }

  function scheduleMeeting(requestId, platform, meetingAt) {
    const meetingId = `${Math.floor(100000000 + Math.random() * 900000000)}`;
    setLoanRequests((current) => current.map((request) => (
      request.id === requestId
        ? {
            ...request,
            meeting: {
              status: "scheduled",
              platform,
              meetingAt,
              link: meetingLink(platform, meetingId),
            },
          }
        : request
    )));
    showNotice("Meeting appointment fixed.");
  }

  const roleContent = {
    "Institute Staff": <InstituteView studentProfiles={studentProfiles} onReportIssue={reportIssue} />,
    "Loan Officer":    <LoanOfficerView
      loanRequests={loanRequests}
      onDecideLoan={decideLoan}
      onRequestMeeting={requestMeeting}
      onReportIssue={reportIssue}
    />,
    "Data Scientist":  <DataScientistView issues={issues} onResolveIssue={resolveIssue} />,
    "Student User":    needsStudentOnboarding
      ? <StudentOnboarding onComplete={(profile) => {
          const completedProfile = { ...profile, account_identifier: session?.identifier };
          setStudentProfile(completedProfile);
          setStudentProfiles((current) => [
            completedProfile,
            ...current.filter((student) => student.account_identifier !== session?.identifier),
          ]);
          setSession((current) => ({ ...current, profileComplete: true }));
        }} />
      : <ScoringView
          role="Student User"
          initialProfile={currentStudentProfile || undefined}
          loanRequest={currentLoanRequest}
          onApplyLoan={applyLoan}
          onAcceptMeeting={acceptMeeting}
          onScheduleMeeting={scheduleMeeting}
          onReportIssue={reportIssue}
        />,
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
        <button className="logout-btn" type="button" onClick={() => {
          setRole(null);
          setSession(null);
        }}>
          Sign out
        </button>
      </aside>

      <section className="workspace">
        {notice && <div className="toast-notice">{notice}</div>}
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
