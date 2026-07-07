import { useState, useRef, useEffect } from "react";

const ROLES = [
  { id: "cloud", label: "Cloud Engineer", icon: "☁️", color: "#00d4ff" },
  { id: "devops", label: "DevOps Engineer", icon: "⚙️", color: "#ff6b35" },
  { id: "data", label: "Data Analyst", icon: "📊", color: "#a855f7" },
  { id: "fullstack", label: "Full Stack Developer", icon: "🧩", color: "#22c55e" },
  { id: "ml", label: "ML Engineer", icon: "🤖", color: "#f59e0b" },
  { id: "backend", label: "Backend Developer", icon: "🔧", color: "#ec4899" },
];

const ROLE_SKILLS = {
  cloud: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Linux", "Networking", "CI/CD", "Python"],
  devops: ["Docker", "Kubernetes", "CI/CD", "Jenkins", "Git", "Linux", "Ansible", "Terraform", "Monitoring", "Shell Scripting"],
  data: ["Python", "SQL", "Excel", "Tableau", "Power BI", "Statistics", "Pandas", "Machine Learning", "Data Visualization", "R"],
  fullstack: ["React", "Node.js", "JavaScript", "HTML/CSS", "REST APIs", "SQL", "Git", "TypeScript", "MongoDB", "Docker"],
  ml: ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "Statistics", "Deep Learning", "NLP", "SQL", "Docker", "MLOps"],
  backend: ["Java", "Python", "Node.js", "REST APIs", "SQL", "NoSQL", "Docker", "Git", "Microservices", "Redis"],
};

async function callClaude(messages, systemPrompt, maxTokens) {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        system: systemPrompt,
        max_tokens: maxTokens || 1024,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.warn("AI proxy error:", data);
      return null;
    }
    return data.text || null;
  } catch (err) {
    console.warn("AI call error:", err);
    return null;
  }
}

function GlowCard({ children, style = {}, className = "" }) {
  return (
    <div className={`glow-card ${className}`} style={style}>
      {children}
    </div>
  );
}

function RadarChart({ skills, matched }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 85;
  const n = skills.length;
  if (n === 0) return null;

  const angleStep = (2 * Math.PI) / n;
  const getPoint = (i, radius) => {
    const angle = i * angleStep - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const matchedSet = new Set(matched.map((s) => s.toLowerCase()));

  const dataPoints = skills.map((skill, i) => {
    const isMatch = matchedSet.has(skill.toLowerCase());
    return getPoint(i, isMatch ? r * 0.9 : r * 0.2);
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {gridLevels.map((level) => {
        const pts = skills.map((_, i) => getPoint(i, r * level));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z";
        return <path key={level} d={path} fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="1" />;
      })}
      {skills.map((_, i) => {
        const [x, y] = getPoint(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(0,212,255,0.15)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill="rgba(0,212,255,0.2)" stroke="#00d4ff" strokeWidth="2" />
      {skills.map((skill, i) => {
        const [lx, ly] = getPoint(i, r + 18);
        const isMatch = matchedSet.has(skill.toLowerCase());
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={isMatch ? "#00d4ff" : "#666"} fontFamily="monospace">
            {skill.length > 8 ? skill.slice(0, 8) + ".." : skill}
          </text>
        );
      })}
    </svg>
  );
}

function ReadinessMeter({ score }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ textAlign: "center", position: "relative", display: "inline-block" }}>
      <svg width={130} height={130}>
        <circle cx={65} cy={65} r={54} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx={65} cy={65} r={54} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dashoffset 1.5s ease", filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x={65} y={60} textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" fontFamily="monospace">{score}%</text>
        <text x={65} y={78} textAnchor="middle" fill="#888" fontSize="9" fontFamily="monospace">READY</text>
      </svg>
    </div>
  );
}

function SkillTag({ skill, matched }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 10px", margin: "3px",
      borderRadius: "20px", fontSize: "12px", fontFamily: "monospace",
      background: matched ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
      border: `1px solid ${matched ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
      color: matched ? "#86efac" : "#fca5a5",
    }}>
      {matched ? "✓" : "✗"} {skill}
    </span>
  );
}

export default function AMDSlingshot() {
  const [step, setStep] = useState(0); // 0=home, 1=resume, 2=role, 3=results, 4=roadmap, 5=interview
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [roadmap, setRoadmap] = useState("");
  const [projectIdea, setProjectIdea] = useState("");
  const [interviewQ, setInterviewQ] = useState("");
  const [interviewA, setInterviewA] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileRef = useRef();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setResumeText(ev.target.result);
        setResumeFile(file.name);
      };
      reader.readAsText(file);
    } else {
      setUploadLoading(true);
      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("resume", file);
        const res = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.text) {
          setResumeText(data.text);
          setResumeFile(file.name);
        } else {
          alert(data.error || "Failed to parse file. Try pasting your resume instead.");
        }
      } catch {
        alert("Failed to parse file. Try pasting your resume instead.");
      }
      setUploadLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!resumeText) return;
    const role = selectedRole;
    const roleSkills = ROLE_SKILLS[role.id] || [];
    const jd = jdText || `Role: ${role.label}. Required skills: ${roleSkills.join(", ")}.`;

    setLoading(true);
    setLoadingMsg("Parsing resume...");
    await new Promise(r => setTimeout(r, 300));

    try {
      setLoadingMsg("Analyzing skill gaps...");

      const analysisPrompt = `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jd}\n\nTARGET ROLE: ${role.label}\nROLE REQUIRED SKILLS: ${roleSkills.join(", ")}\n\nInstructions:\n- Extract ONLY skills ACTUALLY mentioned in the resume. Do NOT assume or guess.\n- Compare extracted skills against required skills. Only mark matched if genuinely present.\n- If candidate has NO relevant skills, matched_skills should be empty [].\n- Be honest about readiness_score. If skills dont match, score should be low (10-30).\n\nReturn ONLY valid JSON:\n{"extracted_skills":[],"required_skills":[],"matched_skills":[],"missing_skills":[],"readiness_score":0,"experience_level":"entry/mid/senior","summary":"2-sentence honest assessment"}`;

      const analysisRaw = await callClaude(
        [{ role: "user", content: analysisPrompt }],
        "You are a strict, honest career analyzer. Return ONLY valid JSON. Never inflate scores or match skills the candidate doesn't have.", 1024
      );

      let parsed;
      if (analysisRaw) {
        try {
          parsed = JSON.parse(analysisRaw.replace(/```json|```/g, "").trim());
        } catch { parsed = null; }
      }

      if (!parsed) {
        const resumeLower = resumeText.toLowerCase();
        const matched = roleSkills.filter(s => resumeLower.includes(s.toLowerCase()));
        const missing = roleSkills.filter(s => !resumeLower.includes(s.toLowerCase()));
        const score = Math.round((matched.length / roleSkills.length) * 100);
        parsed = {
          extracted_skills: matched, required_skills: roleSkills,
          matched_skills: matched, missing_skills: missing,
          readiness_score: score, experience_level: "entry",
          summary: matched.length > 0
            ? `You have ${matched.length} of ${roleSkills.length} required skills. Focus on: ${missing.slice(0, 3).join(", ")}.`
            : `You have none of the key skills for ${role.label}. Significant learning needed.`
        };
      }

      setLoadingMsg("Generating learning roadmap...");
      const roadmapRaw = await callClaude([{
        role: "user",
        content: `I want to become a ${role.label}. Missing skills: ${parsed.missing_skills?.join(", ")}.\nCurrent skills: ${parsed.matched_skills?.join(", ") || "None relevant"}.\nReadiness: ${parsed.readiness_score}%.\n\nCreate a detailed 30-day roadmap:\nWEEK 1: Foundation (specific free resources, YouTube channels, docs)\nWEEK 2: Hands-on (exercises, labs, mini-projects)\nWEEK 3: Build a Real Project (step-by-step)\nWEEK 4: Interview Prep + Portfolio\n\nTOP 3 CERTIFICATIONS with provider, cost, and relevance.\nUse clear headings, bullets, emojis. Give actual course/channel names.`
      }], "You are an expert career coach for Indian tech students. Be specific with real resource names.", 1500);

      setLoadingMsg("Generating project idea...");
      const projectRaw = await callClaude([{
        role: "user",
        content: `I am preparing for a ${role.label} role. Missing skills: ${parsed.missing_skills?.slice(0, 5).join(", ")}.\n\nGenerate ONE impressive project that:\n1. Directly demonstrates missing skills for ${role.label}\n2. Buildable in 2-3 weeks\n3. Would impress a hiring manager\n\nFormat:\nPROJECT NAME: [name]\nDESCRIPTION: [2-3 lines]\nTECH STACK: [exact technologies]\nKEY FEATURES (5):\n1. [feature]\nARCHITECTURE: [brief system design]\nRESUME BULLET: [how to write on resume]\nGITHUB README: [sections to include]`
      }], `You are a senior ${role.label} at a top company mentoring a junior developer.`, 1200);

      const iqRaw = await callClaude([{
        role: "user",
        content: `You are interviewing for ${role.label}. Candidate skills: ${parsed.extracted_skills?.join(", ") || "basic programming"}. Missing: ${parsed.missing_skills?.slice(0, 3).join(", ")}.\n\nAsk ONE technical interview question that is specific to ${role.label}, tests practical knowledge, and requires a detailed answer. Just the question.`
      }], `You are a senior ${role.label} conducting a technical interview.`);

      // -- Fallback data when API is unavailable --
      const fallbackRoadmaps = {
        cloud: `☁️ 30-DAY CLOUD ENGINEER ROADMAP\n\n📅 WEEK 1 — Foundation\n• Learn Linux basics (The Linux Command Line - William Shotts, free online)\n• AWS Cloud Practitioner Essentials (free on AWS Skill Builder)\n• Watch TechWorld with Nana - AWS Tutorial on YouTube\n• Set up a free-tier AWS account and explore EC2, S3, IAM\n\n📅 WEEK 2 — Hands-on Practice\n• Complete 5 AWS labs on learn.cantrill.io or A Cloud Guru\n• Deploy a static website on S3 + CloudFront\n• Set up a VPC with public/private subnets\n• Learn Docker basics (Docker crash course - TechWorld with Nana)\n\n📅 WEEK 3 — Build a Real Project\n• Build a 3-tier web app on AWS:\n  - Frontend on S3/CloudFront\n  - Backend on EC2 or Lambda\n  - Database on RDS\n  - Use Terraform for infrastructure-as-code\n\n📅 WEEK 4 — Interview Prep & Portfolio\n• Solve 20 cloud scenario questions (Tutorials Dojo practice exams)\n• Document your project on GitHub with architecture diagrams\n• Practice explaining cloud concepts aloud\n• Review AWS Well-Architected Framework\n\n🏆 TOP 3 CERTIFICATIONS\n1. AWS Cloud Practitioner — AWS, ~$100, entry-level, most recognized\n2. AWS Solutions Architect Associate — AWS, ~$150, gold standard\n3. Azure Fundamentals AZ-900 — Microsoft, ~$99, multi-cloud advantage`,
        devops: `⚙️ 30-DAY DEVOPS ENGINEER ROADMAP\n\n📅 WEEK 1 — Foundation\n• Linux commands & shell scripting (LinuxJourney.com, free)\n• Git advanced workflows (Atlassian Git tutorials)\n• Watch TechWorld with Nana - DevOps Bootcamp on YouTube\n• Learn YAML syntax (essential for CI/CD configs)\n\n📅 WEEK 2 — Containers & CI/CD\n• Docker deep dive (Docker Mastery - Bret Fisher on Udemy)\n• Build a CI/CD pipeline with GitHub Actions\n• Learn Jenkins basics (Jenkins pipeline tutorial on YouTube)\n• Containerize a Node.js/Python app with Docker Compose\n\n📅 WEEK 3 — Build a Real Project\n• Build a full DevOps pipeline:\n  - GitHub repo with branching strategy\n  - Dockerfile + docker-compose.yml\n  - GitHub Actions CI/CD (build → test → deploy)\n  - Deploy to AWS EC2 or a free Kubernetes cluster\n  - Add monitoring with Prometheus + Grafana\n\n📅 WEEK 4 — Kubernetes & Interview Prep\n• Kubernetes basics (KodeKloud free labs)\n• Deploy your app on Minikube/Kind\n• Practice DevOps interview questions (DevOps-Exercises GitHub repo)\n• Write Terraform for your infrastructure\n\n🏆 TOP 3 CERTIFICATIONS\n1. AWS Cloud Practitioner — AWS, ~$100, cloud fundamentals\n2. CKA (Certified Kubernetes Admin) — CNCF, ~$395, highly valued\n3. Docker Certified Associate — Docker, ~$195, container expertise`,
        data: `📊 30-DAY DATA ANALYST ROADMAP\n\n📅 WEEK 1 — Foundation\n• Python for Data Analysis (Kaggle free courses)\n• SQL Masterclass (Mode Analytics SQL tutorial, free)\n• Statistics basics (Khan Academy - Statistics & Probability)\n• Excel advanced functions (ExcelJet.net tutorials)\n\n📅 WEEK 2 — Visualization & Tools\n• Tableau Public (free) - build 3 dashboards\n• Power BI Desktop (free) - complete a guided project\n• Pandas & Matplotlib (Corey Schafer YouTube channel)\n• Practice on real datasets from Kaggle\n\n📅 WEEK 3 — Build a Real Project\n• End-to-end data analysis project:\n  - Pick a real dataset (e.g., Indian e-commerce, IPL stats)\n  - Clean & transform with Python/Pandas\n  - Perform EDA with visualizations\n  - Build interactive Tableau/Power BI dashboard\n  - Write insights report with recommendations\n\n📅 WEEK 4 — Interview Prep & Portfolio\n• Solve 30 SQL problems on LeetCode/HackerRank\n• Create a portfolio website showcasing 3 projects\n• Practice case study presentations\n• Review A/B testing and hypothesis testing concepts\n\n🏆 TOP 3 CERTIFICATIONS\n1. Google Data Analytics Certificate — Coursera, ~₹3,000/month, great for beginners\n2. Microsoft Power BI Data Analyst — Microsoft, ~$165, industry recognized\n3. Tableau Desktop Specialist — Tableau, ~$100, visualization expertise`,
        fullstack: `🧩 30-DAY FULL STACK DEVELOPER ROADMAP\n\n📅 WEEK 1 — Foundation\n• JavaScript ES6+ deep dive (javascript.info, free)\n• React fundamentals (React docs tutorial + Scrimba free course)\n• Node.js + Express basics (The Odin Project, free)\n• Watch Traversy Media - MERN stack crash course on YouTube\n\n📅 WEEK 2 — Backend & Database\n• Build REST APIs with Express.js\n• MongoDB + Mongoose (MongoDB University free courses)\n• Authentication with JWT + bcrypt\n• Learn TypeScript basics (TypeScript Handbook, free)\n\n📅 WEEK 3 — Build a Real Project\n• Build a full-stack application:\n  - React frontend with routing & state management\n  - Node.js/Express REST API backend\n  - MongoDB database with proper schema\n  - JWT authentication & role-based access\n  - Deploy: Frontend on Vercel, Backend on Render/Railway\n\n📅 WEEK 4 — Polish & Interview Prep\n• Add testing (Jest + React Testing Library)\n• Git workflow: feature branches, PRs, meaningful commits\n• Solve 20 JavaScript/React interview questions\n• Optimize performance (lazy loading, caching)\n\n🏆 TOP 3 CERTIFICATIONS\n1. Meta Front-End Developer — Coursera, ~₹3,000/month, React focused\n2. freeCodeCamp Full Stack — Free, comprehensive, well-recognized\n3. AWS Cloud Practitioner — AWS, ~$100, deploy your apps to cloud`,
        ml: `🤖 30-DAY ML ENGINEER ROADMAP\n\n📅 WEEK 1 — Foundation\n• Python for ML (Kaggle Learn courses, free)\n• Statistics & Probability (StatQuest YouTube channel)\n• NumPy + Pandas deep dive (Corey Schafer YouTube)\n• Linear Algebra basics (3Blue1Brown - Essence of Linear Algebra)\n\n📅 WEEK 2 — Core ML\n• Scikit-learn tutorial (official docs + DataSchool YouTube)\n• Supervised learning: Regression, Classification, Decision Trees\n• Unsupervised learning: K-means, PCA\n• Model evaluation: cross-validation, metrics, overfitting\n\n📅 WEEK 3 — Deep Learning & Project\n• TensorFlow/PyTorch basics (official tutorials)\n• Build an end-to-end ML project:\n  - Dataset collection & cleaning\n  - Feature engineering\n  - Model training & hyperparameter tuning\n  - Deploy as REST API with Flask/FastAPI\n  - Create a simple web interface\n\n📅 WEEK 4 — MLOps & Interview Prep\n• Learn Docker for ML model containerization\n• MLflow for experiment tracking\n• Practice ML interview questions (InterviewBit)\n• Write a technical blog about your project\n\n🏆 TOP 3 CERTIFICATIONS\n1. Andrew Ng's ML Specialization — Coursera, ~₹3,000/month, gold standard\n2. TensorFlow Developer Certificate — Google, ~$100, practical skills\n3. AWS ML Specialty — AWS, ~$300, production ML`,
        backend: `🔧 30-DAY BACKEND DEVELOPER ROADMAP\n\n📅 WEEK 1 — Foundation\n• Choose: Python (FastAPI) or Java (Spring Boot) or Node.js (Express)\n• REST API design principles (RESTful API Design - Best Practices)\n• SQL deep dive (PostgreSQL tutorial on SQLBolt.com)\n• Git & GitHub workflow (GitHub Skills, free)\n\n📅 WEEK 2 — Advanced Backend\n• Database design: normalization, indexing, queries\n• Redis for caching (Redis University, free)\n• Authentication & Authorization (JWT, OAuth2)\n• Learn Docker (TechWorld with Nana Docker tutorial)\n\n📅 WEEK 3 — Build a Real Project\n• Build a production-grade backend:\n  - RESTful API with 10+ endpoints\n  - PostgreSQL/MongoDB database with proper schema\n  - Redis caching layer\n  - JWT authentication + role-based access\n  - Docker containerization\n  - API documentation with Swagger/OpenAPI\n\n📅 WEEK 4 — System Design & Interview Prep\n• System design basics (Gaurav Sen YouTube channel)\n• Microservices vs Monolith patterns\n• Practice backend interview questions\n• Load testing with Apache Bench or k6\n\n🏆 TOP 3 CERTIFICATIONS\n1. Oracle Java SE Certification — Oracle, ~$245, enterprise value\n2. AWS Cloud Practitioner — AWS, ~$100, cloud deployment\n3. MongoDB Developer Certification — MongoDB, ~$150, NoSQL expertise`,
      };

      const fallbackProjects = {
        cloud: `PROJECT NAME: CloudDeploy Pro\n\nDESCRIPTION: An automated infrastructure provisioning tool that deploys a 3-tier web application (React frontend, Node.js API, PostgreSQL DB) to AWS using Terraform. Includes auto-scaling, monitoring dashboards, and one-click rollback.\n\nTECH STACK: AWS (EC2, S3, RDS, CloudFront, ALB), Terraform, Docker, GitHub Actions, CloudWatch\n\nKEY FEATURES:\n1. Infrastructure-as-Code with Terraform modules for VPC, EC2, RDS, S3\n2. CI/CD pipeline with GitHub Actions for automatic deployment on push\n3. Auto-scaling group with CloudWatch alarms and SNS notifications\n4. Multi-environment setup (dev/staging/prod) with variable-driven configs\n5. Monitoring dashboard with CloudWatch metrics and log aggregation\n\nARCHITECTURE: User → CloudFront → ALB → EC2 Auto Scaling Group → RDS (Multi-AZ)\n\nRESUME BULLET: "Designed and deployed a 3-tier cloud infrastructure on AWS using Terraform, implementing auto-scaling, CI/CD pipelines, and monitoring — reducing deployment time by 80%"\n\nGITHUB README: Overview, Architecture Diagram, Prerequisites, Quick Start, Terraform Modules, CI/CD Setup, Monitoring, Cost Estimation, Screenshots`,
        devops: `PROJECT NAME: PipelineForge\n\nDESCRIPTION: A complete DevOps pipeline that automates the build, test, containerization, and deployment of a microservices application. Features GitOps workflow, Kubernetes deployment, and real-time monitoring with Prometheus and Grafana.\n\nTECH STACK: Docker, Kubernetes (Minikube), GitHub Actions, Terraform, Prometheus, Grafana, Ansible, Nginx\n\nKEY FEATURES:\n1. Multi-stage Docker builds for 3 microservices with optimized image sizes\n2. GitHub Actions CI/CD: lint → test → build → push to registry → deploy\n3. Kubernetes manifests with Deployments, Services, Ingress, ConfigMaps\n4. Prometheus metrics collection + Grafana dashboards for all services\n5. Ansible playbook for server provisioning and configuration management\n\nARCHITECTURE: GitHub → Actions CI/CD → Docker Registry → Kubernetes Cluster → Prometheus/Grafana\n\nRESUME BULLET: "Built an end-to-end DevOps pipeline with GitHub Actions, Docker, and Kubernetes, automating deployment of 3 microservices with monitoring — achieving zero-downtime deployments"\n\nGITHUB README: Architecture, Tech Stack, Prerequisites, Setup Guide, CI/CD Pipeline, K8s Deployment, Monitoring Setup, Screenshots, Contributing`,
        data: `PROJECT NAME: InsightDash India\n\nDESCRIPTION: An interactive data analytics platform that analyzes Indian e-commerce/startup data. Features automated ETL pipeline, statistical analysis, and real-time dashboards with drill-down capabilities.\n\nTECH STACK: Python, Pandas, SQL (PostgreSQL), Tableau/Power BI, Jupyter, Streamlit, Matplotlib, Seaborn\n\nKEY FEATURES:\n1. Automated ETL pipeline: data ingestion, cleaning, transformation with Python\n2. SQL analytics: complex queries, window functions, CTEs for business metrics\n3. Interactive Tableau dashboard with 5+ views and cross-filtering\n4. Statistical analysis: correlation, regression, A/B test simulation\n5. Streamlit web app for non-technical stakeholders to explore data\n\nARCHITECTURE: Raw Data → Python ETL → PostgreSQL → Tableau Dashboard + Streamlit App\n\nRESUME BULLET: "Built an end-to-end analytics platform processing 100K+ records with Python ETL, SQL analysis, and interactive Tableau dashboards — uncovering 3 key business insights that drove data-driven decisions"\n\nGITHUB README: Project Overview, Dataset, ETL Pipeline, SQL Queries, Dashboard Screenshots, Statistical Findings, Setup, Future Scope`,
        fullstack: `PROJECT NAME: TaskFlow Pro\n\nDESCRIPTION: A real-time project management application with Kanban boards, team collaboration, and AI-powered task prioritization. Features drag-and-drop UI, WebSocket live updates, and role-based access control.\n\nTECH STACK: React 18, TypeScript, Node.js, Express, MongoDB, Socket.io, JWT, Docker\n\nKEY FEATURES:\n1. Drag-and-drop Kanban board with React DnD and real-time sync\n2. WebSocket-powered live collaboration (see teammates' changes instantly)\n3. JWT authentication with role-based access (Admin, Manager, Member)\n4. RESTful API with 15+ endpoints, input validation, error handling\n5. Responsive design with dark/light mode and notification system\n\nARCHITECTURE: React SPA → Express API + Socket.io → MongoDB Atlas\n\nRESUME BULLET: "Developed a real-time project management app with React, Node.js, and WebSockets supporting 50+ concurrent users with drag-and-drop Kanban boards and role-based access control"\n\nGITHUB README: Demo GIF, Features, Tech Stack, Architecture, API Docs, Setup, Screenshots, Deployment`,
        ml: `PROJECT NAME: SmartPredict Engine\n\nDESCRIPTION: An end-to-end ML platform that predicts house prices/job salaries using ensemble models. Features automated feature engineering, model comparison dashboard, and a REST API for real-time predictions.\n\nTECH STACK: Python, Scikit-learn, TensorFlow, Pandas, FastAPI, Docker, Streamlit, MLflow\n\nKEY FEATURES:\n1. Automated data preprocessing: missing value handling, encoding, scaling\n2. Model comparison: Linear Regression, Random Forest, XGBoost, Neural Network\n3. MLflow experiment tracking with hyperparameter tuning results\n4. FastAPI REST endpoint for real-time predictions with input validation\n5. Streamlit dashboard: upload data, visualize predictions, compare models\n\nARCHITECTURE: Data → Preprocessing → Model Training (MLflow) → FastAPI Serving → Streamlit UI\n\nRESUME BULLET: "Built an ML prediction platform with 4 model comparison achieving 92% accuracy, deployed via FastAPI with Docker containerization and MLflow experiment tracking"\n\nGITHUB README: Problem Statement, Dataset, EDA, Model Training, Results, API Usage, Docker Setup, Demo`,
        backend: `PROJECT NAME: AuthScale API\n\nDESCRIPTION: A production-grade RESTful API platform with advanced authentication, rate limiting, caching, and comprehensive API documentation. Demonstrates microservice patterns with clean architecture.\n\nTECH STACK: Node.js/Python, Express/FastAPI, PostgreSQL, Redis, Docker, JWT, Swagger, Jest\n\nKEY FEATURES:\n1. Clean architecture: controllers, services, repositories, middleware layers\n2. JWT + refresh token auth with OAuth2 social login (Google, GitHub)\n3. Redis caching layer reducing DB queries by 60%\n4. Rate limiting, request validation, and comprehensive error handling\n5. Swagger/OpenAPI documentation with 20+ documented endpoints\n\nARCHITECTURE: Client → API Gateway (Rate Limit) → Express Routes → Service Layer → Repository → PostgreSQL + Redis Cache\n\nRESUME BULLET: "Architected a production-grade REST API with JWT auth, Redis caching, and rate limiting serving 1000+ req/sec — containerized with Docker and documented with Swagger"\n\nGITHUB README: Architecture, API Endpoints, Auth Flow, Setup, Docker, Testing, Performance Benchmarks`,
      };

      const fallbackInterviews = {
        cloud: [
          "You need to design a highly available web application on AWS that can handle sudden traffic spikes during sales events. Walk me through your architecture choices — which services would you use, how would you handle auto-scaling, and what would your disaster recovery strategy look like?",
          "Explain the difference between a public subnet and a private subnet in AWS VPC. How would you set up a secure architecture where your web servers are public-facing but your database is only accessible internally?",
          "Your company's AWS bill has increased by 40% this month. How would you investigate and optimize the costs? Walk me through your debugging process and cost optimization strategies.",
        ],
        devops: [
          "Your team's deployment takes 45 minutes and frequently fails at the testing stage. Design a CI/CD pipeline from scratch that would reduce this to under 10 minutes with reliable deployments. What tools and stages would you include?",
          "Explain the difference between Docker containers and Kubernetes pods. If I give you a Node.js application with 3 microservices, how would you containerize them and orchestrate deployment on Kubernetes?",
          "A production server is experiencing intermittent 502 errors during peak hours. Walk me through your troubleshooting process — what logs would you check, what monitoring would you set up, and how would you prevent this in the future?",
        ],
        data: [
          "You're given a dataset of 1 million e-commerce transactions. The business wants to know why sales dropped 20% last quarter. Walk me through your entire analysis process — from data cleaning to presenting actionable insights.",
          "Write a SQL query to find the top 5 customers by total spending in the last 6 months, along with their most purchased product category and the month-over-month growth rate of their spending.",
          "Explain the difference between correlation and causation with a real-world example. Your manager says 'ice cream sales and drowning deaths are correlated, so we should ban ice cream.' How would you respond?",
        ],
        fullstack: [
          "Design a real-time chat application. Walk me through the full architecture — frontend framework choice, backend API design, database schema for messages, and how you'd implement real-time updates. How would you handle 10,000 concurrent users?",
          "Explain the difference between server-side rendering (SSR) and client-side rendering (CSR). When would you choose one over the other? How does Next.js handle this?",
          "You have a React application that's becoming slow as the data grows. The page takes 5 seconds to render a list of 10,000 items. What optimization techniques would you apply?",
        ],
        ml: [
          "You're building a model to predict customer churn. Your dataset has 95% non-churned and 5% churned customers. How would you handle this class imbalance? Walk me through your complete approach from data preprocessing to model evaluation.",
          "Explain the bias-variance tradeoff with a practical example. Your model has 98% training accuracy but only 65% test accuracy. What's happening and how would you fix it?",
          "Compare Random Forest and XGBoost. When would you choose one over the other? Explain how each handles feature importance differently.",
        ],
        backend: [
          "Design a URL shortener service like bit.ly. Walk me through the system design — how would you generate unique short codes, what database would you choose, how would you handle millions of redirects per day, and what caching strategy would you use?",
          "Explain the difference between SQL and NoSQL databases. You're building a social media platform — which database would you use for user profiles, posts, and real-time messaging? Justify each choice.",
          "Your API endpoint is responding in 3 seconds but the target is under 200ms. Walk me through your performance debugging process and the optimization techniques you'd apply.",
        ],
      };

      setAnalysis(parsed);
      const questions = fallbackInterviews[role.id] || fallbackInterviews.backend;
      const randomQ = questions[Math.floor(Math.random() * questions.length)];
      setRoadmap(roadmapRaw || fallbackRoadmaps[role.id] || "Roadmap not available.");
      setProjectIdea(projectRaw || fallbackProjects[role.id] || "Project suggestion not available.");
      setInterviewQ((iqRaw || randomQ || "").trim());

      setStep(3);
    } catch (err) {
      console.error("Analysis error:", err);
      alert("Error during analysis. Please try again.");
    }
    setLoading(false);
  };

  const evaluateInterview = async () => {
    if (!interviewA.trim()) return;
    setInterviewLoading(true);
    const fb = await callClaude([{
      role: "user",
      content: `Role: ${selectedRole?.label}\nQuestion: ${interviewQ}\nCandidate Answer: ${interviewA}\n\nEvaluate as a senior ${selectedRole?.label} interviewer:\n- Technical Accuracy: score/10 with explanation\n- Clarity & Communication: score/10\n- What was done well (specific)\n- What needs improvement (specific)\n- Model answer outline (brief)\n\nBe constructive, specific, and encouraging.`
    }], `You are a senior ${selectedRole?.label} evaluating interview answers. Be fair, detailed, and constructive.`);
    setInterviewFeedback(fb || "AI evaluation is currently unavailable. Review your answer by checking if it covers: key concepts, practical examples, trade-offs, and real-world application.");
    setInterviewLoading(false);
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #080b14;
      color: #e2e8f0;
      font-family: 'Syne', sans-serif;
      min-height: 100vh;
    }

    .app {
      min-height: 100vh;
      background: #080b14;
      position: relative;
      overflow-x: hidden;
    }

    .bg-grid {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image: 
        linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .bg-orb {
      position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0;
    }

    .orb1 { width: 400px; height: 400px; background: rgba(0,212,255,0.06); top: -100px; right: -100px; }
    .orb2 { width: 300px; height: 300px; background: rgba(168,85,247,0.06); bottom: 100px; left: -50px; }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px;
      position: relative;
      z-index: 1;
    }

    .header {
      padding: 24px 0 16px;
      border-bottom: 1px solid rgba(0,212,255,0.1);
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }

    .logo {
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      color: #00d4ff;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .logo-dot { color: #a855f7; }

    .header-badge {
      margin-left: auto;
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      padding: 4px 10px;
      background: rgba(0,212,255,0.08);
      border: 1px solid rgba(0,212,255,0.2);
      border-radius: 20px;
      color: #00d4ff;
      letter-spacing: 1px;
    }

    .glow-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.3s;
    }

    .glow-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(0,212,255,0.03) 0%, transparent 60%);
      pointer-events: none;
    }

    .hero-title {
      font-size: clamp(32px, 6vw, 52px);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 16px;
    }

    .hero-title .accent { color: #00d4ff; }
    .hero-title .accent2 { color: #a855f7; }

    .hero-sub {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 32px;
      max-width: 560px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 10px;
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #00d4ff, #0099cc);
      color: #080b14;
      box-shadow: 0 0 20px rgba(0,212,255,0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 30px rgba(0,212,255,0.5);
    }

    .btn-secondary {
      background: rgba(255,255,255,0.05);
      color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.15);
    }

    .btn-secondary:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.25);
    }

    .btn-purple {
      background: linear-gradient(135deg, #a855f7, #7c3aed);
      color: white;
      box-shadow: 0 0 20px rgba(168,85,247,0.3);
    }

    .btn-purple:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 30px rgba(168,85,247,0.5);
    }

    .btn-green {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
      box-shadow: 0 0 20px rgba(34,197,94,0.3);
    }

    .section-label {
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #00d4ff;
      margin-bottom: 8px;
    }

    .section-title {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 20px;
    }

    .upload-zone {
      border: 2px dashed rgba(0,212,255,0.3);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: rgba(0,212,255,0.02);
    }

    .upload-zone:hover {
      border-color: rgba(0,212,255,0.6);
      background: rgba(0,212,255,0.05);
    }

    .upload-zone.has-file {
      border-color: rgba(34,197,94,0.5);
      background: rgba(34,197,94,0.05);
    }

    .role-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .role-card {
      padding: 16px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
      transition: all 0.2s;
      background: rgba(255,255,255,0.02);
    }

    .role-card:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-2px); }
    .role-card.selected { border-color: #00d4ff; background: rgba(0,212,255,0.08); box-shadow: 0 0 15px rgba(0,212,255,0.15); }

    .role-icon { font-size: 24px; margin-bottom: 8px; }
    .role-name { font-size: 14px; font-weight: 600; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .stat-box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }

    .stat-number {
      font-family: 'Space Mono', monospace;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .progress-bar {
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 3px;
      overflow: hidden;
      margin: 8px 0;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 1.5s ease;
    }

    .tab-bar {
      display: flex;
      gap: 4px;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
      padding: 4px;
      margin-bottom: 24px;
    }

    .tab {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: #64748b;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .tab.active {
      background: rgba(0,212,255,0.15);
      color: #00d4ff;
    }

    .roadmap-text {
      font-size: 14px;
      line-height: 1.8;
      color: #cbd5e1;
      white-space: pre-wrap;
      font-family: 'Syne', sans-serif;
    }

    textarea {
      width: 100%;
      padding: 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      color: #e2e8f0;
      font-size: 14px;
      font-family: 'Space Mono', monospace;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }

    textarea:focus { border-color: rgba(0,212,255,0.4); }

    .loading-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(8,11,20,0.9);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 16px;
    }

    .spinner {
      width: 48px; height: 48px;
      border: 3px solid rgba(0,212,255,0.2);
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .loading-text {
      font-family: 'Space Mono', monospace;
      font-size: 14px;
      color: #00d4ff;
      letter-spacing: 2px;
    }

    .step-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 32px;
    }

    .step-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      transition: all 0.3s;
    }

    .step-dot.done { background: #00d4ff; box-shadow: 0 0 8px rgba(0,212,255,0.5); }
    .step-dot.active { background: #a855f7; box-shadow: 0 0 8px rgba(168,85,247,0.5); transform: scale(1.3); }

    .interview-feedback {
      font-size: 14px;
      line-height: 1.8;
      color: #cbd5e1;
      white-space: pre-wrap;
      background: rgba(168,85,247,0.05);
      border: 1px solid rgba(168,85,247,0.2);
      border-radius: 10px;
      padding: 16px;
      font-family: 'Syne', sans-serif;
    }

    .back-btn {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      color: #64748b;
      cursor: pointer;
      background: none;
      border: none;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 20px;
      transition: color 0.2s;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .back-btn:hover { color: #00d4ff; }

    .divider {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 24px 0;
    }
  `;

  const [activeResultTab, setActiveResultTab] = useState("analysis");

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="bg-grid" />
        <div className="bg-orb orb1" />
        <div className="bg-orb orb2" />

        {loading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <div className="loading-text">{loadingMsg}</div>
          </div>
        )}

        <div className="container">
          <header className="header">
            <div>
              <div className="logo">AI Career<span className="logo-dot">.</span>Mentor</div>
            </div>
            <span className="header-badge">🇮🇳 Built for India</span>
          </header>

          {/* Step indicator */}
          {step > 0 && (
            <div className="step-indicator">
              {["Resume", "Role", "Results"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className={`step-dot ${step > i + 1 ? "done" : step === i + 1 ? "active" : ""}`} />
                  <span style={{ fontSize: 11, color: step === i + 1 ? "#a855f7" : step > i + 1 ? "#00d4ff" : "#334155", fontFamily: "Space Mono", letterSpacing: 1, textTransform: "uppercase" }}>{s}</span>
                  {i < 2 && <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.1)" }} />}
                </div>
              ))}
            </div>
          )}

          {/* === STEP 0: HERO === */}
          {step === 0 && (
            <div style={{ paddingBottom: 60 }}>
              <div style={{ marginBottom: 48 }}>
                <div className="section-label">Solving India's Employability Crisis</div>
                <h1 className="hero-title">
                  Know Your <span className="accent">Skill Gap</span>.<br />
                  Build Your <span className="accent2">Career Path</span>.
                </h1>
                <p className="hero-sub">
                  Upload your resume, pick a role, and get an AI-powered skill gap analysis, readiness score, personalized 30-day roadmap, and project ideas — in seconds.
                </p>
                <button className="btn btn-primary" onClick={() => setStep(1)} style={{ marginRight: 12 }}>
                  Get Started →
                </button>
                <button className="btn btn-secondary" onClick={() => { setResumeText("Sample resume - Skills: Python, SQL, Git, HTML, CSS, JavaScript, basic Linux"); setStep(2); }}>
                  Try Demo
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {[
                  { icon: "🎯", title: "Skill Gap Analysis", desc: "See exactly what skills you're missing for your target role" },
                  { icon: "📊", title: "Readiness Score", desc: "Get a precise % score of how job-ready you are right now" },
                  { icon: "🗺️", title: "30-Day Roadmap", desc: "A personalized learning plan to land your dream job" },
                ].map((f, i) => (
                  <GlowCard key={i}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{f.desc}</div>
                  </GlowCard>
                ))}
              </div>
            </div>
          )}

          {/* === STEP 1: RESUME UPLOAD === */}
          {step === 1 && (
            <div style={{ paddingBottom: 60 }}>
              <button className="back-btn" onClick={() => setStep(0)}>← Back</button>
              <div className="section-label">Step 1 of 2</div>
              <div className="section-title">Upload Your Resume</div>

              <GlowCard>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? "⏳ Parsing file..." : "📂 Upload File (PDF, DOCX, DOC, TXT)"}
                  </button>
                  {resumeFile && <span style={{ fontSize: 13, color: "#22c55e", fontFamily: "Space Mono" }}>✅ {resumeFile}</span>}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileUpload} />
                {uploadLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "10px 14px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 10 }}>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    <span style={{ fontSize: 13, color: "#00d4ff", fontFamily: "Space Mono" }}>Extracting text from your file...</span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                  {resumeText ? "Your resume text (edit if needed):" : "Or paste your resume text below:"}
                </div>
                <textarea
                  rows={10}
                  placeholder="Paste your resume content here... Include your skills, projects, experience, education."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </GlowCard>

              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setStep(2)}
                  disabled={!resumeText}
                  style={{ opacity: resumeText ? 1 : 0.4 }}
                >
                  Next: Select Role →
                </button>
              </div>
            </div>
          )}

          {/* === STEP 2: ROLE SELECTION === */}
          {step === 2 && (
            <div style={{ paddingBottom: 60 }}>
              <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
              <div className="section-label">Step 2 of 2</div>
              <div className="section-title">Select Target Role</div>

              <div className="role-grid" style={{ marginBottom: 24 }}>
                {ROLES.map((role) => (
                  <div
                    key={role.id}
                    className={`role-card ${selectedRole?.id === role.id ? "selected" : ""}`}
                    onClick={() => setSelectedRole(role)}
                    style={selectedRole?.id === role.id ? { borderColor: role.color, boxShadow: `0 0 15px ${role.color}33` } : {}}
                  >
                    <div className="role-icon">{role.icon}</div>
                    <div className="role-name">{role.label}</div>
                  </div>
                ))}
              </div>

              <GlowCard>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Or paste a Job Description (optional):</div>
                <textarea
                  rows={5}
                  placeholder="Paste the job description here for more accurate analysis..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </GlowCard>

              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  onClick={runAnalysis}
                  disabled={!selectedRole}
                  style={{ opacity: selectedRole ? 1 : 0.4 }}
                >
                  🚀 Analyze My Profile
                </button>
              </div>
            </div>
          )}

          {/* === STEP 3: RESULTS === */}
          {step === 3 && analysis && (
            <div style={{ paddingBottom: 60 }}>
              <button className="back-btn" onClick={() => { setStep(2); setAnalysis(null); }}>← Restart</button>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <div>
                  <div className="section-label">Analysis Complete</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedRole?.icon} {selectedRole?.label}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <ReadinessMeter score={analysis.readiness_score || 0} />
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-number" style={{ color: "#22c55e" }}>{analysis.matched_skills?.length || 0}</div>
                  <div className="stat-label">Matched Skills</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number" style={{ color: "#ef4444" }}>{analysis.missing_skills?.length || 0}</div>
                  <div className="stat-label">Missing Skills</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number" style={{ color: "#f59e0b" }}>{analysis.experience_level || "—"}</div>
                  <div className="stat-label">Experience</div>
                </div>
              </div>

              <div className="tab-bar">
                {["analysis", "roadmap", "project", "interview"].map((t) => (
                  <button key={t} className={`tab ${activeResultTab === t ? "active" : ""}`} onClick={() => setActiveResultTab(t)}>
                    {t === "analysis" ? "📊 Analysis" : t === "roadmap" ? "🗺️ Roadmap" : t === "project" ? "💡 Project" : "🎤 Interview"}
                  </button>
                ))}
              </div>

              {activeResultTab === "analysis" && (
                <div>
                  <GlowCard style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: "#94a3b8" }}>AI Summary</div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cbd5e1" }}>{analysis.summary}</p>
                  </GlowCard>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <GlowCard>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: "#22c55e", fontSize: 13 }}>✅ You Have These</div>
                      <div>
                        {analysis.matched_skills?.map((s, i) => <SkillTag key={i} skill={s} matched={true} />)}
                        {(!analysis.matched_skills?.length) && <span style={{ color: "#64748b", fontSize: 13 }}>None detected</span>}
                      </div>
                    </GlowCard>
                    <GlowCard>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: "#ef4444", fontSize: 13 }}>❌ You Need These</div>
                      <div>
                        {analysis.missing_skills?.map((s, i) => <SkillTag key={i} skill={s} matched={false} />)}
                        {(!analysis.missing_skills?.length) && <span style={{ color: "#64748b", fontSize: 13 }}>None missing!</span>}
                      </div>
                    </GlowCard>
                  </div>

                  <GlowCard style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: "#94a3b8" }}>Skill Radar</div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <RadarChart
                        skills={analysis.required_skills?.slice(0, 8) || []}
                        matched={analysis.matched_skills || []}
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6, fontFamily: "Space Mono" }}>
                        <span>Overall Readiness</span>
                        <span>{analysis.readiness_score}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${analysis.readiness_score}%`,
                          background: analysis.readiness_score >= 70 ? "linear-gradient(90deg,#22c55e,#16a34a)" : analysis.readiness_score >= 40 ? "linear-gradient(90deg,#f59e0b,#d97706)" : "linear-gradient(90deg,#ef4444,#dc2626)"
                        }} />
                      </div>
                    </div>
                  </GlowCard>
                </div>
              )}

              {activeResultTab === "roadmap" && (
                <GlowCard>
                  <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: "#00d4ff" }}>🗺️ Your 30-Day Learning Roadmap</div>
                  <div className="roadmap-text">{roadmap}</div>
                </GlowCard>
              )}

              {activeResultTab === "project" && (
                <GlowCard>
                  <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: "#f59e0b" }}>💡 Recommended GitHub Project</div>
                  <div className="roadmap-text">{projectIdea}</div>
                </GlowCard>
              )}

              {activeResultTab === "interview" && (
                <div>
                  <GlowCard style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: "#a855f7" }}>🎤 Interview Question</div>
                    <div style={{
                      padding: "14px 16px",
                      background: "rgba(168,85,247,0.08)",
                      border: "1px solid rgba(168,85,247,0.2)",
                      borderRadius: 10,
                      fontSize: 15,
                      lineHeight: 1.6,
                      marginBottom: 16
                    }}>
                      {interviewQ || "Loading question..."}
                    </div>
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Your Answer:</div>
                    <textarea
                      rows={5}
                      placeholder="Type your answer here..."
                      value={interviewA}
                      onChange={(e) => setInterviewA(e.target.value)}
                      style={{ marginBottom: 12 }}
                    />
                    <button className="btn btn-purple" onClick={evaluateInterview} disabled={interviewLoading || !interviewA.trim()}>
                      {interviewLoading ? "Evaluating..." : "Get AI Feedback →"}
                    </button>
                  </GlowCard>

                  {interviewFeedback && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>AI Evaluation:</div>
                      <div className="interview-feedback">{interviewFeedback}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}