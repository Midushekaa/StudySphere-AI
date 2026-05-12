"""
EduBot - Flask Backend
REST API serving the React frontend

Routes:
  POST /api/chat              - main chatbot endpoint
  GET  /api/courses           - list all courses
  GET  /api/courses/<code>    - single course details + deadlines
  GET  /api/deadlines         - upcoming assignment deadlines
  GET  /api/admin/unknown     - pending unknown questions (ML panel)
  POST /api/admin/train       - admin teaches the bot a new intent
  GET  /api/admin/stats       - dashboard statistics
  DELETE /api/admin/unknown/<id> - ignore a question
"""

import json
import uuid
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from db import execute, fetch_all, fetch_one
from nlp_engine import get_response
from otp_service import (
    init_mail, generate_otp, store_otp, verify_otp,
    is_otp_verified, clear_otp, send_otp_email
)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Flask-Mail config (Gmail SMTP) ──────────────────────────
# Replace with your Gmail address and App Password
# Get App Password: Google Account → Security → 2-Step Verification → App passwords
app.config["MAIL_SERVER"]        = "smtp.gmail.com"
app.config["MAIL_PORT"]          = 587
app.config["MAIL_USE_TLS"]       = True
app.config["MAIL_USERNAME"]      = "hikmahaaris@gmail.com"
app.config["MAIL_PASSWORD"]      = "zorc wdyu itlu kkev"
app.config["MAIL_DEFAULT_SENDER"] = ("StudySphere", "hikmahaaris@gmail.com")
init_mail(app)   # allow React dev server


# ════════════════════════════════════════════════════════════
#  Helper
# ════════════════════════════════════════════════════════════

def _session_id() -> str:
    sid = request.headers.get("X-Session-ID") or str(uuid.uuid4())
    # Upsert session row
    existing = fetch_one(
        "SELECT id FROM chat_sessions WHERE session_id = %s", (sid,)
    )
    if not existing:
        execute(
            "INSERT INTO chat_sessions (session_id) VALUES (%s)", (sid,)
        )
    return sid


# ════════════════════════════════════════════════════════════
#  Main chat endpoint
# ════════════════════════════════════════════════════════════

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Body: { "message": "...", "session_id": "..." }
    Returns: { "response": "...", "intent": "...", "sentiment": 0.0, "confidence": 0.0 }
    """
    data       = request.get_json(silent=True) or {}
    user_input = (data.get("message") or "").strip()
    session_id = data.get("session_id") or str(uuid.uuid4())

    user_id    = data.get("user_id")
    
    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    # Always ensure session row exists
    existing = fetch_one(
        "SELECT id FROM chat_sessions WHERE session_id = %s", (session_id,)
    )
    if not existing:
        execute(
            "INSERT INTO chat_sessions (session_id, user_id) VALUES (%s, %s)", 
            (session_id, user_id)
        )
    elif user_id and not existing.get("user_id"):
        # Link existing anonymous session to user if they just logged in
        execute("UPDATE chat_sessions SET user_id = %s WHERE session_id = %s", (user_id, session_id))

    # ── Off-topic detection ──────────────────────────────────
    OFF_TOPIC_KEYWORDS = [
        # Travel & tourism
        "visit", "visiting", "travel", "tourist", "tourism", "holiday", "vacation",
        "hotel", "beach", "mountain", "sight", "sightseeing", "trip", "tour",
        # Food & cooking
        "recipe", "food", "cook", "restaurant", "cuisine", "meal", "dish",
        # Sports & entertainment
        "cricket", "football", "sport", "game", "movie", "film", "song", "music",
        "celebrity", "actor", "actress", "concert", "netflix",
        # Politics & news
        "politics", "president", "minister", "government", "election", "vote",
        "war", "military", "news", "weather",
        # Health & medicine (non-academic)
        "doctor", "hospital", "medicine", "disease", "symptoms", "covid",
        # Shopping & finance
        "buy", "shop", "shopping", "price", "stock", "crypto", "bitcoin",
        # Animals & nature
        "animal", "pet", "dog", "cat", "nature", "planet", "space",
        # Jokes & casual
        "joke", "funny", "laugh", "meme",
    ]

    # Education-related override terms (these are always allowed even if matched)
    EDUCATION_OVERRIDE = [
        "course", "degree", "lecture", "assignment", "exam", "study", "university",
        "campus", "module", "timetable", "deadline", "grade", "gpa", "semester",
        "tutor", "library", "lab", "faculty", "department", "scholarship",
        "registration", "enrollment", "academic", "chatbot", "ai", "help",
        "student", "teacher", "professor", "class", "school", "college",
        "edubot", "studysphere",
    ]

    msg_lower = user_input.lower()

    has_education = any(kw in msg_lower for kw in EDUCATION_OVERRIDE)
    has_offtopic  = any(kw in msg_lower for kw in OFF_TOPIC_KEYWORDS)

    if has_offtopic and not has_education:
        off_topic_response = (
            "🎓 I appreciate your curiosity! However, I'm StudySphere — a dedicated "
            "Academic Counselling Assistant, here exclusively to help you with your "
            "university studies.\n\n"
            "I'm not able to assist with topics outside of education, but I'm here "
            "whenever you need help with:\n"
            "• 📅 Assignment deadlines & timetables\n"
            "• 📚 Course information & modules\n"
            "• 🎯 Academic goals & GPA tracking\n"
            "• 🧠 Study tips & exam preparation\n"
            "• 💬 Campus life & student support\n\n"
            "Feel free to ask me anything related to your academic journey! 😊"
        )
        # Still persist the conversation for transparency
        execute(
            "INSERT INTO chat_messages (session_id, sender, message, intent_matched, sentiment)"
            " VALUES (%s, %s, %s, %s, %s)",
            (session_id, "user", user_input, "off_topic", 0.0),
        )
        execute(
            "INSERT INTO chat_messages (session_id, sender, message, intent_matched, sentiment)"
            " VALUES (%s, %s, %s, %s, %s)",
            (session_id, "bot", off_topic_response, "off_topic", 0.0),
        )
        execute(
            "UPDATE chat_sessions SET message_count = message_count + 2 WHERE session_id = %s",
            (session_id,),
        )
        return jsonify({
            "response": off_topic_response,
            "intent": "off_topic",
            "sentiment": 0.0,
            "confidence": 1.0,
            "total_queries": 0,
            "sentiment_score": 0.0
        })
    # ── End off-topic detection ──────────────────────────────

    # Get NLP response
    result = get_response(user_input, session_id)

    # Persist messages
    execute(
        "INSERT INTO chat_messages (session_id, sender, message, intent_matched, sentiment)"
        " VALUES (%s, %s, %s, %s, %s)",
        (session_id, "user", user_input, None, result["sentiment"]),
    )
    execute(
        "INSERT INTO chat_messages (session_id, sender, message, intent_matched, sentiment)"
        " VALUES (%s, %s, %s, %s, %s)",
        (session_id, "bot", result["response"], result["intent"], 0.0),
    )

    # Update session stats
    execute(
        "UPDATE chat_sessions SET message_count = message_count + 2,"
        " sentiment_score = %s WHERE session_id = %s",
        (result["sentiment"], session_id),
    )

    return jsonify(result)



@app.route("/api/chat/sessions/<int:user_id>", methods=["GET"])
def get_user_sessions(user_id: int):
    """
    Get all chat sessions for a user, with the last message as a preview.
    """
    rows = fetch_all("""
        SELECT s.session_id, s.last_active, 
               (SELECT message FROM chat_messages WHERE session_id = s.session_id ORDER BY timestamp DESC LIMIT 1) as last_msg
        FROM chat_sessions s
        WHERE s.user_id = %s
        ORDER BY s.last_active DESC
    """, (user_id,))
    
    for row in rows:
        if row.get("last_active"):
            row["last_active"] = row["last_active"].isoformat()
    return jsonify(rows)


@app.route("/api/chat/history/<session_id>", methods=["GET"])
def get_chat_history(session_id: str):
    """
    Fetch all messages for a specific session ID.
    """
    rows = fetch_all(
        "SELECT sender, message, timestamp, sentiment FROM chat_messages"
        " WHERE session_id = %s ORDER BY timestamp ASC",
        (session_id,)
    )
    # Convert timestamps to ISO format for JSON
    for row in rows:
        if row.get("timestamp"):
            row["time"] = row["timestamp"].isoformat()
    return jsonify(rows)


# ════════════════════════════════════════════════════════════
#  Courses
# ════════════════════════════════════════════════════════════

@app.route("/api/courses", methods=["GET"])
def get_courses():
    department = request.args.get("department")
    level      = request.args.get("level")

    sql    = "SELECT * FROM courses WHERE 1=1"
    params = []
    if department:
        sql += " AND department = %s"
        params.append(department)
    if level:
        sql += " AND level = %s"
        params.append(level)
    sql += " ORDER BY level, code"

    courses = fetch_all(sql, tuple(params))
    return jsonify(courses)


@app.route("/api/courses", methods=["POST"])
def admin_create_course():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "").strip().upper()
    title = data.get("title", "").strip()
    dept = data.get("department", "").strip()
    level = data.get("level", 1)
    
    if not code or not title:
        return jsonify({"error": "Code and Title are required"}), 400
        
    try:
        execute("INSERT INTO courses (code, title, department, level) VALUES (%s, %s, %s, %s)",
                (code, title, dept, level))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/courses/<code>", methods=["GET"])
def get_course(code: str):
    course = fetch_one(
        "SELECT * FROM courses WHERE code = %s", (code.upper(),)
    )
    if not course:
        return jsonify({"error": "Course not found"}), 404

    deadlines = fetch_all(
        "SELECT title, due_date, weight_percent,"
        " DATEDIFF(due_date, CURDATE()) AS days_left"
        " FROM assignments WHERE course_id = %s AND due_date >= CURDATE()"
        " ORDER BY due_date",
        (course["id"],),
    )
    course["deadlines"] = deadlines
    return jsonify(course)


# ════════════════════════════════════════════════════════════
#  Deadlines
# ════════════════════════════════════════════════════════════

@app.route("/api/deadlines", methods=["GET"])
def get_deadlines():
    rows = fetch_all("""
        SELECT c.code, c.title AS course_title,
               a.title AS assignment_title,
               a.due_date, a.weight_percent,
               DATEDIFF(a.due_date, CURDATE()) AS days_left
        FROM   assignments a
        JOIN   courses c ON a.course_id = c.id
        WHERE  a.due_date >= CURDATE()
        ORDER  BY a.due_date ASC
    """)
    return jsonify(rows)


# ════════════════════════════════════════════════════════════
#  Admin — ML training panel
# ════════════════════════════════════════════════════════════

@app.route("/api/admin/unknown", methods=["GET"])
def get_unknown_questions():
    """Return all pending unknown questions sorted by frequency."""
    rows = fetch_all(
        "SELECT * FROM unknown_questions WHERE status = 'pending'"
        " ORDER BY times_asked DESC, asked_at ASC"
    )
    return jsonify(rows)


@app.route("/api/admin/train", methods=["POST"])
def train_bot():
    """
    Admin teaches the bot a new intent.
    Body: {
      "unknown_q_id": 1,
      "tag": "exam_deferral",
      "patterns": ["how to defer exam", "defer my exam"],
      "responses": ["To defer an exam, contact Registry..."]
    }
    """
    data = request.get_json(silent=True) or {}
    required = ("unknown_q_id", "tag", "patterns", "responses")
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields: {required}"}), 400

    tag       = data["tag"].strip().lower().replace(" ", "_")
    patterns  = data["patterns"]
    responses = data["responses"]

    # Insert or update intent in knowledge base
    existing = fetch_one("SELECT id FROM intents WHERE tag = %s", (tag,))
    if existing:
        execute(
            "UPDATE intents SET patterns = %s, responses = %s WHERE tag = %s",
            (json.dumps(patterns), json.dumps(responses), tag),
        )
    else:
        execute(
            "INSERT INTO intents (tag, patterns, responses) VALUES (%s, %s, %s)",
            (tag, json.dumps(patterns), json.dumps(responses)),
        )

    # Save to trained_responses table
    execute(
        "INSERT INTO trained_responses (unknown_q_id, new_tag, patterns, responses)"
        " VALUES (%s, %s, %s, %s)",
        (data["unknown_q_id"], tag, json.dumps(patterns), json.dumps(responses)),
    )

    # Mark original question as trained
    execute(
        "UPDATE unknown_questions SET status = 'trained' WHERE id = %s",
        (data["unknown_q_id"],),
    )

    return jsonify({"success": True, "message": f"Bot trained with intent '{tag}'"})


@app.route("/api/admin/unknown/<int:qid>", methods=["DELETE"])
def ignore_question(qid: int):
    execute(
        "UPDATE unknown_questions SET status = 'ignored' WHERE id = %s", (qid,)
    )
    return jsonify({"success": True})


@app.route("/api/admin/stats", methods=["GET"])
def admin_stats():
    total_intents  = fetch_one("SELECT COUNT(*) AS n FROM intents")["n"]
    total_sessions = fetch_one("SELECT COUNT(*) AS n FROM chat_sessions")["n"]
    total_messages = fetch_one("SELECT COUNT(*) AS n FROM chat_messages")["n"]
    pending_train  = fetch_one(
        "SELECT COUNT(*) AS n FROM unknown_questions WHERE status='pending'"
    )["n"]
    trained_count  = fetch_one(
        "SELECT COUNT(*) AS n FROM unknown_questions WHERE status='trained'"
    )["n"]
    avg_sentiment  = fetch_one(
        "SELECT ROUND(AVG(sentiment),3) AS n FROM chat_messages WHERE sender='user'"
    )["n"] or 0.0

    return jsonify({
        "total_intents":  total_intents,
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "pending_training": pending_train,
        "trained_count":  trained_count,
        "avg_sentiment":  float(avg_sentiment),
    })



# ════════════════════════════════════════════════════════════
#  Contact Feedback Routes
# ════════════════════════════════════════════════════════════

@app.route("/api/feedbacks", methods=["POST"])
def submit_feedback():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    message = data.get("message", "").strip()
    
    if not name or not email or not message:
        return jsonify({"error": "Missing fields"}), 400
        
    execute(
        "INSERT INTO contact_feedbacks (name, email, message) VALUES (%s, %s, %s)",
        (name, email, message)
    )
    return jsonify({"success": True, "message": "Feedback submitted successfully."})


@app.route("/api/admin/feedbacks", methods=["GET"])
def get_feedbacks():
    rows = fetch_all("SELECT * FROM contact_feedbacks ORDER BY created_at DESC")
    for row in rows:
        if row.get("created_at"):
            row["created_at"] = row["created_at"].isoformat()
    return jsonify(rows)


@app.route("/api/admin/feedbacks/<int:fid>/read", methods=["PUT"])
def mark_feedback_read(fid: int):
    execute("UPDATE contact_feedbacks SET status = 'read' WHERE id = %s", (fid,))
    return jsonify({"success": True})


# ════════════════════════════════════════════════════════════
#  Auth & User Management Routes
# ════════════════════════════════════════════════════════════

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    user = fetch_one("SELECT * FROM users WHERE (username=%s OR email=%s) AND password=%s", (username, username, password))
    if user:
        return jsonify(user)
    return jsonify({"error": "Invalid credentials"}), 401


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    student_id = data.get("studentId", "").strip()
    
    if not name or not username or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400
        
    existing = fetch_one("SELECT id FROM users WHERE username=%s OR email=%s", (username, email))
    if existing:
        return jsonify({"error": "Username or Email already exists"}), 409
        
    try:
        execute("INSERT INTO users (name, username, email, password, role, student_id) VALUES (%s, %s, %s, %s, 'student', %s)",
                (name, username, email, password, student_id or None))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/users", methods=["GET"])
def get_users():
    users = fetch_all("SELECT id, name, username, email, role, student_id, created_at FROM users ORDER BY id DESC")
    for u in users:
        if u.get("created_at"):
            u["created_at"] = u["created_at"].isoformat()
    return jsonify(users)

@app.route("/api/users", methods=["POST"])
def admin_create_user():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    role = data.get("role", "student")
    student_id = data.get("studentId", "").strip()
    
    try:
        # Default password for admin-created users
        password = data.get("password") or "StudySphere123" 
        username = data.get("username") or email.split("@")[0]
        execute("INSERT INTO users (name, username, email, password, role, student_id) VALUES (%s, %s, %s, %s, %s, %s)",
                (name, username, email, password, role, student_id or None))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/users/<int:uid>", methods=["PUT"])
def update_user(uid: int):
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    role = data.get("role", "student")
    
    try:
        execute("UPDATE users SET name=%s, email=%s, role=%s WHERE id=%s",
                (name, email, role, uid))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/users/<int:uid>", methods=["DELETE"])
def delete_user(uid: int):
    execute("DELETE FROM users WHERE id=%s", (uid,))
    return jsonify({"success": True})


# ════════════════════════════════════════════════════════════
#  OTP Password Reset Routes
# ════════════════════════════════════════════════════════════

@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    """
    Step 1: User enters email → generate OTP → send to email.
    Body: { "email": "user@uni.ac.uk" }
    """
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    # Generate and store OTP
    otp = generate_otp()
    store_otp(email, otp)

    # Get user name if they exist (for personalised email)
    # In production, look up from DB. For demo we use a generic name.
    user_name = "Student"

    # Send email
    result = send_otp_email(app, email, otp, user_name)

    if result["success"]:
        return jsonify({
            "success": True,
            "message": f"A 6-digit OTP has been sent to {email}. Check your inbox.",
            # In development only — remove in production!
            "dev_otp": otp
        })
    else:
        return jsonify({
            "success": False,
            "message": "Failed to send email. Please check the email address and try again.",
            # Still return OTP in dev so you can test without email setup
            "dev_otp": otp
        }), 200  # 200 so frontend can still show dev OTP


@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp_route():
    """
    Step 2: User enters the 6-digit OTP → verify it.
    Body: { "email": "user@uni.ac.uk", "otp": "123456" }
    """
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp   = (data.get("otp")   or "").strip()

    if not email or not otp:
        return jsonify({"success": False, "message": "Email and OTP are required."}), 400

    result = verify_otp(email, otp)
    return jsonify(result)


@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    """
    Step 3: OTP verified → user sets new password.
    Body: { "email": "user@uni.ac.uk", "new_password": "newpass123" }
    """
    data         = request.get_json(silent=True) or {}
    email        = (data.get("email")        or "").strip().lower()
    new_password = (data.get("new_password") or "").strip()

    if not email or not new_password:
        return jsonify({"success": False, "message": "Email and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400

    if not is_otp_verified(email):
        return jsonify({"success": False, "message": "OTP not verified. Please verify your OTP first."}), 403

    # Update password in DB
    execute("UPDATE users SET password=%s WHERE email=%s", (new_password, email))
    clear_otp(email)

    return jsonify({
        "success": True,
        "message": "Password reset successfully! You can now sign in with your new password."
    })


# ════════════════════════════════════════════════════════════
#  Update user profile
# ════════════════════════════════════════════════════════════

@app.route("/api/update_profile", methods=["POST"])
def update_profile():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    name    = data.get("name", "").strip()

    if not user_id or not name:
        return jsonify({"error": "user_id and name are required"}), 400

    try:
        execute(
            "UPDATE users SET name = %s WHERE id = %s",
            (name, user_id)
        )
        return jsonify({"message": "Profile updated successfully", "name": name}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ════════════════════════════════════════════════════════════
#  Health check
# ════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


# ════════════════════════════════════════════════════════════
#  Run
# ════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app.run(debug=True, port=5000)