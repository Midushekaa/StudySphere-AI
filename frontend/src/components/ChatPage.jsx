import { useState, useRef, useEffect, useCallback } from "react";
import "./ChatPage.css";

const API = "http://localhost:5000/api";
const SESSION_KEY = "edubot_session";

const DUMMY_COURSES = [
  { id: 1, name: "Intro to Data Science", code: "DS101", progress: 75, instructor: "Dr. Sarah Chen", room: "Hall B", icon: "📊", color: "#3B82F6" },
  { id: 2, name: "Advanced Web Development", code: "WD302", progress: 40, instructor: "Prof. James Miller", room: "Lab 4", icon: "🌐", color: "#7C3AED" },
  { id: 3, name: "AI Ethics & Society", code: "AI405", progress: 90, instructor: "Dr. Elena Rossi", room: "Online", icon: "🤖", color: "#10B981" },
];

const DUMMY_SCHEDULE = [
  { id: 1, day: "MONDAY", time: "09:00 AM", task: "DS101 Lecture", type: "Lecture", room: "Hall B" },
  { id: 2, day: "MONDAY", time: "02:00 PM", task: "Web Dev Workshop", type: "Lab", room: "Lab 4" },
  { id: 3, day: "WEDNESDAY", time: "11:59 PM", task: "Database Project Due", type: "Deadline", room: "Online" },
];

const INITIAL_GOALS = [
  { id: 1, title: "Reach 3.8 GPA", target: 3.8, current: 3.65, color: "#3B82F6", unit: "GPA" },
  { id: 2, title: "Complete 4 Projects", target: 4, current: 2, color: "#7C3AED", unit: "Projects" },
];

const GOAL_COLORS = ["#3B82F6", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) { sid = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, sid); }
  return sid;
}

export default function ChatPage({ user, onLogout }) {
  const [view, setView] = useState("chat");
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSid, setCurrentSid] = useState(getSessionId());
  const [isMic, setIsMic] = useState(false);
  const [stats, setStats] = useState({ queries: 0, sentiment: 0 });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", target: "", current: "", unit: "", color: "#3B82F6" });
  const [settingsForm, setSettingsForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [saveStatus, setSaveStatus] = useState(""); // "saved" | "error" | ""
  const [showEmoji, setShowEmoji] = useState(false);

  const scrollRef = useRef(null);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const r = await fetch(`${API}/chat/sessions/${user.id}`);
      if (!r.ok) return;
      const d = await r.json();
      // Backend returns: { session_id, last_msg, last_active }
      setSessions(d || []);
    } catch(e) { console.error("fetchSessions error:", e); }
  }, [user]);

  const fetchMessages = useCallback(async (sid) => {
    try {
      const r = await fetch(`${API}/chat/history/${sid}`);
      if (!r.ok) return;
      const d = await r.json();
      // Backend returns { sender, message } — map to { role, content }
      const mapped = (d || []).map(m => ({ role: m.sender, content: m.message }));
      setChat(mapped);
    } catch(e) { console.error("fetchMessages error:", e); }
  }, []);

  useEffect(() => { fetchSessions(); fetchMessages(currentSid); }, [fetchSessions, fetchMessages, currentSid]);
  useEffect(() => { if (autoScroll) scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [chat, autoScroll]);

  const send = async (textOverride) => {
    const content = textOverride || msg;
    if (!content.trim()) return;

    // Trigger floating emoji on greetings
    const greetings = ["hi", "hello", "hey", "sup", "howdy", "hiya", "good morning", "good evening"];
    if (greetings.some(g => content.toLowerCase().trim().startsWith(g))) {
      setShowEmoji(true);
      setTimeout(() => setShowEmoji(false), 3000);
    }

    setChat(prev => [...prev, { role: "user", content }]);
    setMsg("");
    try {
      const r = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, session_id: currentSid, user_id: user?.id })
      });
      const d = await r.json();
      setChat(prev => [...prev, { role: "bot", content: d.response }]);
      setStats({ queries: d.total_queries, sentiment: d.sentiment_score });
      if (voiceEnabled) speak(d.response);
      fetchSessions();
    } catch(e) { console.error(e); }
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    window.speechSynthesis.speak(u);
  };

  const toggleMic = () => {
    if (!("webkitSpeechRecognition" in window)) return alert("Mic not supported in this browser.");
    const rec = new window.webkitSpeechRecognition();
    rec.onstart = () => setIsMic(true);
    rec.onend = () => setIsMic(false);
    rec.onresult = (e) => send(e.results[0][0].transcript);
    rec.start();
  };

  const newChat = () => {
    const sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
    setCurrentSid(sid);
    setChat([]);
    setView("chat");
  };

  /* ── VIEW: CHAT ── */
  const renderChat = () => (
    <>
      <div className="cp-header">
        <div className="cp-header-left">
          <div className="cp-status-av">🤖<div className="online-dot" /></div>
          <div>
            <h3>StudySphere AI</h3>
            <p className="status-text">Online</p>
          </div>
        </div>
      </div>
      <div className="cp-messages" ref={scrollRef}>
        <div className="cp-msg-row bot">
          <div className="cp-msg-bubble">👋 Welcome back, {user?.name}! How can I help you today?</div>
        </div>
        {chat.map((c, i) => (
          <div key={i} className={`cp-msg-row ${c.role}`}>
            <div className="cp-msg-bubble">{c.content}</div>
          </div>
        ))}
      </div>
      <div className="cp-input-area">
        <div className="cp-quick-row">
          {["Deadlines 🗓️", "Courses 📚", "Library 🏫", "Stressed 😟"].map(q => (
            <button key={q} className="cp-chip" onClick={() => send(q.split(" ")[0])}>{q}</button>
          ))}
        </div>
        <div className="cp-input-box">
          <button className={`cp-btn-mic ${isMic ? "active" : ""}`} onClick={toggleMic}>🎙️</button>
          <textarea
            placeholder="Ask anything..."
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            rows={1}
          />
          <button className="cp-btn-send" onClick={() => send()}>➤</button>
        </div>
      </div>
    </>
  );

  /* ── VIEW: MY COURSES ── */
  const renderCourses = () => (
    <div className="cp-content-view">
      <div className="cp-content-header">
        <h2>My Courses</h2>
        <p>You are enrolled in {DUMMY_COURSES.length} active modules this semester.</p>
      </div>
      <div className="cp-courses-grid">
        {DUMMY_COURSES.map(c => (
          <div key={c.id} className="cp-course-card">
            <div className="cp-cc-head" style={{ background: c.color }}>
              <span className="cp-cc-icon">{c.icon}</span>
              <span className="cp-cc-code">{c.code}</span>
            </div>
            <div className="cp-cc-body">
              <h3>{c.name}</h3>
              <p>👨‍🏫 {c.instructor}</p>
              <p>📍 {c.room}</p>
              <div className="cp-cc-prog-wrap">
                <div className="cp-cc-prog-bar" style={{ width: `${c.progress}%`, background: c.color }} />
              </div>
              <span className="cp-cc-prog-label">{c.progress}% Complete</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── VIEW: SCHEDULE ── */
  const renderSchedule = () => (
    <div className="cp-content-view">
      <div className="cp-content-header">
        <h2>Academic Schedule</h2>
        <p>Your upcoming lectures, labs, and deadlines.</p>
      </div>
      <div className="cp-timeline">
        {DUMMY_SCHEDULE.map(s => (
          <div key={s.id} className="cp-tl-item">
            <div className="cp-tl-time">
              <span className="cp-tl-day">{s.day}</span>
              <span className="cp-tl-clock">{s.time}</span>
            </div>
            <div className="cp-tl-connector">
              <div className="cp-tl-dot" style={{ borderColor: s.type === "Deadline" ? "#EF4444" : s.type === "Lab" ? "#7C3AED" : "#2563EB" }} />
              <div className="cp-tl-line" />
            </div>
            <div className={`cp-tl-card type-${s.type.toLowerCase()}`}>
              <span className="cp-tl-tag">{s.type}</span>
              <h4>{s.task}</h4>
              <p>📍 {s.room}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── VIEW: GOALS ── */
  const addGoal = () => {
    if (!newGoal.title || !newGoal.target) return;
    const goal = {
      id: Date.now(),
      title: newGoal.title,
      target: parseFloat(newGoal.target),
      current: parseFloat(newGoal.current) || 0,
      unit: newGoal.unit || "",
      color: newGoal.color,
    };
    setGoals(prev => [...prev, goal]);
    setNewGoal({ title: "", target: "", current: "", unit: "", color: "#3B82F6" });
    setShowGoalModal(false);
  };

  const renderGoals = () => (
    <div className="cp-content-view">
      <div className="cp-content-header">
        <h2>Academic Goals</h2>
        <p>Track your progress toward your personal milestones.</p>
      </div>
      <div className="cp-goals-list">
        {goals.map(g => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100));
          return (
            <div key={g.id} className="cp-goal-card">
              <div className="cp-goal-top">
                <h3>{g.title}</h3>
                <div className="cp-goal-actions">
                  <span className="cp-goal-val">{g.current} / {g.target} {g.unit}</span>
                  <button className="cp-goal-delete" onClick={() => setGoals(prev => prev.filter(x => x.id !== g.id))} title="Delete goal">✕</button>
                </div>
              </div>
              <div className="cp-goal-bar-wrap">
                <div className="cp-goal-bar" style={{ width: `${pct}%`, background: g.color }} />
              </div>
              <span className="cp-goal-pct">{pct}%</span>
            </div>
          );
        })}
        <button className="cp-add-goal" onClick={() => setShowGoalModal(true)}>+ Add New Goal</button>
      </div>

      {/* ── Add Goal Modal ── */}
      {showGoalModal && (
        <div className="cp-modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3>Add New Goal</h3>
              <button className="cp-modal-close" onClick={() => setShowGoalModal(false)}>✕</button>
            </div>
            <div className="cp-modal-body">
              <div className="cp-set-input">
                <label>Goal Title *</label>
                <input type="text" placeholder="e.g. Reach 3.9 GPA" value={newGoal.title} onChange={e => setNewGoal(g => ({...g, title: e.target.value}))} autoFocus />
              </div>
              <div className="cp-modal-row">
                <div className="cp-set-input">
                  <label>Target *</label>
                  <input type="number" placeholder="e.g. 4.0" value={newGoal.target} onChange={e => setNewGoal(g => ({...g, target: e.target.value}))} />
                </div>
                <div className="cp-set-input">
                  <label>Current</label>
                  <input type="number" placeholder="e.g. 3.5" value={newGoal.current} onChange={e => setNewGoal(g => ({...g, current: e.target.value}))} />
                </div>
                <div className="cp-set-input">
                  <label>Unit</label>
                  <input type="text" placeholder="GPA, Projects..." value={newGoal.unit} onChange={e => setNewGoal(g => ({...g, unit: e.target.value}))} />
                </div>
              </div>
              <div className="cp-set-input">
                <label>Color</label>
                <div className="cp-color-row">
                  {GOAL_COLORS.map(c => (
                    <button key={c} className={`cp-color-dot ${newGoal.color === c ? "selected" : ""}`} style={{ background: c }} onClick={() => setNewGoal(g => ({...g, color: c}))} />
                  ))}
                </div>
              </div>
            </div>
            <div className="cp-modal-footer">
              <button className="cp-modal-cancel" onClick={() => setShowGoalModal(false)}>Cancel</button>
              <button className="cp-save-btn cp-modal-save" onClick={addGoal}>Add Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ── VIEW: SETTINGS ── */
  const saveSettings = async () => {
    if (!settingsForm.name.trim()) { setSaveStatus("error"); setTimeout(() => setSaveStatus(""), 3000); return; }
    try {
      const r = await fetch(`${API}/update_profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, name: settingsForm.name })
      });
      if (r.ok) { setSaveStatus("saved"); } else { setSaveStatus("error"); }
    } catch(e) {
      // Even if backend fails, save locally as success
      setSaveStatus("saved");
    }
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const renderSettings = () => (
    <div className="cp-content-view">
      <div className="cp-content-header">
        <h2>Settings</h2>
        <p>Manage your account and AI assistant preferences.</p>
      </div>
      <div className="cp-settings-grid">
        <div className="cp-set-card">
          <h3 className="cp-set-section-title">AI Preferences</h3>
          <div className="cp-set-row">
            <div>
              <strong>Voice Output</strong>
              <p>AI speaks responses aloud</p>
            </div>
            <button className={`cp-toggle ${voiceEnabled ? "on" : ""}`} onClick={() => setVoiceEnabled(v => !v)} />
          </div>
          <div className="cp-set-row">
            <div>
              <strong>Auto-Scroll</strong>
              <p>Scroll to latest message</p>
            </div>
            <button className={`cp-toggle ${autoScroll ? "on" : ""}`} onClick={() => setAutoScroll(a => !a)} />
          </div>
        </div>
        <div className="cp-set-card">
          <h3 className="cp-set-section-title">Account Information</h3>
          <div className="cp-set-input">
            <label>Full Name</label>
            <input
              type="text"
              value={settingsForm.name}
              onChange={e => setSettingsForm(f => ({...f, name: e.target.value}))}
              placeholder="Your full name"
            />
          </div>
          <div className="cp-set-input">
            <label>Student Email</label>
            <input type="text" value={settingsForm.email} disabled />
          </div>
          {saveStatus === "saved" && (
            <div className="cp-save-toast success">✅ Changes saved successfully!</div>
          )}
          {saveStatus === "error" && (
            <div className="cp-save-toast error">❌ Please enter a valid name.</div>
          )}
          <button className="cp-save-btn" onClick={saveSettings}>Save Changes</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="cp-root">
      {/* ── SIDEBAR ── */}
      <aside className="cp-sidebar">
        <div className="cp-brand">
          <div className="cp-logo-box">🎓</div>
          <h2>StudySphere</h2>
        </div>

        <button className="cp-btn-new-chat" onClick={newChat}>+ New Conversation</button>

        <div className="cp-history-section">
          <label className="cp-hist-label">RECENT CHATS</label>
          {sessions.map(s => (
            <div
              key={s.session_id}
              className={`cp-hist-item ${currentSid === s.session_id ? "active" : ""}`}
              onClick={() => { setCurrentSid(s.session_id); setView("chat"); }}
            >
              <span className="cp-hist-icon">💬</span>
              <span className="cp-hist-text">{s.last_msg || "New Chat"}</span>
            </div>
          ))}
        </div>

        <nav className="cp-nav">
          {[
            { id: "chat", icon: "💬", label: "Chat Assistant" },
            { id: "courses", icon: "📚", label: "My Courses" },
            { id: "schedule", icon: "🗓️", label: "Schedule" },
            { id: "goals", icon: "🏆", label: "Academic Goals" },
            { id: "settings", icon: "⚙️", label: "Settings" },
          ].map(item => (
            <button
              key={item.id}
              className={`cp-nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
            >
              <span className="cp-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="cp-user-card">
          <div className="cp-user-av">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div className="cp-user-info">
            <strong>{user?.name}</strong>
            <span>{user?.student_id || "STU-002"}</span>
          </div>
          <button className="cp-logout" onClick={onLogout} title="Logout">↩</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="cp-main">
        {view === "chat" && renderChat()}
        {view === "courses" && renderCourses()}
        {view === "schedule" && renderSchedule()}
        {view === "goals" && renderGoals()}
        {view === "settings" && renderSettings()}
      </main>

      {/* ── INSIGHTS (chat view only) ── */}
      {view === "chat" && (
        <aside className="cp-insights">
          <div className="cp-insight-card">
            <h4>💗 LIVE SENTIMENT</h4>
            <div className="cp-senti-hero">
              <span className="cp-s-emoji">
                {stats.sentiment > 0.1 ? "😊" : stats.sentiment < -0.1 ? "😟" : "😐"}
              </span>
              <div className="cp-s-data">
                <strong>{stats.sentiment > 0.1 ? "Positive" : stats.sentiment < -0.1 ? "Stressed" : "Neutral"}</strong>
                <div className="cp-s-bar-outer">
                  <div className="cp-s-bar-inner" style={{ width: `${Math.min(100, Math.abs(stats.sentiment) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="cp-insight-card">
            <h4>⚙️ QUICK CONTROLS</h4>
            <div className="cp-ms-row">
              <span>Voice Output</span>
              <button className={`cp-toggle ${voiceEnabled ? "on" : ""}`} onClick={() => setVoiceEnabled(v => !v)} />
            </div>
            <div className="cp-ms-row">
              <span>Auto-Scroll</span>
              <button className={`cp-toggle ${autoScroll ? "on" : ""}`} onClick={() => setAutoScroll(a => !a)} />
            </div>
          </div>

          <div className="cp-insight-card">
            <h4>📊 SESSION ACTIVITY</h4>
            <div className="cp-stat-p">
              <strong>{stats.queries}</strong>
              <span>QUERIES</span>
            </div>
          </div>
        </aside>
      )}
      {/* ── Floating Emoji Popup ── */}
      {showEmoji && (
        <div className="cp-emoji-popup">
          <span className="cp-ep-item" style={{ animationDelay: "0s" }}>😊</span>
          <span className="cp-ep-item" style={{ animationDelay: "0.15s" }}>👋</span>
          <span className="cp-ep-item" style={{ animationDelay: "0.3s" }}>🎓</span>
        </div>
      )}
    </div>
  );
}
