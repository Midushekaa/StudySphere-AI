import { useState, useEffect } from "react";
import "./CoursesPage.css";

const API = "http://localhost:5000/api";

// Beautiful gradient covers for each course
const COURSE_VISUALS = {
  "CS301": { gradient:"linear-gradient(135deg,#667eea,#764ba2)", emoji:"🤖", color:"#667eea" },
  "CS401": { gradient:"linear-gradient(135deg,#f093fb,#f5576c)", emoji:"🧠", color:"#f093fb" },
  "WEB201":{ gradient:"linear-gradient(135deg,#4facfe,#00f2fe)", emoji:"🌐", color:"#4facfe" },
  "CS201": { gradient:"linear-gradient(135deg,#43e97b,#38f9d7)", emoji:"📊", color:"#43e97b" },
  "DB101": { gradient:"linear-gradient(135deg,#fa709a,#fee140)", emoji:"🗄️", color:"#fa709a" },
  "NET101":{ gradient:"linear-gradient(135deg,#a18cd1,#fbc2eb)", emoji:"🔗", color:"#a18cd1" },
  "CS101": { gradient:"linear-gradient(135deg,#ffecd2,#fcb69f)", emoji:"💻", color:"#fcb69f" },
  "CS302": { gradient:"linear-gradient(135deg,#a1c4fd,#c2e9fb)", emoji:"⚙️", color:"#a1c4fd" },
  "MATH101":{ gradient:"linear-gradient(135deg,#fddb92,#d1fdff)", emoji:"🔢", color:"#fddb92" },
  "MATH201":{ gradient:"linear-gradient(135deg,#96fbc4,#f9f586)", emoji:"📈", color:"#96fbc4" },
};

const TRENDING_TAGS = {
  "CS301": "🔥 Most Popular",
  "CS401": "⭐ Top Rated",
  "WEB201":"🚀 Trending",
  "CS201": "💡 Essential",
  "DB101": "🎯 In Demand",
  "NET101":"🛠️ Practical",
};

const STUDENT_COUNTS = {
  "CS301":"2,431","CS401":"1,203","WEB201":"3,102",
  "CS201":"1,847","DB101":"1,523","NET101":"987",
  "CS101":"4,210","CS302":"1,334","MATH101":"892","MATH201":"743",
};

export default function CoursesPage({ user }) {
  const [courses,   setCourses]   = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/courses`).then(r => r.json()).catch(()=>[]),
      fetch(`${API}/deadlines`).then(r => r.json()).catch(()=>[]),
    ]).then(([c, d]) => {
      setCourses(Array.isArray(c) ? c : []);
      setDeadlines(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(e => { setError("Cannot connect to server."); setLoading(false); });
  }, []);

  const departments = ["all", ...new Set(courses.map(c => c.department))];
  const filtered = courses.filter(c => {
    const matchDept  = filter === "all" || c.department === filter;
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  const getVisual = (code) => COURSE_VISUALS[code] || { gradient:"linear-gradient(135deg,#667eea,#764ba2)", emoji:"📚", color:"#667eea" };
  const urgencyColor = (days) => days <= 3 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#22c55e";
  const courseDeadlines = (code) => deadlines.filter(d => d.code === code);

  if (loading) return (
    <div className="cp-loading">
      <div className="cp-spinner"/>
      <p>Loading courses from database…</p>
    </div>
  );

  if (error) return (
    <div className="cp-loading">
      <div style={{fontSize:48}}>⚠️</div>
      <p style={{color:"#ef4444"}}>{error}</p>
      <p style={{fontSize:13,color:"#94a3b8"}}>Make sure Flask is running on port 5000</p>
    </div>
  );

  return (
    <div className="cp-root">

      {/* ── Page header ── */}
      <div className="cp-header">
        <div>
          <div className="cp-header-badge">COURSE INTEGRATION</div>
          <h1 className="cp-header-title">Seamlessly Connected<br/>to Your <span>Studies</span></h1>
          <p className="cp-header-sub">
            EduBot integrates directly with your university's course catalogue.
            Access timetables, lecturer info, deadlines, and room details instantly.
          </p>
        </div>
        <div className="cp-header-stats">
          <div className="cp-hstat"><span>{courses.length}</span><small>Courses</small></div>
          <div className="cp-hstat"><span>{deadlines.length}</span><small>Deadlines</small></div>
          <div className="cp-hstat"><span>{departments.length-1}</span><small>Departments</small></div>
        </div>
      </div>

      {/* ── Deadlines strip ── */}
      {deadlines.length > 0 && (
        <div className="cp-deadlines-strip">
          <span className="cp-dl-label">⏰ Upcoming Deadlines</span>
          <div className="cp-dl-chips">
            {deadlines.slice(0,6).map((d,i) => (
              <div key={i} className="cp-dl-chip" style={{borderColor: urgencyColor(d.days_left)+"44", background: urgencyColor(d.days_left)+"11"}}>
                <span style={{color: urgencyColor(d.days_left)}}>●</span>
                <strong>{d.code}</strong>
                <span>{d.assignment_title}</span>
                <span className="cp-dl-days" style={{color: urgencyColor(d.days_left)}}>{d.days_left}d</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="cp-toolbar">
        <div className="cp-search-wrap">
          <span className="cp-search-icon">🔍</span>
          <input
            className="cp-search"
            type="text"
            placeholder="Search by course name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="cp-search-clear" onClick={() => setSearch("")}>✕</button>}
        </div>
        <div className="cp-dept-filters">
          {departments.map(d => (
            <button
              key={d}
              className={`cp-dept-btn ${filter===d?"active":""}`}
              onClick={() => setFilter(d)}
            >
              {d === "all" ? "All Courses" : d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Course grid ── */}
      {filtered.length === 0 ? (
        <div className="cp-empty">
          <div style={{fontSize:52}}>🔍</div>
          <h3>No courses found</h3>
          <p>Try a different search term or filter</p>
        </div>
      ) : (
        <div className="cp-grid">
          {filtered.map(course => {
            const vis  = getVisual(course.code);
            const dl   = courseDeadlines(course.code);
            const tag  = TRENDING_TAGS[course.code];
            const stud = STUDENT_COUNTS[course.code] || "500+";
            const isSel = selected?.id === course.id;

            return (
              <div key={course.id} className={`cp-card ${isSel?"selected":""}`}>
                {/* Card image area */}
                <div className="cp-card-cover" style={{background: vis.gradient}}
                  onClick={() => setSelected(isSel ? null : course)}>
                  <div className="cp-card-cover-emoji">{vis.emoji}</div>
                  {tag && <div className="cp-card-tag">{tag}</div>}
                  <div className="cp-card-level">Level {course.level}</div>
                </div>

                {/* Card body */}
                <div className="cp-card-body" onClick={() => setSelected(isSel ? null : course)}>
                  <div className="cp-card-code" style={{color: vis.color}}>{course.code}</div>
                  <h3 className="cp-card-title">{course.title}</h3>
                  <p className="cp-card-dept">🏛️ {course.department}</p>

                  <div className="cp-card-meta">
                    <span>👥 {stud} students</span>
                    <span>🏆 {course.credits} credits</span>
                    <span>⭐ {(4.5 + Math.random()*0.4).toFixed(1)}</span>
                  </div>

                  {dl.length > 0 && (
                    <div className="cp-card-deadline" style={{color: urgencyColor(dl[0].days_left)}}>
                      📅 Next deadline: {dl[0].days_left} days
                    </div>
                  )}

                  <button className="cp-card-cta" style={{background: vis.gradient}}>
                    {isSel ? "▲ Hide Details" : "View Details →"}
                  </button>
                </div>

                {/* Expanded details */}
                {isSel && (
                  <div className="cp-expanded">
                    <div className="cp-expanded-grid">
                      <div className="cp-exp-item">
                        <div className="cp-exp-icon">👨‍🏫</div>
                        <div><div className="cp-exp-label">Lecturer</div><div className="cp-exp-val">{course.lecturer}</div></div>
                      </div>
                      <div className="cp-exp-item">
                        <div className="cp-exp-icon">📍</div>
                        <div><div className="cp-exp-label">Room</div><div className="cp-exp-val">{course.room}</div></div>
                      </div>
                      <div className="cp-exp-item" style={{gridColumn:"1/-1"}}>
                        <div className="cp-exp-icon">🕐</div>
                        <div><div className="cp-exp-label">Schedule</div><div className="cp-exp-val">{course.schedule}</div></div>
                      </div>
                    </div>

                    {course.description && (
                      <div className="cp-exp-desc">
                        <div className="cp-exp-label">📝 About this course</div>
                        <p>{course.description}</p>
                      </div>
                    )}

                    {dl.length > 0 && (
                      <div className="cp-exp-deadlines">
                        <div className="cp-exp-label">📅 Assignments</div>
                        {dl.map((d,i) => (
                          <div key={i} className="cp-exp-dl-row"
                            style={{borderLeft:`3px solid ${urgencyColor(d.days_left)}`}}>
                            <span>{d.assignment_title}</span>
                            <span className="cp-exp-dl-date" style={{color: urgencyColor(d.days_left)}}>
                              {d.due_date} · {d.days_left}d left · {d.weight_percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button className="cp-collapse-btn" onClick={() => setSelected(null)}>
                      ▲ Collapse
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
