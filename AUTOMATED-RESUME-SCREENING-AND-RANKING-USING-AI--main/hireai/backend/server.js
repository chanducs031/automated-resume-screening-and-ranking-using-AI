require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const app = express();
const PORT = 4000;
const JWT_SECRET = "hireai_secret_key_2025";
const DB_FILE = path.join(__dirname, "hireai.json");

// -- File Upload Setup --
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only .pdf, .doc, .docx, and .txt files are allowed"));
  },
});

const db = {
  users: [],
  jobs: [],
  applications: [],
};

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(raw || "{}");
      db.users = parsed.users || [];
      db.jobs = parsed.jobs || [];
      db.applications = parsed.applications || [];
    } catch (err) {
      console.error("Failed to load DB:", err);
    }
  }
}

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function ensureSeedData() {
  const seedUsers = [
    { id: "admin1", name: "Admin", email: "hr123@gmail.com", password: "hr@123", role: "admin", dept: "Administration", avatar: "AD" },
  ];

  const seedJobs = [
    { id: "j1", title: "Senior Python Backend Developer", company: "Infosys", dept: "Engineering", location: "Bangalore", type: "Full-time", deadline: "2025-06-30", hr_id: "admin1", jd: "Senior Python Backend Developer - 3+ years experience.\nRequired Skills: Python, Django, FastAPI, PostgreSQL, Docker, Kubernetes, AWS, REST APIs, Git, Linux\nNice to have: CI/CD, Redis, Kafka\nEducation: B.Tech/M.Tech CS\nExperience: 3-5 years", status: "active", posted_at: new Date().toISOString() },
    { id: "j2", title: "React Frontend Developer", company: "TCS", dept: "Product", location: "Remote", type: "Full-time", deadline: "2025-06-15", hr_id: "admin1", jd: "React Frontend Developer - 2+ years.\nRequired Skills: React, TypeScript, JavaScript, HTML, CSS, REST APIs, GraphQL, Git, Agile\nNice to have: Node.js, Next.js\nExperience: 2+ years", status: "active", posted_at: new Date().toISOString() },
    { id: "j3", title: "ML Engineer", company: "Wipro", dept: "AI Research", location: "Hyderabad", type: "Full-time", deadline: "2025-05-30", hr_id: "admin1", jd: "ML Engineer - 2+ years.\nRequired Skills: Python, TensorFlow, PyTorch, Scikit-learn, Pandas, NumPy, Machine Learning, Deep Learning, NLP, Docker, AWS\nEducation: M.Tech preferred", status: "active", posted_at: new Date().toISOString() },
  ];

  seedUsers.forEach(user => {
    const exists = db.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (!exists) {
      db.users.push({ ...user, password: bcrypt.hashSync(user.password, 10) });
    }
  });

  seedJobs.forEach(job => {
    const exists = db.jobs.find(j => j.id === job.id);
    if (!exists) {
      db.jobs.push(job);
    }
  });

  saveDb();
}

function findUserByEmail(email) {
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function getJobWithHr(job) {
  const hr = db.users.find(u => u.id === job.hr_id);
  return { ...job, hr_name: hr?.name || "" };
}

function getApplicationResponse(app) {
  const applicant = db.users.find(u => u.id === app.applicant_id) || {};
  const job = db.jobs.find(j => j.id === app.job_id) || {};
  return {
    ...app,
    applicant_name: applicant.name || "",
    applicant_email: applicant.email || "",
    job_title: job.title || "",
    job_dept: job.dept || "",
    matched_skills: JSON.parse(app.matched_skills || "[]"),
    missing_skills: JSON.parse(app.missing_skills || "[]"),
  };
}

loadDb();
ensureSeedData();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "5mb" }));

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// -- Resume File Upload and Parse Endpoint --
app.post("/api/resume/parse", auth, upload.single("resume"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  try {
    let text = "";
    if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (ext === ".doc") {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } catch (docErr) {
        text = fs.readFileSync(filePath, "utf8");
      }
    } else {
      text = fs.readFileSync(filePath, "utf8");
    }
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    // Normalize whitespace
    text = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
    if (!text) return res.status(422).json({ error: "Could not extract text from the file. Try pasting your resume instead." });
    res.json({ text, filename: req.file.originalname });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error("Resume parse error:", err.message);
    res.status(500).json({ error: "Failed to parse the file. Try a different format or paste your resume." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, role, dept } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: "All fields required" });
  if (findUserByEmail(email)) return res.status(409).json({ error: "Email already registered" });
  const id = `${role}_${Date.now()}`;
  const hash = bcrypt.hashSync(password, 10);
  const avatar = name.split(" ").filter(Boolean).map(n => n[0].toUpperCase()).join("").slice(0, 2);
  const newUser = { id, name, email, password: hash, role, dept: dept || "", avatar, created_at: new Date().toISOString() };
  db.users.push(newUser);
  saveDb();
  const { password: pw, ...safeUser } = newUser;
  const token = jwt.sign({ id: safeUser.id, role: safeUser.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: safeUser });
});

app.get("/api/auth/me", auth, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  res.json(user ? { id: user.id, name: user.name, email: user.email, role: user.role, dept: user.dept, avatar: user.avatar } : null);
});

app.get("/api/jobs", auth, (req, res) => {
  const { role, id } = req.user;
  let jobs = db.jobs.slice();
  if (role === "hr") {
    jobs = jobs.filter(j => j.hr_id === id);
  } else if (role !== "admin") {
    jobs = jobs.filter(j => j.status === "active");
  }
  jobs = jobs.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
  const result = jobs.map(j => ({
    ...getJobWithHr(j),
    application_count: db.applications.filter(a => a.job_id === j.id).length,
  }));
  res.json(result);
});

app.get("/api/jobs/:id", auth, (req, res) => {
  const job = db.jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(getJobWithHr(job));
});

app.post("/api/jobs", auth, (req, res) => {
  if (!["admin", "hr"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const { title, company, dept, location, type, deadline, jd, experience_level } = req.body;
  if (!title || !jd) return res.status(400).json({ error: "Title and JD required" });
  const id = `j_${Date.now()}`;
  const job = { id, title, company: company || "", dept: dept || "", location: location || "", type: type || "Full-time", deadline: deadline || "", experience_level: experience_level || "any", jd, status: "active", hr_id: req.user.id, posted_at: new Date().toISOString() };
  db.jobs.push(job);
  saveDb();
  res.status(201).json(getJobWithHr(job));
});

app.patch("/api/jobs/:id", auth, (req, res) => {
  if (!["admin", "hr"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const job = db.jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const { status } = req.body;
  if (status) job.status = status;
  saveDb();
  res.json(getJobWithHr(job));
});

app.get("/api/applications", auth, (req, res) => {
  const { role, id } = req.user;
  let apps = db.applications.slice();
  if (role === "hr") {
    const hrJobs = db.jobs.filter(j => j.hr_id === id).map(j => j.id);
    apps = apps.filter(a => hrJobs.includes(a.job_id));
  } else if (role === "applicant") {
    apps = apps.filter(a => a.applicant_id === id);
  }
  apps = apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
  res.json(apps.map(getApplicationResponse));
});

app.get("/api/applications/job/:jobId", auth, (req, res) => {
  if (!["admin", "hr"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const apps = db.applications.filter(a => a.job_id === req.params.jobId).sort((a, b) => b.score - a.score);
  res.json(apps.map(getApplicationResponse));
});

app.post("/api/applications", auth, (req, res) => {
  if (req.user.role !== "applicant") return res.status(403).json({ error: "Only applicants can apply" });
  const { job_id, resume_text, score, skill_match, tfidf_score, matched_skills, missing_skills } = req.body;
  if (!job_id || !resume_text) return res.status(400).json({ error: "Job ID and resume required" });
  if (!db.jobs.find(j => j.id === job_id)) return res.status(404).json({ error: "Job not found" });
  if (db.applications.find(a => a.job_id === job_id && a.applicant_id === req.user.id)) return res.status(409).json({ error: "Already applied to this job" });
  const id = `app_${Date.now()}`;
  const application = {
    id,
    job_id,
    applicant_id: req.user.id,
    resume_text,
    status: "screening",
    score: score || 0,
    skill_match: skill_match || 0,
    tfidf_score: tfidf_score || 0,
    matched_skills: JSON.stringify(matched_skills || []),
    missing_skills: JSON.stringify(missing_skills || []),
    ai_note: "",
    applied_at: new Date().toISOString(),
  };
  db.applications.push(application);
  saveDb();
  res.status(201).json(getApplicationResponse(application));
});

app.patch("/api/applications/:id", auth, (req, res) => {
  if (!["admin", "hr"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const application = db.applications.find(a => a.id === req.params.id);
  if (!application) return res.status(404).json({ error: "Application not found" });
  const { status, ai_note } = req.body;
  if (status) application.status = status;
  if (ai_note !== undefined) application.ai_note = ai_note;
  saveDb();
  res.json(getApplicationResponse(application));
});

app.get("/api/stats", auth, (req, res) => {
  if (!["admin", "hr"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  let jobs = db.jobs.slice();
  if (req.user.role === "hr") jobs = jobs.filter(j => j.hr_id === req.user.id);
  const jobIds = jobs.map(j => j.id);
  const apps = db.applications.filter(a => jobIds.includes(a.job_id));
  const statuses = ["screening", "shortlisted", "interview", "offer", "rejected", "hired"];
  const stats = {
    total_jobs: jobs.length,
    active_jobs: jobs.filter(j => j.status === "active").length,
    total_apps: apps.length,
    shortlisted: apps.filter(a => ["shortlisted", "interview", "offer", "hired"].includes(a.status)).length,
    pipeline: Object.fromEntries(statuses.map(s => [s, apps.filter(a => a.status === s).length])),
  };
  res.json(stats);
});

app.get("/api/users", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const users = db.users
    .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, dept: u.dept, avatar: u.avatar, created_at: u.created_at }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(users);
});

// -- Claude AI Proxy Endpoint --
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || "";

app.post("/api/ai/chat", auth, async (req, res) => {
  const { messages, system, max_tokens } = req.body;
  if (!messages || !messages.length) return res.status(400).json({ error: "Messages required" });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: max_tokens || 1024,
        system: system || "",
        messages,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Claude API error:", data);
      return res.status(response.status).json({ error: data.error?.message || "Claude API error" });
    }
    res.json({ text: data.content?.[0]?.text || "" });
  } catch (err) {
    console.error("Claude proxy error:", err.message);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

app.listen(PORT, () => console.log(`HireAI backend running on http://localhost:${PORT}`));
