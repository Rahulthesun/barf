"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Deploy counter ─────────────────────────────────────────────────────────────
function useDeployCounter(initial = 3124) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => {
      setCount(n => (Math.random() < 0.6 ? n + 1 : n));
    }, 1700);
    return () => clearInterval(t);
  }, []);
  return count;
}

// ── Rotating word ──────────────────────────────────────────────────────────────
const ROTATE_WORDS = ["Salesforce", "Mailchimp", "GitHub", "Zapier", "Auth0", "Notion", "1Password"];

function useRotatingWord() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % ROTATE_WORDS.length);
        setVisible(true);
      }, 280);
    }, 2200);
    return () => clearInterval(t);
  }, []);
  return { word: ROTATE_WORDS[idx], visible };
}

// ── Data ───────────────────────────────────────────────────────────────────────

const TILES = [
  { t: "t1", dur: "7s",   bg: "#175CFF",                              color: "#fff", text: "Sf", name: "Salesforce",  do: "CRM & pipelines",         arrow: "→ Twenty"      },
  { t: "t2", dur: "8s",   bg: "#0d1117",                              color: "#fff", text: "Gh", name: "GitHub",      do: "Code hosting & CI",       arrow: "→ Gitea"       },
  { t: "t3", dur: "9s",   bg: "#FFE01B",                              color: "#000", text: "Mc", name: "Mailchimp",   do: "Newsletters & campaigns", arrow: "→ Listmonk"    },
  { t: "t4", dur: "7.5s", bg: "#FF4F00",                              color: "#fff", text: "Zp", name: "Zapier",      do: "Workflow automation",     arrow: "→ n8n"         },
  { t: "t5", dur: "8.5s", bg: "#0070F3",                              color: "#fff", text: "1P", name: "1Password",   do: "Password vault",          arrow: "→ Vaultwarden" },
  { t: "t6", dur: "9.5s", bg: "#ffffff",                              color: "#000", text: "Nt", name: "Notion",      do: "Docs & wiki",             arrow: "→ AppFlowy"    },
  { t: "t7", dur: "7.8s", bg: "#EB5424",                              color: "#fff", text: "A0", name: "Auth0",       do: "SSO & identity",          arrow: "→ Keycloak"    },
  { t: "t8", dur: "8.2s", bg: "linear-gradient(135deg,#4285F4,#34A853)", color: "#fff", text: "GD", name: "Google Drive", do: "Files & sharing",     arrow: "→ Nextcloud"   },
] as const;

const MARQUEE_APPS = [
  { abbr: "VW", name: "Vaultwarden" }, { abbr: "Gi", name: "Gitea" },
  { abbr: "Lm", name: "Listmonk" },   { abbr: "Um", name: "Umami" },
  { abbr: "n8", name: "n8n" },        { abbr: "Nc", name: "Nextcloud" },
  { abbr: "Tw", name: "Twenty" },     { abbr: "Kc", name: "Keycloak" },
  { abbr: "Co", name: "Corteza" },    { abbr: "Ap", name: "Activepieces" },
];

const KILL_CHIPS = ["Salesforce", "Auth0", "Zapier", "Mailchimp", "GitHub", "Google Drive", "1Password", "Notion"];

const RECEIPT_ROWS = [
  { name: "Salesforce Pro · 8 seats", amt: "$200.00" },
  { name: "GitHub Team · 8 seats",    amt: "$32.00"  },
  { name: "Mailchimp Standard",        amt: "$45.00"  },
  { name: "Zapier Pro",               amt: "$29.99"  },
  { name: "1Password Business",        amt: "$63.92"  },
  { name: "Google Workspace",          amt: "$96.00"  },
  { name: "Auth0 B2B",                amt: "$240.00" },
];

const STEPS = [
  {
    n: "STEP 01",
    title: "Pick your app",
    body: "Choose from a curated library of vetted OSS alternatives to the tools you're already paying for. CRM, password vault, analytics — pick the bill you want to kill.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    n: "STEP 02",
    title: "Deploy in 2–3 minutes",
    body: "We spin it up, wire the database, configure SSL, hand you the keys. You watch a progress bar; we do the actual work behind it.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    n: "STEP 03",
    title: "Ask barfy anything",
    body: '"How do I set up email sequences in Listmonk?" "How do I create a custom object in Twenty?" Every app, one assistant that actually knows it.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const SHOWCASE = [
  { saas: "1Password",        oss: "Vaultwarden",        desc: "Full password vault, zero subscription, your encryption keys.",          slug: "vaultwarden" },
  { saas: "GitHub",           oss: "Gitea",              desc: "Git hosting, CI/CD, code review. Yours, on your subdomain.",             slug: "gitea"       },
  { saas: "Mailchimp",        oss: "Listmonk",           desc: "Unlimited subscribers. No per-send pricing. No surprise upgrades.",      slug: "listmonk"    },
  { saas: "Google Analytics", oss: "Umami",              desc: "Privacy-first analytics, clean dashboard, GDPR-friendly by default.",    slug: "umami"       },
  { saas: "Zapier",           oss: "n8n + Activepieces", desc: "400+ integrations, visual workflows, your data never leaves.",           slug: "n8n"         },
  { saas: "Google Drive",     oss: "Nextcloud",          desc: "File sync, collaboration, video calls, calendar — one app.",             slug: "nextcloud"   },
  { saas: "Salesforce",       oss: "Twenty + Corteza",   desc: "Modern CRM, low-code, no contracts, custom objects in 30 seconds.",     slug: "twenty"      },
  { saas: "Auth0",            oss: "Keycloak",           desc: "SSO, MFA, LDAP, RBAC. Enterprise-grade, free.",                         slug: "keycloak"    },
];

const FAQS = [
  {
    q: "Can I actually replace Salesforce with this?",
    a: "Twenty and Corteza are both production-grade CRMs used by real companies. They handle pipelines, custom objects, automations, and team permissions. barfy helps you get them configured for your workflow specifically — including importing from your current CRM.",
    open: true,
  },
  {
    q: "What if something breaks?",
    a: "barfy helps you troubleshoot first. If it's our infrastructure, we fix it — we monitor every deployment 24/7 and roll back automatically. If it's the app itself, barfy walks you through it. No tickets that go to /dev/null.",
  },
  {
    q: "Is this legal?",
    a: "Every app we support is open-source and licensed for commercial deployment (mostly AGPL, MIT, and Apache 2.0). barf is a hosting and AI assistance layer — not a knock-off. We pay it forward by sponsoring upstream maintainers on the apps you deploy.",
  },
  {
    q: "What if I want to move everything later?",
    a: "It's your data, your deployment. One-click export at any time — Postgres dump, file blobs, environment config. We're not a lock-in play. If you outgrow us and want to host yourself, we'll even help you migrate.",
  },
  {
    q: "How does barfy compare to ChatGPT or Claude for this stuff?",
    a: 'Generic assistants know these apps roughly. barfy has the actual current docs, your live config, and your deployment context. So when you ask "why isn\'t my Listmonk SMTP sending?", barfy can look at your settings — not just guess.',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const C = {
  container: { maxWidth: 1240, margin: "0 auto", padding: "0 32px", position: "relative" as const, zIndex: 1 },
  rule: { height: 1, background: "var(--line)", width: "100%" },
  sectionPad: { padding: "110px 0", position: "relative" as const, zIndex: 1 },
  h2: {
    fontSize: "clamp(36px, 5vw, 64px)" as string,
    lineHeight: 1.02,
    letterSpacing: "-0.035em",
    fontWeight: 900,
    margin: "0 0 24px",
  },
} as const;

// ── Page ───────────────────────────────────────────────────────────────────────
type Theme = "amber" | "cyber" | "plasma";

export default function LandingPage() {
  const deployCount = useDeployCounter(3124);
  const { word: rotateWord, visible: rotateVisible } = useRotatingWord();
  const [theme, setTheme] = useState<Theme>("amber");

  useEffect(() => {
    const stored = (localStorage.getItem("barf-theme") as Theme) || "amber";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function applyTheme(t: Theme) {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("barf-theme", t);
  }

  const killlistRef = useRef<HTMLDivElement>(null);
  const receiptRef  = useRef<HTMLDivElement>(null);
  const [struckChips, setStruckChips] = useState<Set<number>>(new Set());
  const [struckRows,  setStruckRows]  = useState<Set<number>>(new Set());

  // Global reveal observer
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // FAQ singleton
  useEffect(() => {
    const faqs = Array.from(document.querySelectorAll<HTMLDetailsElement>(".faq"));
    const handler = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
    };
    faqs.forEach(d => d.addEventListener("toggle", handler));
    return () => faqs.forEach(d => d.removeEventListener("toggle", handler));
  }, []);

  // Kill chips cascade
  useEffect(() => {
    const el = killlistRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        KILL_CHIPS.forEach((_, i) => setTimeout(() => setStruckChips(s => new Set([...s, i])), 200 + i * 90));
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Receipt cascade
  useEffect(() => {
    const el = receiptRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        RECEIPT_ROWS.forEach((_, i) => setTimeout(() => setStruckRows(s => new Set([...s, i])), 250 + i * 220));
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* ── Ambient layers ─────────────────────────────────────────────────── */}
      <div className="bg-layer bg-grid" />
      <div className="bg-layer bg-blobs">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>
      <div className="bg-layer bg-noise" />

      {/* ── Landing Nav ──────────────────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(14px)", background: "color-mix(in oklab, var(--bg) 78%, transparent)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ fontWeight: 900, letterSpacing: "-0.04em", fontSize: 26, color: "var(--fg)", textDecoration: "none", display: "inline-flex", alignItems: "baseline", gap: 4 }}>
            barf<span style={{ color: "var(--primary)", display: "inline-block", animation: "dotPulse 2.4s var(--ease) infinite" }}>.</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Link href="#apps" style={{ color: "var(--fg-mute)", textDecoration: "none", fontWeight: 500, fontSize: 15, transition: "color .15s ease" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-mute)")}
            >
              See all apps
            </Link>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 14.5, background: "var(--primary)", color: "var(--primary-ink)", textDecoration: "none", boxShadow: "0 0 0 1px var(--primary-glow), 0 8px 30px -8px var(--primary-glow)" }}>
              Deploy free
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1 }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section style={{ padding: "96px 0 80px", position: "relative" }}>
          <div style={C.container}>
            <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 56, alignItems: "center" }}>

              {/* Copy */}
              <div>
                {/* Eyebrow */}
                <span className="reveal" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px 6px 8px", border: "1px solid var(--line-2)", borderRadius: 999, background: "color-mix(in oklab, var(--bg-1) 80%, transparent)", fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "var(--fg-mute)", letterSpacing: "0.02em" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", animation: "pulse 1.8s infinite", display: "inline-block" }} />
                  <span>{deployCount.toLocaleString()}</span> apps deployed this week
                </span>

                {/* Headline */}
                <h1 className="reveal delay-1" style={{ fontSize: "clamp(48px, 7.4vw, 86px)", lineHeight: 0.96, letterSpacing: "-0.045em", fontWeight: 900, margin: "24px 0 24px", maxWidth: "14ch" }}>
                  Stop paying{" "}
                  <span style={{ position: "relative", display: "inline-block", color: "var(--fg-mute)" }}>
                    rent
                    <svg style={{ position: "absolute", left: "-6%", top: "52%", width: "112%", height: 12, overflow: "visible" }} viewBox="0 0 240 12" preserveAspectRatio="none">
                      <path className="strike-path" d="M2 6 Q60 2 120 6 Q180 10 238 6" stroke="var(--red)" strokeWidth="6" strokeLinecap="round" fill="none" />
                    </svg>
                  </span>
                  {" "}on{" "}
                  <span style={{
                    display: "inline-block",
                    background: "linear-gradient(120deg, var(--primary) 0%, var(--spark) 60%, var(--primary) 100%)",
                    backgroundSize: "220% 100%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    animation: "shimmer 6s linear infinite",
                    transition: "opacity 0.25s ease, transform 0.35s cubic-bezier(.16,1.2,.3,1)",
                    opacity: rotateVisible ? 1 : 0,
                    transform: rotateVisible ? "translateY(0)" : "translateY(-10px)",
                  }}>
                    {rotateWord}
                  </span>
                  {" "}you already own.
                </h1>

                {/* Sub */}
                <p className="reveal delay-2" style={{ color: "var(--fg-mute)", fontSize: "clamp(17px, 1.4vw, 20px)", lineHeight: 1.55, maxWidth: "60ch", margin: "0 0 36px" }}>
                  barf deploys open-source alternatives to{" "}
                  <strong style={{ color: "var(--fg)" }}>Salesforce, GitHub, Zapier, Google Drive</strong>
                  {" "}and more — live in your own cloud in under 3 minutes. With{" "}
                  <strong style={{ color: "var(--fg)" }}>barfy</strong>, an enterprise-grade AI assistant that helps you actually use them.
                </p>

                {/* CTAs */}
                <div className="reveal delay-3" style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
                  <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 28px", borderRadius: 999, fontWeight: 700, fontSize: 16, background: "var(--primary)", color: "var(--primary-ink)", textDecoration: "none", boxShadow: "0 0 0 1px var(--primary-glow), 0 8px 30px -8px var(--primary-glow)" }}>
                    Deploy your first app — it&apos;s free <span>→</span>
                  </Link>
                  <Link href="#apps" style={{ color: "var(--fg)", fontWeight: 500, textDecoration: "none", borderBottom: "1px solid transparent", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 16, transition: "color .2s ease, border-color .2s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; (e.currentTarget as HTMLElement).style.borderBottomColor = "var(--primary)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg)"; (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent"; }}
                  >
                    See what you can kill <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Collage */}
              <div className="reveal delay-2">
                <div className="collage" id="collage">
                  {TILES.map(tile => (
                    <div key={tile.name} className={`tile ${tile.t}`} style={{ "--dur": tile.dur } as React.CSSProperties}>
                      <div className="tile-logo" style={{ background: tile.bg, color: tile.color }}>{tile.text}</div>
                      <div className="tile-meta">
                        <span className="tile-name">{tile.name}</span>
                        <span className="tile-do">{tile.do}</span>
                      </div>
                      <span className="tile-arrow">{tile.arrow}</span>
                    </div>
                  ))}
                  <div className="collage-stamp">
                    <div className="stamp-eyebrow">all replaced by</div>
                    <div className="stamp-mark">barf<span className="dot">.</span></div>
                    <div className="stamp-sub">open-source · self-hosted · yours</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Proof / Marquee ────────────────────────────────────────────────── */}
        <section style={{ background: "var(--bg-2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "30px 0", overflow: "hidden" }}>
          <div style={{ textAlign: "center", fontFamily: "var(--font-geist-mono)", color: "var(--fg-mute)", fontSize: 14, marginBottom: 22, letterSpacing: "-0.01em" }}>
            Replace tools worth{" "}<span style={{ color: "var(--primary)", fontWeight: 600 }}>$3,000+/year</span>.
            {" "}Deploy in minutes.{" "}<strong style={{ color: "var(--fg)" }}>Own everything.</strong>
          </div>
          <div style={{ overflow: "hidden" }}>
            <div className="marquee-track">
              {[...MARQUEE_APPS, ...MARQUEE_APPS].map((app, i) => (
                <span key={i} className="applogo">
                  <span className="glyph">{app.abbr}</span>{app.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Problem ─────────────────────────────────────────────────────────── */}
        <section style={C.sectionPad}>
          <div style={C.container}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>

              {/* Left */}
              <div>
                <div className="section-eyebrow reveal">The SaaS tax</div>
                <h2 className="reveal delay-1" style={C.h2}>
                  You&apos;re renting software you should own.
                </h2>

                {/* Kill chips */}
                <div className="reveal delay-2" ref={killlistRef} style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                  {KILL_CHIPS.map((chip, i) => (
                    <span key={chip} className={`killchip${struckChips.has(i) ? " struck" : ""}`}>
                      <span style={{ color: "var(--red)", marginRight: 6, fontWeight: 800 }}>×</span>{chip}
                      <svg className="kc-strike" viewBox="0 0 200 4" preserveAspectRatio="none">
                        <path d="M2 2 L198 2" />
                      </svg>
                    </span>
                  ))}
                </div>

                <p className="reveal delay-3" style={{ marginTop: 28, color: "var(--fg-mute)", fontSize: 19, lineHeight: 1.6, marginBottom: 18 }}>
                  Every month you&apos;re paying — sometimes hundreds of dollars — for tools that have free, open-source alternatives that are just as powerful.
                </p>
                <p className="reveal delay-3" style={{ color: "var(--fg-mute)", fontSize: 19, lineHeight: 1.6, marginBottom: 18 }}>
                  The only reason you haven&apos;t switched is that setting them up is a pain nobody has time for.
                </p>
                <p className="reveal delay-4" style={{ color: "var(--fg)", fontWeight: 600, fontSize: 19 }}>
                  Until now.
                </p>
              </div>

              {/* Receipt */}
              <div className="receipt reveal delay-2" ref={receiptRef}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-dim)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px dashed var(--line-2)", paddingBottom: 12, marginBottom: 14 }}>
                  <span>monthly · sept</span><span>acme inc.</span>
                </div>
                {RECEIPT_ROWS.map((row, i) => (
                  <div key={row.name} className={`receipt-row${struckRows.has(i) ? " striking" : ""}`}>
                    <span className="rname">{row.name}</span>
                    <span className="ramt">{row.amt}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, paddingTop: 14, borderTop: "1px dashed var(--line-2)", display: "flex", justifyContent: "space-between", color: "var(--fg)", fontWeight: 600 }}>
                  <span>after barf</span>
                  <span style={{ color: "var(--primary)", fontWeight: 700, textShadow: "0 0 18px var(--primary-glow)" }}>$0.00</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style={C.container}><div style={C.rule} /></div>

        {/* ── How it works ─────────────────────────────────────────────────────── */}
        <section style={C.sectionPad}>
          <div style={C.container}>
            <div className="section-eyebrow reveal">How it works</div>
            <h2 className="reveal delay-1" style={C.h2}>
              Live in 3 minutes. Guided by barfy every step after.
            </h2>
            <p className="reveal delay-2" style={{ color: "var(--fg-mute)", fontSize: 19, maxWidth: "58ch", lineHeight: 1.55, margin: "0 0 56px" }}>
              No servers. No YAML. No PhD. Pick what you want, we ship it to your subdomain, and barfy makes sure you actually know how to use it.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
              {STEPS.map((step, i) => (
                <div
                  key={step.n}
                  className={`step-card reveal delay-${i + 1}`}
                  onPointerMove={e => {
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
                    e.currentTarget.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
                  }}
                >
                  <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "var(--fg-dim)", letterSpacing: "0.1em" }}>{step.n}</div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "color-mix(in oklab, var(--primary) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--primary) 30%, transparent)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "14px 0 18px" }}>
                    {step.icon}
                  </div>
                  <h3 style={{ fontSize: 22, margin: "0 0 10px", fontWeight: 800, letterSpacing: "-0.02em" }}>{step.title}</h3>
                  <p style={{ color: "var(--fg-mute)", fontSize: 15.5, lineHeight: 1.55, margin: 0 }}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Barfy spotlight ──────────────────────────────────────────────────── */}
        <section style={{ padding: "0 0 110px", position: "relative", zIndex: 1 }}>
          <div style={C.container}>
            <div className="reveal" style={{ position: "relative", border: "1px solid var(--line-2)", borderRadius: 22, background: "radial-gradient(900px 320px at -10% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 60%), radial-gradient(700px 280px at 110% 100%, color-mix(in oklab, var(--spark) 12%, transparent), transparent 60%), var(--bg-1)", padding: 56, overflow: "hidden" }}>
              {/* Left accent bar */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "linear-gradient(180deg, var(--primary), var(--spark) 60%, transparent 100%)", boxShadow: "0 0 28px var(--primary-glow)" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

                {/* Copy */}
                <div>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--primary)", display: "grid", placeItems: "center", boxShadow: "0 0 0 1px color-mix(in oklab, var(--primary) 40%, transparent), 0 14px 40px -10px var(--primary-glow)", color: "var(--primary-ink)", marginBottom: 18, animation: "bob 4s ease-in-out infinite" }}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <circle cx="11" cy="13" r="2.2" fill="currentColor"/>
                      <circle cx="21" cy="13" r="2.2" fill="currentColor"/>
                      <path d="M10 21 Q16 25 22 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                    </svg>
                  </div>
                  <div className="section-eyebrow">Meet barfy</div>
                  <h2 style={C.h2}>
                    Every app. One AI that actually knows it.
                  </h2>
                  <p style={{ color: "var(--fg-mute)", fontSize: 19, maxWidth: "58ch", lineHeight: 1.55, margin: 0 }}>
                    barfy isn&apos;t a generic chatbot. It&apos;s an enterprise-grade AI assistant trained specifically on every app barf supports. Setup, configuration, team onboarding, troubleshooting — barfy handles it so you don&apos;t have to dig through docs at 11pm.
                  </p>
                  <p style={{ fontStyle: "italic", fontSize: "clamp(20px, 2vw, 26px)", color: "var(--primary)", lineHeight: 1.4, borderLeft: "2px solid color-mix(in oklab, var(--primary) 50%, transparent)", paddingLeft: 18, margin: "28px 0 0", fontWeight: 500, letterSpacing: "-0.015em" }}>
                    &ldquo;It&apos;s like having a senior DevOps engineer on call, except it never ignores your Slack messages.&rdquo;
                  </p>
                </div>

                {/* Chat mock */}
                <div>
                  <div
                    style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 14, padding: 22, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)", transform: "perspective(1200px) rotateY(-2deg)", transition: "transform .6s var(--ease)" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "perspective(1200px) rotateY(0)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "perspective(1200px) rotateY(-2deg)")}
                  >
                    <div className="bubble user">
                      <div className="bav">JM</div>
                      <div className="bubble-body">How do I connect SMTP to Listmonk so my newsletters actually send?</div>
                    </div>
                    <div className="bubble bot">
                      <div className="bav" style={{ fontWeight: 900, fontSize: 14 }}>b</div>
                      <div className="bubble-body">
                        <p style={{ margin: "0 0 6px" }}>Two minutes. In your Listmonk admin, go to <code style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, fontSize: 12.5, color: "var(--primary)" }}>Settings → SMTP</code>. Use <code style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, fontSize: 12.5, color: "var(--primary)" }}>Postmark</code> or <code style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, fontSize: 12.5, color: "var(--primary)" }}>Resend</code> — both have free tiers.</p>
                        <p style={{ margin: 0 }}>Want me to walk through the DNS records for your domain too?</p>
                      </div>
                    </div>
                    <div className="bubble user">
                      <div className="bav">JM</div>
                      <div className="bubble-body">Yes — and what&apos;s the deliverability difference vs Mailchimp?</div>
                    </div>
                    <div className="bubble bot">
                      <div className="bav" style={{ fontWeight: 900, fontSize: 14 }}>b</div>
                      <div className="bubble-body">
                        <div className="typing-dots"><span /><span /><span /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style={C.container}><div style={C.rule} /></div>

        {/* ── App showcase ──────────────────────────────────────────────────────── */}
        <section id="apps" style={C.sectionPad}>
          <div style={C.container}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 40, marginBottom: 36, flexWrap: "wrap" }}>
              <div>
                <div className="section-eyebrow reveal">The kill list</div>
                <h2 className="reveal delay-1" style={{ ...C.h2, margin: 0 }}>
                  What are you still paying for?
                </h2>
              </div>
              <p className="reveal delay-2" style={{ color: "var(--fg-mute)", fontSize: 19, maxWidth: "46ch", lineHeight: 1.55, margin: 0 }}>
                Every app on this list is open-source, production-grade, and one click away. Hover a row to deploy.
              </p>
            </div>

            <div className="reveal delay-1" style={{ border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", background: "var(--bg-1)" }}>
              <div className="trow thead">
                <span style={{ fontFamily: "var(--font-geist-mono)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11, color: "var(--fg-dim)" }}>You&apos;re paying for</span>
                <span className="arrow-cell" style={{ fontFamily: "var(--font-geist-mono)" }}>→</span>
                <span style={{ fontFamily: "var(--font-geist-mono)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11, color: "var(--fg-dim)" }}>Deploy this instead</span>
                <span />
              </div>
              {SHOWCASE.map(row => (
                <div key={row.saas} className="trow">
                  <span className="saas-col">{row.saas}</span>
                  <span className="arrow-cell">→</span>
                  <span>
                    <span style={{ fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em", fontSize: 16 }}>{row.oss}</span>
                    <span style={{ color: "var(--fg-mute)", fontSize: 14, display: "block", marginTop: 2 }}>{row.desc}</span>
                  </span>
                  <Link href={`/browse/${row.slug}`} className="tdeploy">
                    Deploy <span>→</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div style={C.container}><div style={C.rule} /></div>

        {/* ── Pricing ──────────────────────────────────────────────────────────── */}
        <section id="pricing" style={C.sectionPad}>
          <div style={{ ...C.container, textAlign: "center" }}>
            <div className="section-eyebrow reveal" style={{ justifyContent: "center" }}>Pricing</div>
            <h2 className="reveal delay-1" style={{ ...C.h2, marginLeft: "auto", marginRight: "auto" }}>
              Free to start. Join the waitlist for more.
            </h2>
            <p className="reveal delay-2" style={{ color: "var(--fg-mute)", fontSize: 19, maxWidth: "58ch", lineHeight: 1.55, margin: "0 auto 56px" }}>
              No credit card to deploy your first app. We make money when you outgrow the free tier — not before.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, maxWidth: 860, margin: "0 auto" }}>
              {/* Free */}
              <div className="price-card reveal delay-1" style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, letterSpacing: "0.16em", color: "var(--fg-mute)", textTransform: "uppercase" }}>Free</span>
                </div>
                <div style={{ fontSize: 60, fontWeight: 900, letterSpacing: "-0.04em", margin: "12px 0 4px", lineHeight: 1 }}>
                  $0<span style={{ fontSize: 17, color: "var(--fg-mute)", fontWeight: 500, marginLeft: 4 }}>/forever</span>
                </div>
                <p style={{ color: "var(--fg-mute)", margin: "0 0 26px", fontSize: 15 }}>Kick the tires. Kill your first SaaS bill.</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "grid", gap: 12 }}>
                  {["2 app builds", "1 live deployment", "barfy AI — limited usage", "barf.app subdomain", "Community support"].map(f => (
                    <li key={f} style={{ display: "flex", gap: 10, color: "var(--fg)", fontSize: 15 }}>
                      <span style={{ color: "var(--primary)" }}>✓</span><span>{f}</span>
                    </li>
                  ))}
                  <li style={{ display: "flex", gap: 10, fontSize: 15 }}>
                    <span style={{ color: "var(--fg-dim)" }}>·</span>
                    <span style={{ fontStyle: "italic", fontSize: 13.5, color: "var(--fg-mute)" }}>App sleeps after inactivity</span>
                  </li>
                </ul>
                <div style={{ marginTop: "auto" }}>
                  <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 28px", borderRadius: 999, fontWeight: 700, fontSize: 16, background: "transparent", color: "var(--fg)", textDecoration: "none", border: "1px solid var(--line-2)", cursor: "pointer" }}>
                    Deploy for free
                  </Link>
                </div>
              </div>

              {/* Always On / featured */}
              <div className="price-card featured reveal delay-2" style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, letterSpacing: "0.16em", color: "var(--fg-mute)", textTransform: "uppercase" }}>Always On</span>
                  <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, letterSpacing: "0.14em", padding: "5px 9px", borderRadius: 5, background: "var(--primary)", color: "var(--primary-ink)", textTransform: "uppercase", fontWeight: 700, boxShadow: "0 0 18px var(--primary-glow)" }}>Waitlist</span>
                </div>
                <div style={{ fontSize: 60, fontWeight: 900, letterSpacing: "-0.04em", margin: "12px 0 4px", lineHeight: 1 }}>
                  $9<span style={{ fontSize: 17, color: "var(--fg-mute)", fontWeight: 500, marginLeft: 4 }}>/mo</span>
                </div>
                <p style={{ color: "var(--fg-mute)", margin: "0 0 26px", fontSize: 15 }}>For founders who run things, not babysit them.</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "grid", gap: 12 }}>
                  {[
                    "10 total builds",
                    "3 apps live simultaneously",
                    <><strong>Always on</strong> — never sleeps</>,
                    <>barfy AI — <strong>unlimited</strong></>,
                    "Custom domain",
                    "Email support + priority deploys",
                  ].map((f, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, color: "var(--fg)", fontSize: 15 }}>
                      <span style={{ color: "var(--primary)" }}>✓</span><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "auto" }}>
                  <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 28px", borderRadius: 999, fontWeight: 700, fontSize: 16, background: "var(--primary)", color: "var(--primary-ink)", textDecoration: "none", boxShadow: "0 0 0 1px var(--primary-glow), 0 8px 30px -8px var(--primary-glow)" }}>
                    Join the waitlist <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            <p className="reveal delay-3" style={{ color: "var(--fg-mute)", fontStyle: "italic", fontSize: 13.5, margin: "24px auto 0", maxWidth: "60ch" }}>
              We&apos;re onboarding Always On users in batches to keep performance tight. Join the list — we&apos;ll reach out within 48 hours.
            </p>
          </div>
        </section>

        <div style={C.container}><div style={C.rule} /></div>

        {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
        <section style={C.sectionPad}>
          <div style={C.container}>
            <div className="section-eyebrow reveal">Honest answers</div>
            <h2 className="reveal delay-1" style={C.h2}>
              Questions founders actually ask.
            </h2>
            <div className="reveal delay-2" style={{ maxWidth: 860, marginTop: 32 }}>
              {FAQS.map(faq => (
                <details key={faq.q} className="faq" open={faq.open}>
                  <summary>
                    {faq.q}
                    <span className="plus">+</span>
                  </summary>
                  <div className="faq-answer">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────────── */}
        <section style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--spark) 100%)", color: "var(--primary-ink)", padding: "110px 0", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.25), transparent 60%)", top: -150, left: "30%", animation: "drift1 14s ease-in-out infinite", pointerEvents: "none" }} />
          <div style={{ ...C.container, position: "relative", zIndex: 2 }}>
            <h2 style={{ fontSize: "clamp(40px, 6vw, 80px)", color: "var(--primary-ink)", maxWidth: "18ch", margin: "0 0 28px", lineHeight: 1.02, fontWeight: 900, letterSpacing: "-0.035em" }}>
              3 minutes from now, you could be running software worth $3,000/year. For free.
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
              <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 28px", borderRadius: 999, fontWeight: 700, fontSize: 16, background: "var(--primary-ink)", color: "var(--primary)", textDecoration: "none", boxShadow: "0 6px 24px -6px rgba(0,0,0,0.4)" }}>
                Deploy your first app — it&apos;s free <span>→</span>
              </Link>
              <Link href="/browse" style={{ color: "var(--primary-ink)", fontWeight: 700, textDecoration: "none", borderBottom: "2px solid color-mix(in oklab, var(--primary-ink) 35%, transparent)", paddingBottom: 2, display: "inline-flex", alignItems: "center", gap: 6 }}>
                See all apps <span>→</span>
              </Link>
            </div>
            <p style={{ fontFamily: "var(--font-geist-mono)", color: "color-mix(in oklab, var(--primary-ink) 70%, transparent)", fontSize: 14, margin: "28px 0 0" }}>
              // no credit card · no servers · no PhD · just barfy and 3 minutes
            </p>
          </div>
        </section>

      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer style={{ background: "color-mix(in oklab, var(--bg) 90%, black)", borderTop: "1px solid var(--line)", padding: "28px 0", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontWeight: 900, letterSpacing: "-0.04em", fontSize: 20, color: "var(--fg)", textDecoration: "none" }}>
            barf<span style={{ color: "var(--primary)", animation: "dotPulse 2.4s var(--ease) infinite", display: "inline-block" }}>.</span>
          </Link>
          <div style={{ display: "flex", gap: 22, fontSize: 14 }}>
            {[["Apps", "/browse"], ["Pricing", "/#pricing"], ["Sign up", "/signup"]].map(([label, href]) => (
              <Link
                key={label}
                href={href!}
                style={{ color: "var(--fg-mute)", textDecoration: "none", transition: "color .2s ease" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-mute)")}
              >
                {label}
              </Link>
            ))}
          </div>
          <div style={{ color: "var(--fg-dim)", fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
            // built for founders done paying the SaaS tax
          </div>
        </div>
      </footer>

      {/* ── Theme picker FAB ──────────────────────────────────────────────── */}
      <div role="group" aria-label="Theme" style={{ position: "fixed", bottom: 22, right: 22, zIndex: 80, background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 999, padding: 8, display: "flex", gap: 6, alignItems: "center", boxShadow: "0 14px 40px -10px rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
        <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, letterSpacing: "0.12em", color: "var(--fg-dim)", padding: "0 8px 0 10px", textTransform: "uppercase" }}>theme</span>
        {(["amber", "cyber", "plasma"] as Theme[]).map(t => (
          <button
            key={t}
            aria-label={t}
            onClick={() => applyTheme(t)}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `2px solid ${theme === t ? "var(--fg)" : "transparent"}`,
              cursor: "pointer", padding: 0,
              background: t === "amber"
                ? "linear-gradient(135deg, #FF6A1A, #FF2E93)"
                : t === "cyber"
                ? "linear-gradient(135deg, #00E0FF, #FF2E93)"
                : "linear-gradient(135deg, #B45CFF, #FFD23F)",
              transition: "transform .25s var(--ease-pop), border-color .2s ease",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = "scale(1.1)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
          />
        ))}
      </div>
    </>
  );
}
