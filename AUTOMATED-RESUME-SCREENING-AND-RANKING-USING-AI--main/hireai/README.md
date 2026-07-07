# HireAI — Full Stack Automated Resume Screening Platform

Real-time resume screening with **Node.js/Express + SQLite backend** and **React frontend**.

---

## Architecture

```
hireai/
├── backend/          ← Express + SQLite API
│   ├── server.js     ← All API routes + DB setup
│   ├── hireai.db     ← Auto-created SQLite database
│   └── package.json
└── frontend/         ← React SPA
    ├── src/
    │   ├── api/
    │   │   ├── client.js     ← Axios API calls
    │   │   └── nlp.js        ← TF-IDF scoring engine
    │   ├── context/
    │   │   └── AuthContext.js ← JWT auth state
    │   ├── components/
    │   │   └── UI.js          ← Shared components
    │   └── pages/
    │       ├── AuthPage.js           ← Login + Signup
    │       ├── HRDashboard.js        ← HR + Admin portal
    │       └── ApplicantDashboard.js ← Applicant portal
    └── package.json
```

---

## Setup & Run

### 1. Backend
```bash
cd backend
npm install
npm start
# Runs on http://localhost:4000
```

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

---

## How It Works (Real-Time Data Flow)

### Applicant applies for a job:
1. Applicant logs in → Browse Jobs (fetched live from DB)
2. Clicks "Quick Apply" or "Check My Fit → Apply"
3. Resume is scored with TF-IDF + Cosine Similarity (client-side)
4. `POST /api/applications` → stored in SQLite
5. **HR Dashboard polls every 8s** → applicant appears in HR's candidate list

### HR posts a job:
1. HR logs in → Post a Job → fills form → Publish
2. `POST /api/jobs` → stored in SQLite
3. **Applicant Dashboard polls every 6s** → job appears in Browse Jobs

### HR updates candidate status:
1. HR opens Screen & Rank, changes status dropdown or stage buttons
2. `PATCH /api/applications/:id` → updated in DB
3. **Applicant's "My Applications" page polls every 6s** → status updates live

---

## Demo Accounts (pre-seeded)

| Role    | Email                  | Password  |
|---------|------------------------|-----------|
| Admin   | admin@company.com      | admin123  |
| HR      | sunita@company.com     | hr123     |
| HR      | vikash@company.com     | hr456     |

Create applicant accounts via the signup form.

---

## API Endpoints

| Method | Endpoint                      | Role       | Description               |
|--------|-------------------------------|------------|---------------------------|
| POST   | /api/auth/login               | All        | Login                     |
| POST   | /api/auth/register            | All        | Signup                    |
| GET    | /api/jobs                     | All        | List jobs (filtered)      |
| POST   | /api/jobs                     | HR/Admin   | Post new job              |
| PATCH  | /api/jobs/:id                 | HR/Admin   | Open/close job            |
| GET    | /api/applications             | All        | List applications         |
| GET    | /api/applications/job/:jobId  | HR/Admin   | Applications for a job    |
| POST   | /api/applications             | Applicant  | Submit application        |
| PATCH  | /api/applications/:id         | HR/Admin   | Update status             |
| GET    | /api/stats                    | HR/Admin   | Dashboard stats           |
| GET    | /api/users                    | Admin      | All users                 |

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Axios                     |
| Backend    | Node.js, Express                    |
| Database   | SQLite (better-sqlite3)             |
| Auth       | JWT + bcryptjs                      |
| AI Scoring | TF-IDF + Cosine Similarity (JS)     |
| AI Notes   | Claude API (claude-sonnet-4)        |
| Polling    | setInterval (6–8s for real-time UX) |
