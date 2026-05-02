# ⚡ AI Resume Analyzer Pro

A full-stack web application to analyze resumes against job descriptions using semantic similarity and NLP techniques.

## Tech Stack
- **Backend**: Python, FastAPI, MongoDB, pdfminer
- **Frontend**: React.js (Vite)
- **NLP**: Regex-based skill extraction, semantic scoring

## Features
- 🔐 JWT authentication (register / login)
- 📄 Resume input via text paste or PDF/TXT file upload
- 🧠 NLP skill extraction (tech + soft skills)
- 📊 Match scoring: overall, tech, soft skill scores
- 🔍 Matched / missing / extra skill breakdown
- 📜 Analysis history per user
- 🛡️ Admin dashboard: user stats, score distribution, skill demand analytics

---

## Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export MONGODB_URI="mongodb+srv://<user>:<pass>@cluster.mongodb.net"
export SECRET_KEY="your-secret-key"

uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173

---

## 📁 Project Structure

```
ai_resume_analyzer/
│
├── backend/
│   ├── main.py
│   ├── db.py
│   ├── routes/
│
├── frontend/
│   ├── src/
│   ├── package.json
│
├── README.md
```

---

## ⚙️ Installation & Setup

### 🔹 1. Clone Repository

```
git clone <your-repo-link>
cd ai_resume_analyzer
```

---

### 🔹 2. Backend Setup

```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend will run at:

```
http://localhost:8000
```

API Docs:

```
http://localhost:8000/docs
```

---

### 🔹 3. Frontend Setup

```
cd frontend
npm install
npm start
```

Frontend will run at:

```
http://localhost:3000
```

---

## 🌐 Deployment

### Backend

* Deploy using platforms like Render
* Start command:

```
uvicorn main:app --host 0.0.0.0 --port 10000
```

### Frontend

* Deploy using Vercel or Netlify

---

## 🔗 API Endpoints

### Analyze Resume

```
POST /analyze
```

### Admin Stats

```
GET /admin/stats
```

---

## 📊 Sample Output

```json
{
  "score": 78,
  "skills": ["python", "sql"],
  "missing": ["machine learning"],
  "feedback": ["Moderate match. Improve skill coverage."]
}
```

---

## ⚠️ Limitations

* Basic scoring logic (can be improved with AI models)
* No authentication (can be extended with JWT)
* Limited skill database

---

## 🔥 Future Enhancements

* Integration with advanced NLP models
* Resume ranking system
* User authentication (JWT)
* Advanced analytics dashboard
* GPT-based feedback system

---

## 🎓 Use Case

* Final year academic project
* Resume screening tool prototype
* HR analytics system

---

## 👨‍💻 Author

Nirjan Barik

---

## 📜 License

This project is for educational purposes.

