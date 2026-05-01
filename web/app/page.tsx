"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Server, Zap, Lock } from "lucide-react";
import { GithubIcon } from "./components/GithubIcon";

const CATEGORIES = ["Forms","Analytics","CRM","Automation","Email","Chat","Project Mgmt","Storage"];

const FEATURED = [
  {
    name: "n8n",
    slug: "n8n",
    tagline: "Workflow automation at any scale",
    replaces: "Zapier",
    stars: "45k",
    license: "Sustainable Use",
    language: "TypeScript",
    category: "Automation",
    color: "from-orange-500/10 to-orange-500/5",
    dot: "bg-orange-400",
  },
  {
    name: "Formbricks",
    slug: "formbricks",
    tagline: "Open-source survey & form builder",
    replaces: "Typeform",
    stars: "8k",
    license: "AGPL-3.0",
    language: "TypeScript",
    category: "Forms",
    color: "from-violet-500/10 to-violet-500/5",
    dot: "bg-violet-400",
  },
  {
    name: "Plausible",
    slug: "plausible",
    tagline: "Privacy-first web analytics",
    replaces: "Google Analytics",
    stars: "19k",
    license: "AGPL-3.0",
    language: "Elixir",
    category: "Analytics",
    color: "from-emerald-500/10 to-emerald-500/5",
    dot: "bg-emerald-400",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Browse the directory",
    body: "Find the open-source alternative to whatever SaaS tool you're paying for. Curated, ranked by stars.",
    icon: <Server className="w-5 h-5" />,
  },
  {
    n: "02",
    title: 'Click "Host This"',
    body: "We spin it up on the cloud instantly. Real Docker deployment. Takes under 2 minutes.",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    n: "03",
    title: "Own it forever",
    body: "Your URL. Your data. Your server. Cancel your SaaS subscription and never look back.",
    icon: <Lock className="w-5 h-5" />,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/assets/logo.jpg" alt="barf" width={22} height={22} className="rounded-sm object-contain" />
            <span className="font-mono text-sm font-bold tracking-tight">barf.</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            {[["Browse", "/browse"], ["Pricing", "#pricing"], ["Docs", "#"]].map(([label, href]) => (
              <Link key={label} href={href} className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="https://github.com" target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors px-2 py-1">
              <GithubIcon className="w-4 h-4" />
              Star
            </Link>
            <Link href="/browse"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 text-sm font-medium px-4 py-2 hover:opacity-90 transition-opacity">
              Browse Apps
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-20 flex flex-col items-center text-center gap-6">

          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-xs font-mono text-zinc-500 dark:text-zinc-400 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Open Source · Self-Hostable · No Credit Card
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Stop paying for{" "}
            <span className="relative inline-block">
              SaaS.
              <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-emerald-500 rounded-full" />
            </span>
            <br />
            <span className="text-zinc-400 dark:text-zinc-500">Own your tools.</span>
          </h1>

          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
            Browse 50+ battle-tested open-source alternatives to the SaaS tools
            draining your bank account. Deploy any of them online in under 2 minutes.
          </p>

          <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
            <Link href="/browse"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-semibold px-6 py-3 hover:opacity-90 transition-opacity text-[15px]">
              Browse Apps
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium px-6 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-[15px]">
              How it works
            </Link>
          </div>

          <p className="text-xs text-zinc-400 font-mono">
            No credit card · Your server · Your data · Forever
          </p>
        </section>

        {/* ── Categories bar ───────────────────────────────────────────────── */}
        <section className="border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 shrink-0 mr-2">Browse:</span>
            {CATEGORIES.map((cat) => (
              <Link key={cat} href={`/browse?category=${encodeURIComponent(cat)}`}
                className="shrink-0 inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                {cat}
              </Link>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
          <div className="flex flex-col items-center text-center gap-3 mb-14">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">How it works</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Three steps to ownership</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    {step.icon}
                  </div>
                  <span className="font-mono text-4xl font-bold text-zinc-100 dark:text-zinc-800 select-none">{step.n}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[17px] mb-2">{step.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Featured apps ────────────────────────────────────────────────── */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">Featured</span>
                <h2 className="text-3xl font-bold tracking-tight mt-1">Popular alternatives</h2>
              </div>
              <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4 shrink-0">
                View all apps <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {FEATURED.map((app) => (
                <div key={app.slug} className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-b ${app.color} p-6 flex flex-col gap-4 group`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${app.dot}`} />
                      <span className="font-mono text-xs text-zinc-500">{app.category}</span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-500">
                      vs {app.replaces}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{app.name}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{app.tagline}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                    <span>⭐ {app.stars}</span>
                    <span>·</span>
                    <span>{app.license}</span>
                    <span>·</span>
                    <span>{app.language}</span>
                  </div>

                  <Link href={`/browse/${app.slug}`}
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity">
                    Host This
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
          <div className="flex flex-col items-center text-center gap-3 mb-14">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, usage-based</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md text-sm">A build is one deployment. Pay only for what you use.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { name: "Free", price: "$0", builds: "10 builds/mo", model: "Phi-4", highlight: false },
              { name: "Pro",  price: "$15", period: "/mo", builds: "30 builds/mo", model: "GPT-4.1 mini", highlight: true },
              { name: "Teams", price: "$99", period: "/mo", builds: "Unlimited builds", model: "Full models", highlight: false },
            ].map((tier) => (
              <div key={tier.name} className={`rounded-2xl border p-7 flex flex-col gap-5 ${
                tier.highlight
                  ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/5"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}>
                {tier.highlight && (
                  <span className="inline-flex self-start rounded-full bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wide">Popular</span>
                )}
                <div>
                  <p className="text-sm text-zinc-500 font-medium">{tier.name}</p>
                  <p className="text-4xl font-bold tracking-tight mt-1">
                    {tier.price}
                    {tier.period && <span className="text-base font-normal text-zinc-400">{tier.period}</span>}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {tier.builds}</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {tier.model}</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Self-hosted deployment</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Your data, your server</li>
                </ul>
                <Link href="/browse"
                  className={`mt-auto inline-flex items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
                    tier.highlight
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900"
                  }`}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-24 flex flex-col items-center text-center gap-6">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-xl">
              Ready to own your stack?
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
              Join the movement against OSS-washing. Browse, host, and own.
            </p>
            <Link href="/browse"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-semibold px-8 py-3.5 hover:opacity-90 transition-opacity text-[15px]">
              Browse all alternatives
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/assets/logo.jpg" alt="barf" width={18} height={18} className="rounded-sm" />
            <span className="font-mono text-xs font-bold text-zinc-400">barf.</span>
            <span className="text-xs text-zinc-400">© 2025</span>
          </div>
          <div className="flex items-center gap-6">
            {["Browse", "Pricing", "GitHub", "Docs"].map((item) => (
              <Link key={item} href={item === "Browse" ? "/browse" : "#"}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors font-mono uppercase tracking-widest">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
