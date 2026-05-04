"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Server, Zap, Lock } from "lucide-react";
import { Nav } from "./components/Nav";
import { GithubIcon } from "./components/GithubIcon";

const CATEGORIES = ["Forms","Analytics","CRM","Automation","Email","Chat","Project Mgmt","Storage"];

const FEATURED = [
  { name: "n8n",        slug: "n8n",        tagline: "Workflow automation at any scale",    replaces: "Zapier",           stars: "45k", license: "Sustainable Use", language: "TypeScript" },
  { name: "Formbricks", slug: "formbricks", tagline: "Open-source survey & form builder",  replaces: "Typeform",         stars: "8k",  license: "AGPL-3.0",       language: "TypeScript" },
  { name: "Plausible",  slug: "plausible",  tagline: "Privacy-first web analytics",        replaces: "Google Analytics", stars: "19k", license: "AGPL-3.0",       language: "Elixir"     },
];

const STEPS = [
  { n: "01", title: "Browse the directory",  body: "Find the open-source alternative to whatever SaaS tool you're paying for. Curated, ranked by stars.",                 icon: <Server className="w-5 h-5" /> },
  { n: "02", title: 'Click "Host This"',     body: "We spin it up on the cloud instantly. Real Docker deployment. Takes under 2 minutes.",                               icon: <Zap    className="w-5 h-5" /> },
  { n: "03", title: "Own it forever",        body: "Your URL. Your data. Your server. Cancel your SaaS subscription and never look back.",                              icon: <Lock   className="w-5 h-5" /> },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#252525]">

      <Nav />

      <main className="flex-1">

        {/* ── Hero — dark purple gradient ────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0c0c0f]">
          {/* glow orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-900/50 rounded-full blur-[140px]" />
            <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-violet-800/25 rounded-full blur-[90px]" />
            <div className="absolute top-1/4 right-1/4 w-[250px] h-[250px] bg-purple-700/20 rounded-full blur-[70px]" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-28 pb-24 flex flex-col items-center text-center gap-7">

            <div className="inline-flex items-center gap-2 rounded-full border border-purple-800/50 bg-purple-950/60 px-3 py-1 text-xs font-mono text-purple-300 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Open Source · Self-Hostable · No Credit Card
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-3xl text-white">
              Stop paying for SaaS.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">
                Own your tools.
              </span>
            </h1>

            <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
              Browse 50+ battle-tested open-source alternatives to the SaaS tools
              draining your bank account. Deploy any of them online in under 2 minutes.
            </p>

            <div className="flex items-center gap-3 flex-wrap justify-center pt-1">
              <Link href="/browse"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-[#252525] font-semibold px-6 py-3 hover:bg-zinc-100 transition-colors text-[15px]">
                Browse Apps
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 text-white font-medium px-6 py-3 hover:bg-white/8 transition-colors text-[15px]">
                How it works
              </Link>
            </div>

            <p className="text-xs text-zinc-500 font-mono">No credit card · Your server · Your data · Forever</p>
          </div>
        </section>

        {/* ── Categories bar ───────────────────────────────────────────────── */}
        <section className="border-b border-[#CFCFCF] bg-[#F8F8F8]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#7D7D7D] shrink-0 mr-2">Browse:</span>
            {CATEGORIES.map((cat) => (
              <Link key={cat} href={`/browse?category=${encodeURIComponent(cat)}`}
                className="shrink-0 inline-flex items-center rounded-full border border-[#CFCFCF] bg-white px-3 py-1 text-xs font-medium text-[#545454] hover:border-[#7D7D7D] hover:text-[#252525] transition-colors">
                {cat}
              </Link>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
          <div className="flex flex-col items-center text-center gap-3 mb-14">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#7D7D7D]">How it works</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Three steps to ownership</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl border border-[#CFCFCF] bg-white p-7 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    {step.icon}
                  </div>
                  <span className="font-mono text-4xl font-bold text-[#CFCFCF] select-none">{step.n}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[17px] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#7D7D7D] leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Featured apps ────────────────────────────────────────────────── */}
        <section className="border-t border-[#CFCFCF] bg-[#F8F8F8]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#7D7D7D]">Featured</span>
                <h2 className="text-3xl font-bold tracking-tight mt-1">Popular alternatives</h2>
              </div>
              <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-medium text-[#545454] hover:text-[#252525] underline underline-offset-4 shrink-0">
                View all apps <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {FEATURED.map((app) => (
                <div key={app.slug} className="rounded-2xl border border-[#CFCFCF] bg-white p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#7D7D7D]">OSS</span>
                    <span className="inline-flex items-center rounded-full bg-[#F0F0F0] px-2.5 py-0.5 text-[11px] font-mono text-[#545454]">
                      vs {app.replaces}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{app.name}</h3>
                    <p className="text-sm text-[#7D7D7D] mt-1">{app.tagline}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#7D7D7D] font-mono">
                    <span>⭐ {app.stars}</span>
                    <span>·</span>
                    <span>{app.license}</span>
                    <span>·</span>
                    <span>{app.language}</span>
                  </div>
                  <Link href={`/browse/${app.slug}`}
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#252525] text-white text-sm font-semibold py-2.5 hover:bg-[#545454] transition-colors">
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
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#7D7D7D]">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, usage-based</h2>
            <p className="text-[#7D7D7D] max-w-md text-sm">A build is one deployment. Pay only for what you use.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { name: "Free",  price: "$0",   period: "",    builds: "10 builds/mo",   model: "Phi-4",         highlight: false },
              { name: "Pro",   price: "$15",  period: "/mo", builds: "30 builds/mo",   model: "GPT-4.1 mini",  highlight: true  },
              { name: "Teams", price: "$99",  period: "/mo", builds: "Unlimited builds",model: "Full models",  highlight: false },
            ].map((tier) => (
              <div key={tier.name} className={`rounded-2xl border p-7 flex flex-col gap-5 ${
                tier.highlight
                  ? "border-purple-300 bg-purple-50"
                  : "border-[#CFCFCF] bg-white"
              }`}>
                {tier.highlight && (
                  <span className="inline-flex self-start rounded-full bg-purple-600 text-white text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wide">Popular</span>
                )}
                <div>
                  <p className="text-sm text-[#7D7D7D] font-medium">{tier.name}</p>
                  <p className="text-4xl font-bold tracking-tight mt-1 text-[#252525]">
                    {tier.price}
                    {tier.period && <span className="text-base font-normal text-[#7D7D7D]">{tier.period}</span>}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-[#545454]">
                  <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> {tier.builds}</li>
                  <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> {tier.model}</li>
                  <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> Self-hosted deployment</li>
                  <li className="flex items-center gap-2"><span className="text-purple-600">✓</span> Your data, your server</li>
                </ul>
                <Link href="/browse"
                  className={`mt-auto inline-flex items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    tier.highlight
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-[#252525] text-white hover:bg-[#545454]"
                  }`}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="border-t border-[#CFCFCF] bg-[#F8F8F8]">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-24 flex flex-col items-center text-center gap-6">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-xl">Ready to own your stack?</h2>
            <p className="text-[#7D7D7D] max-w-sm">Join the movement against OSS-washing. Browse, host, and own.</p>
            <Link href="/browse"
              className="inline-flex items-center gap-2 rounded-xl bg-[#252525] text-white font-semibold px-8 py-3.5 hover:bg-[#545454] transition-colors text-[15px]">
              Browse all alternatives
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </main>

      <footer className="border-t border-[#CFCFCF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/assets/logo.jpg" alt="barf" width={18} height={18} className="rounded-sm" />
            <span className="font-mono text-xs font-bold text-[#7D7D7D]">barf.</span>
            <span className="text-xs text-[#7D7D7D]">© 2025</span>
          </div>
          <div className="flex items-center gap-6">
            {[["Browse", "/browse"], ["Pricing", "#pricing"], ["GitHub", "#"], ["Docs", "#"]].map(([item, href]) => (
              <Link key={item} href={href!}
                className="text-xs text-[#7D7D7D] hover:text-[#252525] transition-colors font-mono uppercase tracking-widest">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
