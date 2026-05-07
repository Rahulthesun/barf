"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Star, Sparkles } from "lucide-react";
import { Nav } from "./components/Nav";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FREE_UNTIL = new Date("2026-05-12T23:59:59");

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountdown() {
  const [time, setTime] = useState({ days: 0, hours: 0 });
  useEffect(() => {
    const compute = () => {
      const ms = FREE_UNTIL.getTime() - Date.now();
      if (ms <= 0) return { days: 0, hours: 0 };
      return {
        days: Math.floor(ms / 86_400_000),
        hours: Math.floor((ms % 86_400_000) / 3_600_000),
      };
    };
    setTime(compute());
    const t = setInterval(() => setTime(compute()), 60_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

// ─────────────────────────────────────────────────────────────────────────────
// FloatingApps
// ─────────────────────────────────────────────────────────────────────────────

type FloatCard = {
  name: string;
  emoji: string;
  sub: string;
  anim: string;
  delay: string;
  top: number;
  side: "left" | "right";
  offset: number;
};

const FLOAT_CARDS: FloatCard[] = [
  { name: "n8n",         emoji: "⚡", sub: "Zapier → $0",             anim: "float-a", delay: "0s",    top: 0,   side: "left",  offset: 0  },
  { name: "Gitea",       emoji: "🐙", sub: "GitHub → $0",             anim: "float-b", delay: "0.3s",  top: 60,  side: "right", offset: 0  },
  { name: "Umami",       emoji: "📊", sub: "Google Analytics → $0",   anim: "float-c", delay: "0.6s",  top: 195, side: "left",  offset: 16 },
  { name: "Vaultwarden", emoji: "🔒", sub: "1Password → $0",          anim: "float-d", delay: "0.9s",  top: 245, side: "right", offset: 8  },
  { name: "Twenty",      emoji: "👥", sub: "HubSpot → $0",            anim: "float-e", delay: "1.2s",  top: 375, side: "left",  offset: 0  },
];

function FloatingApps() {
  return (
    <div className="relative w-[340px] h-[510px] select-none shrink-0">
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-violet-600/20 rounded-full blur-[55px] pointer-events-none"
        style={{ animation: "orb-breathe 12s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-1/4 right-1/3 w-44 h-44 bg-purple-600/15 rounded-full blur-[45px] pointer-events-none"
        style={{ animation: "orb-drift 16s ease-in-out infinite" }}
      />
      {FLOAT_CARDS.map((card, i) => (
        <div
          key={card.name}
          className="absolute w-[158px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex flex-col gap-2.5 shadow-xl shadow-black/20"
          style={{
            top: card.top,
            ...(card.side === "left" ? { left: card.offset } : { right: card.offset }),
            animation: `${card.anim} ${5.5 + i * 0.4}s ease-in-out infinite`,
            animationDelay: card.delay,
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{card.emoji}</span>
            <div>
              <p className="text-white text-[13px] font-bold leading-none">{card.name}</p>
              <p className="text-white/45 text-[10px] mt-0.5">{card.sub}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">deployed</span>
            <span
              className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 rounded-full px-2 py-0.5 border border-emerald-500/30"
              style={{
                animation: "badge-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                animationDelay: card.delay,
              }}
            >
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BarfyMockChat
// ─────────────────────────────────────────────────────────────────────────────

function BarfyMockChat() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 overflow-hidden shadow-xl dark:shadow-black/40 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800">
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">Barfy</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">n8n just went live</span>
          </div>
        </div>
        <span className="ml-auto text-[10px] font-mono text-zinc-300 dark:text-zinc-600 uppercase tracking-widest">AI setup guide</span>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 p-4">
        {/* Barfy opens */}
        <div className="flex gap-2.5 max-w-[90%]">
          <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-zinc-100 dark:bg-zinc-700/70 px-3.5 py-2.5">
            <p className="text-[13px] text-zinc-900 dark:text-zinc-100 leading-relaxed">
              Your n8n is live! 🎉 Head to your URL — first visit triggers the setup wizard. Create your owner account, then <strong>change the default password immediately</strong>.
            </p>
          </div>
        </div>

        {/* User */}
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-tr-sm bg-violet-600 px-3.5 py-2.5 max-w-[82%]">
            <p className="text-[13px] text-white leading-relaxed">
              Done. Now how do I replace my Zapier Stripe → Slack workflow?
            </p>
          </div>
        </div>

        {/* Barfy replies */}
        <div className="flex gap-2.5 max-w-[90%]">
          <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-zinc-100 dark:bg-zinc-700/70 px-3.5 py-2.5">
            <p className="text-[13px] text-zinc-900 dark:text-zinc-100 leading-relaxed">
              Easy. New Workflow → add a <strong>Stripe Trigger</strong> node (event: <code className="text-[11px] font-mono bg-zinc-200/70 dark:bg-zinc-600/50 rounded px-1">customer.created</code>) → connect a <strong>Slack</strong> node → map the name. ~3 minutes.
            </p>
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex gap-2 items-center">
          <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-violet-500" />
          </div>
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700/60 rounded-full px-3 py-2">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600">Barfy is typing</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = ["Automation", "Forms", "Analytics", "CRM", "Email", "Storage", "Auth", "DevOps", "Security", "Project Mgmt"];

const COMPARISON = [
  { saas: "Zapier",       saasPrice: "$49+/mo", oss: "n8n",         ossSlug: "n8n"         },
  { saas: "Typeform",     saasPrice: "$50/mo",  oss: "Formbricks",  ossSlug: "formbricks"  },
  { saas: "HubSpot CRM",  saasPrice: "$20+/mo", oss: "Twenty",      ossSlug: "twenty"      },
  { saas: "1Password",    saasPrice: "$3/user", oss: "Vaultwarden", ossSlug: "vaultwarden" },
  { saas: "GitHub Teams", saasPrice: "$4/user", oss: "Gitea",       ossSlug: "gitea"       },
];

const FEATURED = [
  { name: "n8n",         slug: "n8n",         tagline: "Zapier, but you own it",        replaces: "Zapier",    stars: "45k",  cat: "Automation" },
  { name: "Formbricks",  slug: "formbricks",  tagline: "Typeform, but free forever",    replaces: "Typeform",  stars: "8k",   cat: "Forms"      },
  { name: "Umami",       slug: "umami",       tagline: "GA without the tracking hell",  replaces: "Google Analytics", stars: "19k", cat: "Analytics" },
  { name: "Twenty",      slug: "twenty",      tagline: "HubSpot without the bill",      replaces: "HubSpot",   stars: "24k",  cat: "CRM"        },
  { name: "Vaultwarden", slug: "vaultwarden", tagline: "Bitwarden, self-hosted",        replaces: "1Password", stars: "41k",  cat: "Security"   },
  { name: "Gitea",       slug: "gitea",       tagline: "GitHub, on your server",        replaces: "GitHub",    stars: "44k",  cat: "DevOps"     },
];

const CAT_ACCENT: Record<string, string> = {
  Automation: "from-orange-500/10 to-orange-500/5 border-orange-500/20 dark:border-orange-500/15",
  Forms:      "from-violet-500/10 to-violet-500/5 border-violet-500/20 dark:border-violet-500/15",
  Analytics:  "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 dark:border-emerald-500/15",
  CRM:        "from-pink-500/10 to-pink-500/5 border-pink-500/20 dark:border-pink-500/15",
  Security:   "from-purple-500/10 to-purple-500/5 border-purple-500/20 dark:border-purple-500/15",
  DevOps:     "from-blue-500/10 to-blue-500/5 border-blue-500/20 dark:border-blue-500/15",
};
const DEFAULT_ACCENT = "from-zinc-500/5 to-zinc-500/5 border-zinc-200 dark:border-zinc-800";

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { days, hours } = useCountdown();
  const isUrgent = days > 0 && days <= 7;

  const barfyRef     = useInView();
  const compRef      = useInView();
  const stepsRef     = useInView();
  const featuredRef  = useInView();
  const pricingRef   = useInView();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Nav />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#07070C] noise">
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 left-1/3 w-[800px] h-[600px] bg-violet-950/55 rounded-full blur-[140px]" />
            <div
              className="absolute top-1/2 -translate-y-1/2 left-[10%] w-[420px] h-[420px] bg-purple-900/20 rounded-full blur-[100px]"
              style={{ animation: "orb-breathe 14s ease-in-out infinite" }}
            />
            <div
              className="absolute top-1/3 right-[15%] w-[360px] h-[360px] bg-violet-800/15 rounded-full blur-[80px]"
              style={{ animation: "orb-drift 18s ease-in-out infinite" }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#07070C] to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-20 pb-28">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

              {/* Copy */}
              <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-7 max-w-[560px]">

                {isUrgent ? (
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold text-violet-200 backdrop-blur-sm"
                    style={{
                      border: "1px solid rgba(139, 92, 246, 0.35)",
                      backgroundColor: "rgba(76, 29, 149, 0.25)",
                      animation: "countdown-pulse 2.5s ease-in-out infinite",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    Free for {days}d {hours}h more — no credit card
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-950/50 px-4 py-1.5 text-[11px] font-medium text-violet-300 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    Free until May 12, 2026 — no credit card
                  </div>
                )}

                <h1 className="text-5xl sm:text-6xl lg:text-[64px] font-bold tracking-[-0.03em] leading-[1.04] text-white">
                  You already know n8n beats Zapier.{" "}
                  <span className="gradient-text">You just haven&rsquo;t set it up yet.</span>
                </h1>

                <p className="text-[17px] text-zinc-400 leading-relaxed">
                  barf deploys n8n, Gitea, Vaultwarden, Twenty and 45+ more OSS tools to your cloud server in under 2&nbsp;minutes. No Docker configs. No nginx rewrites. No 3am debugging sessions.
                </p>

                <div className="flex items-center gap-3 flex-wrap justify-center lg:justify-start">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 transition-colors text-[15px] shadow-lg shadow-violet-500/25"
                  >
                    Deploy free now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/browse"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 text-white/80 font-medium px-6 py-3 hover:bg-white/5 hover:border-white/25 transition-all text-[15px]"
                  >
                    Browse apps
                  </Link>
                </div>

                <div className="flex items-center gap-5 text-[11px] flex-wrap justify-center lg:justify-start">
                  {["Docker-native deploys", "Runs on your own VPS", "Free until May 12"].map((item) => (
                    <span key={item} className="flex items-center gap-1.5 text-zinc-400">
                      <Check className="w-3 h-3 text-zinc-600" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Floating cards — desktop only */}
              <div className="hidden lg:flex justify-center items-start">
                <FloatingApps />
              </div>
            </div>
          </div>
        </section>

        {/* ── Category pills ───────────────────────────────────────────────── */}
        <section className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-semibold font-mono uppercase tracking-widest text-zinc-400 shrink-0 mr-1">Browse:</span>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/browse?category=${encodeURIComponent(cat)}`}
                className="shrink-0 inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Barfy ────────────────────────────────────────────────────────── */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 bg-violet-50/40 dark:bg-violet-950/10">
          <div
            ref={barfyRef.ref}
            className={`max-w-7xl mx-auto px-4 sm:px-8 py-24 transition-all duration-700 ${
              barfyRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

              {/* Copy */}
              <div className="flex-1 flex flex-col gap-6 max-w-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shadow-violet-500/30">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400">Introducing Barfy</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Your app&rsquo;s personal setup guide. Built in.
                </h2>

                <p className="text-[16px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  The moment your app is live, Barfy pops up and walks you through everything — first login, initial config, the workflows that actually matter. Like having a friend who&rsquo;s set up every app before.
                </p>

                <ul className="flex flex-col gap-3.5">
                  {[
                    "Knows every app in the catalog — credentials, first steps, gotchas",
                    "Conversational, not a wall of docs — ask anything, get a real answer",
                    "Stays open while you work — no switching to a browser tab with docs",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-zinc-700 dark:text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <p className="text-[13px] text-zinc-400 dark:text-zinc-600 italic">
                  Reading docs for 10 new apps is painful. Barfy eliminates that.
                </p>
              </div>

              {/* Mock chat */}
              <div className="flex-1 flex justify-center lg:justify-end w-full">
                <BarfyMockChat />
              </div>
            </div>
          </div>
        </section>

        {/* ── Comparison ───────────────────────────────────────────────────── */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
          <div
            ref={compRef.ref}
            className={`max-w-4xl mx-auto px-4 sm:px-8 py-24 transition-all duration-700 ${
              compRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex flex-col items-center text-center gap-2 mb-12">
              <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400">The math</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Your SaaS bill vs. barf</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-[15px] max-w-sm">
                Same tools you already know. Deployed in 2 minutes. Free forever.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <th className="text-left px-6 py-3 text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">Tool</th>
                      <th className="text-center px-6 py-3 text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">SaaS price</th>
                      <th className="text-center px-6 py-3 text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">OSS alternative</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">With barf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row, i) => (
                      <tr
                        key={row.saas}
                        className={i < COMPARISON.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800/60" : ""}
                      >
                        <td className="px-6 py-4 text-[14px] font-medium text-zinc-700 dark:text-zinc-300">{row.saas}</td>
                        <td className="px-6 py-4 text-[13px] font-semibold text-red-500 dark:text-red-400 font-mono text-center">{row.saasPrice}</td>
                        <td className="px-6 py-4 text-center">
                          <Link href={`/browse/${row.ossSlug}`} className="text-[14px] font-semibold text-violet-600 dark:text-violet-400 hover:underline">
                            {row.oss}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-[13px] font-bold text-emerald-600 dark:text-emerald-400 font-mono text-right">$0</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/20 border-t border-emerald-200 dark:border-emerald-900/40">
                      <td className="px-6 py-4 text-[13px] font-bold text-zinc-900 dark:text-zinc-100">Your savings</td>
                      <td className="px-6 py-4 text-[14px] font-bold text-red-500 dark:text-red-400 font-mono text-center">~$163/mo</td>
                      <td className="px-6 py-4 text-[13px] text-zinc-400 dark:text-zinc-500 text-center">all of the above</td>
                      <td className="px-6 py-4 text-[14px] font-bold text-emerald-600 dark:text-emerald-400 font-mono text-right">$0</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <p className="text-center text-[12px] text-zinc-400 dark:text-zinc-600 mt-4">
              That&rsquo;s <strong className="text-zinc-600 dark:text-zinc-400">$1,956/year</strong> back in your pocket.
            </p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section>
          <div
            ref={stepsRef.ref}
            id="how-it-works"
            className={`max-w-7xl mx-auto px-4 sm:px-8 py-24 transition-all duration-700 ${
              stepsRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex flex-col items-center text-center gap-2 mb-16">
              <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400">How it works</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">From &ldquo;I should do this&rdquo; to live in 2 minutes</h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-xs text-[15px]">We handle the infra. You just pick the app.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  emoji: "🔍",
                  n: "01",
                  title: "Pick your tool",
                  body: "Browse 50+ curated OSS apps — n8n, Gitea, Vaultwarden, you know them. Find the one you've been meaning to deploy.",
                },
                {
                  emoji: "⚡",
                  n: "02",
                  title: "Click Deploy",
                  body: "We provision the server, handle Docker, configure SSL, and set up your domain. You don't touch a config file.",
                },
                {
                  emoji: "🤖",
                  n: "03",
                  title: "Barfy walks you in",
                  body: "The moment it's live, Barfy pops up and guides you through first login, setup, and your first real workflow.",
                },
              ].map((step, i) => (
                <div
                  key={step.n}
                  className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 flex flex-col gap-5 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{step.emoji}</span>
                    <span className="font-mono text-[42px] font-bold text-zinc-100 dark:text-zinc-800 select-none leading-none">{step.n}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold text-[16px] text-zinc-900 dark:text-zinc-100">{step.title}</h3>
                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.body}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden sm:block absolute -right-3 top-10 w-6 h-px bg-zinc-200 dark:bg-zinc-800 z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured apps ────────────────────────────────────────────────── */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
          <div
            ref={featuredRef.ref}
            className={`max-w-7xl mx-auto px-4 sm:px-8 py-24 transition-all duration-700 ${
              featuredRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400">Most deployed</span>
                <h2 className="text-3xl font-bold tracking-tight mt-1.5">The ones people actually switch to</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-[14px] mt-1">Each one replaces a SaaS you&rsquo;re already paying for.</p>
              </div>
              <Link
                href="/browse"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors shrink-0"
              >
                View all 50+ apps
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURED.map((app) => {
                const accent = CAT_ACCENT[app.cat] ?? DEFAULT_ACCENT;
                return (
                  <Link
                    key={app.slug}
                    href={`/browse/${app.slug}`}
                    className={`group relative rounded-2xl border bg-gradient-to-br p-6 flex flex-col gap-4 hover:shadow-lg dark:hover:shadow-zinc-900 transition-all card-glow ${accent}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{app.name}</h3>
                        <p className="text-[13px] text-zinc-600 dark:text-zinc-400 mt-0.5 font-medium">{app.tagline}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center rounded-full bg-zinc-900/8 dark:bg-white/8 border border-zinc-900/8 dark:border-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        vs {app.replaces}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {app.stars}
                      </span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">$0/mo forever</span>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-zinc-900/6 dark:border-white/6">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide font-mono">{app.cat}</span>
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet-600 dark:text-violet-400 group-hover:gap-2 transition-all">
                        Deploy free <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section>
          <div
            ref={pricingRef.ref}
            id="pricing"
            className={`max-w-7xl mx-auto px-4 sm:px-8 py-24 transition-all duration-700 ${
              pricingRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex flex-col items-center text-center gap-2 mb-10">
              <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400">Pricing</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, usage-based</h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-sm text-[14px]">One deploy = one hosted instance. Pay only for what you use.</p>
            </div>

            <div className="max-w-3xl mx-auto mb-10">
              <div className="relative rounded-2xl overflow-hidden border border-violet-300/40 dark:border-violet-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/8 via-purple-600/8 to-violet-600/8" />
                <div className="relative flex flex-col sm:flex-row items-center gap-4 px-6 py-5 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
                    <span className="text-xl">🎁</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">Everything free until May 12, 2026</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Unlimited deploys, no limits. Post-launch the plans below apply.</p>
                  </div>
                  <Link
                    href="/signup"
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 text-sm transition-colors shadow-sm"
                  >
                    Deploy free now
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {[
                {
                  name: "Free",
                  price: "$0",
                  period: "",
                  desc: "For solo hackers spinning up their first tools",
                  features: ["10 deploys/month", "Barfy AI onboarding", "Community support"],
                  highlight: false,
                },
                {
                  name: "Pro",
                  price: "$15",
                  period: "/mo",
                  desc: "For founders replacing their whole SaaS stack",
                  features: ["30 deploys/month", "Barfy with smarter models", "Priority support", "Early access to new apps"],
                  highlight: true,
                },
                {
                  name: "Teams",
                  price: "$99",
                  period: "/mo",
                  desc: "For small teams who all hate their SaaS bills",
                  features: ["Unlimited deploys", "Full AI models for Barfy", "Dedicated support", "SLA + custom terms"],
                  highlight: false,
                },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-2xl border p-7 flex flex-col gap-6 transition-all ${
                    tier.highlight
                      ? "border-violet-400/60 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-950/20 shadow-lg shadow-violet-500/10"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  }`}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-violet-600 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wide shadow-sm">
                        Most popular
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-mono">{tier.name}</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{tier.price}</span>
                      {tier.period && <span className="text-sm text-zinc-400 dark:text-zinc-500">{tier.period}</span>}
                    </div>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-1.5">{tier.desc}</p>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] text-zinc-700 dark:text-zinc-300">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          tier.highlight ? "bg-violet-100 dark:bg-violet-900/50" : "bg-zinc-100 dark:bg-zinc-800"
                        }`}>
                          <Check className={`w-2.5 h-2.5 ${tier.highlight ? "text-violet-600 dark:text-violet-400" : "text-zinc-500"}`} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-colors ${
                      tier.highlight
                        ? "bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
                        : "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900"
                    }`}
                  >
                    Get started free
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-zinc-800 bg-[#07070C] noise">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-950/55 rounded-full blur-[120px]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-28 flex flex-col items-center text-center gap-6">
            <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-violet-400">
              You&rsquo;ve been putting this off long enough
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.02em] max-w-lg text-white leading-tight">
              Stop paying for Zapier.{" "}
              <span className="gradient-text">Actually deploy n8n today.</span>
            </h2>
            <p className="text-zinc-400 max-w-sm text-[15px]">
              2 minutes. No Docker configs. Barfy walks you through the rest. Free until May 12.
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-4 transition-colors text-[16px] shadow-lg shadow-violet-500/30"
              >
                Deploy free now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 text-white/80 font-medium px-8 py-4 hover:bg-white/5 hover:border-white/25 transition-all text-[16px]"
              >
                Browse apps first
              </Link>
            </div>
            <p className="text-[12px] text-zinc-600">No credit card. Runs on your own VPS. Cancel SaaS, keep your data.</p>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm overflow-hidden ring-1 ring-zinc-800">
              <Image src="/assets/logo.jpg" alt="barf" width={20} height={20} className="object-cover" />
            </div>
            <span className="font-mono text-xs font-bold text-zinc-500">barf.</span>
            <span className="text-xs text-zinc-700">© 2026</span>
          </div>
          <nav className="flex items-center gap-6">
            {[["Browse", "/browse"], ["Pricing", "/#pricing"], ["Sign up", "/signup"]].map(([label, href]) => (
              <Link
                key={label}
                href={href!}
                className="text-[11px] font-mono uppercase tracking-widest text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
