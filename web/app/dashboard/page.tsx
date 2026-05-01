"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Globe,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ExternalLink,
  Server,
} from "lucide-react";
import { GithubIcon } from "../components/GithubIcon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Deployment {
  id: string;
  app_slug: string;
  app_id: string | null;
  status: "queued" | "deploying" | "live" | "failed";
  live_url: string | null;
  azure_app_name: string | null;
  created_at: string;
  updated_at: string;
}

function statusBadge(status: Deployment["status"]) {
  const map: Record<Deployment["status"], { label: string; cls: string; icon: React.ReactNode }> = {
    queued: {
      label: "Queued",
      cls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700",
      icon: <Clock className="w-3 h-3" />,
    },
    deploying: {
      label: "Deploying",
      cls: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    live: {
      label: "Live",
      cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    failed: {
      label: "Failed",
      cls: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const { label, cls, icon } = map[status] ?? map.queued;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
}

function timeSince(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function DeploymentCard({ dep, onRefresh }: { dep: Deployment; onRefresh: () => void }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col gap-4">
      {/* header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500 font-mono shrink-0">
            {dep.app_slug.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[15px] truncate">{dep.app_slug}</p>
            <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">{dep.id.slice(0, 8)}…</p>
          </div>
        </div>
        {statusBadge(dep.status)}
      </div>

      {/* live url */}
      {dep.live_url && (
        <a
          href={dep.live_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors truncate"
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{dep.live_url}</span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
        </a>
      )}

      {dep.azure_app_name && !dep.live_url && (
        <p className="text-xs font-mono text-zinc-400 truncate">
          <span className="text-zinc-300 dark:text-zinc-600">container:</span> {dep.azure_app_name}
        </p>
      )}

      {/* footer row */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs text-zinc-400 font-mono">{timeSince(dep.created_at)}</span>
        <div className="flex items-center gap-2">
          {(dep.status === "failed" || dep.status === "queued") && (
            <Link
              href={`/browse/${dep.app_slug}`}
              className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-3 font-medium"
            >
              Retry <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {dep.status === "deploying" && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          )}
          {dep.status === "live" && (
            <Link
              href={`/browse/${dep.app_slug}`}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              View app <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <Server className="w-7 h-7 text-zinc-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">No deployments yet</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
          Browse open-source alternatives and hit &quot;Host This&quot; to spin up your first deployment.
        </p>
      </div>
      <Link
        href="/browse"
        className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-semibold px-6 py-3 hover:opacity-90 transition-opacity text-sm"
      >
        Browse apps
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeployments = useCallback(async () => {
    try {
      // In a real auth'd app we'd filter by user_id. For now fetches all.
      const r = await fetch(`${API}/api/deploy`);
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      setDeployments(data.deployments ?? []);
    } catch {
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  // auto-refresh deploying rows
  useEffect(() => {
    const hasActive = deployments.some((d) => d.status === "deploying" || d.status === "queued");
    if (!hasActive) return;
    const t = setInterval(fetchDeployments, 6000);
    return () => clearInterval(t);
  }, [deployments, fetchDeployments]);

  const byStatus = {
    live: deployments.filter((d) => d.status === "live"),
    deploying: deployments.filter((d) => d.status === "deploying" || d.status === "queued"),
    failed: deployments.filter((d) => d.status === "failed"),
  };

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
                className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-10">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Deployments</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1.5">
              {loading ? "Loading…" : `${deployments.length} total · ${byStatus.live.length} live`}
            </p>
          </div>
          <button
            onClick={fetchDeployments}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-sm font-medium px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 h-40 animate-pulse" />
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-8">

            {/* Active */}
            {byStatus.deploying.length > 0 && (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-4">
                  Deploying ({byStatus.deploying.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byStatus.deploying.map((d) => (
                    <DeploymentCard key={d.id} dep={d} onRefresh={fetchDeployments} />
                  ))}
                </div>
              </section>
            )}

            {/* Live */}
            {byStatus.live.length > 0 && (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-4">
                  Live ({byStatus.live.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byStatus.live.map((d) => (
                    <DeploymentCard key={d.id} dep={d} onRefresh={fetchDeployments} />
                  ))}
                </div>
              </section>
            )}

            {/* Failed */}
            {byStatus.failed.length > 0 && (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-4">
                  Failed ({byStatus.failed.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byStatus.failed.map((d) => (
                    <DeploymentCard key={d.id} dep={d} onRefresh={fetchDeployments} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-zinc-400">barf. © 2025</span>
          <Link href="/browse" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Browse apps →
          </Link>
        </div>
      </footer>

    </div>
  );
}
