import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getJobs, getApplications, getApplicationsForJob, createJob, updateJobStatus, updateApplicationStatus, getStats, getUsers } from "../api/client";
import { extractSkills } from "../api/nlp";
import { C, STATUS, Avatar, Badge, ScorePill, SkillChip, MiniBar, RingScore, Spinner, StatCard, Card, PageHeader, Button, SidebarLayout } from "../components/UI";

export default function HRDashboard() {
  const { user, logout } = useAuth();
  const [nav, setNav]       = useState("overview");
  const [jobs, setJobs]     = useState([]);
  const [stats, setStats]   = useState(null);
  const [allApps, setAllApps] = useState([]);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobApps, setJobApps]   = useState([]);
  const [aiSums, setAiSums]     = useState({});
  const [expandedApp, setExpandedApp] = useState(null);
  const [newJob, setNewJob] = useState({ title: "", company: "", dept: "", location: "", type: "Full-time", deadline: "", experience_level: "any", jd: "" });
  const [jobError, setJobError] = useState("");
  const [aiReport, setAiReport] = useState("");
  const [repLoading, setRepLoading] = useState(false);
  const [pollingTs, setPollingTs] = useState(Date.now());
  const [rejectConfirm, setRejectConfirm] = useState(null);

  const isAdmin = user.role === "admin";
  const accent  = C.hr;

  const navItems = [
    { id: "overview", label: "Overview",    icon: "" },
    { id: "jobs",     label: isAdmin ? "All Jobs" : "My Jobs", icon: "" },
    { id: "allcands", label: isAdmin ? "All Candidates" : "My Candidates", icon: "" },
    { id: "shortlisted", label: "Shortlisted", icon: "" },
    ...(!isAdmin ? [{ id: "post", label: "Post a Job", icon: "" }] : []),
    ...(isAdmin ? [
      { id: "div1",      divider: true },
      { id: "analytics", label: "Analytics",     icon: "" },
      { id: "allusers",  label: "Users",           icon: "" },
    ] : []),
  ];

  // ─── Data Loading ────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [j, s] = await Promise.all([getJobs(), getStats()]);
      setJobs(j); setStats(s);
    } catch (_) {}
  }, []);

  useEffect(() => { loadAll(); }, [loadAll, pollingTs]);

  // Poll every 8 seconds for real-time updates
  useEffect(() => {
    const t = setInterval(() => setPollingTs(Date.now()), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (nav === "allcands" || nav === "pipeline" || nav === "shortlisted") {
      getApplications().then(setAllApps).catch(() => {});
    }
    if (nav === "allusers" && isAdmin) {
      getUsers().then(setUsers).catch(() => {});
    }
  }, [nav, pollingTs, isAdmin]);

  // ─── Screen a job ────────────────────────────────────────────────────────────
  const runScreen = async (job) => {
    setLoading(true); setLoadMsg("🔍 Loading applications...");
    setSelectedJob(job); setJobApps([]); setExpandedApp(null);
    try {
      const apps = await getApplicationsForJob(job.id);
      // Sort by score desc, assign rank
      const sorted = [...apps].sort((a, b) => b.score - a.score).map((a, i) => ({ ...a, rank: i + 1 }));
      setJobApps(sorted);
      setLoadMsg("🤖 Generating AI notes for top candidates...");
      const newSums = { ...aiSums };
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        const a = sorted[i];
        if (newSums[a.id]) continue;
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 200, system: "You are a recruiter. Write concise 2-sentence candidate notes.", messages: [{ role: "user", content: `Resume excerpt:\n${a.resume_text?.slice(0, 400)}\n\nJob: ${job.title}\nScore: ${a.score}%, Matched: ${a.matched_skills?.join(", ")}, Missing: ${a.missing_skills?.join(", ")}\n\nWrite a 2-sentence recruiter note: key strength + main gap.` }] }),
          });
          const data = await res.json();
          newSums[a.id] = data.content?.[0]?.text || "";
        } catch (_) {}
      }
      setAiSums(newSums);
      setNav("screen");
    } catch (_) {}
    setLoading(false);
  };

  // ─── Update app status ───────────────────────────────────────────────────────
  const moveStatus = async (appId, status) => {
    if (status === "rejected") {
      const app = allApps.find(a => a.id === appId);
      setRejectConfirm({ appId, name: app?.applicant_name || "this candidate", jobTitle: app?.job_title || "" });
      return;
    }
    await updateApplicationStatus(appId, status);
    setJobApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    setAllApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const confirmReject = async () => {
    if (!rejectConfirm) return;
    await updateApplicationStatus(rejectConfirm.appId, "rejected");
    setJobApps(prev => prev.map(a => a.id === rejectConfirm.appId ? { ...a, status: "rejected" } : a));
    setAllApps(prev => prev.map(a => a.id === rejectConfirm.appId ? { ...a, status: "rejected" } : a));
    setRejectConfirm(null);
  };

  // ─── Post job ────────────────────────────────────────────────────────────────
  const postJob = async () => {
    setJobError("");
    if (!newJob.title.trim() || !newJob.jd.trim()) { setJobError("Title and Job Description are required."); return; }
    try {
      const j = await createJob(newJob);
      setJobs(prev => [j, ...prev]);
      setNewJob({ title: "", company: "", dept: "", location: "", type: "Full-time", deadline: "", experience_level: "any", jd: "" });
      setNav("jobs");
      loadAll();
    } catch (err) { setJobError(err.response?.data?.error || "Failed to post job."); }
  };

  const toggleJobStatus = async (job) => {
    const updated = await updateJobStatus(job.id, job.status === "active" ? "closed" : "active");
    setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
  };

  const genReport = async () => {
    setRepLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, system: "You are an HR analytics expert. Write concise executive reports.", messages: [{ role: "user", content: `Hiring data: ${jobs.length} jobs (${jobs.filter(j=>j.status==="active").length} active), ${stats?.total_apps||0} applications. Pipeline: ${JSON.stringify(stats?.pipeline||{})}. Departments: ${[...new Set(jobs.map(j=>j.dept))].join(", ")}.\n\nWrite a concise executive hiring report with key insights and 3 actionable recommendations. Use bullet points.` }] }),
      });
      const data = await res.json();
      setAiReport(data.content?.[0]?.text || "");
    } catch (_) {}
    setRepLoading(false);
  };

  const pad = { padding: "28px 32px" };
  const cardSt = { marginBottom: 16 };

  const buildMailto = (email, name, jobTitle, status) => {
    const templates = {
      screening: {
        subject: `Application Update — ${jobTitle} | HireAI`,
        body: `Dear ${name},\n\nThank you for applying for the ${jobTitle} position. We have received your application and it is currently under review.\n\nWe will get back to you shortly with an update.\n\nBest regards,\n${user.name}\nHR Team | HireAI`
      },
      shortlisted: {
        subject: `Congratulations! You've been Shortlisted — ${jobTitle} | HireAI`,
        body: `Dear ${name},\n\nWe are pleased to inform you that you have been shortlisted for the ${jobTitle} position.\n\nOur team was impressed with your profile and we would like to move forward with the next steps of the hiring process.\n\nPlease reply to this email to confirm your availability for further rounds.\n\nBest regards,\n${user.name}\nHR Team | HireAI`
      },
      interview: {
        subject: `Interview Invitation — ${jobTitle} | HireAI`,
        body: `Dear ${name},\n\nWe are excited to invite you for an interview for the ${jobTitle} position.\n\nInterview Details:\n- Date: [Please fill in]\n- Time: [Please fill in]\n- Mode: [Online/In-person]\n- Platform/Location: [Please fill in]\n\nPlease confirm your availability by replying to this email.\n\nBest regards,\n${user.name}\nHR Team | HireAI`
      },
      offer: {
        subject: `Offer Letter — ${jobTitle} | HireAI`,
        body: `Dear ${name},\n\nCongratulations! We are delighted to extend an offer for the ${jobTitle} position.\n\nOffer Details:\n- Position: ${jobTitle}\n- Joining Date: [Please fill in]\n- CTC/Stipend: [Please fill in]\n\nPlease review and confirm your acceptance by replying to this email within 5 business days.\n\nWe look forward to having you on our team!\n\nBest regards,\n${user.name}\nHR Team | HireAI`
      },
      hired: {
        subject: `Welcome Aboard! — ${jobTitle} | HireAI`,
        body: `Dear ${name},\n\nWelcome to the team! We are thrilled to confirm your hiring for the ${jobTitle} position.\n\nOnboarding Details:\n- Start Date: [Please fill in]\n- Reporting To: [Please fill in]\n- Documents Required: [Please fill in]\n\nPlease reply if you have any questions. We look forward to working with you!\n\nBest regards,\n${user.name}\nHR Team | HireAI`
      },
      rejected: {
        subject: `Application Update — ${jobTitle} | HireAI`,
        body: `Dear ${name},\n\nThank you for your interest in the ${jobTitle} position and for taking the time to apply.\n\nAfter careful consideration, we have decided to move forward with other candidates whose profiles more closely match our current requirements.\n\nWe encourage you to apply for future openings. We wish you all the best in your career.\n\nBest regards,\n${user.name}\nHR Team | HireAI`
      },
    };
    const t = templates[status] || templates.screening;
    return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`;
  };

  return (
    <SidebarLayout user={user} navItems={navItems} activeNav={nav} onNav={setNav} onLogout={logout} accent={accent}>
      {loading && <Spinner message={loadMsg} accent={accent} />}

      {/* ── REJECT CONFIRMATION MODAL ── */}
      {rejectConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
          onClick={() => setRejectConfirm(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22, fontWeight: 800, color: "#ef4444" }}>!</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>Reject Candidate?</div>
            <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 6 }}>
              Are you sure you want to reject <strong style={{ color: "#1e293b" }}>{rejectConfirm.name}</strong>?
            </div>
            {rejectConfirm.jobTitle && (
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
                Applied for: <strong>{rejectConfirm.jobTitle}</strong>
              </div>
            )}
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#b91c1c", marginBottom: 24, lineHeight: 1.5 }}>
              This action will notify the applicant that their application has been rejected. This can be changed later.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setRejectConfirm(null)}
                style={{ padding: "10px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={confirmReject}
                style={{ padding: "10px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}>
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div key={nav} style={{ ...pad, animation: "fadeUp 0.25s ease" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* ── OVERVIEW ── */}
        {nav === "overview" && (
          <div>
            <PageHeader preLabel={isAdmin ? "Admin Portal" : "HR Portal"} title={`Welcome back, ${user.name.split(" ")[0]}`} subtitle="Live data — refreshes every 8 seconds" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
              <StatCard label={isAdmin ? "Total Jobs" : "My Jobs"} value={stats?.total_jobs ?? "—"} icon="" color={accent} />
              <StatCard label="Active Jobs"   value={stats?.active_jobs ?? "—"} icon="" color={C.green} />
              <StatCard label="Applications"  value={stats?.total_apps ?? "—"}  icon="" color={C.app} />
              <StatCard label="Shortlisted"   value={stats?.shortlisted ?? "—"} icon="" color={C.yel} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Recent Job Postings</div>
                {jobs.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>No jobs posted yet.</div>}
                {jobs.slice(0, 5).map(j => (
                  <div key={j.id} onClick={() => setNav("jobs")}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 8, marginBottom: 2, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surf2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: j.status === "active" ? C.green : C.red, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{j.application_count} apps · {j.dept}</div>
                    </div>
                    <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>View →</span>
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Pipeline at a Glance</div>
                {Object.entries(STATUS).map(([key, cfg]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: C.sub }}>{cfg.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{stats?.pipeline?.[key] ?? 0}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ── JOBS ── */}
        {nav === "jobs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <PageHeader preLabel={isAdmin ? "Admin" : "HR Portal"} title={isAdmin ? "All Job Postings" : "My Job Postings"} />
              <Button onClick={() => setNav("post")} accent={accent}>+ Post New Job</Button>
            </div>
            {jobs.length === 0 && <Card><div style={{ color: C.muted, textAlign: "center", padding: 32 }}>No jobs yet. Post your first job!</div></Card>}
            {jobs.map(job => (
              <Card key={job.id} style={{ ...cardSt, padding: "18px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{job.title}</span>
                      <span style={{ background: job.status === "active" ? C.greenBg : C.redBg, color: job.status === "active" ? C.greenT : C.redT, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{job.status}</span>
                      {isAdmin && <span style={{ background: "#ede9fe", color: "#4f46e5", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{job.hr_name}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                      {job.company && <span>{job.company}</span>}<span>{job.dept}</span><span>{job.location}</span><span>{(job.experience_level || "any") === "fresher" ? "Fresher" : (job.experience_level || "any") === "experienced" ? "Experienced" : "Fresher / Experienced"}</span><span>Deadline: {job.deadline}</span><span>Posted: {job.posted_at?.slice(0, 10)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.sub }}>{job.jd?.slice(0, 120)}...</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: accent }}>{job.application_count}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>apps</div>
                    </div>
                    <Button onClick={() => toggleJobStatus(job)} variant="ghost" style={{ fontSize: 11 }}>{job.status === "active" ? "Close" : "Reopen"}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}



        {/* ── POST JOB ── */}
        {nav === "post" && (
          <div>
            <PageHeader preLabel="HR Portal" title="Post a New Job" />
            <Card style={{ maxWidth: 660 }}>
              {jobError && <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>⚠ {jobError}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
                {[["Job Title *", "title", "e.g. Senior Python Developer"], ["Company Name *", "company", "e.g. Infosys, TCS, Google"], ["Department", "dept", "e.g. Engineering"], ["Location", "location", "e.g. Bangalore / Remote"], ["Deadline", "deadline", "YYYY-MM-DD"]].map(([lbl, key, ph]) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>{lbl}</label>
                    <input value={newJob[key]} onChange={e => setNewJob(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                      style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.surf2, outline: "none" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4, marginTop: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Job Type</label>
                  <select value={newJob.type} onChange={e => setNewJob(p => ({ ...p, type: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.surf2 }}>
                    <option value="Full-time">Full-time</option><option value="Part-time">Part-time</option><option value="Contract">Contract</option><option value="Internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Experience Level *</label>
                  <select value={newJob.experience_level} onChange={e => setNewJob(p => ({ ...p, experience_level: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.surf2 }}>
                    <option value="any">Any (Fresher + Experienced)</option>
                    <option value="fresher">Fresher Only</option>
                    <option value="experienced">Experienced Only</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 14, marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Job Description *</label>
                <textarea value={newJob.jd} onChange={e => setNewJob(p => ({ ...p, jd: e.target.value }))} rows={8}
                  placeholder={"Required Skills: Python, Docker, AWS...\nExperience: 3+ years\nEducation: B.Tech CS"}
                  style={{ width: "100%", background: C.surf2, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "12px 14px", color: C.text, fontSize: 13, resize: "vertical", lineHeight: 1.7, outline: "none" }} />
              </div>
              {newJob.jd && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Skills detected:</div>
                  <div>{extractSkills(newJob.jd).map(s => <SkillChip key={s} label={s} type="jd" />)}</div>
                </div>
              )}
              <Button onClick={postJob} disabled={!newJob.title || !newJob.company || !newJob.jd} accent={accent}>Publish Job Posting</Button>
            </Card>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {nav === "analytics" && isAdmin && (
          <div>
            <PageHeader preLabel="Admin" title="System Analytics" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
              <StatCard label="Total Jobs"        value={stats?.total_jobs ?? 0}  icon="" color={accent} />
              <StatCard label="Total Candidates"  value={stats?.total_apps ?? 0}  icon="" color={C.app} />
              <StatCard label="Offers Extended"   value={stats?.pipeline?.offer ?? 0} icon="" color={C.green} />
              <StatCard label="Hired"             value={stats?.pipeline?.hired ?? 0} icon="" color={C.green} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Apps per Job</div>
                {jobs.map(j => {
                  const max = Math.max(...jobs.map(x => x.application_count), 1);
                  return (
                    <div key={j.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.sub, marginBottom: 3 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "72%" }}>{j.title}</span>
                        <span style={{ fontWeight: 700, color: accent }}>{j.application_count}</span>
                      </div>
                      <MiniBar value={(j.application_count / max) * 100} color={accent} />
                    </div>
                  );
                })}
              </Card>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Hiring Funnel</div>
                {Object.entries(stats?.pipeline || {}).map(([stage, cnt]) => {
                  const total = stats?.total_apps || 1;
                  const pct = Math.round((cnt / total) * 100);
                  return (
                    <div key={stage} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.sub, marginBottom: 3 }}>
                        <span style={{ textTransform: "capitalize" }}>{stage}</span>
                        <span style={{ fontWeight: 700, color: accent }}>{cnt} ({pct}%)</span>
                      </div>
                      <MiniBar value={pct} color={accent} />
                    </div>
                  );
                })}
              </Card>
            </div>
          </div>
        )}

        {/* ── ALL CANDIDATES (grouped by applicant) ── */}
        {nav === "allcands" && (() => {
          const grouped = {};
          allApps.forEach(a => {
            if (!grouped[a.applicant_id]) {
              grouped[a.applicant_id] = { name: a.applicant_name, email: a.applicant_email, apps: [] };
            }
            grouped[a.applicant_id].apps.push(a);
          });
          const applicants = Object.entries(grouped);
          return (
          <div>
            <PageHeader preLabel={isAdmin ? "Admin" : "HR Portal"} title={isAdmin ? "All Candidates" : "My Candidates"} subtitle={`${applicants.length} candidate${applicants.length !== 1 ? "s" : ""} · ${allApps.length} total applications — refreshes every 8s`} />
            {applicants.length === 0 && <Card><div style={{ color: C.muted, textAlign: "center", padding: 32 }}>No applications yet.</div></Card>}
            {applicants.map(([appId, person]) => {
              const isExpanded = expandedApp === appId;
              const bestScore = Math.max(...person.apps.map(a => a.score || 0));
              return (
              <Card key={appId} style={{ ...cardSt, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => setExpandedApp(isExpanded ? null : appId)}>
                  <Avatar initials={(person.name || "?").split(" ").map(n => n[0]).join("")} size={42} bg="#e0e7ff" color="#4f46e5" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{person.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{person.email} · {person.apps.length} application{person.apps.length > 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ background: "#e0e7ff", color: "#4f46e5", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{person.apps.length} jobs</span>
                    <ScorePill value={bestScore} />
                  </div>
                  {!isAdmin && <button onClick={(e) => { e.stopPropagation(); window.open(buildMailto(person.email, person.name, person.apps[0]?.job_title, person.apps[0]?.status), '_blank'); }}
                    style={{ padding: "6px 14px", background: accent, color: "#fff", borderRadius: 7, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                    Contact
                  </button>}
                  <span style={{ fontSize: 11, color: C.muted }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Applications ({person.apps.length})</div>
                    {person.apps.map(a => (
                      <div key={a.id} style={{ background: C.surf2, borderRadius: 10, padding: "12px 16px", marginBottom: 10, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.job_title}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>Applied: {a.applied_at?.slice(0, 10)}</div>
                          </div>
                          <ScorePill value={a.score} />
                          <Badge status={a.status} />
                          {!isAdmin && <select value={a.status} onChange={e => moveStatus(a.id, e.target.value)}
                            style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", color: C.text, fontSize: 11 }}>
                            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>}
                        </div>
                        {!isAdmin && <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {["shortlisted", "interview", "offer", "hired", "rejected"].map(s => (
                            <button key={s} onClick={() => moveStatus(a.id, s)}
                              style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600, border: `1px solid ${STATUS[s]?.color || C.border}33`, background: a.status === s ? STATUS[s]?.bg : "transparent", color: STATUS[s]?.color || C.sub, cursor: "pointer" }}>
                              {STATUS[s]?.label}
                            </button>
                          ))}
                        </div>}
                        {a.matched_skills?.length > 0 && (
                          <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {a.matched_skills.map(s => <SkillChip key={s} label={s} type="matched" />)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              );
            })}
          </div>
          );
        })()}

        {/* ── USERS ── */}
        {nav === "allusers" && isAdmin && (
          <div>
            <PageHeader preLabel="Admin" title="All Users" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
              <StatCard label="Admins"       value={users.filter(u => u.role === "admin").length}     icon="" color={C.hr} />
              <StatCard label="HR Managers"  value={users.filter(u => u.role === "hr").length}        icon="" color="#7c3aed" />
              <StatCard label="Applicants"   value={users.filter(u => u.role === "applicant").length} icon="" color={C.app} />
            </div>
            {users.map(u => {
              const rc = u.role === "admin" ? C.hr : u.role === "hr" ? "#7c3aed" : C.app;
              return (
                <Card key={u.id} style={{ ...cardSt, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar initials={u.avatar || (u.name || "?").slice(0, 2)} size={38} bg={rc + "18"} color={rc} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{u.email} · {u.dept || "—"}</div>
                    </div>
                    <span style={{ background: rc + "18", color: rc, border: `1px solid ${rc}44`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{u.role}</span>
                    <div style={{ fontSize: 11, color: C.muted }}>{u.created_at?.slice(0, 10)}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── SHORTLISTED / CONTACT ── */}
        {nav === "shortlisted" && (() => {
          const groups = [
            { key: "shortlisted", label: "Shortlisted", color: STATUS.shortlisted.color, bg: STATUS.shortlisted.bg },
            { key: "interview", label: "Interview Stage", color: STATUS.interview.color, bg: STATUS.interview.bg },
            { key: "offer", label: "Offer Extended", color: STATUS.offer.color, bg: STATUS.offer.bg },
            { key: "hired", label: "Hired", color: STATUS.hired.color, bg: STATUS.hired.bg },
          ];
          const selected = allApps.filter(a => ["shortlisted","interview","offer","hired"].includes(a.status));
          return (
            <div>
              <PageHeader preLabel={isAdmin ? "Admin" : "HR Portal"} title="Shortlisted Candidates" subtitle={`${selected.length} candidate${selected.length !== 1 ? "s" : ""} selected — contact info & status management`} />
              {selected.length === 0 && (
                <Card style={{ textAlign: "center", padding: 52 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.muted, marginBottom: 14 }}>No Results</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.sub, marginBottom: 8 }}>No shortlisted candidates yet</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Go to "My Candidates" and change status to Shortlisted to see them here.</div>
                  <Button onClick={() => setNav("allcands")} accent={accent}>View All Candidates →</Button>
                </Card>
              )}
              {groups.map(g => {
                const items = allApps.filter(a => a.status === g.key);
                if (items.length === 0) return null;
                return (
                  <div key={g.key} style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: g.color }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{g.label}</div>
                      <span style={{ background: g.bg, color: g.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{items.length}</span>
                    </div>
                    {items.map(a => (
                      <Card key={a.id} style={{ marginBottom: 10, padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <Avatar initials={(a.applicant_name || "?").split(" ").map(n => n[0]).join("")} size={42} bg={g.color + "18"} color={g.color} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{a.applicant_name}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>{a.job_title} · Score: <strong style={{ color: a.score >= 70 ? C.green : a.score >= 45 ? C.yel : C.red }}>{a.score}%</strong></div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                            {!isAdmin && <button onClick={(e) => { e.stopPropagation(); window.open(buildMailto(a.applicant_email, a.applicant_name, a.job_title, a.status), '_blank'); }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", background: accent, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: `0 2px 8px ${accent}44`, border: "none", cursor: "pointer" }}>
                              Contact via Email
                            </button>}
                            <span style={{ fontSize: 11, color: C.muted }}>{a.applicant_email}</span>
                          </div>
                        </div>
                        {!isAdmin && <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                          {["shortlisted", "interview", "offer", "hired", "rejected"].map(s => (
                            <button key={s} onClick={() => moveStatus(a.id, s)}
                              style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: `1px solid ${STATUS[s]?.color || C.border}33`, background: a.status === s ? STATUS[s]?.bg : "transparent", color: STATUS[s]?.color || C.sub, cursor: "pointer" }}>
                              {STATUS[s]?.label}
                            </button>
                          ))}
                        </div>}
                        {a.matched_skills?.length > 0 && (
                          <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {a.matched_skills.map(s => <SkillChip key={s} label={s} type="matched" />)}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })()}

      </div>
    </SidebarLayout>
  );
}

// helper
function rankedJob(jobId) { return false; }
