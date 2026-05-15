import { useState, useCallback, useRef, useEffect } from "react";

const REPORTS = [
  { id: "sqp", label: "Search Query Performance", short: "SQP", desc: "Brand Analytics → Search Query Performance", color: "#FF6B35", icon: "⚡" },
  { id: "search_term", label: "Search Term Report", short: "ST", desc: "Campaign Manager → Reports → Search Term", color: "#4F8EF7", icon: "🔍" },
  { id: "campaign", label: "Campaign Report", short: "CAM", desc: "Campaign Manager → Reports → Campaign", color: "#A78BFA", icon: "📊" },
  { id: "targeting", label: "Targeting Report", short: "TGT", desc: "Campaign Manager → Reports → Targeting", color: "#34D399", icon: "🎯" },
  { id: "placement", label: "Placement Report", short: "PLC", desc: "Campaign Manager → Reports → Placement", color: "#F472B6", icon: "📍" },
  { id: "business", label: "Business Report", short: "BIZ", desc: "Seller Central → Reports → Business Reports", color: "#FBBF24", icon: "💼" },
  { id: "purchased", label: "Purchased Product", short: "PPR", desc: "Campaign Manager → Reports → Purchased Product", color: "#22D3EE", icon: "🛒" },
  { id: "inventory", label: "Inventory Report", short: "INV", desc: "Seller Central → Reports → Fulfilment → Inventory", color: "#FB923C", icon: "📦" },
  { id: "sb_search", label: "Sponsored Brands Search Term", short: "SB", desc: "Campaign Manager → Sponsored Brands → Search Term", color: "#C084FC", icon: "🏷️" },
];

const SYSTEM_PROMPT = `You are the core intelligence engine of ReportIQ — an elite Amazon Advertising analytics platform. You have access to multiple Amazon Ads reports uploaded by the advertiser.

Perform a DEEP, CROSS-REPORT analysis. Identify patterns that ONLY emerge when comparing multiple reports simultaneously. Every insight must reference actual data from the reports. Be brutally specific — name campaigns, keywords, ASINs, and exact numbers.

Structure your output EXACTLY with these headers (use ## for each):

## 🚨 CRITICAL ISSUES
Money being lost RIGHT NOW. Cross-report signals that prove it. Be specific.

## 💎 HIDDEN OPPORTUNITIES
Patterns only visible by cross-referencing reports. Specific keywords, ASINs, queries with data to back it.

## ⚙️ CAMPAIGN STRUCTURE DIAGNOSIS
Cannibalization, self-auction wars, broad match black holes, auto poaching manual. Name specific campaigns.

## 📈 TACOS vs ACOS INTELLIGENCE
Organic-paid relationship analysis. Is ACoS lying? Death spiral or flywheel? What the TACoS trend actually means.

## 🎯 EXACT BID CHANGES
Specific bids with formula: Suggested Bid = Current Bid × (Target ACoS ÷ Actual ACoS). List each one.

## 🕵️ ATTRIBUTION TRAPS
14-day window inflation, wrong product credit, halo effect misread. Flag every suspicious pattern.

## 📅 TIMING SIGNALS
Day-of-week CVR patterns, budget exhaustion timing, seasonal signals in data.

## 🏁 30-DAY ACTION PLAN
Week 1: Stop bleeding. Week 2: Fix structure. Week 3–4: Scale winners. Numbered, specific tasks.

Be direct. If the account is poorly structured, say exactly that. The advertiser paid for expert truth, not encouragement.`;

function parseCSVPreview(text, maxRows = 80) {
  return text.split("\n").filter(l => l.trim()).slice(0, maxRows).join("\n");
}

function UploadBox({ report, file, onUpload, onRemove, index }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  const handle = (f) => {
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".txt"))) {
      onUpload(report.id, f);
    }
  };

  return (
    <div
      className={`ubox ${file ? "ubox--done" : ""} ${drag ? "ubox--drag" : ""}`}
      style={{ "--c": report.color, "--i": index }}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => !file && ref.current.click()}
    >
      <input ref={ref} type="file" accept=".csv,.xlsx,.txt" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
      <div className="ubox__top">
        <span className="ubox__icon">{report.icon}</span>
        <span className="ubox__chip">{report.short}</span>
      </div>
      <div className="ubox__name">{report.label}</div>
      {file ? (
        <div className="ubox__file">
          <span className="ubox__fname">✓ {file.name}</span>
          <button className="ubox__rm" onClick={e => { e.stopPropagation(); onRemove(report.id); }}>×</button>
        </div>
      ) : (
        <>
          <div className="ubox__where">{report.desc}</div>
          <div className="ubox__cta">Drop CSV or click</div>
        </>
      )}
      <div className="ubox__glow" />
    </div>
  );
}

function ResultSection({ title, content }) {
  const [open, setOpen] = useState(true);
  const emoji = title.match(/^(##\s*)?([\S]+)/)?.[2] || "•";
  const text = title.replace(/^##\s*/, "").replace(/^[\u{1F300}-\u{1FFFF}]\s*/u, "").trim();

  const formatted = content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .split("\n")
    .map(line => {
      if (line.startsWith("- ") || line.match(/^\d+\./)) return `<li>${line.replace(/^[-\d.]+\s*/, "")}</li>`;
      if (line.trim() === "") return "";
      return `<p>${line}</p>`;
    })
    .join("");

  return (
    <div className={`rsec ${open ? "rsec--open" : ""}`}>
      <button className="rsec__head" onClick={() => setOpen(!open)}>
        <span className="rsec__emoji">{emoji}</span>
        <span className="rsec__title">{text}</span>
        <span className="rsec__arrow">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="rsec__body" dangerouslySetInnerHTML={{ __html: formatted }} />
      )}
    </div>
  );
}

function parseAnalysis(raw) {
  const sections = [];
  const parts = raw.split(/(?=^## )/m);
  for (const part of parts) {
    const lines = part.trim().split("\n");
    if (!lines[0]) continue;
    const title = lines[0];
    const content = lines.slice(1).join("\n").trim();
    if (content) sections.push({ title, content });
  }
  return sections;
}

export default function App() {
  const [files, setFiles] = useState({});
  const [analysis, setAnalysis] = useState("");
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  const uploadedCount = Object.keys(files).length;

  const phases = [
    "Reading your reports...",
    "Cross-referencing data...",
    "Detecting hidden patterns...",
    "Building recommendations...",
    "Finalising analysis...",
  ];

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setTick(x => x + 1), 80);
    const p = setInterval(() => setPhase(x => Math.min(x + 1, phases.length - 1)), 4000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [loading]);

  const handleUpload = useCallback((id, file) => setFiles(prev => ({ ...prev, [id]: file })), []);
  const handleRemove = useCallback((id) => setFiles(prev => { const n = { ...prev }; delete n[id]; return n; }), []);

  const readFile = (file) => new Promise(res => {
    const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsText(file);
  });

  const analyse = async () => {
    if (!uploadedCount) return;
    setLoading(true); setAnalysis(""); setSections([]); setError(""); setPhase(0);
    try {
      const reportData = [];
      for (const [id, file] of Object.entries(files)) {
        const text = await readFile(file);
        const report = REPORTS.find(r => r.id === id);
        reportData.push(`\n\n=== ${report.label.toUpperCase()} ===\nFile: ${file.name}\n${parseCSVPreview(text, 80)}`);
      }
      const names = Object.keys(files).map(id => REPORTS.find(r => r.id === id).label).join(", ");
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-iab": "true"
},
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Uploaded reports: ${names}\n\nData:\n${reportData.join("\n")}` }],
        }),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = await response.json();
      const result = data.content.map(b => b.text || "").join("");
      setAnalysis(result);
      setSections(parseAnalysis(result));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => { navigator.clipboard.writeText(analysis); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const bars = Array.from({ length: 28 }, (_, i) => i);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,700;12..96,800&family=Fira+Code:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #07070C;
          --bg2: #0E0E18;
          --bg3: #14141F;
          --border: #ffffff0D;
          --border2: #ffffff18;
          --text: #F0F0F8;
          --muted: #6B6B80;
          --accent: #FF6B35;
          --accent2: #FF9A6C;
          --green: #34D399;
          --font: 'Bricolage Grotesque', sans-serif;
          --mono: 'Fira Code', monospace;
        }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font); background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }

        /* NOISE OVERLAY */
        body::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          opacity: .4;
        }

        .app { position: relative; z-index: 1; max-width: 1160px; margin: 0 auto; padding: 0 24px 100px; }

        /* NAV */
        .nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 0 0;
          margin-bottom: 64px;
        }
        .logo {
          display: flex; align-items: center; gap: 10px;
          font-size: 22px; font-weight: 800; letter-spacing: -.03em; color: var(--text);
        }
        .logo-mark {
          width: 34px; height: 34px; border-radius: 8px;
          background: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 800; color: #fff;
          font-family: var(--mono);
          letter-spacing: -.05em;
        }
        .logo span { color: var(--accent); }
        .nav-tag {
          font-family: var(--mono); font-size: 11px; color: var(--muted);
          border: 1px solid var(--border2); padding: 5px 12px; border-radius: 20px;
        }

        /* HERO */
        .hero { margin-bottom: 72px; }
        .hero-kicker {
          font-family: var(--mono); font-size: 11px; color: var(--accent);
          letter-spacing: .15em; text-transform: uppercase; margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .hero-kicker::before { content: ''; width: 24px; height: 1px; background: var(--accent); }
        .hero-h1 {
          font-size: clamp(36px, 6vw, 72px); font-weight: 800;
          line-height: 1.0; letter-spacing: -.04em;
          margin-bottom: 20px;
        }
        .hero-h1 em { font-style: normal; color: var(--accent); }
        .hero-sub {
          font-size: 17px; color: var(--muted); max-width: 500px; line-height: 1.6; font-weight: 300;
          margin-bottom: 32px;
        }
        .hero-stats {
          display: flex; gap: 32px; flex-wrap: wrap;
        }
        .hstat { }
        .hstat-num {
          font-size: 28px; font-weight: 800; color: var(--text);
          font-variant-numeric: tabular-nums; letter-spacing: -.03em;
        }
        .hstat-num span { color: var(--accent); }
        .hstat-label { font-size: 12px; color: var(--muted); margin-top: 2px; }

        /* WAVEFORM DECO */
        .wave-deco {
          position: absolute; right: -24px; top: 80px;
          width: 340px; height: 120px; overflow: hidden; opacity: .15;
          pointer-events: none;
        }
        .wave-bar {
          display: inline-block; width: 6px; border-radius: 3px;
          background: var(--accent); margin: 0 2px;
          transition: height .1s ease;
          vertical-align: bottom;
        }

        /* SECTION LABEL */
        .slabel {
          font-family: var(--mono); font-size: 11px; color: var(--muted);
          letter-spacing: .12em; text-transform: uppercase;
          display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        }
        .slabel::after { content: ''; flex: 1; height: 1px; background: var(--border); }

        /* UPLOAD GRID */
        .ugrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 10px;
          margin-bottom: 40px;
        }

        /* UPLOAD BOX */
        .ubox {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 18px 16px 14px;
          cursor: pointer;
          position: relative; overflow: hidden;
          transition: border-color .2s, transform .2s;
          animation: fadeUp .4s ease both;
          animation-delay: calc(var(--i) * 30ms);
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        .ubox:hover { border-color: var(--c); transform: translateY(-3px); }
        .ubox--drag { border-color: var(--c) !important; border-style: dashed; }
        .ubox--done { border-color: color-mix(in srgb, var(--c) 50%, transparent); cursor: default; }
        .ubox__glow {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 20% 20%, var(--c), transparent 70%);
          opacity: 0; transition: opacity .25s;
        }
        .ubox:hover .ubox__glow, .ubox--done .ubox__glow { opacity: .07; }
        .ubox--drag .ubox__glow { opacity: .12; }

        .ubox__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .ubox__icon { font-size: 20px; }
        .ubox__chip {
          font-family: var(--mono); font-size: 9px; font-weight: 500;
          padding: 2px 8px; border-radius: 20px; letter-spacing: .06em;
          background: color-mix(in srgb, var(--c) 15%, transparent);
          color: var(--c);
          border: 1px solid color-mix(in srgb, var(--c) 25%, transparent);
        }
        .ubox__name {
          font-size: 13px; font-weight: 600; color: var(--text);
          line-height: 1.3; margin-bottom: 8px;
        }
        .ubox__where {
          font-size: 10px; color: var(--muted); line-height: 1.5; margin-bottom: 10px;
        }
        .ubox__cta {
          font-size: 11px; color: var(--border2);
          font-style: italic;
        }
        .ubox__file {
          display: flex; align-items: center; gap: 6px; margin-top: 6px;
        }
        .ubox__fname {
          font-family: var(--mono); font-size: 10px; color: var(--c);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
        }
        .ubox__rm {
          background: #ffffff0a; border: none; color: var(--muted);
          width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
          font-size: 14px; display: flex; align-items: center; justify-content: center;
          transition: all .15s; flex-shrink: 0; line-height: 1;
        }
        .ubox__rm:hover { background: #ff444466; color: #fff; }

        /* CTA BAR */
        .cta-bar {
          display: flex; align-items: center; gap: 20px;
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 16px; padding: 20px 24px;
          margin-bottom: 40px;
        }
        .cta-left { flex: 1; }
        .cta-count {
          font-size: 13px; color: var(--muted); margin-bottom: 4px;
        }
        .cta-count strong { color: var(--text); font-weight: 600; }
        .cta-hint { font-size: 12px; color: color-mix(in srgb, var(--muted) 60%, transparent); }
        .run-btn {
          font-family: var(--font); font-size: 15px; font-weight: 700;
          background: var(--accent); color: #fff;
          border: none; border-radius: 10px; padding: 14px 28px;
          cursor: pointer; white-space: nowrap;
          transition: all .2s; position: relative; overflow: hidden;
          letter-spacing: -.01em;
        }
        .run-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,.15) 0%, transparent 100%);
          opacity: 0; transition: opacity .15s;
        }
        .run-btn:hover::after { opacity: 1; }
        .run-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px color-mix(in srgb, var(--accent) 40%, transparent); }
        .run-btn:disabled { background: var(--bg3); color: var(--muted); cursor: not-allowed; transform: none; box-shadow: none; }
        .run-btn:disabled::after { display: none; }

        /* LOADING */
        .loading-wrap {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 16px; padding: 40px;
          text-align: center; margin-bottom: 40px;
        }
        .loading-bars {
          display: flex; align-items: flex-end; justify-content: center;
          gap: 4px; height: 48px; margin-bottom: 20px;
        }
        .lbar {
          width: 5px; border-radius: 3px; background: var(--accent);
          animation: lbounce 1.2s ease-in-out infinite;
        }
        @keyframes lbounce {
          0%, 100% { transform: scaleY(.2); opacity: .3; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .loading-phase {
          font-family: var(--mono); font-size: 13px; color: var(--accent);
          margin-bottom: 8px;
        }
        .loading-sub { font-size: 13px; color: var(--muted); }

        /* RESULTS */
        .results-wrap {
          animation: fadeUp .5s ease;
        }
        .results-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .results-meta { }
        .results-title {
          font-size: 22px; font-weight: 800; letter-spacing: -.02em;
          margin-bottom: 4px;
        }
        .results-title span { color: var(--accent); }
        .results-sub { font-size: 13px; color: var(--muted); }
        .copy-btn {
          font-family: var(--mono); font-size: 11px;
          background: var(--bg2); border: 1px solid var(--border2);
          color: var(--muted); padding: 8px 16px; border-radius: 8px;
          cursor: pointer; transition: all .15s;
        }
        .copy-btn:hover { background: var(--bg3); color: var(--text); }

        /* RESULT SECTIONS */
        .rsec {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 14px; margin-bottom: 10px; overflow: hidden;
          transition: border-color .2s;
        }
        .rsec--open { border-color: var(--border2); }
        .rsec__head {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 16px 20px; background: none; border: none; cursor: pointer;
          text-align: left;
        }
        .rsec__head:hover { background: #ffffff03; }
        .rsec__emoji { font-size: 20px; flex-shrink: 0; }
        .rsec__title {
          font-size: 15px; font-weight: 700; color: var(--text);
          flex: 1; letter-spacing: -.01em;
        }
        .rsec__arrow {
          font-size: 18px; color: var(--muted); flex-shrink: 0;
          font-family: var(--mono);
        }
        .rsec__body {
          padding: 0 20px 20px; border-top: 1px solid var(--border);
          padding-top: 16px;
        }
        .rsec__body p {
          font-size: 14px; color: color-mix(in srgb, var(--text) 70%, transparent);
          line-height: 1.8; margin-bottom: 10px;
        }
        .rsec__body strong { color: var(--text); font-weight: 600; }
        .rsec__body code {
          font-family: var(--mono); font-size: 12px;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          color: var(--accent2);
          padding: 2px 7px; border-radius: 5px;
        }
        .rsec__body ul { list-style: none; padding: 0; margin: 8px 0 14px; }
        .rsec__body li {
          font-size: 14px; color: color-mix(in srgb, var(--text) 70%, transparent);
          padding: 5px 0 5px 20px; position: relative; line-height: 1.7;
        }
        .rsec__body li::before {
          content: '→'; position: absolute; left: 0;
          color: var(--accent); font-size: 12px; top: 7px;
        }

        /* ERROR */
        .err {
          background: #1a0808; border: 1px solid #ff444422;
          border-radius: 12px; padding: 16px 20px;
          font-family: var(--mono); font-size: 12px; color: #ff8888;
          margin-bottom: 24px;
        }

        /* FOOTER */
        .footer {
          margin-top: 80px; padding-top: 32px;
          border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .footer-logo {
          font-size: 16px; font-weight: 800; letter-spacing: -.03em;
          display: flex; align-items: center; gap: 8px;
        }
        .footer-lm {
          width: 26px; height: 26px; border-radius: 6px;
          background: var(--accent); display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff; font-family: var(--mono);
        }
        .footer-copy { font-size: 12px; color: var(--muted); }

        @media (max-width: 640px) {
          .hero-h1 { font-size: 36px; }
          .ugrid { grid-template-columns: 1fr 1fr; }
          .cta-bar { flex-direction: column; align-items: stretch; }
          .run-btn { text-align: center; }
          .wave-deco { display: none; }
          .hero-stats { gap: 20px; }
        }
      `}</style>

      <div className="app">
        {/* NAV */}
        <nav className="nav">
          <div className="logo">
            <div className="logo-mark">R</div>
            Report<span>IQ</span>
          </div>
          <div className="nav-tag">Amazon Ads Intelligence</div>
        </nav>

        {/* HERO */}
        <div className="hero" style={{ position: "relative" }}>
          <div className="hero-kicker">AI-Powered Report Analysis</div>
          <h1 className="hero-h1">
            Your ads data<br />
            <em>tells the truth.</em><br />
            We translate it.
          </h1>
          <p className="hero-sub">
            Upload your Amazon Ads reports. ReportIQ cross-references all of them simultaneously to surface patterns no human analyst would catch manually.
          </p>
          <div className="hero-stats">
            <div className="hstat">
              <div className="hstat-num">{uploadedCount}<span>/9</span></div>
              <div className="hstat-label">Reports uploaded</div>
            </div>
            <div className="hstat">
              <div className="hstat-num">8<span>+</span></div>
              <div className="hstat-label">Analysis dimensions</div>
            </div>
            <div className="hstat">
              <div className="hstat-num">&lt;30<span>s</span></div>
              <div className="hstat-label">Full audit time</div>
            </div>
          </div>

          {/* Waveform decoration */}
          <div className="wave-deco">
            {bars.map((_, i) => (
              <div key={i} className="wave-bar" style={{
                height: `${20 + Math.sin(i * 0.7 + tick * 0.15) * 30 + Math.sin(i * 1.3) * 20}px`,
                opacity: loading ? 1 : 0.4
              }} />
            ))}
          </div>
        </div>

        {/* UPLOAD */}
        <div className="slabel">Upload Reports — more reports = deeper cross-analysis</div>
        <div className="ugrid">
          {REPORTS.map((r, i) => (
            <UploadBox key={r.id} report={r} file={files[r.id] || null} onUpload={handleUpload} onRemove={handleRemove} index={i} />
          ))}
        </div>

        {/* CTA BAR */}
        <div className="cta-bar">
          <div className="cta-left">
            <div className="cta-count">
              <strong>{uploadedCount} report{uploadedCount !== 1 ? "s" : ""}</strong> ready for analysis
              {uploadedCount >= 3 && " — enough for cross-report pattern detection"}
            </div>
            <div className="cta-hint">
              {uploadedCount === 0 && "Upload at least one report above to begin"}
              {uploadedCount === 1 && "Upload 2+ reports for cross-reference analysis"}
              {uploadedCount === 2 && "Good start — 3+ reports unlock deeper pattern detection"}
              {uploadedCount >= 3 && `Analysing ${Object.keys(files).map(id => REPORTS.find(r => r.id === id).short).join(" · ")}`}
            </div>
          </div>
          <button className="run-btn" onClick={analyse} disabled={loading || uploadedCount === 0}>
            {loading ? "Analysing…" : `Run Analysis →`}
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="loading-wrap">
            <div className="loading-bars">
              {Array.from({ length: 16 }, (_, i) => (
                <div key={i} className="lbar" style={{
                  height: `${20 + Math.random() * 28}px`,
                  animationDelay: `${i * 75}ms`,
                  animationDuration: `${0.8 + (i % 3) * 0.3}s`
                }} />
              ))}
            </div>
            <div className="loading-phase">{phases[phase]}</div>
            <div className="loading-sub">Cross-referencing {uploadedCount} report{uploadedCount !== 1 ? "s" : ""} — finding patterns invisible to manual analysis</div>
          </div>
        )}

        {/* ERROR */}
        {error && <div className="err">⚠ {error}</div>}

        {/* RESULTS */}
        {sections.length > 0 && (
          <div className="results-wrap">
            <div className="results-header">
              <div className="results-meta">
                <div className="results-title">Analysis <span>Complete</span></div>
                <div className="results-sub">{sections.length} insight categories · {uploadedCount} reports cross-referenced</div>
              </div>
              <button className="copy-btn" onClick={copy}>{copied ? "✓ Copied" : "Copy report"}</button>
            </div>
            {sections.map((s, i) => <ResultSection key={i} title={s.title} content={s.content} />)}
          </div>
        )}

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-logo">
            <div className="footer-lm">R</div>
            ReportIQ
          </div>
          <div className="footer-copy">Amazon Ads Intelligence Platform · Cross-report AI analysis</div>
        </footer>
      </div>
    </>
  );
}
