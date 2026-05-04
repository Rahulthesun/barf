"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Star, ArrowUpRight } from "lucide-react";
import { GithubIcon } from "../components/GithubIcon";
import { AppIcon } from "../components/AppIcon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const CATEGORIES = [
  "All", "Forms", "Analytics", "CRM", "Automation", "Email",
  "Chat", "Project Mgmt", "Storage", "Auth", "DevOps", "Security",
];

const CAT_COLOR: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Forms:         { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-200", dot: "bg-violet-400" },
  Analytics:     { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", dot: "bg-emerald-400" },
  Automation:    { bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-200", dot: "bg-orange-400" },
  Email:         { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200", dot: "bg-blue-400" },
  CRM:           { bg: "bg-pink-50",    text: "text-pink-600",    border: "border-pink-200", dot: "bg-pink-400" },
  Chat:          { bg: "bg-cyan-50",    text: "text-cyan-600",    border: "border-cyan-200", dot: "bg-cyan-400" },
  "Project Mgmt":{ bg: "bg-yellow-50", text: "text-yellow-700",  border: "border-yellow-200", dot: "bg-yellow-400" },
  Storage:       { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200", dot: "bg-slate-400" },
  Auth:          { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-200", dot: "bg-indigo-400" },
  DevOps:        { bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200", dot: "bg-red-400" },
  Security:      { bg: "bg-purple-50",  text: "text-purple-600",  border: "border-purple-200", dot: "bg-purple-400" },
  Monitoring:    { bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200", dot: "bg-red-400" },
};

const DEFAULT_COLOR = { bg: "bg-zinc-50", text: "text-zinc-600", border: "border-zinc-200", dot: "bg-zinc-400" };

interface OssApp {
  id: string; name: string; slug: string; tagline: string;
  description: string; category: string; replaces: string;
  github_url: string; website_url: string; stars: number;
  license: string; language: string; logo_url: string | null;
  si_slug: string | null; has_docker: boolean;
  self_hostable: boolean; featured: boolean; features: string[];
}

function fmtStars(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
}

function AppCard({ app }: { app: OssApp }) {
  const c = CAT_COLOR[app.category] ?? DEFAULT_COLOR;

  return (
    <Link
      href={`/browse/${app.slug}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-zinc-100 p-5 gap-3.5 hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
      {/* top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* icon */}
          <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center shrink-0`}>
            {app.logo_url
              ? <img src={app.logo_url} alt={app.name} className="w-6 h-6 object-contain rounded" />
              : <AppIcon siSlug={app.si_slug} appSlug={app.slug} fallbackLetter={app.name.charAt(0)} size={20} className={c.text} />
            }
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[15px] text-zinc-900 leading-tight truncate">{app.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
              <span className="text-[11px] font-medium text-zinc-400 truncate">{app.category}</span>
            </div>
          </div>
        </div>

        {/* vs badge */}
        {app.replaces && (
          <span className="shrink-0 text-[11px] font-semibold bg-zinc-900 text-white rounded-full px-2.5 py-1 leading-none">
            vs {app.replaces}
          </span>
        )}
      </div>

      {/* tagline */}
      <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-2 flex-1">
        {app.tagline}
      </p>

      {/* footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
          {app.stars > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {fmtStars(app.stars)}
            </span>
          )}
          {app.license && <><span>·</span><span>{app.license}</span></>}
          {app.language && <><span>·</span><span>{app.language}</span></>}
        </div>
        <ArrowUpRight className="w-4 h-4 text-zinc-200 group-hover:text-zinc-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-zinc-100 p-5 gap-3.5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-100" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-28 rounded bg-zinc-100" />
          <div className="h-2.5 w-16 rounded bg-zinc-100" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-full rounded bg-zinc-100" />
        <div className="h-3 w-3/4 rounded bg-zinc-100" />
      </div>
      <div className="flex gap-2">
        <div className="h-2.5 w-10 rounded bg-zinc-100" />
        <div className="h-2.5 w-14 rounded bg-zinc-100" />
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [apps, setApps] = useState<OssApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "All");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 280);
    return () => clearTimeout(t);
  }, [search]);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category !== "All") params.set("category", category);
      const res = await fetch(`${API}/api/apps?${params}`);
      const data = await res.json();
      setApps(data.apps ?? []);
    } catch { setApps([]); }
    finally { setLoading(false); }
  }, [debouncedSearch, category]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (category !== "All") params.set("category", category);
    const qs = params.toString();
    router.replace(`/browse${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [debouncedSearch, category, router]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/assets/logo.jpg" alt="barf" width={22} height={22} className="rounded-sm object-contain" />
            <span className="font-mono text-sm font-bold tracking-tight">barf.</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            {(["Browse", "Pricing", "Docs"] as const).map((label) => (
              <Link key={label} href={label === "Browse" ? "/browse" : label === "Pricing" ? "/#pricing" : "#"}
                className={`text-sm transition-colors ${label === "Browse" ? "text-zinc-900 font-semibold" : "text-zinc-400 hover:text-zinc-900"}`}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="https://github.com" target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-900 transition-colors px-2 py-1">
              <GithubIcon className="w-4 h-4" /> Star
            </Link>
            <Link href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 text-zinc-700 text-sm font-medium px-3.5 py-2 hover:bg-zinc-50 transition-colors">
              My Deployments
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Search hero ── */}
        <div className="border-b border-zinc-100 bg-zinc-50/60">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-12 pb-8 flex flex-col items-center gap-6 text-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Find your OSS alternative</h1>
              <p className="text-zinc-400 text-[15px] mt-2">
                {loading ? "Loading…" : `${apps.length} open-source apps · deploy any in under 2 minutes`}
              </p>
            </div>

            {/* search */}
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search apps, or what they replace…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white shadow-sm pl-11 pr-5 py-3.5 text-[15px] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
              />
              {loading && debouncedSearch && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />
              )}
            </div>

            {/* category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full justify-center flex-wrap">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                const c = CAT_COLOR[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                      active
                        ? c
                          ? `${c.bg} ${c.text} ${c.border}`
                          : "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <p className="text-5xl">🔍</p>
              <h3 className="text-lg font-bold">No results</h3>
              <p className="text-sm text-zinc-400 max-w-xs">
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}"${category !== "All" ? ` in ${category}` : ""}.`
                  : `No apps in this category yet.`}
              </p>
              <button
                onClick={() => { setSearch(""); setCategory("All"); }}
                className="text-sm font-medium text-zinc-900 underline underline-offset-4 hover:no-underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {apps.map((app) => <AppCard key={app.id} app={app} />)}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-100 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-zinc-300">barf. © 2025</span>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">← Home</Link>
        </div>
      </footer>
    </div>
  );
}
