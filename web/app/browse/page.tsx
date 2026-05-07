"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Star, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { Nav } from "../components/Nav";
import { AppIcon } from "../components/AppIcon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const CATEGORIES = [
  "All", "Forms", "Analytics", "CRM", "Automation", "Email",
  "Chat", "Project Mgmt", "Storage", "Auth", "DevOps", "Security",
];

const CAT_COLORS: Record<string, { dot: string }> = {
  Forms:          { dot: "bg-violet-500" },
  Analytics:      { dot: "bg-emerald-500" },
  CRM:            { dot: "bg-pink-500" },
  Automation:     { dot: "bg-orange-500" },
  Email:          { dot: "bg-blue-500" },
  Chat:           { dot: "bg-cyan-500" },
  "Project Mgmt": { dot: "bg-yellow-500" },
  Storage:        { dot: "bg-slate-500" },
  Auth:           { dot: "bg-indigo-500" },
  DevOps:         { dot: "bg-red-500" },
  Security:       { dot: "bg-purple-500" },
};

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
  const dot = CAT_COLORS[app.category]?.dot ?? "bg-zinc-400";
  return (
    <Link
      href={`/browse/${app.slug}`}
      className="group flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md dark:hover:shadow-zinc-900 transition-all card-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
            {app.logo_url
              ? <img src={app.logo_url} alt={app.name} className="w-6 h-6 object-contain rounded-md" />
              : <AppIcon siSlug={app.si_slug} appSlug={app.slug} fallbackLetter={app.name.charAt(0)} size={20} className="text-zinc-500 dark:text-zinc-400" />
            }
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[14px] text-zinc-900 dark:text-zinc-100 leading-snug truncate">{app.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
              <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 truncate">{app.category}</p>
            </div>
          </div>
        </div>

        {app.replaces && (
          <span className="shrink-0 text-[10px] font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full px-2.5 py-1 leading-none uppercase tracking-wide">
            vs {app.replaces}
          </span>
        )}
      </div>

      <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 flex-1">
        {app.tagline}
      </p>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
          {app.stars > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {fmtStars(app.stars)}
            </span>
          )}
          {app.license && <><span>·</span><span>{app.license}</span></>}
          {app.language && <><span>·</span><span>{app.language}</span></>}
        </div>
        <ArrowUpRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-violet-500 dark:group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 gap-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-24 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-2.5 w-14 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-3 w-3/4 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="flex gap-2">
        <div className="h-2.5 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-2.5 w-12 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

function BrowseContent() {
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

  const featured = apps.filter(a => a.featured);
  const regular  = apps.filter(a => !a.featured);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Nav />

      <main className="flex-1">
        {/* Search hero */}
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-12 pb-8 flex flex-col items-center gap-6 text-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">
                Find your OSS alternative
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-[14px] mt-2.5">
                {loading
                  ? "Loading apps…"
                  : `${apps.length} open-source apps · deploy any in under 2 minutes`}
              </p>
            </div>

            {/* Search bar */}
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search apps, or what they replace…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 shadow-sm pl-11 pr-5 py-3 text-[14px] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition-all"
              />
              {loading && debouncedSearch && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full justify-center flex-wrap">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                const dot = CAT_COLORS[cat]?.dot;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border transition-all ${
                      active
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                        : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    {dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white dark:bg-zinc-900" : dot}`} />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <div className="text-5xl">🔍</div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No results</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}"${category !== "All" ? ` in ${category}` : ""}.`
                  : "No apps in this category yet."}
              </p>
              <button
                onClick={() => { setSearch(""); setCategory("All"); }}
                className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                Clear filters →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Featured section */}
              {featured.length > 0 && !debouncedSearch && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400">Featured</span>
                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {featured.map((app) => <AppCard key={app.id} app={app} />)}
                  </div>
                </div>
              )}

              {/* All / search results */}
              <div>
                {featured.length > 0 && !debouncedSearch && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-600">All apps</span>
                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {(debouncedSearch ? apps : regular).map((app) => <AppCard key={app.id} app={app} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-auto bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold text-zinc-400 dark:text-zinc-600">barf. © 2026</span>
          <Link href="/" className="text-[11px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">← Home</Link>
        </div>
      </footer>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}
