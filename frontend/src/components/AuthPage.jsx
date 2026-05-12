import { useState, useRef, useEffect } from "react";
import "./AuthPage.css";

const API = "http://localhost:5000/api";

export default function AuthPage({ initialMode = "login", onLogin, onBack }) {
  const [mode,    setMode]    = useState(initialMode);
  // forgot sub-steps: "email" → "otp" → "newpass" → "done"
  const [fstep,   setFstep]   = useState("email");
  const [form,    setForm]    = useState({ name:"", username:"", email:"", password:"", confirm:"", studentId:"", otp:["","","","","",""], newPass:"", newConfirm:"" });
  const [show,    setShow]    = useState(false);
  const [show2,   setShow2]   = useState(false);
  const [showN,   setShowN]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [devOtp,  setDevOtp]  = useState("");   // shown in dev mode
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(""); setSuccess(""); };

  // ── Resend countdown ────────────────────────────────────────
  const startTimer = () => {
    setResendTimer(60);
    timerRef.current = setInterval(() => {
      setResendTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  };
  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── OTP digit input ─────────────────────────────────────────
  const handleOtpDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const newOtp = [...form.otp];
    newOtp[i] = val;
    setForm(f => ({ ...f, otp: newOtp }));
    setError("");
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !form.otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft"  && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setForm(f => ({ ...f, otp: pasted.split("") }));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  // ── LOGIN ────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username.trim(), password: form.password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data);
      } else {
        setError(data.error || "Incorrect username/email or password.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault(); setError("");
    if (!form.name || !form.username || !form.email || !form.password || !form.confirm) return setError("Please fill in all fields.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          studentId: form.studentId
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("✅ Account created! You can now sign in.");
        setTimeout(() => { setMode("login"); setSuccess(""); }, 1800);
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT STEP 1: Send OTP ──────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (data.dev_otp) setDevOtp(data.dev_otp);  // show in dev
      setFstep("otp");
      setSuccess(`✅ OTP sent to ${form.email}! Check your inbox.`);
      startTimer();
    } catch {
      setError("Could not connect to server. Make sure Flask is running.");
    } finally { setLoading(false); }
  };

  // ── FORGOT STEP 2: Verify OTP ────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setError("");
    const otpStr = form.otp.join("");
    if (otpStr.length < 6) return setError("Please enter the complete 6-digit OTP.");
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: otpStr }),
      });
      const data = await res.json();
      if (data.success) { setFstep("newpass"); setSuccess(""); setDevOtp(""); }
      else setError(data.message);
    } catch { setError("Could not connect to server."); }
    finally { setLoading(false); }
  };

  // ── FORGOT STEP 3: Reset password ────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault(); setError("");
    if (form.newPass !== form.newConfirm) return setError("Passwords do not match.");
    if (form.newPass.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, new_password: form.newPass }),
      });
      const data = await res.json();
      if (data.success) {
        setFstep("done");
      } else setError(data.message);
    } catch { setError("Could not connect to server."); }
    finally { setLoading(false); }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setForm(f => ({ ...f, otp: ["","","","","",""] }));
    setError(""); setSuccess("");
    handleSendOtp({ preventDefault: () => {} });
  };

  const resetForgot = () => { setFstep("email"); setDevOtp(""); setError(""); setSuccess(""); setForm(f => ({ ...f, otp: ["","","","","",""], newPass:"", newConfirm:"" })); };

  return (
    <div className="auth-root">
      {/* ── Left panel ── */}
      <div className="auth-left">
        <button className="auth-back-btn" onClick={onBack}>
          <span className="back-icon">←</span>
          <span>Back to home</span>
        </button>
        
        <div className="auth-left-content">
          <div className="auth-brand">
            <span className="auth-brand-icon">🎓</span>
            <h1>StudySphere</h1>
          </div>
          <p className="auth-tagline">
            Your intelligent gateway to academic excellence and campus intelligence.
          </p>
          <div className="auth-features">
            {[
              "✨ Smart AI Interaction",
              "📅 Real-time Deadline Tracking",
              "🎙️ Voice Command Support",
              "🧠 Emotional Intelligence",
              "🤖 Autonomous Self-Learning"
            ].map(f => (
              <div className="auth-feat" key={f}>
                <span className="auth-feat-check">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
        
        <div className="auth-left-footer">
          London Metropolitan University · Academic Assistant v2.0
        </div>
      </div>

        {/* ── Right panel ── */}
        <div className="auth-right">
          <div className="auth-card">

            {/* Tabs — hidden on forgot */}
            {mode !== "forgot" && (
              <div className="auth-tabs">
                <button className={`auth-tab ${mode==="login"?"active":""}`}    onClick={() => { setMode("login");    setError(""); setSuccess(""); }}>Sign In</button>
                <button className={`auth-tab ${mode==="register"?"active":""}`} onClick={() => { setMode("register"); setError(""); setSuccess(""); }}>Register</button>
              </div>
            )}

            {/* ═══════ LOGIN ═══════ */}
            {mode === "login" && (
              <>
                <div className="auth-card-head"><h2>Welcome back 👋</h2><p>Sign in to your StudySphere account</p></div>
                <form onSubmit={handleLogin} className="auth-form">
                  <div className="field">
                    <label>Username or Email</label>
                    <div className="inp-wrap"><span className="inp-icon">👤</span>
                      <input type="text" placeholder="Enter credentials" value={form.username} onChange={e => set("username", e.target.value)} required />
                    </div>
                  </div>
                  <div className="field">
                    <div className="field-label-row">
                      <label>Password</label>
                      <button type="button" className="forgot-link" onClick={() => { setMode("forgot"); resetForgot(); }}>Forgot password?</button>
                    </div>
                    <div className="inp-wrap"><span className="inp-icon">🔒</span>
                      <input type={show?"text":"password"} placeholder="Enter password" value={form.password} onChange={e => set("password", e.target.value)} required />
                      <button type="button" className="eye-btn" onClick={() => setShow(s=>!s)}>{show?"🙈":"👁️"}</button>
                    </div>
                  </div>
                  {error   && <div className="auth-error">⚠️ {error}</div>}
                  {success && <div className="auth-success">{success}</div>}
                  <button type="submit" className="auth-submit" disabled={loading}>{loading ? <LoadingDots/> : "Sign In →"}</button>
                </form>
                <p className="auth-switch">New to StudySphere? <button onClick={() => { setMode("register"); setError(""); }}>Create an account</button></p>
              </>
            )}

            {/* ═══════ REGISTER ═══════ */}
            {mode === "register" && (
              <>
                <div className="auth-card-head"><h2>Join StudySphere 🎓</h2><p>Unlock your academic potential today</p></div>
                <form onSubmit={handleRegister} className="auth-form">
                  <div className="field-row">
                    <div className="field">
                      <label>Full Name</label>
                      <div className="inp-wrap"><span className="inp-icon">👤</span><input type="text" placeholder="Your full name" value={form.name} onChange={e => set("name", e.target.value)} required /></div>
                    </div>
                    <div className="field">
                      <label>Student ID <span className="opt">(optional)</span></label>
                      <div className="inp-wrap"><span className="inp-icon">🪪</span><input type="text" placeholder="e.g. STU12345" value={form.studentId} onChange={e => set("studentId", e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="field">
                    <label>Username</label>
                    <div className="inp-wrap"><span className="inp-icon">@</span><input type="text" placeholder="Choose a username" value={form.username} onChange={e => set("username", e.target.value)} required /></div>
                  </div>
                  <div className="field">
                    <label>University Email</label>
                    <div className="inp-wrap"><span className="inp-icon">✉️</span><input type="email" placeholder="yourname@uni.ac.uk" value={form.email} onChange={e => set("email", e.target.value)} required /></div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Password</label>
                      <div className="inp-wrap"><span className="inp-icon">🔒</span>
                        <input type={show?"text":"password"} placeholder="Min 6 characters" value={form.password} onChange={e => set("password", e.target.value)} required />
                        <button type="button" className="eye-btn" onClick={() => setShow(s=>!s)}>{show?"🙈":"👁️"}</button>
                      </div>
                    </div>
                    <div className="field">
                      <label>Confirm Password</label>
                      <div className="inp-wrap"><span className="inp-icon">🔒</span>
                        <input type={show2?"text":"password"} placeholder="Repeat password" value={form.confirm} onChange={e => set("confirm", e.target.value)} required />
                        <button type="button" className="eye-btn" onClick={() => setShow2(s=>!s)}>{show2?"🙈":"👁️"}</button>
                      </div>
                    </div>
                  </div>
                  {form.password && <PasswordStrength pwd={form.password} />}
                  {error   && <div className="auth-error">⚠️ {error}</div>}
                  {success && <div className="auth-success">{success}</div>}
                  <button type="submit" className="auth-submit" disabled={loading}>{loading ? <LoadingDots/> : "Create Account →"}</button>
                </form>
                <p className="auth-switch">Already have an account? <button onClick={() => { setMode("login"); setError(""); }}>Sign in</button></p>
              </>
            )}

            {/* ═══════ FORGOT PASSWORD — 3 STEPS ═══════ */}
            {mode === "forgot" && (
              <>
                <button className="back-to-login" onClick={() => { setMode("login"); resetForgot(); }}>← Back to Sign In</button>

                {/* Step indicator */}
                <div className="otp-steps">
                  {[{n:1,label:"Email"},{n:2,label:"Verify OTP"},{n:3,label:"New Password"}].map((s,i) => {
                    const stepMap = { email:1, otp:2, newpass:3, done:3 };
                    const cur = stepMap[fstep];
                    return (
                      <div key={s.n} className="otp-step-wrap">
                        <div className={`otp-step-circle ${cur >= s.n ? "done" : ""} ${cur === s.n ? "active" : ""}`}>{cur > s.n ? "✓" : s.n}</div>
                        <span className={`otp-step-label ${cur === s.n ? "active" : ""}`}>{s.label}</span>
                        {i < 2 && <div className={`otp-step-line ${cur > s.n ? "done" : ""}`}/>}
                      </div>
                    );
                  })}
                </div>

                {/* ── Step 1: Enter email ── */}
                {fstep === "email" && (
                  <>
                    <div className="auth-card-head"><h2>Reset Password 🔑</h2><p>Enter your email to receive a 6-digit OTP</p></div>
                    <form onSubmit={handleSendOtp} className="auth-form">
                      <div className="field">
                        <label>University Email</label>
                        <div className="inp-wrap"><span className="inp-icon">✉️</span>
                          <input type="email" placeholder="yourname@uni.ac.uk" value={form.email} onChange={e => set("email", e.target.value)} required />
                        </div>
                      </div>
                      {error && <div className="auth-error">⚠️ {error}</div>}
                      <button type="submit" className="auth-submit" disabled={loading}>{loading ? <LoadingDots/> : "Send OTP →"}</button>
                    </form>
                  </>
                )}

                {/* ── Step 2: Enter OTP ── */}
                {fstep === "otp" && (
                  <>
                    <div className="auth-card-head">
                      <h2>Enter OTP 📱</h2>
                      <p>We sent a 6-digit code to <strong>{form.email}</strong></p>
                    </div>

                    {success && <div className="auth-success">{success}</div>}

                    <form onSubmit={handleVerifyOtp} className="auth-form">
                      {/* 6-digit OTP boxes */}
                      <div className="otp-boxes" onPaste={handleOtpPaste}>
                        {form.otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={el => otpRefs.current[i] = el}
                            className={`otp-box ${digit ? "filled" : ""}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpDigit(i, e.target.value)}
                            onKeyDown={e => handleOtpKey(i, e)}
                            autoFocus={i === 0}
                          />
                        ))}
                      </div>

                      <div className="otp-timer-row">
                        <span className="otp-expiry">⏱️ OTP expires in 10 minutes</span>
                        <button type="button" className={`resend-btn ${resendTimer > 0 ? "disabled" : ""}`} onClick={handleResend} disabled={resendTimer > 0}>
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                        </button>
                      </div>

                      {error && <div className="auth-error">⚠️ {error}</div>}
                      <button type="submit" className="auth-submit" disabled={loading || form.otp.join("").length < 6}>
                        {loading ? <LoadingDots/> : "Verify OTP →"}
                      </button>
                    </form>

                    <p className="otp-change-email">
                      Wrong email? <button onClick={() => { setFstep("email"); setDevOtp(""); setError(""); }}>Change email</button>
                    </p>
                  </>
                )}

                {/* ── Step 3: New password ── */}
                {fstep === "newpass" && (
                  <>
                    <div className="auth-card-head"><h2>New Password 🔒</h2><p>OTP verified! Set your new password.</p></div>
                    <form onSubmit={handleResetPassword} className="auth-form">
                      <div className="field">
                        <label>New Password</label>
                        <div className="inp-wrap"><span className="inp-icon">🔒</span>
                          <input type={showN?"text":"password"} placeholder="Min 6 characters" value={form.newPass} onChange={e => set("newPass", e.target.value)} required autoFocus />
                          <button type="button" className="eye-btn" onClick={() => setShowN(s=>!s)}>{showN?"🙈":"👁️"}</button>
                        </div>
                      </div>
                      <div className="field">
                        <label>Confirm New Password</label>
                        <div className="inp-wrap"><span className="inp-icon">🔒</span>
                          <input type={showN?"text":"password"} placeholder="Repeat new password" value={form.newConfirm} onChange={e => set("newConfirm", e.target.value)} required />
                        </div>
                      </div>
                      {form.newPass && <PasswordStrength pwd={form.newPass} />}
                      {error && <div className="auth-error">⚠️ {error}</div>}
                      <button type="submit" className="auth-submit" disabled={loading}>{loading ? <LoadingDots/> : "Reset Password →"}</button>
                    </form>
                  </>
                )}

                {/* ── Done ── */}
                {fstep === "done" && (
                  <div className="reset-done">
                    <div className="reset-done-icon">✅</div>
                    <h2>Password Reset!</h2>
                    <p>Your password has been successfully updated.</p>
                    <button className="auth-submit" onClick={() => { setMode("login"); resetForgot(); }}>Sign In Now →</button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
    </div>
  );
}

function LoadingDots() {
  return <span className="ldots"><span/><span/><span/></span>;
}

function PasswordStrength({ pwd }) {
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  const levels = ["","Weak","Fair","Good","Strong","Very strong"];
  const colors = ["","#ef4444","#f59e0b","#3b82f6","#22c55e","#16a34a"];
  return (
    <div className="pwd-strength">
      <div className="pwd-bars">{[1,2,3,4,5].map(i => <div key={i} className="pwd-bar" style={{ background: i<=score ? colors[score] : "#e2e8f0" }} />)}</div>
    </div>
  );
}
