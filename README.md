# EduBot — AI University Chatbot
### React.js + Flask + MySQL | AI Coursework 2

---

## Project Structure
```
edubot/
├── backend/
│   ├── app.py            ← Flask REST API
│   ├── nlp_engine.py     ← NLTK NLP + intent matching
│   ├── db.py             ← MySQL connection
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatPage.jsx    ← Chat UI + voice
│   │   │   ├── AdminPage.jsx   ← ML training panel
│   │   │   └── CoursesPage.jsx ← Course browser
│   └── package.json
└── edubot_schema.sql     ← MySQL database
```

---

## Setup Instructions

### Step 1 — Database (MySQL Workbench)
1. Open MySQL Workbench
2. File → Open SQL Script → select `edubot_schema.sql`
3. Click ⚡ Execute All
4. Open `backend/db.py` and update:
   ```python
   "password": "your_mysql_password",
   ```

### Step 2 — Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python -m textblob.download_corpora   # first time only
python app.py
```
Backend runs at: http://localhost:5000

### Step 3 — Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:3000

---

## Voice Features
| Feature | How it works |
|---------|-------------|
| 🎤 Voice Input | Click mic button → speak → auto-sent to bot |
| 🔊 Voice Output | Bot reply is spoken aloud automatically |
| ON/OFF toggle | Sidebar toggle to enable/disable auto-speak |
| Stop button | Appears while speaking to interrupt |
| Supported browsers | Chrome, Edge, Safari (not Firefox) |

---

## Marks Coverage
| Feature | Marks |
|---------|-------|
| NLP: tokenization, lemmatization, intent matching | 22 marks |
| MySQL knowledge base (dynamic, not hard-coded) | 5 marks  |
| ML training panel (admin teaches unknown Q's)  | 5 marks  |
| Voice input + output (creativity)              | 10 marks |
| Sentiment detection + empathetic responses     | Bonus    |
| Admin stats dashboard                          | Bonus    |
| Course browser with live DB data               | Bonus    |

---

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/chat | Send message, get bot reply |
| GET  | /api/courses | List all courses |
| GET  | /api/courses/:code | Single course + deadlines |
| GET  | /api/deadlines | Upcoming assignment deadlines |
| GET  | /api/admin/unknown | Pending unknown questions |
| POST | /api/admin/train | Train bot with new intent |
| GET  | /api/admin/stats | Dashboard statistics |
