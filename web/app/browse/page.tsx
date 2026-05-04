"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Star, ArrowUpRight } from "lucide-react";
import { Nav } from "../components/Nav";
import { AppIcon } from "../components/AppIcon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const CATEGORIES = [
  "All", "Forms", "Analytics", "CRM", "Automation", "Email",
  "Chat", "Project Mgmt", "Storage", "Auth", "DevOps", "Security",
];

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
  return (
    <Link
      href={`/browse/${app.slug}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-[#CFCFCF] p-5 gap-3.5 hover:border-[#7D7D7D] hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] border border-[#CFCFCF] flex items-center justify-center shrink-0">
            {app.logo_url
              ? <img src={app.logo_url} alt={app.name} className="w-6 h-6 object-contain rounded" />
              : <AppIcon siSlug={app.si_slug} appSlug={app.slug} fallbackLetter={app.name.charAt(0)} size={20} className="text-[#545454]" />
            }
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[15px] text-[#252525] leading-tight truncate">{app.name}</p>
            <p className="text-[11px] font-medium text-[#7D7D7D] mt-0.5 truncate">{app.category}</p>
          </div>
        </div>

        {app.replaces && (
          <span className="shrink-0 text-[11px] font-semibold bg-[#252525] text-white rounded-full px-2.5 py-1 leading-none">
            vs {app.replaces}
          </span>
        )}
      </div>

      <p className="text-[13px] text-[#7D7D7D] leading-relaxed line-clamp-2 flex-1">
        {app.tagline}
      </p>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-[11px] text-[#7D7D7D] font-mono">
          {app.stars > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {fmtStars(app.stars)}
            </span>
          )}
          {app.license && <><span>·</span><span>{app.license}</span></>}
          {app.language && <><span>·</span><span>{app.language}</span></>}
        </div>
        <ArrowUpRight className="w-4 h-4 text-[#CFCFCF] group-hover:text-[#545454] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[#CFCFCF] p-5 gap-3.5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F0F0F0]" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-28 rounded bg-[#F0F0F0]" />
          <div className="h-2.5 w-16 rounded bg-[#F0F0F0]" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-full rounded bg-[#F0F0F0]" />
        <div className="h-3 w-3/4 rounded bg-[#F0F0F0]" />
      </div>
      <div className="flex gap-2">
        <div className="h-2.5 w-10 rounded bg-[#F0F0F0]" />
        <div className="h-2.5 w-14 rounded bg-[#F0F0F0]" />
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

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#252525]">

      <Nav />

      <main className="flex-1">

        {/* ── Search hero ── */}
        <div className="border-b border-[#CFCFCF] bg-[#F8F8F8]">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-12 pb-8 flex flex-col items-center gap-6 text-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Find your OSS alternative</h1>
              <p className="text-[#7D7D7D] text-[15px] mt-2">
                {loading ? "Loading…" : `${apps.length} open-source apps · deploy any in under 2 minutes`}
              </p>
            </div>

            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7D7D] pointer-events-none" />
              <input
                type="text"
                placeholder="Search apps, or what they replace…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[#CFCFCF] bg-white shadow-sm pl-11 pr-5 py-3.5 text-[15px] placeholder:text-[#7D7D7D] text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#252525] focus:border-transparent transition"
              />
              {loading && debouncedSearch && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7D7D] animate-spin" />
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full justify-center flex-wrap">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                      active
                        ? "bg-[#252525] text-white border-[#252525]"
                        : "bg-white text-[#545454] border-[#CFCFCF] hover:border-[#7D7D7D] hover:text-[#252525]"
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
              <p className="text-sm text-[#7D7D7D] max-w-xs">
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}"${category !== "All" ? ` in ${category}` : ""}.`
                  : `No apps in this category yet.`}
              </p>
              <button
                onClick={() => { setSearch(""); setCategory("All"); }}
                className="text-sm font-medium text-[#252525] underline underline-offset-4 hover:no-underline"
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

      <footer className="border-t border-[#CFCFCF] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-[#7D7D7D]">barf. © 2025</span>
          <Link href="/" className="text-xs text-[#7D7D7D] hover:text-[#252525] transition-colors">← Home</Link>
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
