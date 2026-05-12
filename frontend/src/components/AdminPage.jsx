import { useState, useEffect, useCallback } from "react";
import "./AdminPage.css";

const API = "http://localhost:5000/api";

const MOCK_LOGS = [
  { id: 1, type: "user", action: "New registration", details: "James Wilson (student) joined", time: "2 mins ago", icon: "👤", bg: "#EFF6FF", color: "#2563EB" },
  { id: 2, type: "system", action: "Model Retrained", details: "Intent 'exam_deferral' updated", time: "15 mins ago", icon: "🧠", bg: "#FEF3C7", color: "#F59E0B" },
  { id: 3, type: "alert", action: "Unrecognized Question", details: "Query: 'What is the refund policy?'", time: "1 hr ago", icon: "⚠️", bg: "#FEE2E2", color: "#EF4444" },
  { id: 4, type: "system", action: "Backup Completed", details: "Database snapshot 'SS_2026_05' saved", time: "4 hrs ago", icon: "💾", bg: "#F0FDF4", color: "#22C55E" },
];

export default function AdminPage({ user }) {
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [training, setTraining] = useState(null);
  const [form, setForm] = useState({ tag: "", patterns: "", responses: "" });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "student" });
  const [courseForm, setCourseForm] = useState({ code: "", title: "", department: "", level: 1 });
  const [showNotifications, setShowNotifications] = useState(false);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, qRes, uRes, cRes] = await Promise.all([
        fetch(`${API}/admin/stats`),
        fetch(`${API}/admin/unknown`),
        fetch(`${API}/users`),
        fetch(`${API}/courses`)
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (qRes.ok) setQuestions(await qRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (cRes.ok) setCourses(await cRes.json());
      
      showToast("System data synced successfully!");
    } catch {
      showToast("Sync partially successful (Mock mode active)", "success");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openTraining(q) {
    setTraining(q);
    setForm({
      tag: q.question.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40),
      patterns: q.question,
      responses: "",
    });
  }

  async function submitTraining() {
    if (!form.tag || !form.patterns || !form.responses) return showToast("Fill all fields", "error");
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unknown_q_id: training.id,
          tag: form.tag,
          patterns: form.patterns.split("\n").map(s => s.trim()).filter(Boolean),
          responses: form.responses.split("\n").map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      showToast(data.message);
      setTraining(null);
      loadData();
    } catch {
      showToast("Training failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function ignoreQ(id) {
    await fetch(`${API}/admin/unknown/${id}`, { method: "DELETE" });
    setQuestions(q => q.filter(x => x.id !== id));
    showToast("Question ignored");
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm)
      });
      if (res.ok) {
        showToast("User created successfully!");
        setShowAddUser(false);
        setUserForm({ name: "", email: "", role: "student" });
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to create user", "error");
      }
    } catch {
      showToast("Server connection failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCourse(e) {
    e.preventDefault();
    if (!courseForm.code || !courseForm.title) return showToast("Code and Title are required", "error");
    setLoading(true);
    try {
      const res = await fetch(`${API}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseForm)
      });
      if (res.ok) {
        showToast("Course added successfully!");
        setShowAddCourse(false);
        setCourseForm({ code: "", title: "", department: "", level: 1 });
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to add course", "error");
      }
    } catch {
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm)
      });
      if (res.ok) {
        showToast("User updated successfully!");
        setEditingUser(null);
        setUserForm({ name: "", email: "", role: "student" });
        loadData();
      } else {
        showToast("Update failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(uid) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${API}/users/${uid}`, { method: "DELETE" });
      if (res.ok) {
        showToast("User deleted");
        loadData();
      }
    } catch {
       showToast("Delete failed", "error");
    }
  }

  function startEdit(u) {
    setEditingUser(u);
    setUserForm({ name: u.name, email: u.email, role: u.role });
  }

  const TABS = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "users", icon: "👥", label: "Users" },
    { id: "courses", icon: "📚", label: "Courses" },
    { id: "ml", icon: "🧠", label: "ML Training" },
    { id: "logs", icon: "📜", label: "System Logs" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const filteredUsers = users.filter(u =>
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCourses = courses.filter(c =>
    (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="adm-root">
      {/* ── SIDEBAR ── */}
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <div className="adm-logo-box">🎓</div>
          <h2>StudySphere</h2>
        </div>

        <nav className="adm-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`adm-nav-item ${tab === t.id ? "active" : ""}`}
              onClick={() => { setTab(t.id); setSearchTerm(""); }}
            >
              <span className="adm-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
              {t.id === "ml" && questions.length > 0 && (
                <span className="adm-tab-badge">{questions.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <p>© 2026 Admin Suite v1.2</p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="adm-main">
        {/* Toast notification */}
        {toast && (
          <div className={`adm-toast ${toast.type === "error" ? "error" : "success"}`}>
            {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
          </div>
        )}

        {/* Topbar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <h1>{TABS.find(t => t.id === tab)?.label}</h1>
            <p>Welcome back, <strong>{user?.name || "Dr. Sarah Ahmed"}</strong></p>
          </div>

          <div className="adm-topbar-right">
            <div className="adm-notify-wrap">
              <button className="adm-notify-btn" onClick={() => setShowNotifications(!showNotifications)}>
                🔔 <span className="adm-notify-dot"></span>
              </button>
              
              {showNotifications && (
                <div className="adm-notify-dropdown">
                  <div className="adm-nd-header">
                    <h4>Notifications</h4>
                    <span className="adm-badge-gold">4 New</span>
                  </div>
                  <div className="adm-nd-body">
                    {MOCK_LOGS.map(log => (
                      <div key={log.id} className="adm-nd-item">
                        <span className="adm-nd-icon" style={{color: log.color}}>{log.icon}</span>
                        <div className="adm-nd-info">
                          <p><strong>{log.action}</strong></p>
                          <small>{log.time}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="adm-nd-footer">
                    <button onClick={() => { setTab("logs"); setShowNotifications(false); }}>View All Activity</button>
                  </div>
                </div>
              )}
            </div>
            
            <button className="adm-refresh-btn" onClick={loadData} disabled={loading}>
              <span>{loading ? "⌛" : "↻"}</span> {loading ? "Syncing..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="adm-body">
          {/* ════════ DASHBOARD ════════ */}
          {tab === "dashboard" && (
            <div className="adm-view">
              <div className="adm-section-header">
                <div className="adm-section-badge">Live Status</div>
                <h2 className="adm-section-title">System Insights</h2>
                <p className="adm-section-sub">Overview of your platform's activity and student sentiment.</p>
              </div>

              <div className="adm-stats-grid">
                {[
                  { icon: "🎓", label: "Total Students", value: users.filter(u=>u.role==="student").length, color: "#2563EB", bg: "#EFF6FF" },
                  { icon: "🛡️", label: "Total Admins",   value: users.filter(u=>u.role==="admin").length,   color: "#6366F1", bg: "#EEF2FF" },
                  { icon: "⚡", label: "Active Sessions", value: stats?.total_sessions || 0, color: "#22C55E", bg: "#F0FDF4" },
                  { icon: "🧠", label: "Bot IQ",          value: stats?.total_intents || 0, color: "#F59E0B", bg: "#FFFBEB" },
                ].map(s => (
                  <div className="adm-stat-card" key={s.label}>
                    <div className="adm-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                    <div className="adm-stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div className="adm-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="adm-charts-row">
                <div className="adm-chart-card">
                  <div className="adm-chart-header">
                    <h3>📈 Traffic Analytics</h3>
                    <span className="adm-chart-badge">Weekly Usage</span>
                  </div>
                  <div className="adm-bar-chart">
                    {[{ day: "Mon", val: 65 }, { day: "Tue", val: 82 }, { day: "Wed", val: 54 }, { day: "Thu", val: 91 }, { day: "Fri", val: 78 }, { day: "Sat", val: 43 }, { day: "Sun", val: 29 }].map(b => (
                      <div className="adm-bar-group" key={b.day}>
                        <div className="adm-bar-wrap">
                          <div className="adm-bar" style={{ height: `${b.val}%` }} />
                        </div>
                        <span className="adm-bar-label">{b.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="adm-chart-card">
                  <div className="adm-chart-header">
                    <h3>🔔 Recent Activity</h3>
                    <span className="adm-chart-badge">Live Feed</span>
                  </div>
                  <div className="adm-mini-logs">
                    {MOCK_LOGS.slice(0, 3).map(log => (
                      <div key={log.id} className="adm-log-item">
                        <div className="adm-log-icon" style={{ background: log.bg, color: log.color }}>{log.icon}</div>
                        <div className="adm-log-info">
                          <h4>{log.action}</h4>
                          <p>{log.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════ USERS ════════ */}
          {tab === "users" && (
            <div className="adm-view">
              <div className="adm-section-header">
                <div className="adm-section-badge">User Directory</div>
                <h2 className="adm-section-title">User Management</h2>
                <div className="adm-search-area" style={{ marginTop: "20px" }}>
                  <div className="adm-search-input-wrap">
                    <span className="adm-search-icon">🔍</span>
                    <input
                      className="adm-search-input"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="adm-action-btn" onClick={() => setShowAddUser(true)}>+ Add User</button>
                </div>
              </div>

              {(showAddUser || editingUser) && (
                <div className="adm-modal-overlay">
                  <div className="adm-modal">
                    <div className="adm-modal-header">
                      <h3>{editingUser ? "📝 Edit User" : "👤 Add New User"}</h3>
                      <button className="adm-close-btn" onClick={() => { setShowAddUser(false); setEditingUser(null); }}>✕</button>
                    </div>
                    <form className="adm-modal-body" onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
                      <div className="adm-form-group">
                        <label>Full Name</label>
                        <input className="adm-input" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} required />
                      </div>
                      <div className="adm-form-group">
                        <label>Email Address</label>
                        <input className="adm-input" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required />
                      </div>
                      <div className="adm-form-group">
                        <label>Role</label>
                        <select className="adm-input" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="adm-modal-footer">
                        <button type="button" className="adm-cancel-btn" onClick={() => { setShowAddUser(false); setEditingUser(null); }}>Cancel</button>
                        <button type="submit" className="adm-action-btn" disabled={loading}>{loading ? "Saving..." : (editingUser ? "Update User" : "Create User")}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-user-av" style={{ background: u.role === "admin" ? "#EEF2FF" : "#F1F5F9" }}>{u.name?.charAt(0) || "U"}</div>
                            <strong>{u.name}</strong>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td><span className={`adm-role-badge ${u.role}`}>{u.role}</span></td>
                        <td><span className={`adm-status-dot active`}>active</span></td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "2026-05-05"}</td>
                        <td style={{display: "flex", gap: "8px"}}>
                          <button className="adm-table-btn" onClick={() => startEdit(u)}>Edit</button>
                          <button className="adm-table-btn" style={{color: "#EF4444"}} onClick={() => deleteUser(u.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════ COURSES ════════ */}
          {tab === "courses" && (
            <div className="adm-view">
              <div className="adm-section-header">
                <div className="adm-section-badge">Academic</div>
                <h2 className="adm-section-title">Course Curriculum</h2>
                <div className="adm-search-area" style={{ marginTop: "20px" }}>
                  <div className="adm-search-input-wrap">
                    <span className="adm-search-icon">🔍</span>
                    <input
                      className="adm-search-input"
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="adm-action-btn" onClick={() => setShowAddCourse(true)}>+ Add Course</button>
                </div>
              </div>

              {showAddCourse && (
                <div className="adm-modal-overlay">
                  <div className="adm-modal">
                    <div className="adm-modal-header">
                      <h3>📚 Add New Course</h3>
                      <button className="adm-close-btn" onClick={() => setShowAddCourse(false)}>✕</button>
                    </div>
                    <form className="adm-modal-body" onSubmit={handleAddCourse}>
                      <div className="adm-form-group">
                        <label>Course Code</label>
                        <input className="adm-input" placeholder="e.g. CS101" value={courseForm.code} onChange={e => setCourseForm(f => ({ ...f, code: e.target.value }))} required />
                      </div>
                      <div className="adm-form-group">
                        <label>Course Title</label>
                        <input className="adm-input" placeholder="e.g. Introduction to AI" value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} required />
                      </div>
                      <div className="adm-form-group">
                        <label>Department</label>
                        <input className="adm-input" placeholder="e.g. Computer Science" value={courseForm.department} onChange={e => setCourseForm(f => ({ ...f, department: e.target.value }))} />
                      </div>
                      <div className="adm-form-group">
                        <label>Level</label>
                        <select className="adm-input" value={courseForm.level} onChange={e => setCourseForm(f => ({ ...f, level: e.target.value }))}>
                          <option value={1}>Level 1</option>
                          <option value={2}>Level 2</option>
                          <option value={3}>Level 3</option>
                        </select>
                      </div>
                      <div className="adm-modal-footer">
                        <button type="button" className="adm-cancel-btn" onClick={() => setShowAddCourse(false)}>Cancel</button>
                        <button type="submit" className="adm-action-btn" disabled={loading}>{loading ? "Saving..." : "Create Course"}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="adm-course-grid">
                {filteredCourses.map(c => (
                  <div key={c.code} className="adm-course-card">
                    <div className="adm-cc-header">
                      <span className="adm-cc-code">{c.code}</span>
                      <span className="adm-cc-level">Level {c.level}</span>
                    </div>
                    <h3 className="adm-cc-title">{c.title}</h3>
                    <p className="adm-cc-dept">{c.dept || c.department}</p>
                    <div className="adm-cc-footer">
                      <span className="adm-cc-students">👥 {c.students || 0} Students</span>
                      <button className="adm-table-btn">Modify</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ ML TRAINING ════════ */}
          {tab === "ml" && (
            <div className="adm-view">
              <div className="adm-section-header">
                <div className="adm-section-badge">AI Core</div>
                <h2 className="adm-section-title">Training Module</h2>
                <p className="adm-section-sub">Teach EduBot how to handle unrecognized student queries.</p>
              </div>

              <div className="adm-ml-layout">
                <div className="adm-ml-panel">
                  <div className="adm-ml-panel-header">
                    <h3>Unrecognized Questions</h3>
                    <span className="adm-tab-badge" style={{ background: "#F59E0B" }}>{questions.length} Pending</span>
                  </div>
                  <div className="adm-ml-list">
                    {questions.length === 0 ? (
                      <div style={{ padding: "4rem", textAlign: "center", color: "var(--slate-400)" }}>
                        <div style={{ fontSize: 64 }}>✨</div>
                        <p>All queries resolved! Bot is smart.</p>
                      </div>
                    ) : (
                      questions.map(q => (
                        <div key={q.id} className={`adm-ml-item ${training?.id === q.id ? "selected" : ""}`} onClick={() => openTraining(q)}>
                          <div className="adm-ml-item-q">"{q.question}"</div>
                          <div className="adm-ml-item-meta">
                            <span className="adm-badge-gold">Asked {q.times_asked}×</span>
                            <span className="adm-badge-gray">{new Date(q.asked_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="adm-train-container">
                  {training ? (
                    <div className="adm-train-panel">
                      <h3>🤖 Train EduBot</h3>
                      <div className="adm-train-question">
                        <small>Student Question:</small>
                        <p>"{training.question}"</p>
                      </div>

                      <div className="adm-form-group">
                        <label>Category (Intent Tag)</label>
                        <input className="adm-input" value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. library_access" />
                      </div>

                      <div className="adm-form-group">
                        <label>AI Response</label>
                        <textarea className="adm-textarea" rows={5} value={form.responses} onChange={e => setForm(f => ({ ...f, responses: e.target.value }))} placeholder="What should the bot say back?" />
                      </div>

                      <button className="adm-action-btn" onClick={submitTraining} style={{ width: "100%", padding: "16px" }}>
                        {loading ? "🔄 Training Core..." : "✅ Save to Knowledge Base"}
                      </button>
                    </div>
                  ) : (
                    <div className="adm-ml-empty-state" style={{ textAlign: "center", padding: "5rem 0" }}>
                      <div style={{ fontSize: 84 }}>🧠</div>
                      <h3 style={{ marginTop: "2rem" }}>Bot Intelligence Module</h3>
                      <p style={{ color: "var(--slate-500)" }}>Select a question from the left panel to begin teaching.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════ LOGS ════════ */}
          {tab === "logs" && (
            <div className="adm-view">
              <div className="adm-section-header">
                <div className="adm-section-badge">Security</div>
                <h2 className="adm-section-title">System Activity Logs</h2>
                <p className="adm-section-sub">Real-time audit trail of all administrative and system events.</p>
              </div>

              <div className="adm-log-list">
                {MOCK_LOGS.map(log => (
                  <div key={log.id} className="adm-log-item">
                    <div className="adm-log-icon" style={{ background: log.bg, color: log.color }}>{log.icon}</div>
                    <div className="adm-log-info">
                      <h4>{log.action}</h4>
                      <p>{log.details}</p>
                    </div>
                    <span className="adm-log-time">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ SETTINGS ════════ */}
          {tab === "settings" && (
            <div className="adm-view">
              <div className="adm-section-header">
                <div className="adm-section-badge">System</div>
                <h2 className="adm-section-title">Admin Settings</h2>
              </div>

              <div className="adm-chart-card" style={{ maxWidth: "600px" }}>
                <div className="adm-form-group">
                  <label>Bot Name</label>
                  <input className="adm-input" defaultValue="EduBot AI" />
                </div>
                <div className="adm-form-group">
                  <label>Primary AI Model</label>
                  <select className="adm-input">
                    <option>NLP-Engine v2.1 (Local)</option>
                    <option>GPT-4o Integration</option>
                    <option>Claude 3.5 Integration</option>
                  </select>
                </div>
                <div className="adm-form-group">
                  <label>Session Timeout (Minutes)</label>
                  <input className="adm-input" type="number" defaultValue="30" />
                </div>
                <button className="adm-action-btn">Update System Config</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
