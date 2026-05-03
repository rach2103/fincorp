import React, { useState, useEffect } from "react";
import { Mail, Phone, Lock, ChevronLeft, CheckCircle2 } from "lucide-react";
import "./login.css";

const DEMO_USERS = {
  "student@fincorp.com":   { password: "student123",   role: "Student User" },
  "institute@fincorp.com": { password: "institute123", role: "Institute Staff" },
  "scientist@fincorp.com": { password: "science123",  role: "Data Scientist" },
  "loan@fincorp.com":      { password: "loan123",      role: "Loan Officer" },
};

const ROLE_OPTIONS = [
  { label: "Student", value: "Student User" },
  { label: "Institute", value: "Institute Staff" },
  { label: "Scientist", value: "Data Scientist" },
  { label: "Loan", value: "Loan Officer" },
];

export default function Login({ onLogin }) {
  const [users, setUsers] = useState(DEMO_USERS);
  const [view, setView] = useState("login");
  const [method, setMethod] = useState("email");
  const [step, setStep] = useState("initial");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [accountRole, setAccountRole] = useState(ROLE_OPTIONS[0].value);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    setStep("initial");
    setOtp(["", "", "", "", "", ""]);
    setIsLoading(false);
    setSuccessMsg("");
    setIdentifier("");
    setPassword("");
    setAccountRole(ROLE_OPTIONS[0].value);
    setError("");
    setVerificationCode("");
  }, [view, method]);

  const handleSimulatedNetworkRequest = (callback, delay = 1200) => {
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); callback(); }, delay);
  };

  const generateVerificationCode = () => {
    return String(Math.floor(100000 + Math.random() * 900000));
  };

  const sendDemoCode = () => {
    setVerificationCode(generateVerificationCode());
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (!identifier) return;
    setError("");

    if (view === "login") {
      if (!password) return;
      const user = users[identifier.toLowerCase()];
      if (!user || user.password !== password) {
        setError("Invalid email or password.");
        return;
      }
      handleSimulatedNetworkRequest(() => {
        onLogin({
          role: user.role,
          identifier: identifier.toLowerCase(),
          isNewAccount: Boolean(user.isNewAccount),
          profileComplete: Boolean(user.profileComplete),
        });
      });
    } else {
      // register or forgot password
      handleSimulatedNetworkRequest(() => {
        sendDemoCode();
        setStep("otp");
      });
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) return;

    if (otpString !== verificationCode) {
      setError("That code does not match. Use the demo code shown below or resend a new one.");
      return;
    }

    setError("");
    handleSimulatedNetworkRequest(() => {
      setStep("password");
    });
  };

  const handleSetPassword = (e) => {
    e.preventDefault();
    if (!password) return;

    handleSimulatedNetworkRequest(() => {
      if (view === "register") {
        setUsers((current) => ({
          ...current,
          [identifier.toLowerCase()]: {
            password,
            role: accountRole,
            isNewAccount: true,
            profileComplete: false,
          },
        }));
        setSuccessMsg("Account created successfully! You can sign in now.");
      } else {
        setUsers((current) => ({
          ...current,
          [identifier.toLowerCase()]: {
            ...(current[identifier.toLowerCase()] || { role: ROLE_OPTIONS[0].value }),
            password,
          },
        }));
        setSuccessMsg("Password reset successfully!");
      }
      setTimeout(() => {
        setView("login");
      }, 1500);
    });
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    if (value.length > 1) {
      const pastedDigits = value.slice(0, 6).split("");
      setOtp((current) => {
        const nextOtp = [...current];
        pastedDigits.forEach((digit, offset) => {
          if (index + offset < nextOtp.length) nextOtp[index + offset] = digit;
        });
        return nextOtp;
      });

      const nextIndex = Math.min(index + pastedDigits.length, 5);
      const nextInput = document.getElementById(`otp-${nextIndex}`);
      if (nextInput) nextInput.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleResendCode = () => {
    handleSimulatedNetworkRequest(() => {
      sendDemoCode();
      setSuccessMsg("New demo code generated.");
      setTimeout(() => setSuccessMsg(""), 1800);
    }, 600);
  };

  const renderHeader = () => {
    let title = "Welcome back";
    let subtitle = "Please enter your details.";

    if (view === "register") {
      title = "Create account";
      subtitle = "Sign up to get started.";
    } else if (view === "forgot") {
      title = "Reset password";
      subtitle = "We'll send you a code to reset it.";
    }

    if (step === "otp") {
      title = "Check your " + (method === "email" ? "email" : "phone");
      subtitle = `We sent a 6-digit code to ${identifier}`;
    } else if (step === "password") {
      title = "Set new password";
      subtitle = "Must be at least 8 characters.";
    }

    return (
      <div className="auth-header">
        {step !== "initial" && (
          <button 
            type="button" 
            className="back-btn" 
            onClick={() => setStep(step === "password" ? "otp" : "initial")}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    );
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-circle">
             <div className="logo-inner" />
          </div>
        </div>

        {renderHeader()}

        {successMsg && (
          <div className="success-banner">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {view === "login" && step === "initial" && (
          <div className="credentials-hint">
            <strong>Demo credentials</strong>
            <table>
              <tbody>
                <tr><td>student@fincorp.com</td><td>student123</td></tr>
                <tr><td>institute@fincorp.com</td><td>institute123</td></tr>
                <tr><td>scientist@fincorp.com</td><td>science123</td></tr>
                <tr><td>loan@fincorp.com</td><td>loan123</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={
          step === "initial" ? handleInitialSubmit :
          step === "otp" ? handleVerifyOtp :
          handleSetPassword
        }>
          
          {step === "initial" && (
            <div className="auth-step slide-in">
              <div className="method-toggle">
                <button
                  type="button"
                  className={method === "email" ? "active" : ""}
                  onClick={() => setMethod("email")}
                >
                  <Mail size={16} /> Email
                </button>
                <button
                  type="button"
                  className={method === "phone" ? "active" : ""}
                  onClick={() => setMethod("phone")}
                >
                  <Phone size={16} /> Phone
                </button>
              </div>

              <div className="input-group">
                <label>{method === "email" ? "Email address" : "Phone number"}</label>
                <input
                  type={method === "email" ? "email" : "tel"}
                  placeholder={method === "email" ? "name@example.com" : "+1 (555) 000-0000"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              {view === "register" && (
                <div className="input-group">
                  <label>Account type</label>
                  <div className="role-options">
                    {ROLE_OPTIONS.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        className={accountRole === role.value ? "active" : ""}
                        onClick={() => setAccountRole(role.value)}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {view === "login" && (
                <div className="input-group mt-16">
                  <div className="label-row">
                    <label>Password</label>
                    <button type="button" className="text-btn" onClick={() => setView("forgot")}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="input-with-icon">
                     <Lock size={18} className="input-icon" />
                     <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? <span className="loader" /> : view === "login" ? "Sign in" : "Continue"}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="auth-step slide-in">
              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    className="otp-input"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    required
                  />
                ))}
              </div>

              <div className="demo-code-banner">
                <span>Demo verification code</span>
                <strong>{verificationCode}</strong>
              </div>
              
              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? <span className="loader" /> : "Verify Code"}
              </button>
              
              <div className="resend-text">
                Didn't receive the code? <button type="button" className="text-btn" onClick={handleResendCode}>Click to resend</button>
              </div>
            </div>
          )}

          {step === "password" && (
            <div className="auth-step slide-in">
               <div className="input-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                     <Lock size={18} className="input-icon" />
                     <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <button type="submit" className="primary-btn" disabled={isLoading}>
                  {isLoading ? <span className="loader" /> : "Confirm"}
                </button>
            </div>
          )}
        </form>

        {step === "initial" && (
          <div className="auth-footer">
            {view === "login" ? (
              <p>Don't have an account? <button type="button" onClick={() => setView("register")}>Sign up</button></p>
            ) : (
              <p>Already have an account? <button type="button" onClick={() => setView("login")}>Sign in</button></p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
