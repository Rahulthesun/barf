"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2, ChevronRight, Star } from "lucide-react";
import { GithubIcon } from "../components/GithubIcon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const CATEGORIES = [
  "All",
  "Forms",
  "Analytics",
  "CRM",
  "Automation",
  "Email",
  "Chat",
  "Project Mgmt",
  "Storage",
  "Auth",
  "Payments",
  "Monitoring",
];

interface OssApp {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  replaces: string;
  github_url: string;
  website_url: string;
  stars: number;
  license: string;
  language: string;
  logo_url: string | null;
  has_docker: boolean;
  self_hostable: boolean;
  featured: boolean;
  features: string[];
}

function AppCard({ app }: { app: OssApp }) {
  const dotColor: Record<string, string> = {
    Forms: "bg-violet-400",
    Analytics: "bg-emerald-400",
    Automation: "bg-orange-400",
    Email: "bg-blue-400",
    CRM: "bg-pink-400",
    Chat: "bg-cyan-400",
    "Project Mgmt": "bg-yellow-400",
    Storage: "bg-slate-400",
    Auth: "bg-indigo-400",
    Payments: "bg-green-400",
    Monitoring: "bg-red-400",
  };

  return (
    <Link
      href={`/browse/${app.slug}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 gap-4 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-sm transition-all"
    >
      {/* top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {app.logo_url ? (
            <img src={app.logo_url} alt={app.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0 font-mono">
              {app.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-[15px] leading-none">{app.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor[app.category] ?? "bg-zinc-400"}`} />
              <span className="text-[11px] font-mono text-zinc-400">{app.category}</span>
            </div>
          </div>
        </div>
        {app.replaces && (
          <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-500 shrink-0">
            vs {app.replaces}
          </span>
        )}
      </div>

      {/* tagline */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 flex-1">
        {app.tagline}
      </p>

      {/* meta */}
      <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
        {app.stars > 0 && (
          <>
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3" />
              {app.stars >= 1000 ? `${(app.stars / 1000).toFixed(0)}k` : app.stars}
            </span>
            <span>·</span>
          </>
        )}
        {app.license && <span>{app.license}</span>}
        {app.language && (
          <>
            <span>·</span>
            <span>{app.language}</span>
          </>
        )}
      </div>

      {/* cta */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors font-medium">
          View details
        </span>
        <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 gap-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-2.5 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="flex gap-2">
        <div className="h-2.5 w-12 rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-2.5 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCategory = searchParams.get("category") ?? "All";
  const initialSearch = searchParams.get("q") ?? "";

  const [apps, setApps] = useState<OssApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category && category !== "All") params.set("category", category);
      const res = await fetch(`${API}/api/apps?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setApps(data.apps ?? []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (category !== "All") params.set("category", category);
    const qs = params.toString();
    router.replace(`/browse${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [debouncedSearch, category, router]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50">

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/assets/logo.jpg" alt="barf" width={22} height={22} className="rounded-sm object-contain" />
            <span className="font-mono text-sm font-bold tracking-tight">barf.</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            {[["Browse", "/browse"], ["Pricing", "/#pricing"], ["Docs", "#"]].map(([label, href]) => (
              <Link key={label} href={href}
                className={`text-sm transition-colors ${label === "Browse"
                  ? "text-zinc-900 dark:text-zinc-50 font-medium"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                }`}>
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
            <Link href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm font-medium px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              My Deployments
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Header + search ───────────────────────────────────────────────── */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-6 flex flex-col gap-5">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Browse alternatives</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1.5">
                {loading ? "Loading apps…" : `${apps.length} open-source alternatives. Host any of them in under 2 minutes.`}
              </p>
            </div>

            {/* search */}
            <div className="relative max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, replaces, category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-10 pr-4 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              {loading && debouncedSearch && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />
              )}
            </div>

            {/* category pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                    category === cat
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <div className="text-4xl">🔍</div>
              <h3 className="text-lg font-semibold">No apps found</h3>
              <p className="text-sm text-zinc-500 max-w-xs">
                {debouncedSearch
                  ? `No results for "${debouncedSearch}" in ${category === "All" ? "all categories" : category}.`
                  : `No apps in this category yet.`}
              </p>
              <button
                onClick={() => { setSearch(""); setCategory("All"); }}
                className="text-sm text-emerald-600 dark:text-emerald-400 underline underline-offset-4 hover:no-underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app) => <AppCard key={app.id} app={app} />)}
            </div>
          )}
        </div>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-zinc-400">barf. © 2025</span>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            ← Back to home
          </Link>
        </div>
      </footer>

    </div>
  );
}
