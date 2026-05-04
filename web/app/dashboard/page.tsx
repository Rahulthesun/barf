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
  Trash2,
  Square,
  Play,
  Zap,
  Moon,
} from "lucide-react";
import { AppIcon } from "../components/AppIcon";
import { Nav } from "../components/Nav";
import { createClient } from "@/utils/supabase/client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const AUTO_STOP_HOURS = 4;

type DeployStatus =
  | "queued" | "deploying" | "live" | "failed"
  | "stopping" | "stopped" | "starting" | "deleting";

interface Deployment {
  id: string;
  app_slug: string;
  app_id: string | null;
  status: DeployStatus;
  live_url: string | null;
  azure_app_name: string | null;
  live_since: string | null;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

function statusBadge(status: DeployStatus) {
  const map: Record<DeployStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    queued: {
      label: "Queued",
      cls: "bg-[#F0F0F0] dark:bg-zinc-800 text-[#7D7D7D] border-[#CFCFCF] dark:border-[#CFCFCF]",
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
    stopping: {
      label: "Stopping",
      cls: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    stopped: {
      label: "Sleeping",
      cls: "bg-[#F0F0F0] dark:bg-zinc-800 text-[#7D7D7D] border-[#CFCFCF] dark:border-[#CFCFCF]",
      icon: <Moon className="w-3 h-3" />,
    },
    starting: {
      label: "Waking up",
      cls: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    deleting: {
      label: "Deleting",
      cls: "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border-red-200 dark:border-red-500/30",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    failed: {
      label: "Failed",
      cls: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const cfg = map[status] ?? map.failed;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
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

function fmtCountdown(ms: number) {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DeploymentCard({
  dep,
  onRefresh,
  onDelete,
  onStop,
  onStart,
  onKeepAlive,
}: {
  dep: Deployment;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onStop: (id: string) => void;
  onStart: (id: string) => void;
  onKeepAlive: (id: string) => void;
}) {
  const isTransient = dep.status === "deploying" || dep.status === "queued"
    || dep.status === "stopping" || dep.status === "starting" || dep.status === "deleting";

  const base = new Date(dep.last_accessed_at ?? dep.live_since ?? dep.created_at).getTime();
  const shutdownMs = dep.status === "live"
    ? Math.max(0, base + AUTO_STOP_HOURS * 3_600_000 - Date.now())
    : 0;

  return (
    <div className="rounded-2xl border border-[#CFCFCF] dark:border-[#CFCFCF] bg-white dark:bg-zinc-900 p-5 flex flex-col gap-4">
      {/* header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F0F0F0] dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <AppIcon appSlug={dep.app_slug} fallbackLetter={dep.app_slug.charAt(0).toUpperCase()} size={18} className="text-[#545454] dark:text-[#CFCFCF]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[15px] truncate">{dep.app_slug}</p>
            <p className="text-xs text-[#7D7D7D] font-mono mt-0.5 truncate">{dep.id.slice(0, 8)}…</p>
          </div>
        </div>
        {statusBadge(dep.status)}
      </div>

      {/* live url */}
      {dep.live_url && dep.status === "live" && (
        <a
          href={dep.live_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-[#CFCFCF] dark:border-[#CFCFCF] bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:bg-[#F0F0F0] dark:hover:bg-zinc-700 transition-colors truncate"
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{dep.live_url}</span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
        </a>
      )}

      {dep.azure_app_name && !dep.live_url && dep.status !== "stopped" && (
        <p className="text-xs font-mono text-[#7D7D7D] truncate">
          <span className="text-[#CFCFCF] dark:text-[#545454]">container:</span> {dep.azure_app_name}
        </p>
      )}

      {/* auto-shutdown countdown */}
      {dep.status === "live" && shutdownMs > 0 && (
        <p className="text-xs font-mono text-[#7D7D7D]">
          Stops in <span className="text-[#545454] dark:text-[#CFCFCF]">{fmtCountdown(shutdownMs)}</span>
        </p>
      )}

      {/* footer row */}
      <div className="flex items-center justify-between pt-1 border-t border-[#CFCFCF] dark:border-[#CFCFCF]">
        <span className="text-xs text-[#7D7D7D] font-mono">{timeSince(dep.created_at)}</span>
        <div className="flex items-center gap-2 flex-wrap justify-end">

          {/* deploying/transient — just refresh */}
          {isTransient && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-xs text-[#7D7D7D] hover:text-[#545454] dark:hover:text-[#CFCFCF] transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          )}

          {/* live controls */}
          {dep.status === "live" && (
            <>
              <button
                onClick={() => onKeepAlive(dep.id)}
                className="inline-flex items-center gap-1 text-xs text-[#7D7D7D] hover:text-[#545454] dark:hover:text-[#CFCFCF] transition-colors"
                title="Reset auto-shutdown timer"
              >
                <Zap className="w-3 h-3 text-yellow-500" /> Keep alive
              </button>
              <button
                onClick={() => onStop(dep.id)}
                className="inline-flex items-center gap-1 text-xs text-[#7D7D7D] hover:text-[#545454] dark:hover:text-[#CFCFCF] transition-colors"
              >
                <Square className="w-3 h-3" /> Stop
              </button>
              <Link
                href={`/browse/${dep.app_slug}`}
                className="inline-flex items-center gap-1 text-xs text-[#7D7D7D] hover:text-[#545454] dark:hover:text-[#CFCFCF] transition-colors"
              >
                Open <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          )}

          {/* stopped controls */}
          {dep.status === "stopped" && (
            <>
              <button
                onClick={() => onStart(dep.id)}
                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-3 font-medium"
              >
                <Play className="w-3 h-3" /> Wake up
              </button>
              <button
                onClick={() => {
                  if (confirm(`Tear down ${dep.app_slug}? This will delete the container.`)) {
                    onDelete(dep.id);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors ml-1"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </>
          )}

          {/* failed */}
          {(dep.status === "failed") && (
            <>
              <Link
                href={`/browse/${dep.app_slug}`}
                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-3 font-medium"
              >
                Retry <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Tear down ${dep.app_slug}? This will delete the container.`)) {
                    onDelete(dep.id);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors ml-1"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F0F0F0] dark:bg-zinc-800 flex items-center justify-center">
        <Server className="w-7 h-7 text-[#7D7D7D]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">No deployments yet</h3>
        <p className="text-sm text-[#7D7D7D] dark:text-[#7D7D7D] mt-1 max-w-xs">
          Browse open-source alternatives and hit &quot;Host This&quot; to spin up your first deployment.
        </p>
      </div>
      <Link
        href="/browse"
        className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-white text-zinc-50 dark:text-[#252525] font-semibold px-6 py-3 hover:opacity-90 transition-opacity text-sm"
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

  async function authHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await createClient().auth.getSession();
    return session ? { "Authorization": `Bearer ${session.access_token}` } : {};
  }

  const fetchDeployments = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const r = await fetch(`${API}/api/deploy`, { headers });
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

  const deleteDeployment = useCallback(async (id: string) => {
    const headers = await authHeaders();
    await fetch(`${API}/api/deploy/${id}`, { method: "DELETE", headers });
    fetchDeployments();
  }, [fetchDeployments]);

  const stopDeployment = useCallback(async (id: string) => {
    const headers = await authHeaders();
    await fetch(`${API}/api/deploy/${id}/stop`, { method: "POST", headers });
    setDeployments(prev => prev.map(d => d.id === id ? { ...d, status: "stopping" as DeployStatus } : d));
    setTimeout(fetchDeployments, 3000);
  }, [fetchDeployments]);

  const startDeployment = useCallback(async (id: string) => {
    const headers = await authHeaders();
    await fetch(`${API}/api/deploy/${id}/start`, { method: "POST", headers });
    setDeployments(prev => prev.map(d => d.id === id ? { ...d, status: "starting" as DeployStatus } : d));
    setTimeout(fetchDeployments, 3000);
  }, [fetchDeployments]);

  const keepAlive = useCallback(async (id: string) => {
    const headers = await authHeaders();
    await fetch(`${API}/api/deploy/${id}/keepalive`, { method: "POST", headers });
    const now = new Date().toISOString();
    setDeployments(prev => prev.map(d => d.id === id ? { ...d, last_accessed_at: now } : d));
  }, []);

  // auto-refresh while any deployment is in a transient state
  useEffect(() => {
    const hasTransient = deployments.some(d =>
      d.status === "deploying" || d.status === "queued" ||
      d.status === "stopping" || d.status === "starting" || d.status === "deleting"
    );
    if (!hasTransient) return;
    const t = setInterval(fetchDeployments, 5000);
    return () => clearInterval(t);
  }, [deployments, fetchDeployments]);

  const live    = deployments.filter(d => d.status === "live");
  const active  = deployments.filter(d => d.status === "deploying" || d.status === "queued" || d.status === "starting" || d.status === "stopping" || d.status === "deleting");
  const stopped = deployments.filter(d => d.status === "stopped");
  const failed  = deployments.filter(d => d.status === "failed");

  const cardProps = {
    onRefresh: fetchDeployments,
    onDelete: deleteDeployment,
    onStop: stopDeployment,
    onStart: startDeployment,
    onKeepAlive: keepAlive,
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#252525]">

      <Nav />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-10">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Deployments</h1>
            <p className="text-[#7D7D7D] dark:text-[#7D7D7D] text-sm mt-1.5">
              {loading ? "Loading…" : `${deployments.length} total · ${live.length} live · ${stopped.length} sleeping`}
            </p>
          </div>
          <button
            onClick={fetchDeployments}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFCFCF] dark:border-[#CFCFCF] bg-white dark:bg-zinc-900 text-[#545454] dark:text-[#7D7D7D] text-sm font-medium px-3.5 py-2 hover:bg-[#F8F8F8] dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#CFCFCF] dark:border-[#CFCFCF] bg-white dark:bg-zinc-900 p-5 h-40 animate-pulse" />
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-8">

            {/* In progress */}
            {active.length > 0 && (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#7D7D7D] mb-4">
                  In progress ({active.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {active.map(d => <DeploymentCard key={d.id} dep={d} {...cardProps} />)}
                </div>
              </section>
            )}

            {/* Live */}
            {live.length > 0 && (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#7D7D7D] mb-4">
                  Live ({live.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {live.map(d => <DeploymentCard key={d.id} dep={d} {...cardProps} />)}
                </div>
              </section>
            )}

            {/* Sleeping */}
            {stopped.length > 0 && (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#7D7D7D] mb-4">
                  Sleeping ({stopped.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stopped.map(d => <DeploymentCard key={d.id} dep={d} {...cardProps} />)}
                </div>
              </section>
            )}

            {/* Failed */}
            {failed.length > 0 && (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-[#7D7D7D] mb-4">
                  Failed ({failed.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {failed.map(d => <DeploymentCard key={d.id} dep={d} {...cardProps} />)}
                </div>
              </section>
            )}

          </div>
        )}

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#CFCFCF] dark:border-[#CFCFCF] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-[#7D7D7D]">barf. © 2025</span>
          <Link href="/browse" className="text-xs text-[#7D7D7D] hover:text-[#545454] dark:hover:text-[#CFCFCF] transition-colors">
            Browse apps →
          </Link>
        </div>
      </footer>

    </div>
  );
}
