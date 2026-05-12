import { useState } from "react";
import "./LoginPage.css";

// Demo credentials
const USERS = [
  { username: "student",  password: "student123",  role: "student",  name: "Alex Johnson"    },
  { username: "admin",    password: "admin123",     role: "admin",    name: "Dr. Sarah Ahmed" },
];

export default function LoginPage({ onLogin, onGoBack }) {
  const [form,   setForm]   = useState({ username: "", password: "" });
  const [error,  setError]  = useState("");
  const [show,   setShow]   = useState(false);
  const [loading,setLoading]= useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const user = USERS.find(
        u => u.username === form.username.trim() && u.password === form.password
      );
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid credentials. Access denied.");
        setLoading(false);
      }
    }, 1200);
  };

  const handleRecovery = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setRecoverySent(true);
      setLoading(false);
    }, 1500);
  };

  const fillDemo = (role) => {
    const u = USERS.find(u => u.role === role);
    setForm({ username: u.username, password: u.password });
    setError("");
  };

  return (
    <div className="login-root">
      <div className="back-home">
        <button className="back-btn" onClick={onGoBack}>
          ← Back to Home
        </button>
      </div>

      {/* ── Left Panel ── */}
      <div className="login-left">
        <div className="left-content">
          <div className="login-brand">
            <span className="brand-icon">🎓</span>
            <h1 className="brand-name">StudySphere</h1>
          </div>
          <p className="brand-tagline">
            Your intelligent gateway to academic excellence and campus intelligence.
          </p>

          <div className="login-features">
            {[
              { icon: "✨", title: "AI-Powered Insights", desc: "Instant answers to all your university queries." },
              { icon: "📅", title: "Smart Scheduling", desc: "Automated deadline tracking and reminders." },
              { icon: "🎙️", title: "Voice Interaction", desc: "Natural language processing at your fingertips." },
            ].map(f => (
              <div className="feature-item" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="login-right">
        <div className="login-card">
          {!isRecovering ? (
            <>
              <div className="login-card-header">
                <h2>Welcome back</h2>
                <p>Sign in to your StudySphere account</p>
              </div>

              <div className="demo-row">
                <span className="demo-label">Demo:</span>
                <button className="demo-btn" onClick={() => fillDemo("student")}>👤 Student</button>
                <button className="demo-btn" onClick={() => fillDemo("admin")}>⚙️ Admin</button>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="field-group">
                  <label>Username</label>
                  <div className="input-wrap">
                    <span className="input-icon">👤</span>
                    <input
                      type="text"
                      placeholder="e.g. student"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>Password</label>
                  <div className="input-wrap">
                    <span className="input-icon">🔒</span>
                    <input
                      type={show ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required
                    />
                    <button type="button" className="show-toggle" onClick={() => setShow(!show)}>
                      {show ? "🙈" : "👁️"}
                    </button>
                  </div>
                  <div className="forgot-link">
                    <button type="button" onClick={() => setIsRecovering(true)}>Forgot password?</button>
                  </div>
                </div>

                {error && <div className="login-error">⚠️ {error}</div>}

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? "Authenticating..." : "Sign In →"}
                </button>
              </form>
            </>
          ) : (
            <div className="recovery-overlay">
              <h3>Reset Password</h3>
              {!recoverySent ? (
                <>
                  <p>Enter your student email and we'll send you a recovery link.</p>
                  <form onSubmit={handleRecovery} className="login-form">
                    <div className="field-group">
                      <label>Student Email</label>
                      <div className="input-wrap">
                        <span className="input-icon">📧</span>
                        <input
                          type="email"
                          placeholder="name@university.ac.lk"
                          value={recoveryEmail}
                          onChange={e => setRecoveryEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                    <button type="button" className="ln-btn-ghost" style={{marginTop: '1rem', width: '100%'}} 
                            onClick={() => setIsRecovering(false)}>
                      Go back to login
                    </button>
                  </form>
                </>
              ) : (
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '3rem', marginBottom: '1.5rem'}}>📧</div>
                  <p>A recovery link has been sent to <strong>{recoveryEmail}</strong>. Please check your inbox.</p>
                  <button className="login-btn" style={{width: '100%'}} onClick={() => {
                    setIsRecovering(false);
                    setRecoverySent(false);
                  }}>
                    Back to Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
