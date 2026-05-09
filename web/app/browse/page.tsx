"use client";

export const dynamic = "force-dynamic";

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

const CAT_DOT: Record<string, string> = {
  Forms: "#8a7bff", Analytics: "#10b981", CRM: "#ec4899",
  Automation: "#FF6A1A", Email: "#3b82f6", Chat: "#06b6d4",
  "Project Mgmt": "#eab308", Storage: "#94a3b8", Auth: "#6366f1",
  DevOps: "#ef4444", Security: "#a855f7",
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
  const dotColor = CAT_DOT[app.category] ?? "var(--fg-dim)";
  return (
    <Link
      href={`/browse/${app.slug}`}
      className="card-glow"
      style={{
        display: "flex", flexDirection: "column",
        background: "var(--bg-1)", borderRadius: 16,
        border: "1px solid var(--line)", padding: 20, gap: 16,
        textDecoration: "none", color: "inherit",
        transition: "border-color .2s ease, transform .2s ease, box-shadow .2s ease",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {app.logo_url
              ? <img src={app.logo_url} alt={app.name} style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 6 }} />
              : <AppIcon siSlug={app.si_slug} appSlug={app.slug} fallbackLetter={app.name.charAt(0)} size={20} className="text-[var(--fg-mute)]" />
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--fg)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
              <p style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.category}</p>
            </div>
          </div>
        </div>

        {app.replaces && (
          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, background: "var(--primary)", color: "var(--primary-ink)", borderRadius: 999, padding: "4px 10px", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            vs {app.replaces}
          </span>
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--fg-mute)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
        {app.tagline}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--fg-dim)", fontFamily: "var(--font-geist-mono)" }}>
          {app.stars > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Star style={{ width: 12, height: 12, fill: "#facc15", color: "#facc15" }} />
              {fmtStars(app.stars)}
            </span>
          )}
          {app.license && <><span>·</span><span>{app.license}</span></>}
          {app.language && <><span>·</span><span>{app.language}</span></>}
        </div>
        <ArrowUpRight style={{ width: 16, height: 16, color: "var(--fg-dim)", transition: "color .2s ease, transform .2s ease" }} className="group-hover:text-[var(--primary)]" />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-1)", borderRadius: 16, border: "1px solid var(--line)", padding: 20, gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--bg-2)", animation: "pulse 2s cubic-bezier(.4,0,.6,1) infinite" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ height: 14, width: 96, borderRadius: 6, background: "var(--bg-2)", animation: "pulse 2s cubic-bezier(.4,0,.6,1) infinite" }} />
          <div style={{ height: 10, width: 56, borderRadius: 6, background: "var(--bg-2)", animation: "pulse 2s cubic-bezier(.4,0,.6,1) infinite" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 12, width: "100%", borderRadius: 6, background: "var(--bg-2)", animation: "pulse 2s cubic-bezier(.4,0,.6,1) infinite" }} />
        <div style={{ height: 12, width: "75%", borderRadius: 6, background: "var(--bg-2)", animation: "pulse 2s cubic-bezier(.4,0,.6,1) infinite" }} />
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--fg)" }}>
      <Nav />

      <main style={{ flex: 1 }}>
        {/* Search hero */}
        <div style={{ background: "var(--bg-1)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ maxWidth: 768, margin: "0 auto", padding: "48px 32px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
            <div>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)", margin: 0 }}>
                Find your OSS alternative
              </h1>
              <p style={{ color: "var(--fg-mute)", fontSize: 14, marginTop: 10, margin: "10px 0 0" }}>
                {loading
                  ? "Loading apps…"
                  : `${apps.length} open-source apps · deploy any in under 2 minutes`}
              </p>
            </div>

            {/* Search bar */}
            <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
              <Search style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--fg-dim)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Search apps, or what they replace…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)", paddingLeft: 44, paddingRight: 20, paddingTop: 12, paddingBottom: 12, fontSize: 14, color: "var(--fg)", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color .2s ease, box-shadow .2s ease" }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              />
              {loading && debouncedSearch && (
                <Loader2 style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--fg-dim)", animation: "spin 1s linear infinite" }} />
              )}
            </div>

            {/* Category pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                const dot = CAT_DOT[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6,
                      borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 500,
                      border: `1px solid ${active ? "var(--primary)" : "var(--line-2)"}`,
                      background: active ? "var(--primary)" : "var(--bg-2)",
                      color: active ? "var(--primary-ink)" : "var(--fg-mute)",
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "background .15s ease, border-color .15s ease, color .15s ease",
                    }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; } }}
                  >
                    {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "var(--primary-ink)" : dot, flexShrink: 0 }} />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 32px" }}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : apps.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "128px 0", gap: 16, textAlign: "center" }}>
              <div style={{ fontSize: 48 }}>🔍</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)", margin: 0 }}>No results</h3>
              <p style={{ fontSize: 14, color: "var(--fg-mute)", maxWidth: 280, margin: 0 }}>
                {debouncedSearch
                  ? `Nothing matched "${debouncedSearch}"${category !== "All" ? ` in ${category}` : ""}.`
                  : "No apps in this category yet."}
              </p>
              <button
                onClick={() => { setSearch(""); setCategory("All"); }}
                style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear filters →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {featured.length > 0 && !debouncedSearch && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span className="section-eyebrow" style={{ margin: 0 }}>Featured</span>
                    <div style={{ height: 1, flex: 1, background: "var(--line)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                    {featured.map((app) => <AppCard key={app.id} app={app} />)}
                  </div>
                </div>
              )}

              <div>
                {featured.length > 0 && !debouncedSearch && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-geist-mono)", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--fg-dim)" }}>All apps</span>
                    <div style={{ height: 1, flex: 1, background: "var(--line)" }} />
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {(debouncedSearch ? apps : regular).map((app) => <AppCard key={app.id} app={app} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--line)", marginTop: "auto", background: "color-mix(in oklab, var(--bg) 90%, black)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, fontWeight: 700, color: "var(--fg-dim)" }}>barf. © 2026</span>
          <Link href="/" style={{ fontSize: 11, color: "var(--fg-dim)", textDecoration: "none", transition: "color .2s ease" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-mute)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-dim)")}
          >← Home</Link>
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
