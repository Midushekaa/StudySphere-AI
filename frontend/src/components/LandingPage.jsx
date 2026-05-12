import { useState, useEffect } from "react";
import "./LandingPage.css";

const FEATURES = [
  { icon:"💬", title:"Smart AI Chat",     desc:"Ask anything about courses, deadlines, campus life — get instant intelligent answers powered by NLP." },
  { icon:"🎤", title:"Voice Interaction",  desc:"Speak your questions hands-free. StudySphere listens, understands, and talks back to you." },
  { icon:"🧠", title:"Sentiment Detection",desc:"StudySphere reads your emotional tone and responds with empathy when you're stressed or overwhelmed." },
  { icon:"📅", title:"Deadline Tracker",    desc:"Never miss a submission. StudySphere knows every assignment deadline and warns you in advance." },
  { icon:"🎓", title:"Course Explorer",    desc:"Browse all modules, timetables, lecturers and rooms — all in one place." },
  { icon:"🤖", title:"Self-Learning",      desc:"StudySphere learns from every unanswered question. Admins can teach it new answers in real-time." },
];

const MODULES = [
  { 
    title: "Introduction to Artificial Intelligence", 
    desc: "Learn the fundamentals of AI, machine learning algorithms, and neural networks.",
    img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"
  },
  { 
    title: "Advanced Data Structures", 
    desc: "Master complex data structures and algorithms to solve real-world problems efficiently.",
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=800"
  },
  { 
    title: "Web Development Bootcamp", 
    desc: "Build modern, responsive full-stack web applications using React and Node.js.",
    img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800"
  },
];

export default function LandingPage({ onGoLogin, onGoRegister }) {
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({ name:"", email:"", message:"" });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = (e) => {
    e.preventDefault();
    alert("Message sent! We will get back to you soon.");
    setFormData({ name:"", email:"", message:"" });
  };

  return (
    <div className="lp-root">
      {/* ── Navbar ── */}
      <nav className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <span className="lp-logo-img">🎓</span>
            <span className="lp-brand-name">StudySphere</span>
          </div>
          <div className="lp-nav-links">
            {["Home", "About", "Vision", "Course", "Story", "Contact"].map(item => (
              <button key={item} className="lp-nav-link" onClick={() => scrollTo(item.toLowerCase())}>{item}</button>
            ))}
          </div>
          <div className="lp-nav-actions">
            <button className="lp-btn-signin" onClick={onGoLogin}>Sign In</button>
            <button className="lp-btn-register" onClick={onGoRegister}>Register</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero" id="home">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-hero-badge">✨ AI-Powered Student Assistant</div>
            <h1 className="lp-hero-title">
              Unlock your<br/>
              <span className="lp-hero-gradient">Academic potential</span>
            </h1>
            <p className="lp-hero-sub">
              Experience the future of university life with StudySphere.
              Instant answers, smart tracking, and empathetic AI support
              designed for the modern student.
            </p>
            <div className="lp-hero-btns">
              <button className="lp-btn-primary" onClick={onGoRegister}>Start Your Journey</button>
              <button className="lp-btn-secondary" onClick={() => scrollTo("features")}>Explore Features</button>
            </div>
          </div>

          <div className="lp-hero-mockup">
            <div className="lp-mockup-window">
              <div className="lp-mockup-header">
                <span className="dot r"/><span className="dot y"/><span className="dot g"/>
              </div>
              <div className="lp-mockup-content">
                <div className="lp-mock-msg bot">
                  <span className="lp-mock-av">🤖</span>
                  <div className="lp-mock-bubble">Hi Sarah! Ready to crush your deadlines today? 🚀</div>
                </div>
                <div className="lp-mock-msg user">
                  <div className="lp-mock-bubble">I'm feeling a bit overwhelmed with assignments 🤯</div>
                </div>
                <div className="lp-mock-msg bot">
                  <span className="lp-mock-av">🤖</span>
                  <div className="lp-mock-bubble">
                    <span className="lp-empathy-badge">💙 Empathy Mode: Active</span>
                    I hear you. Let's break it down. Your AI Assignment is due in 12 days. Want to create a study plan together?
                  </div>
                </div>
              </div>
              <div className="lp-mockup-footer">
                <span>Type a message...</span>
                <span className="lp-mock-send">➤</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-hero-stats">
          <div className="lp-stat"><strong>20+</strong><span>AI INTENTS</span></div>
          <div className="lp-stat"><strong>10</strong><span>COURSES</span></div>
          <div className="lp-stat"><strong>NLP</strong><span>POWERED ENGINE</span></div>
          <div className="lp-stat"><strong>24/7</strong><span>ALWAYS AVAILABLE</span></div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section lp-features" id="features">
        <div className="lp-section-header">
          <div className="lp-section-badge">INTELLIGENT FEATURES</div>
          <h2 className="lp-section-title">Designed for the<br/>Digital-First Student</h2>
          <p className="lp-section-sub">StudySphere isn't just a chatbot. It's a comprehensive ecosystem that understands your needs and supports your growth.</p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="lp-f-card">
              <div className="lp-f-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="lp-section lp-vision" id="vision">
        <div className="lp-vision-card">
          <div className="lp-vision-badge">OUR VISION</div>
          <h2 className="lp-vision-title">Empowering every student<br/>to reach their full potential.</h2>
          <p className="lp-vision-text">
            We believe university life should be about learning and growth, not navigating complex logistics.
            Our vision is to build a world where every student has a personal AI companion that makes higher
            education more accessible, efficient, and empathetic.
          </p>
          <div className="lp-vision-stats">
            <div className="lp-v-stat"><strong>100%</strong><span>ACCESSIBILITY</span></div>
            <div className="lp-v-stat"><strong>24/7</strong><span>SUPPORT</span></div>
            <div className="lp-v-stat"><strong>AI</strong><span>DRIVEN</span></div>
          </div>
        </div>
      </section>

      {/* ── Courses ── */}
      <section className="lp-section lp-courses" id="course">
        <div className="lp-section-header">
          <h2 className="lp-section-title">Explore Trending Modules</h2>
          <p className="lp-section-sub">Stay ahead of the curve with our most popular academic pathways.</p>
        </div>
        <div className="lp-courses-grid">
          {MODULES.map(m => (
            <div key={m.title} className="lp-m-card">
              <div className="lp-m-img"><img src={m.img} alt={m.title}/></div>
              <div className="lp-m-body">
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Community / Story ── */}
      <section className="lp-section lp-community" id="story">
        <div className="lp-community-inner">
          <h2 className="lp-section-title">Hear from our community</h2>
          <div className="lp-story-row">
            <div className="lp-story-visual">
              <img src="/students_studying_library.png" alt="Students in library" />
              <div className="lp-quote-circle">❝</div>
            </div>
            <div className="lp-story-content">
              <p className="lp-quote-text">
                "StudySphere has completely transformed how I manage my studies.
                It's like having a personal tutor, an advisor, and a friend all rolled into one
                smart interface. I finally feel in control of my university life."
              </p>
              <div className="lp-author">
                <div className="lp-author-av">SJ</div>
                <div className="lp-author-info">
                  <strong>Sarah Jenkins</strong>
                  <span>BSc Computer Science, Final Year</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="lp-section lp-contact" id="contact">
        <div className="lp-contact-inner">
          <div className="lp-contact-info">
            <div className="lp-section-badge">CONNECT</div>
            <h2 className="lp-section-title">Let's build the<br/>future together</h2>
            <div className="lp-contact-list">
              <div className="lp-contact-item">
                <span className="icon">👤</span>
                <div className="data"><strong>Project Manager:</strong> B-18 Team Lead</div>
              </div>
              <div className="lp-contact-item">
                <span className="icon">📍</span>
                <div className="data"><strong>Address:</strong> B-18 Team, Esoft Metro Campus, Batticaloa</div>
              </div>
              <div className="lp-contact-item">
                <span className="icon">📧</span>
                <div className="data"><strong>Email:</strong> support@studysphere.ai</div>
              </div>
              <div className="lp-contact-item">
                <span className="icon">📞</span>
                <div className="data"><strong>Phone:</strong> +94 77 123 4567</div>
              </div>
            </div>
            <div className="lp-map-box">
              <img src="/batticaloa_map.png" alt="Map mockup" />
              <button className="lp-map-btn">Open in Maps ↗</button>
            </div>
          </div>
          <div className="lp-contact-form-wrap">
            <form className="lp-contact-form" onSubmit={handleSend}>
              <input type="text" placeholder="Full Name" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required />
              <input type="email" placeholder="Student Email" value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})} required />
              <textarea placeholder="Tell us how we can help..." value={formData.message} onChange={e=>setFormData({...formData, message:e.target.value})} required />
              <button type="submit" className="lp-btn-send">Send Message</button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer-dark">
        <div className="lp-footer-main">
          <div className="lp-footer-col brand">
            <div className="lp-brand">
              <span className="lp-logo-img">🎓</span>
              <span className="lp-brand-name-light">StudySphere</span>
            </div>
            <p>Education counselling AI chatbot empowering with a unified academic platform.</p>
            <div className="lp-socials">
              {["f","t","in","ig"].map(s => <span key={s} className="social-icon">{s}</span>)}
            </div>
          </div>
          <div className="lp-footer-col">
            <h3>Platform</h3>
            <ul>
              {["About","Features","Courses","Testimonials"].map(l => <li key={l}>{l}</li>)}
            </ul>
          </div>
          <div className="lp-footer-col">
            <h3>Roles</h3>
            <ul>
              <li>For Students</li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h3>Contact Us</h3>
            <ul className="contact-details">
              <li>📍 Esoft Metro Campus, Batticaloa</li>
              <li>📧 support@studysphere.ai</li>
              <li>📞 +94 77 123 4567</li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© 2026 StudySphere — Students Education Counselling AI Chatbot. All rights reserved.</p>
          <div className="lp-legal">
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
