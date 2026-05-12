"""
EduBot - NLP Engine
Three-tier architecture: NLP Interface layer

Features:
  - Tokenisation and lemmatisation (NLTK)
  - Bag-of-words intent matching
  - Sentiment analysis (TextBlob)
  - Dynamic DB lookup for courses / deadlines
  - Unknown question capture for ML training
"""

import json
import random
import re
import uuid
from datetime import date

import nltk
from nltk.stem import WordNetLemmatizer
from textblob import TextBlob

from db import fetch_all, fetch_one, execute

# ── Download required NLTK data on first run ────────────────
for pkg in ("punkt", "wordnet", "stopwords", "averaged_perceptron_tagger"):
    try:
        nltk.data.find(f"tokenizers/{pkg}")
    except LookupError:
        nltk.download(pkg, quiet=True)

lemmatizer = WordNetLemmatizer()

# ── Greeting mirror map — echoes back the user's exact greeting style ──
GREETING_MIRROR = {
    "good morning":      ["Good morning! ☀️ Hope you have a great day! How can I help?",
                          "Good morning! ☀️ Ready to tackle the day? What do you need?"],
    "good afternoon":    ["Good afternoon! 🌤️ Hope your day is going well! What can I help with?",
                          "Good afternoon! 🌤️ How can I assist you?"],
    "good evening":      ["Good evening! 🌙 Hope you have had a good day! How can I help?",
                          "Good evening! 🌙 Studying late? What do you need?"],
    "good night":        ["Good night! 🌙 Get some rest — check your deadlines tomorrow!",
                          "Good night! 😴 Sweet dreams and good luck with your studies!"],
    "good day":          ["Good day! 🌟 How may I assist you?",
                          "Good day to you! 🌟 What can I help with?"],
    "hello":             ["Hello! 👋 Great to see you! How can I assist you today?",
                          "Hello there! 👋 What can I help you with?"],
    "hi":                ["Hi! 😊 What can I do for you today?",
                          "Hi there! 😊 How can I help?"],
    "hey":               ["Hey! 👋 What is up? How can I help?",
                          "Hey there! 👋 What do you need?"],
    "howdy":             ["Howdy! 🤠 What can I do for you today?",
                          "Howdy partner! 🤠 How can I help?"],
    "greetings":         ["Greetings! 🎩 How may I assist you today?",
                          "Greetings! 🎩 It is a pleasure. What can I help you with?"],
    "salutations":       ["Salutations! 🎩 How may I be of service?",
                          "Salutations! 🎩 What can I assist you with today?"],
    "sup":               ["Sup! 😎 What do you need?",
                          "Sup! 😎 What can I do for you?"],
    "yo":                ["Yo! ✌️ What is good? How can I help?",
                          "Yo! ✌️ What do you need?"],
    "whats up":          ["Not much, just here to help! 😄 What do you need?",
                          "All good here! 😄 What can I help you with?"],
    "what is up":        ["Not much, just here for you! 😄 What do you need?",
                          "All good! 😄 What can I help with?"],
    "wassup":            ["All good! 😄 What can I do for you?",
                          "Wassup! 😄 How can I help?"],
    "how are you":       ["I am doing great, thanks for asking! 😊 How can I help you today?",
                          "All systems go! 🤖 How can I assist you?"],
    "how are you doing": ["I am doing wonderful, thank you! 😊 What can I help you with?",
                          "Running perfectly! 🤖 How can I help?"],
    "how do you do":     ["I do very well, thank you! 😊 How may I assist you?",
                          "Very well indeed! 😊 How can I help you today?"],
}

def check_greeting_mirror(user_input: str) -> str | None:
    """
    If the user sends a greeting, mirror it back with the same style.
    Checks from longest phrase to shortest to avoid 'hi' matching 'hi there'.
    """
    clean = user_input.strip().lower().rstrip("!.,?")
    # Sort by length descending so multi-word phrases match first
    for phrase in sorted(GREETING_MIRROR.keys(), key=len, reverse=True):
        # Match if input IS the greeting, or STARTS with it
        if clean == phrase or clean.startswith(phrase + " ") or clean.startswith(phrase + "!"):
            return random.choice(GREETING_MIRROR[phrase])
    return None


# ── Words to ignore during matching ─────────────────────────
STOP_WORDS = {
    "the", "a", "an", "is", "it", "in", "on", "at", "to", "for",
    "of", "and", "or", "i", "my", "me", "do", "can", "could",
    "would", "please", "what", "when", "where", "how", "who",
    "?", "!", ".", ",",
}


# ════════════════════════════════════════════════════════════
#  Core NLP functions
# ════════════════════════════════════════════════════════════

def tokenize_and_lemmatize(text: str) -> list[str]:
    """Lowercase → tokenise → lemmatise → remove stop-words."""
    tokens = nltk.word_tokenize(text.lower())
    return [
        lemmatizer.lemmatize(t)
        for t in tokens
        if t.isalpha() and t not in STOP_WORDS
    ]


def bag_of_words(tokens: list[str], pattern_tokens: list[str]) -> float:
    """
    Compute a similarity score between user tokens and a pattern.
    Returns a float 0.0–1.0.
    """
    if not pattern_tokens:
        return 0.0
    matches = sum(1 for t in tokens if t in pattern_tokens)
    return matches / len(pattern_tokens)


def get_sentiment(text: str) -> float:
    """
    Return polarity score: -1.0 (very negative) to +1.0 (very positive).
    Uses TextBlob for simple sentiment analysis.
    """
    return TextBlob(text).sentiment.polarity


# ════════════════════════════════════════════════════════════
#  Intent matching
# ════════════════════════════════════════════════════════════

def load_intents() -> list[dict]:
    """Load all intents from the MySQL knowledge base."""
    rows = fetch_all("SELECT tag, patterns, responses FROM intents")
    intents = []
    for row in rows:
        intents.append({
            "tag":       row["tag"],
            "patterns":  json.loads(row["patterns"]),
            "responses": json.loads(row["responses"]),
        })
    return intents


def find_best_intent(user_input: str, intents: list[dict]) -> tuple[str | None, float]:
    """
    Return (best_tag, confidence_score) for the given user input.
    Returns (None, 0.0) if no intent clears the threshold.
    """
    user_tokens = tokenize_and_lemmatize(user_input)
    if not user_tokens:
        return None, 0.0

    best_tag   = None
    best_score = 0.0
    THRESHOLD  = 0.25          # minimum confidence to accept

    for intent in intents:
        for pattern in intent["patterns"]:
            pattern_tokens = tokenize_and_lemmatize(pattern)
            score = bag_of_words(user_tokens, pattern_tokens)
            if score > best_score:
                best_score = score
                best_tag   = intent["tag"]

    if best_score < THRESHOLD:
        return None, best_score

    return best_tag, best_score


# ════════════════════════════════════════════════════════════
#  Dynamic DB responders (course / deadline lookups)
# ════════════════════════════════════════════════════════════

def lookup_course(user_input: str) -> str | None:
    """Check if the user is asking about a specific course."""
    courses = fetch_all("SELECT code, title, lecturer, schedule, room, description FROM courses")
    user_lower = user_input.lower()

    for c in courses:
        if c["code"].lower() in user_lower or c["title"].lower() in user_lower:
            return (
                f"📚 **{c['code']} – {c['title']}**\n"
                f"👨‍🏫 Lecturer: {c['lecturer']}\n"
                f"🕐 Schedule: {c['schedule']}\n"
                f"📍 Room: {c['room']}\n"
                f"📝 {c['description']}"
            )
    return None


def lookup_deadline(user_input: str) -> str | None:
    """Check if the user is asking about an assignment deadline."""
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

    user_lower = user_input.lower()

    # Filter by mentioned course
    matched = [
        r for r in rows
        if r["code"].lower() in user_lower or r["course_title"].lower() in user_lower
    ]
    target = matched if matched else rows[:3]   # fall back to next 3 deadlines

    if not target:
        return "Great news — no upcoming deadlines found! 🎉"

    lines = ["📅 **Upcoming Deadlines:**\n"]
    for r in target:
        days = r["days_left"]
        urgency = "🔴" if days <= 3 else "🟡" if days <= 7 else "🟢"
        lines.append(
            f"{urgency} **{r['course_title']}** — {r['assignment_title']}\n"
            f"   Due: {r['due_date']}  ({days} days left)  |  Worth: {r['weight_percent']}%\n"
        )
    return "\n".join(lines)


def get_all_courses_summary() -> str:
    """Return a formatted list of all courses."""
    courses = fetch_all("SELECT code, title, department, level FROM courses ORDER BY level, code")
    if not courses:
        return "No courses found in the database."

    lines = ["🎓 **Available Courses:**\n"]
    current_level = None
    for c in courses:
        if c["level"] != current_level:
            current_level = c["level"]
            lines.append(f"\n**Level {c['level']}:**")
        lines.append(f"  • {c['code']} — {c['title']}")
    return "\n".join(lines)


def lookup_faq(user_input: str) -> str | None:
    """Simple keyword match against the FAQ table."""
    faqs = fetch_all("SELECT question, answer FROM faqs")
    user_tokens = set(tokenize_and_lemmatize(user_input))

    best_faq   = None
    best_score = 0

    for faq in faqs:
        faq_tokens = set(tokenize_and_lemmatize(faq["question"]))
        overlap    = len(user_tokens & faq_tokens)
        if overlap > best_score:
            best_score = overlap
            best_faq   = faq

    if best_score >= 2 and best_faq:
        return f"ℹ️ {best_faq['answer']}"
    return None


# ════════════════════════════════════════════════════════════
#  Sentiment-aware override
# ════════════════════════════════════════════════════════════

def sentiment_override(sentiment: float, user_input: str, intents: list[dict]) -> str | None:
    """
    Only trigger support response if the student is CLEARLY distressed.
    Requires BOTH a very low sentiment AND explicit distress keywords,
    so normal questions containing negative-sounding words don't trigger it.
    """
    DISTRESS_KEYWORDS = re.compile(
        r"\b(stressed|overwhelmed|anxious|struggling|worried|cant cope|"
        r"giving up|depressed|hopeless|breaking down|falling apart|panic)\b", re.I
    )
    if sentiment < -0.55 and DISTRESS_KEYWORDS.search(user_input):
        neg_intent = next((i for i in intents if i["tag"] == "negative_sentiment"), None)
        if neg_intent:
            return random.choice(neg_intent["responses"])
    return None


# ════════════════════════════════════════════════════════════
#  ML: save unknown questions
# ════════════════════════════════════════════════════════════

def save_unknown_question(question: str, session_id: str) -> None:
    """
    Save an unanswered question so the admin can train the bot later.
    If the same question was asked before, just increment the counter.
    """
    existing = fetch_one(
        "SELECT id, times_asked FROM unknown_questions WHERE question = %s AND status = 'pending'",
        (question,)
    )
    if existing:
        execute(
            "UPDATE unknown_questions SET times_asked = times_asked + 1 WHERE id = %s",
            (existing["id"],)
        )
    else:
        execute(
            "INSERT INTO unknown_questions (question, session_id) VALUES (%s, %s)",
            (question, session_id)
        )


# ════════════════════════════════════════════════════════════
#  Main chatbot response function
# ════════════════════════════════════════════════════════════

def get_response(user_input: str, session_id: str) -> dict:
    if not user_input.strip():
        return {"response": "Please type or say something so I can help you!", "intent": None, "sentiment": 0.0, "confidence": 0.0}

    # ── GREETING MIRROR — check first, before anything else ──
    greeting_resp = check_greeting_mirror(user_input)
    if greeting_resp:
        return {"response": greeting_resp, "intent": "greeting", "sentiment": get_sentiment(user_input), "confidence": 1.0}

    sentiment = get_sentiment(user_input)
    intents   = load_intents()

    # Sentiment override — only fires on genuine distress keywords
    override = sentiment_override(sentiment, user_input, intents)
    if override:
        return {"response": override, "intent": "negative_sentiment", "sentiment": sentiment, "confidence": 1.0}

    # DEADLINE check runs FIRST — fixes "show my deadlines" being caught by courses
    if "deadline" in user_input.lower() or re.search(r"\b(due|submit|submission|assignment|coursework)\b", user_input, re.I):
        deadline_resp = lookup_deadline(user_input)
        if deadline_resp:
            return {"response": deadline_resp, "intent": "assignment_deadline", "sentiment": sentiment, "confidence": 1.0}

    # Course list
    if re.search(r"\b(list|show|all|available)\b.*\b(course|module)\b", user_input, re.I):
        return {"response": get_all_courses_summary(), "intent": "courses", "sentiment": sentiment, "confidence": 1.0}

    # Specific course lookup
    if re.search(r"\b(course|module|subject|class|lecture|seminar|timetable|schedule|room)\b", user_input, re.I):
        course_resp = lookup_course(user_input)
        if course_resp:
            return {"response": course_resp, "intent": "courses", "sentiment": sentiment, "confidence": 1.0}

    # FAQ lookup
    faq_resp = lookup_faq(user_input)
    if faq_resp:
        return {"response": faq_resp, "intent": "faq", "sentiment": sentiment, "confidence": 0.8}

    # Bag-of-words intent matching
    tag, confidence = find_best_intent(user_input, intents)
    if tag:
        intent_row = next((i for i in intents if i["tag"] == tag), None)
        response   = random.choice(intent_row["responses"]) if intent_row else "I'm not sure how to help with that."
    else:
        save_unknown_question(user_input, session_id)
        response = random.choice([
            "I'm not sure about that yet, but I've noted your question so I can learn! 🤖 Try asking about courses, deadlines, or university services.",
            "That's a new one for me! I've saved your question and an admin will teach me the answer soon.",
            "I haven't learned about that yet. Your question has been recorded. Can I help you with something else?",
        ])

    return {"response": response, "intent": tag, "sentiment": round(sentiment, 3), "confidence": round(confidence, 3)}
