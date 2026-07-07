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

async function callClaude(messages, systemPrompt) {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
  if (!apiKey) {
    console.warn("VITE_CLAUDE_API_KEY is not set; using demo mode fallback");
    return null;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn("Claude API returned non-ok response", response.status, data);
      return null;
    }
    return data.content?.[0]?.text || null;
  } catch (err) {
    console.warn("Claude API call error", err);
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

export default function App() {
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
  const fileRef = useRef();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResumeFile(file.name);
    // Read as text (works for .txt; for real app use PDF parser)
    const reader = new FileReader();
    reader.onload = (ev) => setResumeText(ev.target.result);
    reader.readAsText(file);
  };

  const runAnalysis = async () => {
    if (!resumeText && !resumeFile) return;
    const role = selectedRole;
    const roleSkills = ROLE_SKILLS[role.id] || [];
    const jd = jdText || `Role: ${role.label}. Required skills: ${roleSkills.join(", ")}.`;

    setLoading(true);
    setLoadingMsg("🔍 Parsing resume...");
    await new Promise(r => setTimeout(r, 400));

    try {
      setLoadingMsg("⚡ Analyzing skill gaps...");
      const resumeForPrompt = resumeText || `Sample resume for hackathon demo - Skills: Python, SQL, Git, Linux, HTML, CSS, JavaScript, basic AWS`;

      const analysisPrompt = `Resume:
${resumeForPrompt}

Job Description:
${jd}

Analyze and return ONLY valid JSON (no markdown) with this exact structure:
{
  "extracted_skills": ["skill1","skill2"],
  "required_skills": ["skill1","skill2"],
  "matched_skills": ["skill1","skill2"],
  "missing_skills": ["skill1","skill2"],
  "readiness_score": 65,
  "experience_level": "entry/mid/senior",
  "summary": "2-sentence summary"
}`;

      const hasApiKey = Boolean(import.meta.env.VITE_CLAUDE_API_KEY);
      const analysisRaw = hasApiKey
        ? await callClaude(
            [ { role: "user", content: analysisPrompt } ],
            "You are a precise career analyzer. Return ONLY valid JSON, no markdown code blocks, no extra text."
          )
        : null;

      let parsed;
      if (analysisRaw) {
        try {
          const cleaned = analysisRaw.replace(/```json|```/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = null;
        }
      }

      if (!parsed) {
        // fallback mock / demo data
        parsed = {
          extracted_skills: ["Python", "SQL", "Git", "Linux", "JavaScript"],
          required_skills: roleSkills,
          matched_skills: roleSkills.slice(0, 3),
          missing_skills: roleSkills.slice(3),
          readiness_score: 42,
          experience_level: "entry",
          summary: "You have foundational skills but need to develop role-specific competencies to be competitive for this position."
        };
      }

      setLoadingMsg("🗺️ Generating personalized roadmap...");
      const roadmapPrompt = `Missing skills for ${role.label}: ${parsed.missing_skills?.join(", ")}.
Create a concise 30-day learning roadmap with:
- Week 1, Week 2, Week 3, Week 4 plans
- Top 3 project ideas
- Top 2 certification recommendations
Keep it practical and India-job-market focused. Format nicely with emojis.`;

      const roadmapRaw = hasApiKey
        ? await callClaude(
            [ { role: "user", content: roadmapPrompt } ],
            "You are an expert career coach for Indian tech students. Be practical, specific, and motivating."
          )
        : `Demo roadmap for ${role.label}:\n- Week 1: Fundamentals and tools\n- Week 2: Hands-on labs\n- Week 3: Build capstone project\n- Week 4: Interview prep + portfolio polish\nTop 3 projects: SkillTracker, RoleReady, CareerPathPro\nTop 2 certs: AWS Cloud Practitioner, Azure Fundamentals`;


      setLoadingMsg("💡 Generating project ideas...");
      const projectPrompt = `Generate ONE impressive GitHub-worthy project idea for a ${role.label} role that demonstrates: ${parsed.missing_skills?.slice(0, 4).join(", ")}.
Include: Project name, 2-line description, tech stack, 3 key features, resume bullet point. Keep concise.`;

      const projectRaw = hasApiKey
        ? await callClaude(
            [ { role: "user", content: projectPrompt } ],
            "You are a senior engineer mentoring Indian CS students for job placements."
          )
        : `Demo project idea: SkillBridge - React + Node + Mongo; features: skill gap analyzer, personalized learning path, resume bullet generator; resume bullet: \"Built SkillBridge to auto-detect skill gaps and recommend a 30-day upskill plan.\"`;


      setAnalysis(parsed);
      setRoadmap(roadmapRaw);
      setProjectIdea(projectRaw);

      // Generate interview question
      const iqRaw = hasApiKey
        ? await callClaude([{
            role: "user",
            content: `Generate 1 technical interview question for a ${role.label} role covering one of: ${parsed.matched_skills?.slice(0, 3).join(", ")}. Just the question, no answer.`
          }], "You are a technical interviewer.")
        : "Explain the difference between a monolith and microservices architecture.";
      setInterviewQ((iqRaw || "").trim());

      setStep(3);
    } catch (err) {
      alert(
        "API error while calling Claude.\n" +
        "Ensure VITE_CLAUDE_API_KEY is set in .env and that the key is valid.\n" +
        "If you're testing without a key, use the 'Try Demo' button to continue."
      );
    }
    setLoading(false);
  };

  const evaluateInterview = async () => {
    if (!interviewA.trim()) return;
    setInterviewLoading(true);
    const hasApiKey = Boolean(import.meta.env.VITE_CLAUDE_API_KEY);
    const fb = hasApiKey
      ? await callClaude([{
          role: "user",
          content: `Question: ${interviewQ}\nCandidate Answer: ${interviewA}\n\nEvaluate: technical accuracy (score/10), clarity (score/10), what was good, what to improve. Be concise and encouraging.`
        }], "You are a technical interviewer evaluating Indian engineering students. Be fair, specific, and constructive.")
      : `Demo feedback:\n- Technical accuracy: 8/10\n- Clarity: 7/10\n- Good: strong concept explanation\n- Improve: add an example and correct CLI syntax.`;
    setInterviewFeedback(fb || "Demo feedback available.");
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

              <GlowCard style={{ marginBottom: 20 }}>
                <div
                  className={`upload-zone ${resumeFile ? "has-file" : ""}`}
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept=".txt,.pdf" style={{ display: "none" }} onChange={handleFileUpload} />
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{resumeFile ? "✅" : "📄"}</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {resumeFile ? resumeFile : "Click to Upload Resume"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {resumeFile ? "File loaded successfully" : "Supports .txt (PDF support coming soon)"}
                  </div>
                </div>
              </GlowCard>

              <GlowCard>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Or paste your resume text:</div>
                <textarea
                  rows={8}
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