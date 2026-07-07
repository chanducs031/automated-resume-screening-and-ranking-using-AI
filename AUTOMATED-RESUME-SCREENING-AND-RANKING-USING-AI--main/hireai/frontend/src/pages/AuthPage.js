import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, FormInput } from "../components/UI";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode]     = useState("login");
  const [portal, setPortal] = useState("hr");
  const [form, setForm]     = useState({ name: "", email: "", password: "", dept: "", confirm: "" });
  const [error, setError]   = useState("");
  const [busy, setBusy]     = useState(false);

  const accent = portal === "hr" ? C.hr : C.app;
  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }));
  const reset = () => { setForm({ name: "", email: "", password: "", dept: "", confirm: "" }); setError(""); };

  const submit = async () => {
    setError(""); setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError("Name is required."); return; }
        if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
        await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: portal === "hr" ? "hr" : "applicant", dept: form.dept.trim() || undefined });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const inputSt = { width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.surf, outline: "none" };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${accent}08, #f8fafc 50%, ${accent}05)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:${accent}!important;outline:none}`}</style>

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 54, height: 54, borderRadius: 15, background: `linear-gradient(135deg,${C.hr},${C.app})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 10px" }}>📋</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text }}>HireAI</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>Automated Resume Screening Platform</div>
      </div>

      <div style={{ width: "100%", maxWidth: 440, background: C.surf, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        {/* Portal tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
          {[{ id: "hr", icon: "🏢", label: "HR Portal" }, { id: "applicant", icon: "👤", label: "Applicant" }].map(tab => {
            const active = portal === tab.id;
            const tc = tab.id === "hr" ? C.hr : C.app;
            return (
              <button key={tab.id} onClick={() => { setPortal(tab.id); reset(); }}
                style={{ flex: 1, padding: "14px 8px", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? tc : C.muted, background: active ? C.surf : C.surf2, border: "none", borderBottom: `2.5px solid ${active ? tc : "transparent"}`, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 4, padding: "16px 22px 0" }}>
          {[{ id: "login", label: "Sign In" }, { id: "signup", label: "Create Account" }].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); reset(); }}
              style={{ flex: 1, padding: "8px", borderRadius: 7, fontSize: 13, fontWeight: mode === m.id ? 600 : 400, color: mode === m.id ? accent : C.muted, background: mode === m.id ? accent + "12" : "transparent", border: `1px solid ${mode === m.id ? accent : C.border}`, cursor: "pointer", transition: "all 0.2s" }}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          {error && <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14, fontWeight: 500 }}>⚠ {error}</div>}

          {mode === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Full Name *</label>
              <input value={form.name} onChange={f("name")} placeholder="e.g. Sunita Rao" style={inputSt} />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Email Address *</label>
            <input type="email" value={form.email} onChange={f("email")} placeholder={portal === "hr" ? "sunita@company.com" : "you@email.com"} style={inputSt} />
          </div>
          {mode === "signup" && portal === "hr" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Department</label>
              <input value={form.dept} onChange={f("dept")} placeholder="e.g. Human Resources" style={inputSt} />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Password *</label>
            <input type="password" value={form.password} onChange={f("password")} placeholder="Min. 6 characters" style={inputSt} />
          </div>
          {mode === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={f("confirm")} placeholder="Repeat password" style={inputSt} />
            </div>
          )}

          <button onClick={submit} disabled={busy || !form.email || !form.password}
            style={{ width: "100%", padding: "12px", background: accent, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>


        </div>
      </div>
    </div>
  );
}
