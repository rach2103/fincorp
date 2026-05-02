import React, { useState, useEffect } from "react";
import { Mail, Phone, Lock, ChevronLeft, CheckCircle2, ArrowRight } from "lucide-react";
import "./login.css";

export default function Login({ onLogin }) {
  // view: "login" | "register" | "forgot"
  const [view, setView] = useState("login");
  // method: "email" | "phone"
  const [method, setMethod] = useState("email");
  // step: "initial" | "otp" | "password"
  const [step, setStep] = useState("initial");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Reset state when view changes
  useEffect(() => {
    setStep("initial");
    setOtp(["", "", "", "", "", ""]);
    setIsLoading(false);
    setSuccessMsg("");
    setIdentifier("");
    setPassword("");
  }, [view, method]);

  const handleSimulatedNetworkRequest = (callback, delay = 1200) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      callback();
    }, delay);
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (!identifier) return;

    if (view === "login") {
      if (!password) return;
      handleSimulatedNetworkRequest(() => {
        onLogin();
      });
    } else {
      // register or forgot password
      handleSimulatedNetworkRequest(() => {
        setStep("otp");
      });
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) return;
    
    handleSimulatedNetworkRequest(() => {
      setStep("password");
    });
  };

  const handleSetPassword = (e) => {
    e.preventDefault();
    if (!password) return;

    handleSimulatedNetworkRequest(() => {
      if (view === "register") {
        setSuccessMsg("Account created successfully!");
      } else {
        setSuccessMsg("Password reset successfully!");
      }
      setTimeout(() => {
        setView("login");
      }, 1500);
    });
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Only 1 digit
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
              
              <button type="submit" className="primary-btn" disabled={isLoading}>
                {isLoading ? <span className="loader" /> : "Verify Code"}
              </button>
              
              <div className="resend-text">
                Didn't receive the code? <button type="button" className="text-btn">Click to resend</button>
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
