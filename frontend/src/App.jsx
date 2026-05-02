import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
// ── API helpers ────────────────────────────────────────────────────────────────
const api = {
  async post(path, body, token) {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
    return res.json();
  },
  async get(path, token) {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
    return res.json();
  },
  async uploadForm(path, formData, token) {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
    return res.json();
  },
};

// ── Gauge component ────────────────────────────────────────────────────────────
function ScoreGauge({ score, size = 140 }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = (score / 100) * arc;
  const color = score >= 75 ? "#22d3a5" : score >= 50 ? "#f59e0b" : "#f87171";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ overflow: "visible" }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="10"
        strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
        strokeDashoffset={circ * 0.125} transform="rotate(-225 60 60)" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
        strokeDashoffset={circ * 0.125} transform="rotate(-225 60 60)"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="60" y="58" textAnchor="middle" fill={color} fontSize="22" fontWeight="800" fontFamily="'Space Grotesk', sans-serif">{score}%</text>
      <text x="60" y="75" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="'Space Grotesk', sans-serif">MATCH SCORE</text>
    </svg>
  );
}

// ── Skill chip ─────────────────────────────────────────────────────────────────
function Chip({ label, type }) {
  const colors = {
    match: { bg: "rgba(34,211,165,0.12)", border: "#22d3a5", text: "#22d3a5" },
    missing: { bg: "rgba(248,113,113,0.12)", border: "#f87171", text: "#f87171" },
    extra: { bg: "rgba(148,163,184,0.1)", border: "#475569", text: "#94a3b8" },
  };
  const c = colors[type] || colors.extra;
  return (
    <span style={{
      display: "inline-block", padding: "3px 11px", borderRadius: "999px",
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontSize: "12px", fontWeight: 600, margin: "3px",
      fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.01em",
    }}>{label}</span>
  );
}

// ── Mini bar for admin ─────────────────────────────────────────────────────────
function MiniBar({ label, value, max }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#22d3a5,#3b82f6)", borderRadius: 3, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent = "#22d3a5" }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("login"); // login | register | app | admin
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [userName, setUserName] = useState(() => localStorage.getItem("userName") || "");
  const [tab, setTab] = useState("analyze"); // analyze | history
  const [adminTab, setAdminTab] = useState("stats");

  // Auth state
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Analyze state
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [inputMode, setInputMode] = useState("text"); // text | file
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  // History
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // Admin
  const [stats, setStats] = useState(null);
  const [skillDemand, setSkillDemand] = useState(null);
  const [adminError, setAdminError] = useState("");

  const fileRef = useRef();

  useEffect(() => {
    if (token) setView("app");
  }, []);

  // ── Auth ──
  const handleAuth = async (mode) => {
    setAuthLoading(true); setAuthError("");
    try {
      const data = mode === "login"
        ? await api.post("/auth/login", { email: authForm.email, password: authForm.password })
        : await api.post("/auth/register", authForm);
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.name);
      setToken(data.token); setUserName(data.name); setView("app");
    } catch (e) { setAuthError(e.message); }
    setAuthLoading(false);
  };

  const logout = () => {
    localStorage.clear(); setToken(""); setUserName(""); setView("login");
    setResult(null); setHistory([]);
  };

  // ── Analyze ──
  const handleAnalyze = async () => {
    if (!jdText.trim()) { setAnalyzeError("Please enter a job description."); return; }
    if (inputMode === "text" && !resumeText.trim()) { setAnalyzeError("Please enter your resume text."); return; }
    if (inputMode === "file" && !uploadFile) { setAnalyzeError("Please select a file."); return; }

    setAnalyzing(true); setAnalyzeError(""); setResult(null);
    try {
      let data;
      if (inputMode === "file") {
        const fd = new FormData();
        fd.append("job_description", jdText);
        fd.append("file", uploadFile);
        data = await api.uploadForm("/analyze/upload", fd, token);
      } else {
        data = await api.post("/analyze/text", { resume_text: resumeText, job_description: jdText }, token);
      }
      setResult(data);
    } catch (e) { setAnalyzeError(e.message); }
    setAnalyzing(false);
  };

  const loadHistory = async () => {
    setHistLoading(true);
    try { setHistory(await api.get("/analyze/history", token)); }
    catch (e) { /* silent */ }
    setHistLoading(false);
  };

  useEffect(() => { if (tab === "history" && token) loadHistory(); }, [tab]);

  // ── Admin ──
  const loadAdmin = async () => {
    setAdminError("");
    try {
      const [s, d] = await Promise.all([
        api.get("/admin/stats", token),
        api.get("/admin/skill-demand", token),
      ]);
      setStats(s); setSkillDemand(d);
    } catch (e) { setAdminError(e.message); }
  };

  useEffect(() => { if (view === "admin" && token) loadAdmin(); }, [view]);

  // ──────────────────────────────────────────────────────────────────────────────
  // STYLES
  const styles = {
    root: {
      minHeight: "100vh", background: "#060c1a", color: "#e2e8f0",
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    },
    nav: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px", height: 64,
      background: "rgba(6,12,26,0.9)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 100,
    },
    logo: { fontSize: 18, fontWeight: 800, color: "#22d3a5", letterSpacing: "-0.02em" },
    navLinks: { display: "flex", gap: 8 },
    navBtn: (active) => ({
      padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
      fontWeight: 600, fontSize: 14, fontFamily: "inherit",
      background: active ? "#22d3a5" : "transparent",
      color: active ? "#060c1a" : "#64748b",
      transition: "all 0.2s",
    }),
    page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
    card: {
      background: "#0a1628", border: "1px solid #1e293b", borderRadius: 20,
      padding: 28, marginBottom: 24,
    },
    h2: { fontSize: 22, fontWeight: 800, marginBottom: 20, color: "#f1f5f9", letterSpacing: "-0.02em" },
    label: { display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 },
    textarea: {
      width: "100%", minHeight: 140, background: "#060c1a", border: "1px solid #1e293b",
      borderRadius: 12, padding: "14px 16px", color: "#e2e8f0", fontSize: 14,
      fontFamily: "inherit", resize: "vertical", outline: "none",
      boxSizing: "border-box", lineHeight: 1.6,
    },
    input: {
      width: "100%", background: "#060c1a", border: "1px solid #1e293b",
      borderRadius: 12, padding: "13px 16px", color: "#e2e8f0", fontSize: 14,
      fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    },
    btn: (variant = "primary") => ({
      padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
      fontWeight: 700, fontSize: 15, fontFamily: "inherit",
      background: variant === "primary" ? "#22d3a5" : variant === "outline"
        ? "transparent" : "#1e293b",
      color: variant === "primary" ? "#060c1a" : "#e2e8f0",
      border: variant === "outline" ? "1px solid #334155" : "none",
      transition: "opacity 0.2s, transform 0.1s",
    }),
    error: { color: "#f87171", fontSize: 13, marginTop: 8, padding: "10px 14px", background: "rgba(248,113,113,0.08)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)" },
    toggleRow: { display: "flex", gap: 8, marginBottom: 20 },
    toggleBtn: (active) => ({
      padding: "8px 18px", borderRadius: 8, border: `1px solid ${active ? "#22d3a5" : "#1e293b"}`,
      background: active ? "rgba(34,211,165,0.1)" : "transparent",
      color: active ? "#22d3a5" : "#64748b", cursor: "pointer",
      fontWeight: 600, fontSize: 13, fontFamily: "inherit",
    }),
    sectionTitle: { fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 },
  };

  // ── RENDER: Auth ──────────────────────────────────────────────────────────────
  if (view === "login" || view === "register") {
    const isReg = view === "register";
    return (
      <div style={{ ...styles.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#22d3a5", letterSpacing: "-0.03em" }}>ResumeAI</div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>AI-powered resume analysis</div>
          </div>

          <div style={{ ...styles.card }}>
            <h2 style={{ ...styles.h2, textAlign: "center" }}>{isReg ? "Create Account" : "Sign In"}</h2>

            {isReg && (
              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>Full Name</label>
                <input style={styles.input} placeholder="Jane Doe"
                  value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Email</label>
              <input style={styles.input} type="email" placeholder="you@example.com"
                value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Password</label>
              <input style={styles.input} type="password" placeholder="••••••••"
                value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAuth(isReg ? "register" : "login")} />
            </div>
            {authError && <div style={styles.error}>{authError}</div>}
            <button style={{ ...styles.btn("primary"), width: "100%", marginTop: 16, opacity: authLoading ? 0.6 : 1 }}
              onClick={() => handleAuth(isReg ? "register" : "login")} disabled={authLoading}>
              {authLoading ? "Please wait…" : isReg ? "Create Account" : "Sign In"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "#64748b" }}>
            {isReg ? "Already have an account? " : "Don't have an account? "}
            <button style={{ background: "none", border: "none", color: "#22d3a5", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}
              onClick={() => { setView(isReg ? "login" : "register"); setAuthError(""); }}>
              {isReg ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Admin Dashboard ───────────────────────────────────────────────────
  if (view === "admin") {
    const maxMissing = skillDemand?.top_missing?.[0]?.[1] || 1;
    const maxMatched = skillDemand?.top_matched?.[0]?.[1] || 1;
    return (
      <div style={styles.root}>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <nav style={styles.nav}>
          <span style={styles.logo}>⚡ ResumeAI <span style={{ fontSize: 11, background: "#22d3a5", color: "#060c1a", borderRadius: 4, padding: "2px 7px", marginLeft: 6, fontWeight: 800 }}>ADMIN</span></span>
          <div style={styles.navLinks}>
            <button style={styles.navBtn(false)} onClick={() => setView("app")}>← Back to App</button>
            <button style={styles.navBtn(false)} onClick={logout}>Logout</button>
          </div>
        </nav>

        <div style={styles.page}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 28, letterSpacing: "-0.03em" }}>Admin Dashboard</h1>

          {adminError && <div style={styles.error}>{adminError}</div>}

          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Users" value={stats.total_users} accent="#22d3a5" />
              <StatCard label="Total Resumes" value={stats.total_resumes} accent="#3b82f6" />
              <StatCard label="Avg Match Score" value={`${stats.average_score}%`} accent="#f59e0b" />
              <StatCard label="Resumes This Week" value={stats.recent_resumes_7d} accent="#a78bfa" />
              <StatCard label="New Users (7d)" value={stats.new_users_7d} accent="#f472b6" />
            </div>
          )}

          {stats && (
            <div style={{ ...styles.card, marginBottom: 24 }}>
              <div style={styles.sectionTitle}>Score Distribution</div>
              {Object.entries(stats.score_distribution).map(([k, v]) => (
                <MiniBar key={k} label={k} value={v} max={stats.total_resumes || 1} />
              ))}
            </div>
          )}

          {skillDemand && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>Top Matched Skills</div>
                {skillDemand.top_matched.map(([skill, count]) => (
                  <MiniBar key={skill} label={skill} value={count} max={maxMatched} />
                ))}
              </div>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>Top Missing Skills</div>
                {skillDemand.top_missing.map(([skill, count]) => (
                  <MiniBar key={skill} label={skill} value={count} max={maxMissing} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: Main App ──────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <nav style={styles.nav}>
        <span style={styles.logo}>⚡ ResumeAI</span>
        <div style={{ ...styles.navLinks, flex: 1, justifyContent: "center" }}>
          <button style={styles.navBtn(tab === "analyze")} onClick={() => setTab("analyze")}>Analyze</button>
          <button style={styles.navBtn(tab === "history")} onClick={() => setTab("history")}>History</button>
        </div>
        <div style={styles.navLinks}>
          <button style={{ ...styles.navBtn(false), fontSize: 13 }} onClick={() => setView("admin")}>Admin</button>
          <div style={{ width: 1, background: "#1e293b", margin: "0 4px" }} />
          <span style={{ fontSize: 13, color: "#64748b", padding: "0 8px" }}>Hi, {userName}</span>
          <button style={styles.navBtn(false)} onClick={logout}>Logout</button>
        </div>
      </nav>

      {/* ── Analyze Tab ── */}
      {tab === "analyze" && (
        <div style={styles.page}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Resume Analyzer</h1>
            <p style={{ color: "#64748b", fontSize: 15 }}>Analyze your resume against any job description using NLP.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Resume Input */}
            <div style={styles.card}>
              <h2 style={styles.h2}>Your Resume</h2>
              <div style={styles.toggleRow}>
                <button style={styles.toggleBtn(inputMode === "text")} onClick={() => setInputMode("text")}>Paste Text</button>
                <button style={styles.toggleBtn(inputMode === "file")} onClick={() => setInputMode("file")}>Upload File</button>
              </div>
              {inputMode === "text" ? (
                <textarea style={styles.textarea} placeholder="Paste your resume text here…"
                  value={resumeText} onChange={e => setResumeText(e.target.value)} />
              ) : (
                <div onClick={() => fileRef.current.click()} style={{
                  minHeight: 140, border: "2px dashed #334155", borderRadius: 12,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#64748b", gap: 8,
                  background: uploadFile ? "rgba(34,211,165,0.06)" : "transparent",
                  borderColor: uploadFile ? "#22d3a5" : "#334155",
                }}>
                  <div style={{ fontSize: 28 }}>📄</div>
                  <div style={{ fontSize: 14 }}>{uploadFile ? uploadFile.name : "Click to upload PDF or TXT"}</div>
                  <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: "none" }}
                    onChange={e => setUploadFile(e.target.files[0])} />
                </div>
              )}
            </div>

            {/* JD Input */}
            <div style={styles.card}>
              <h2 style={styles.h2}>Job Description</h2>
              <textarea style={{ ...styles.textarea, minHeight: 200 }}
                placeholder="Paste the job description here…"
                value={jdText} onChange={e => setJdText(e.target.value)} />
            </div>
          </div>

          {analyzeError && <div style={{ ...styles.error, marginBottom: 16 }}>{analyzeError}</div>}

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <button style={{ ...styles.btn("primary"), padding: "14px 48px", fontSize: 16, opacity: analyzing ? 0.7 : 1 }}
              onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "⏳ Analyzing…" : "⚡ Analyze Resume"}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

              {/* Score row */}
              <div style={{ ...styles.card, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
                <ScoreGauge score={result.score} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h2 style={{ ...styles.h2, marginBottom: 16 }}>Analysis Results</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#060c1a", borderRadius: 10, padding: "12px 16px", border: "1px solid #1e293b" }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>TECH SCORE</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>{result.tech_score}%</div>
                    </div>
                    <div style={{ background: "#060c1a", borderRadius: 10, padding: "12px 16px", border: "1px solid #1e293b" }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>SOFT SKILLS</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{result.soft_score}%</div>
                    </div>
                    <div style={{ background: "#060c1a", borderRadius: 10, padding: "12px 16px", border: "1px solid #1e293b" }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>EXP. YEARS</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{result.experience_years}+</div>
                    </div>
                  </div>
                  {result.contact?.email && (
                    <div style={{ marginTop: 14, fontSize: 13, color: "#64748b" }}>
                      📧 {result.contact.email} {result.contact.phone && ` · 📞 ${result.contact.phone}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Skills breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div style={styles.card}>
                  <div style={styles.sectionTitle}>✅ Matched Skills ({result.matched_skills.length})</div>
                  <div>{result.matched_skills.map(s => <Chip key={s} label={s} type="match" />)}</div>
                  {result.matched_skills.length === 0 && <span style={{ color: "#475569", fontSize: 13 }}>None found</span>}
                </div>
                <div style={styles.card}>
                  <div style={styles.sectionTitle}>❌ Missing Skills ({result.missing_skills.length})</div>
                  <div>{result.missing_skills.map(s => <Chip key={s} label={s} type="missing" />)}</div>
                  {result.missing_skills.length === 0 && <span style={{ color: "#475569", fontSize: 13 }}>None! Great match.</span>}
                </div>
                <div style={styles.card}>
                  <div style={styles.sectionTitle}>➕ Extra Skills ({result.extra_skills.length})</div>
                  <div>{result.extra_skills.map(s => <Chip key={s} label={s} type="extra" />)}</div>
                  {result.extra_skills.length === 0 && <span style={{ color: "#475569", fontSize: 13 }}>None</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History Tab ── */}
      {tab === "history" && (
        <div style={styles.page}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Analysis History</h1>
            <p style={{ color: "#64748b", fontSize: 14 }}>Your last 20 analyses</p>
          </div>

          {histLoading && <div style={{ color: "#64748b", padding: 24, textAlign: "center" }}>Loading…</div>}

          {!histLoading && history.length === 0 && (
            <div style={{ ...styles.card, textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ color: "#64748b" }}>No analyses yet. Start by analyzing a resume.</div>
            </div>
          )}

          {history.map((r) => (
            <div key={r._id} style={{ ...styles.card, display: "flex", gap: 20, alignItems: "center" }}>
              <ScoreGauge score={r.score} size={80} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Tech: <strong style={{ color: "#3b82f6" }}>{r.tech_score}%</strong></span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Soft: <strong style={{ color: "#a78bfa" }}>{r.soft_score}%</strong></span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Exp: <strong style={{ color: "#f59e0b" }}>{r.experience_years}+ yrs</strong></span>
                </div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  {(r.matched_skills || []).slice(0, 5).map(s => <Chip key={s} label={s} type="match" />)}
                  {(r.missing_skills || []).slice(0, 3).map(s => <Chip key={s} label={s} type="missing" />)}
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
