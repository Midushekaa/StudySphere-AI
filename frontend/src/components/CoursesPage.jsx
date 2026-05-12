import { useState, useEffect } from "react";
import "./CoursesPage.css";

const API = "http://localhost:5000/api";

export default function CoursesPage() {
  const [courses,    setCourses]    = useState([]);
  const [deadlines,  setDeadlines]  = useState([]);
  const [filter,     setFilter]     = useState("all");
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/courses`).then(r => r.json()),
      fetch(`${API}/deadlines`).then(r => r.json()),
    ]).then(([c, d]) => { setCourses(c); setDeadlines(d); setLoading(false); });
  }, []);

  const departments = ["all", ...new Set(courses.map(c => c.department))];
  const filtered = filter === "all" ? courses : courses.filter(c => c.department === filter);

  const urgency = (days) => days <= 3 ? "red" : days <= 7 ? "amber" : "green";
  const urgencyIcon = (days) => days <= 3 ? "🔴" : days <= 7 ? "🟡" : "🟢";

  if (loading) return <div className="loading">Loading courses…</div>;

  return (
    <div className="courses-layout">

      {/* ── Deadlines strip ── */}
      {deadlines.length > 0 && (
        <div className="deadlines-strip">
          <span className="strip-title">⏰ Upcoming deadlines:</span>
          {deadlines.slice(0, 4).map(d => (
            <div key={d.assignment_title} className={`deadline-chip urgency-${urgency(d.days_left)}`}>
              {urgencyIcon(d.days_left)} <strong>{d.code}</strong> — {d.assignment_title} ({d.days_left}d)
            </div>
          ))}
        </div>
      )}

      <div className="courses-body">

        {/* ── Filter ── */}
        <div className="filter-bar">
          {departments.map(d => (
            <button
              key={d}
              className={`filter-btn ${filter === d ? "active" : ""}`}
              onClick={() => setFilter(d)}
            >
              {d === "all" ? "All Departments" : d}
            </button>
          ))}
        </div>

        {/* ── Course grid ── */}
        <div className="courses-grid">
          {filtered.map(course => (
            <div
              key={course.id}
              className={`course-card card ${selected?.id === course.id ? "selected" : ""}`}
              onClick={() => setSelected(selected?.id === course.id ? null : course)}
            >
              <div className="course-top">
                <span className="course-code">{course.code}</span>
                <span className="badge badge-blue">Level {course.level}</span>
              </div>
              <h3 className="course-title">{course.title}</h3>
              <p className="course-dept">{course.department}</p>

              {selected?.id === course.id && (
                <div className="course-detail">
                  <div className="detail-row"><span>👨‍🏫</span><span>{course.lecturer}</span></div>
                  <div className="detail-row"><span>🕐</span><span>{course.schedule}</span></div>
                  <div className="detail-row"><span>📍</span><span>{course.room}</span></div>
                  <div className="detail-row"><span>📝</span><span>{course.description}</span></div>
                  <div className="detail-row"><span>🏆</span><span>{course.credits} credits</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
