import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getJobs, getApplications, applyToJob, parseResumeFile } from "../api/client";
import { extractSkills, scoreResume } from "../api/nlp";
import { C, STATUS, Avatar, Badge, SkillChip, MiniBar, RingScore, Spinner, Card, PageHeader, Button, SidebarLayout } from "../components/UI";
import AMDSlingshot from "./AMDSlingshot";

export default function ApplicantDashboard() {
  const { user, logout } = useAuth();
  const [nav, setNav]           = useState("browse");
  const [jobs, setJobs]         = useState([]);
  const [myApps, setMyApps]     = useState([]);
  const [resumeText, setResume] = useState(localStorage.getItem("resume_" + user.id) || "");
  const [fitResult, setFit]     = useState(null);
  const [fitLoading, setFitL]   = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyErr] = useState("");
  const [aiTips, setAiTips]     = useState("");
  const [tipsLoading, setTipsL] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [pollingTs, setPolling] = useState(Date.now());
  const fileRef = useRef();
  const accent = C.app;

  const navItems = [
    { id: "browse",   label: "Browse Jobs",      icon: "" },
    { id: "resume",   label: "My Resume",         icon: "" },
    { id: "myapps",   label: "My Applications",   icon: "" },
    { id: "insights", label: "AI Mentor",        icon: "" },
  ];

  const appliedJobIds = new Set(myApps.map(a => a.job_id));

  // Save resume to localStorage on change
  useEffect(() => {
    localStorage.setItem("resume_" + user.id, resumeText);
  }, [resumeText, user.id]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [j, a] = await Promise.all([getJobs(), getApplications()]);
      setJobs(j);
      setMyApps(a);
    } catch (_) {}
  }, []);

  useEffect(() => { loadData(); }, [loadData, pollingTs]);

  // Poll every 6 seconds for status updates
  useEffect(() => {
    const t = setInterval(() => setPolling(Date.now()), 6000);
    return () => clearInterval(t);
  }, []);

  // ── Check Fit ────────────────────────────────────────────────────────────────
  const checkFit = async (job) => {
    if (!resumeText.trim()) { setNav("resume"); return; }
    setFitL(true);
    setFit({ job, loading: true });
    const jdSkills = extractSkills(job.jd);
    const metrics  = scoreResume(resumeText, job.jd, jdSkills, job.experience_level);
    let tips = "";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, system: "You are a career coach. Give concise, numbered, actionable tips.", messages: [{ role: "user", content: `Job: ${job.title}\nMy resume:\n${resumeText.slice(0, 600)}\nMissing skills: ${metrics.missing_skills.join(", ")}\nMatch score: ${metrics.score}%\n\nGive exactly 3 specific actionable tips to improve my match for this role.` }] }),
      });
      const data = await res.json();
      tips = data.content?.[0]?.text || "";
    } catch (_) {}
    setFit({ job, metrics, jdSkills, tips });
    setFitL(false);
  };

  // ── Apply ────────────────────────────────────────────────────────────────────
  const apply = async (job) => {
    if (!resumeText.trim()) { setNav("resume"); return; }
    setApplying(true); setApplyErr("");
    const jdSkills = extractSkills(job.jd);
    const metrics  = scoreResume(resumeText, job.jd, jdSkills, job.experience_level);
    try {
      const newApp = await applyToJob({
        job_id:         job.id,
        resume_text:    resumeText,
        score:          metrics.score,
        skill_match:    metrics.skill_match,
        tfidf_score:    metrics.tfidf_score,
        matched_skills: metrics.matched_skills,
        missing_skills: metrics.missing_skills,
      });
      setMyApps(prev => [newApp, ...prev]);
      setNav("myapps");
    } catch (err) {
      setApplyErr(err.response?.data?.error || "Failed to apply.");
    }
    setApplying(false);
  };

  // ── AI Resume Analysis ───────────────────────────────────────────────────────
  const analyzeResume = async () => {
    if (!resumeText.trim()) return;
    setTipsL(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, system: "You are an expert resume coach. Be specific and practical.", messages: [{ role: "user", content: `Resume:\n${resumeText}\n\nAnalyze and provide:\n1. Top 3 strengths\n2. Top 3 gaps or weaknesses\n3. 3 specific improvement tips\n4. ATS optimization advice\n5. Top 5 skills to add for better employability in tech` }] }),
      });
      const data = await res.json();
      setAiTips(data.content?.[0]?.text || "");
    } catch (_) {}
    setTipsL(false);
  };

  const pad = { padding: "28px 32px" };
  const cardSt = { marginBottom: 14 };

  return (
    <SidebarLayout user={user} navItems={navItems} activeNav={nav} onNav={setNav} onLogout={logout} accent={accent}>
      {(fitLoading || applying) && <Spinner message={applying ? "Submitting application..." : "🎯 Analyzing your fit..."} accent={accent} />}
      <div key={nav} style={{ ...pad, animation: "fadeUp 0.25s ease" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* ── BROWSE JOBS ── */}
        {nav === "browse" && (
          <div>
            <PageHeader preLabel="Applicant Portal" title="Browse Open Positions" subtitle={`${jobs.length} active opening${jobs.length !== 1 ? "s" : ""} — real-time from the database`} />
            {applyError && <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>⚠ {applyError}</div>}

            {fitResult && !fitResult.loading && (
              <div style={{ background: `linear-gradient(135deg,${accent}08,${accent}04)`, border: `1.5px solid ${accent}33`, borderRadius: 14, padding: 22, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Your Fit Analysis</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{fitResult.job.title}</div>
                  </div>
                  <RingScore value={fitResult.metrics?.score || 0} size={68} />
                </div>
                {fitResult.metrics?.experience_mismatch && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>Not Suitable — Experience Mismatch</div>
                    <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.5 }}>
                      This role requires <strong>{fitResult.metrics.required_experience === "experienced" ? "experienced candidates" : "freshers"}</strong>, but your resume indicates you are {fitResult.metrics.candidate_experience === "fresher" ? "a fresher" : fitResult.metrics.candidate_experience === "experienced" ? "an experienced candidate" : "not clearly categorized"}. Your score has been adjusted accordingly.
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.greenT, marginBottom: 6 }}>Skills you have ({fitResult.metrics?.matched_skills?.length || 0})</div>
                    <div style={{ marginBottom: 12 }}>{(fitResult.metrics?.matched_skills || []).map(s => <SkillChip key={s} label={"✓ " + s} type="matched" />)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.red, marginBottom: 6 }}>Skills to learn ({fitResult.metrics?.missing_skills?.length || 0})</div>
                    <div>{(fitResult.metrics?.missing_skills || []).map(s => <SkillChip key={s} label={"✗ " + s} type="missing" />)}</div>
                  </div>
                  <div>
                    {fitResult.tips && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 8 }}>AI Career Tips</div>
                        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8, background: "rgba(255,255,255,0.8)", borderRadius: 9, padding: 12, whiteSpace: "pre-wrap" }}>{fitResult.tips}</div>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  {appliedJobIds.has(fitResult.job.id)
                    ? <span style={{ fontSize: 13, color: C.greenT, fontWeight: 600 }}>Already applied</span>
                    : <Button onClick={() => apply(fitResult.job)} accent={accent}>Apply for This Role →</Button>
                  }
                </div>
              </div>
            )}

            {jobs.length === 0 && <Card><div style={{ color: C.muted, textAlign: "center", padding: 32 }}>No open jobs at the moment. Check back soon!</div></Card>}
            {jobs.map(job => (
              <Card key={job.id} style={{ ...cardSt, padding: "18px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{job.title}</span>
                      <span style={{ background: C.greenBg, color: C.greenT, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>Open</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
                      {job.company && <span style={{ fontWeight: 600, color: C.sub }}>{job.company}</span>}<span>{job.dept}</span><span>{job.location}</span><span>{job.type}</span><span style={{ fontWeight: 600, color: (job.experience_level || "any") === "experienced" ? "#b45309" : (job.experience_level || "any") === "fresher" ? C.greenT : C.sub }}>{(job.experience_level || "any") === "fresher" ? "Fresher" : (job.experience_level || "any") === "experienced" ? "Experienced" : "Fresher / Experienced"}</span><span>Deadline: {job.deadline}</span>
                    </div>
                    <div>{extractSkills(job.jd).slice(0, 8).map(s => <SkillChip key={s} label={s} type="neutral" />)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, alignItems: "flex-end" }}>
                    {appliedJobIds.has(job.id)
                      ? <span style={{ background: C.greenBg, color: C.greenT, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600 }}>✅ Applied</span>
                      : <Button onClick={() => apply(job)} accent={accent} style={{ fontSize: 12 }}>Quick Apply</Button>
                    }
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── MY RESUME ── */}
        {nav === "resume" && (
          <div>
            <PageHeader preLabel="Applicant Portal" title="My Resume" subtitle="Your resume is saved in your browser and used for all applications" />
            <Card style={{ maxWidth: 700 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <Button onClick={() => fileRef.current?.click()} variant="ghost" style={{ fontSize: 12 }} disabled={uploadLoading}>
                  {uploadLoading ? "Parsing file..." : "📂 Upload Resume (PDF, DOCX, DOC, TXT)"}
                </Button>
                {resumeText && <Button onClick={() => { setResume(""); setUploadedFileName(""); localStorage.removeItem("resume_" + user.id); }} variant="danger" style={{ fontSize: 12 }}>Clear</Button>}
                {uploadedFileName && <span style={{ fontSize: 12, color: C.greenT, fontWeight: 600 }}>✅ {uploadedFileName}</span>}
              </div>
              {uploadError && <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>⚠ {uploadError}</div>}
              {uploadLoading && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "12px 16px", background: `${accent}10`, borderRadius: 10, border: `1.5px solid ${accent}33` }}><div style={{ width: 18, height: 18, border: `2.5px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /><span style={{ fontSize: 13, color: accent, fontWeight: 600 }}>Extracting text from your file...</span></div>}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }}
                onChange={async e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  e.target.value = "";
                  const ext = f.name.split(".").pop().toLowerCase();
                  if (ext === "txt") {
                    const r = new FileReader();
                    r.onload = ev => { setResume(ev.target.result); setUploadedFileName(f.name); setUploadError(""); };
                    r.readAsText(f);
                  } else {
                    setUploadLoading(true);
                    setUploadError("");
                    try {
                      const result = await parseResumeFile(f);
                      setResume(result.text);
                      setUploadedFileName(result.filename || f.name);
                    } catch (err) {
                      setUploadError(err.response?.data?.error || "Failed to parse file. Try a different format.");
                    }
                    setUploadLoading(false);
                  }
                }} />
              <textarea value={resumeText} onChange={e => setResume(e.target.value)} rows={16}
                placeholder={"Paste your resume here...\n\nFormat:\nYour Name | Email | Phone\nJob Title | X years experience\n\nSkills: Python, React, Docker...\n\nExperience:\nCompany Name (X years) — Role\n\nEducation:\nDegree, Institution Year"}
                style={{ width: "100%", background: C.surf2, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "12px 14px", color: C.text, fontSize: 13, resize: "vertical", lineHeight: 1.7, outline: "none" }} />
              {resumeText && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>Skills detected in your resume:</div>
                  <div style={{ marginBottom: 14 }}>{extractSkills(resumeText).map(s => <SkillChip key={s} label={s} type="jd" />)}</div>
                  <Button onClick={() => setNav("browse")} accent={accent}>Browse & Apply to Jobs →</Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── MY APPLICATIONS ── */}
        {nav === "myapps" && (
          <div>
            <PageHeader preLabel="Applicant Portal" title="My Applications" subtitle="Status updates in real time from the HR team" />
            {myApps.length === 0 && (
              <Card style={{ textAlign: "center", padding: 52 }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>📭</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.sub, marginBottom: 18 }}>No applications yet.</div>
                <Button onClick={() => setNav("browse")} accent={accent}>Browse Jobs →</Button>
              </Card>
            )}
            {myApps.map(app => {
              const stages = ["screening","shortlisted","interview","offer","hired"];
              const ci = stages.indexOf(app.status);
              const isRej = app.status === "rejected";
              return (
                <Card key={app.id} style={cardSt}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{app.job_title}</div>
                      <div style={{ fontSize: 12, color: C.muted, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>Applied: {app.applied_at?.slice(0, 10)}</span>
                        <span>Match: <strong style={{ color: app.score >= 70 ? C.green : app.score >= 45 ? C.yel : C.red }}>{app.score}%</strong></span>
                        <Badge status={app.status} />
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                    {stages.map((stage, i) => {
                      const done = ci > i, curr = ci === i && !isRej;
                      const stageColor = done ? C.green : curr ? accent : C.border;
                      return (
                        <div key={stage} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 72 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: done ? C.greenBg : curr ? accent + "18" : C.surf2, border: `2px solid ${stageColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: stageColor, transition: "all 0.3s" }}>
                              {done ? "✓" : curr ? "●" : "○"}
                            </div>
                            <span style={{ fontSize: 9, color: done ? C.greenT : curr ? accent : C.muted, textTransform: "capitalize", whiteSpace: "nowrap", fontWeight: done || curr ? 600 : 400 }}>{stage}</span>
                          </div>
                          {i < stages.length - 1 && <div style={{ flex: 1, height: 2.5, background: done ? C.green : C.surf2, marginBottom: 18, borderRadius: 2 }} />}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ background: isRej ? C.redBg : accent + "10", border: `1.5px solid ${isRej ? C.red : accent}33`, borderRadius: 10, padding: "12px 16px", marginBottom: app.matched_skills?.length ? 14 : 0 }}>
                    <div style={{ fontSize: 13, color: isRej ? C.red : C.sub, lineHeight: 1.7 }}>
                      {app.status === "screening"    && "⏳ Your application is under AI review. Expect feedback within 1–3 business days."}
                      {app.status === "shortlisted"  && "🎉 You've been shortlisted! Our HR team will contact you within 2–3 days."}
                      {app.status === "interview"    && "🎤 You've been selected for an interview! Check your email for scheduling details."}
                      {app.status === "offer"        && "🎊 Congratulations! An offer letter is on its way to your email."}
                      {app.status === "rejected"     && "Thank you for applying. This role wasn't the right fit — keep applying, great opportunities await!"}
                      {app.status === "hired"        && "🏆 Welcome aboard! You've been hired. Check your email for onboarding details."}
                    </div>
                  </div>

                  {app.matched_skills?.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.greenT, marginBottom: 6 }}>Skills Matched ({app.matched_skills?.length || 0})</div>
                        <div>{(app.matched_skills || []).map(s => <SkillChip key={s} label={"✓ " + s} type="matched" />)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.red, marginBottom: 6 }}>Skills to Improve ({app.missing_skills?.length || 0})</div>
                        <div>{(app.missing_skills || []).map(s => <SkillChip key={s} label={"✗ " + s} type="missing" />)}</div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── AMD SLINGSHOT ── */}
        {nav === "insights" && (
          <div style={{ margin: "-28px -32px", minHeight: "100vh" }}>
            <AMDSlingshot />
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
