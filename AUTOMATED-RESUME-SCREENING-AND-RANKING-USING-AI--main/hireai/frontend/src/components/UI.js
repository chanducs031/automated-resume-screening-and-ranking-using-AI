import { useState } from "react";

export const C = {
  hr: "#6366f1", app: "#0ea5e9",
  green: "#16a34a", greenBg: "#dcfce7", greenT: "#14532d",
  yel: "#d97706", yelBg: "#fef3c7", yelT: "#78350f",
  red: "#dc2626", redBg: "#fee2e2", redT: "#7f1d1d",
  surf: "#ffffff", surf2: "#f1f5f9", bg: "#f8fafc",
  border: "#e2e8f0", text: "#0f172a", sub: "#475569", muted: "#94a3b8",
};

export const STATUS = {
  screening:   { label: "Screening",      color: "#2563eb", bg: "#eff6ff" },
  shortlisted: { label: "Shortlisted",    color: "#d97706", bg: "#fffbeb" },
  interview:   { label: "Interview",      color: "#7c3aed", bg: "#f5f3ff" },
  offer:       { label: "Offer Extended", color: "#16a34a", bg: "#f0fdf4" },
  rejected:    { label: "Rejected",       color: "#dc2626", bg: "#fef2f2" },
  hired:       { label: "Hired",          color: "#059669", bg: "#ecfdf5" },
};

export function Avatar({ initials = "?", size = 36, bg = "#e0e7ff", color = "#4f46e5" }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export function Badge({ status }) {
  const s = STATUS[status] || { label: status, color: C.muted, bg: C.surf2 };
  return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{s.label}</span>;
}

export function ScorePill({ value }) {
  const color = value >= 70 ? C.green : value >= 45 ? C.yel : C.red;
  const bg    = value >= 70 ? C.greenBg : value >= 45 ? C.yelBg : C.redBg;
  return <span style={{ background: bg, color, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{value}%</span>;
}

export function SkillChip({ label, type = "neutral" }) {
  const styles = {
    matched: { bg: C.greenBg, color: C.greenT },
    missing: { bg: C.redBg,   color: C.redT   },
    jd:      { bg: "#ede9fe", color: "#4f46e5" },
    neutral: { bg: C.surf2,   color: C.sub     },
  };
  const s = styles[type] || styles.neutral;
  return <span style={{ display: "inline-block", margin: "2px 3px", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>{label}</span>;
}

export function MiniBar({ value, color }) {
  return (
    <div style={{ height: 6, background: C.surf2, borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${Math.min(value, 100)}%`, background: color, borderRadius: 3, transition: "width 0.8s" }} />
    </div>
  );
}

export function RingScore({ value, size = 56 }) {
  const r = size * 0.38, circ = 2 * Math.PI * r, offset = circ - (value / 100) * circ;
  const color = value >= 70 ? C.green : value >= 45 ? C.yel : C.red;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.surf2} strokeWidth={size*0.09} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.09}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset 1s" }} />
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={color} fontSize={size*0.22} fontWeight="700">{value}%</text>
    </svg>
  );
}

export function Spinner({ message, accent }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(248,250,252,0.9)", backdropFilter: "blur(3px)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ width: 44, height: 44, border: `3px solid ${C.border}`, borderTopColor: accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 14, color: accent, fontWeight: 600 }}>{message}</div>
    </div>
  );
}

export function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
        </div>
        {icon && <span style={{ fontSize: 22, opacity: 0.6 }}>{icon}</span>}
      </div>
    </div>
  );
}

export function Card({ children, style = {} }) {
  return <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", ...style }}>{children}</div>;
}

export function PageHeader({ preLabel, title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {preLabel && <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>{preLabel}</div>}
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

export function FormInput({ label, value, onChange, placeholder, type = "text", required = false }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 5 }}>{label}{required && " *"}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${focused ? C.hr : C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.surf, outline: "none", transition: "border-color 0.2s" }} />
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", accent = C.hr, disabled = false, style = {} }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", border: "none", transition: "all 0.15s", opacity: disabled ? 0.45 : 1, ...style };
  const vars = {
    primary: { background: accent, color: "#fff", boxShadow: `0 2px 8px ${accent}44` },
    outline: { background: "transparent", color: accent, border: `1.5px solid ${accent}` },
    ghost:   { background: C.surf2, color: C.sub },
    danger:  { background: C.redBg, color: C.red },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant] }}>{children}</button>;
}

export function SidebarLayout({ user, navItems, activeNav, onNav, onLogout, accent, children }) {
  const initials = user.avatar || (user.name || "?").split(" ").filter(Boolean).map(n => n[0].toUpperCase()).join("").slice(0, 2);
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <aside style={{ width: 240, background: C.surf, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>H</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>HireAI</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{user.role === "admin" ? "Admin" : user.role === "hr" ? "HR Manager" : "Applicant"}</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {navItems.map(item => {
            if (item.divider) return <div key={item.id} style={{ height: 1, background: C.border, margin: "6px 8px" }} />;
            const active = activeNav === item.id;
            return (
              <div key={item.id} onClick={() => onNav(item.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 1, cursor: "pointer", background: active ? accent + "15" : "transparent", color: active ? accent : C.sub, fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.15s", borderLeft: `3px solid ${active ? accent : "transparent"}` }}>
                {item.icon && <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{item.icon}</span>}
                {item.label}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 4px" }}>
            <Avatar initials={initials} size={34} bg={accent + "1a"} color={accent} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ width: "100%", background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px", color: C.sub, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Sign Out</button>
        </div>
      </aside>
      <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
    </div>
  );
}
