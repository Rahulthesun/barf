"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { use } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Star, Loader2, CheckCircle2,
  Server, Globe, Shield, Package, Square, Play, Trash2, Zap, ArrowUpRight,
} from "lucide-react";
import { GithubIcon } from "../../components/GithubIcon";
import { AppIcon } from "../../components/AppIcon";
import { Nav } from "../../components/Nav";
import { Barfy } from "../../components/BarfAI";
import { createClient } from "@/utils/supabase/client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const AUTO_STOP_HOURS = 4;

const CAT_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  Forms:          { bg: "bg-violet-50 dark:bg-violet-950/40",   text: "text-violet-600 dark:text-violet-400",  border: "border-violet-200 dark:border-violet-800/60" },
  Analytics:      { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/60" },
  Automation:     { bg: "bg-orange-50 dark:bg-orange-950/40",   text: "text-orange-600 dark:text-orange-400",  border: "border-orange-200 dark:border-orange-800/60" },
  Email:          { bg: "bg-blue-50 dark:bg-blue-950/40",       text: "text-blue-600 dark:text-blue-400",      border: "border-blue-200 dark:border-blue-800/60" },
  CRM:            { bg: "bg-pink-50 dark:bg-pink-950/40",       text: "text-pink-600 dark:text-pink-400",      border: "border-pink-200 dark:border-pink-800/60" },
  Chat:           { bg: "bg-cyan-50 dark:bg-cyan-950/40",       text: "text-cyan-600 dark:text-cyan-400",      border: "border-cyan-200 dark:border-cyan-800/60" },
  "Project Mgmt": { bg: "bg-yellow-50 dark:bg-yellow-950/40",   text: "text-yellow-700 dark:text-yellow-400",  border: "border-yellow-200 dark:border-yellow-800/60" },
  Storage:        { bg: "bg-slate-50 dark:bg-slate-900/60",     text: "text-slate-600 dark:text-slate-400",    border: "border-slate-200 dark:border-slate-700/60" },
  Auth:           { bg: "bg-indigo-50 dark:bg-indigo-950/40",   text: "text-indigo-600 dark:text-indigo-400",  border: "border-indigo-200 dark:border-indigo-800/60" },
  DevOps:         { bg: "bg-red-50 dark:bg-red-950/40",         text: "text-red-600 dark:text-red-400",        border: "border-red-200 dark:border-red-800/60" },
  Security:       { bg: "bg-purple-50 dark:bg-purple-950/40",   text: "text-purple-600 dark:text-purple-400",  border: "border-purple-200 dark:border-purple-800/60" },
  Monitoring:     { bg: "bg-red-50 dark:bg-red-950/40",         text: "text-red-600 dark:text-red-400",        border: "border-red-200 dark:border-red-800/60" },
};
const DEFAULT_CAT = {
  bg: "bg-zinc-100 dark:bg-zinc-800",
  text: "text-zinc-600 dark:text-zinc-400",
  border: "border-zinc-200 dark:border-zinc-700",
};

interface OssApp {
  id: string; name: string; slug: string; tagline: string; description: string;
  category: string; replaces: string; github_url: string; website_url: string;
  docker_image: string; default_port: number; stars: number; license: string;
  language: string; logo_url: string | null; si_slug: string | null; has_docker: boolean;
  self_hostable: boolean; featured: boolean; features: string[]; deployable?: boolean;
}

interface Deployment {
  id: string; app_slug: string; status: string;
  live_url: string | null; azure_app_name: string | null;
  live_since: string | null; last_accessed_at: string | null;
  created_at: string; updated_at: string;
}

const STEPS = [
  { label: "Reserving compute",    maxSec: 15 },
  { label: "Pulling Docker image", maxSec: 90 },
  { label: "Starting app",         maxSec: 150 },
];

function currentStep(elapsedSec: number) {
  let acc = 0;
  for (let i = 0; i < STEPS.length; i++) {
    acc += STEPS[i]!.maxSec;
    if (elapsedSec < acc) return i;
  }
  return STEPS.length - 1;
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtElapsed(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Deploy Panel ─────────────────────────────────────────────────────────────
function DeployPanel({ app, onLive }: { app: OssApp; onLive?: (url: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dep, setDep] = useState<Deployment | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [shutdownMs, setShutdownMs] = useState(0);
  const [checking, setChecking] = useState(true);
  const [deployError, setDeployError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number | null>(null);
  const storageKey = `dep_${app.slug}`;
  const onLiveRef = useRef(onLive);
  useEffect(() => { onLiveRef.current = onLive; }, [onLive]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  };

  const fetchStatus = useCallback(async (id: string) => {
    const r = await fetch(`${API}/api/deploy/${id}`);
    if (!r.ok) return;
    const d: Deployment = await r.json();
    setDep(d);
    if (d.status === "live" || d.status === "stopped" || d.status === "failed") stopPolling();
  }, []);

  const startTick = useCallback(() => {
    startedAt.current = Date.now();
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000));
    }, 1000);
  }, []);

  useEffect(() => {
    if (!dep?.live_since && !dep?.last_accessed_at) return;
    const base = new Date(dep.last_accessed_at ?? dep.live_since!).getTime();
    const deadline = base + AUTO_STOP_HOURS * 3_600_000;
    const update = () => setShutdownMs(Math.max(0, deadline - Date.now()));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [dep?.last_accessed_at, dep?.live_since]);

  useEffect(() => {
    if (dep?.status === "live" && dep.live_url) {
      onLiveRef.current?.(dep.live_url);
    }
  }, [dep?.status, dep?.live_url]);

  const startPolling = useCallback((id: string) => {
    fetchStatus(id);
    pollRef.current = setInterval(() => fetchStatus(id), 4000);
  }, [fetchStatus]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) { setChecking(false); return; }
    fetch(`${API}/api/deploy/${stored}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: Deployment | null) => {
        if (!data || data.status === "failed") {
          localStorage.removeItem(storageKey);
        } else {
          setDep(data);
          if (data.status === "queued" || data.status === "deploying" || data.status === "starting") {
            startTick(); startPolling(stored);
          }
        }
      })
      .catch(() => localStorage.removeItem(storageKey))
      .finally(() => setChecking(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopPolling(), []);

  async function handleDeploy() {
    setElapsed(0);
    setDeployError(null);

    const { data: { session } } = await createClient().auth.getSession();
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const r = await fetch(`${API}/api/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ app_slug: app.slug, app_id: app.id }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setDeployError(body.error ?? "Deployment failed. Please try again.");
      return;
    }
    const data: Deployment = await r.json();
    localStorage.setItem(storageKey, data.id);
    setDep(data); startTick(); startPolling(data.id);
  }

  async function handleStop() {
    if (!dep) return;
    await fetch(`${API}/api/deploy/${dep.id}/stop`, { method: "POST" });
    setDep(d => d ? { ...d, status: "stopping" } : d);
    startPolling(dep.id);
  }

  async function handleStart() {
    if (!dep) return;
    await fetch(`${API}/api/deploy/${dep.id}/start`, { method: "POST" });
    setElapsed(0); startTick();
    setDep(d => d ? { ...d, status: "starting" } : d);
    startPolling(dep.id);
  }

  async function handleKeepAlive() {
    if (!dep) return;
    await fetch(`${API}/api/deploy/${dep.id}/keepalive`, { method: "POST" });
    setDep(d => d ? { ...d, last_accessed_at: new Date().toISOString() } : d);
  }

  async function handleTearDown() {
    if (!dep || !confirm(`Permanently delete this ${app.name} container?`)) return;
    const { data: { session } } = await createClient().auth.getSession();
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    await fetch(`${API}/api/deploy/${dep.id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${session.access_token}` },
    });
    localStorage.removeItem(storageKey);
    setDep(null); stopPolling();
  }

  const st = dep?.status ?? "idle";
  const isDeploying = st === "queued" || st === "deploying";
  const isStarting  = st === "starting";
  const isStopping  = st === "stopping";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">

      {/* header */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
            <AppIcon siSlug={app.si_slug} appSlug={app.slug} fallbackLetter={app.name.charAt(0)} size={16} className="text-zinc-500 dark:text-zinc-400" />
          </div>
          <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Host {app.name}</h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-11">
          {st === "idle"    ? "Your own instance in ~2 minutes." : ""}
          {isDeploying      ? `Setting up… ${fmtElapsed(elapsed)}` : ""}
          {isStarting       ? `Waking up… ${fmtElapsed(elapsed)}` : ""}
          {isStopping       ? "Stopping container…" : ""}
          {st === "live"    ? "Your instance is running." : ""}
          {st === "stopped" ? "Your instance is sleeping." : ""}
          {st === "failed"  ? "Something went wrong." : ""}
        </p>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">

        {/* CHECKING */}
        {checking && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-300 dark:text-zinc-600" />
          </div>
        )}

        {/* IDLE */}
        {!checking && st === "idle" && (
          <>
            <ul className="flex flex-col gap-2.5">
              {[
                { icon: Server, text: "1 vCPU · 1.5 GB RAM" },
                { icon: Globe,  text: "Your own public URL" },
                { icon: Zap,    text: "Auto-stops after 4 hours" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />{text}
                </li>
              ))}
            </ul>

            {app.deployable !== false ? (
              <>
                <button onClick={handleDeploy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold py-3 hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors text-[15px]">
                  Host This
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                {deployError && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {deployError}
                  </div>
                )}
                <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 text-center">Free tier · No card required</p>
              </>
            ) : (
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Coming soon</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">One-click hosting for this app is being verified</p>
              </div>
            )}
          </>
        )}

        {/* DEPLOYING */}
        {isDeploying && (
          <>
            <div className="flex flex-col gap-3">
              {STEPS.map((step, i) => {
                const cur = currentStep(elapsed);
                const done = i < cur;
                const active = i === cur;
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : active
                        ? <Loader2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 animate-spin shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600 shrink-0" />
                    }
                    <span className={`text-sm ${
                      done   ? "text-zinc-300 dark:text-zinc-600 line-through" :
                      active ? "text-zinc-900 dark:text-zinc-100 font-medium" :
                               "text-zinc-400 dark:text-zinc-500"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-xs font-mono text-zinc-500 dark:text-zinc-400 text-center">
              Usually 2–3 minutes total
            </div>
          </>
        )}

        {/* STARTING */}
        {isStarting && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-7 h-7 text-zinc-900 dark:text-zinc-100 animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Waking up…</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Usually under 30 seconds · {fmtElapsed(elapsed)}</p>
            </div>
          </div>
        )}

        {/* STOPPING */}
        {isStopping && (
          <div className="flex items-center gap-3 py-4 justify-center">
            <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Stopping container…</span>
          </div>
        )}

        {/* LIVE */}
        {st === "live" && dep?.live_url && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Live</span>
              </div>
              {shutdownMs > 0 && (
                <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">Stops in {fmtCountdown(shutdownMs)}</span>
              )}
            </div>

            <a href={dep.live_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white font-semibold py-3 hover:bg-emerald-600 transition-colors text-[15px]">
              <Globe className="w-4 h-4" />
              Open {app.name}
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate block">{dep.live_url}</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleKeepAlive}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <Zap className="w-3.5 h-3.5 text-yellow-500" /> Keep alive
              </button>
              <button onClick={handleStop}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <Square className="w-3.5 h-3.5" /> Stop
              </button>
            </div>
          </>
        )}

        {/* STOPPED */}
        {st === "stopped" && (
          <>
            <div className="flex flex-col items-center gap-1 py-2 text-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Sleeping</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Container is paused. Wake it up in under 30 seconds.</p>
            </div>
            <button onClick={handleStart}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold py-3 hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors text-[15px]">
              <Play className="w-4 h-4" /> Wake Up
            </button>
            <button onClick={handleTearDown}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors py-1">
              <Trash2 className="w-3.5 h-3.5" /> Permanently delete
            </button>
          </>
        )}

        {/* FAILED */}
        {st === "failed" && (
          <>
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 p-4 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Deployment failed</p>
              <p className="text-xs text-red-400 dark:text-red-500 mt-1">Check your Azure resource group for details.</p>
            </div>
            <button onClick={() => { setDep(null); stopPolling(); }}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [app, setApp] = useState<OssApp | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/apps/${slug}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then(data => { if (data) setApp(data.app ?? data); })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <span className="text-5xl">🤷</span>
      <h1 className="text-2xl font-bold">App not found</h1>
      <Link href="/browse" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors underline underline-offset-4">
        <ArrowLeft className="w-4 h-4" /> Back to browse
      </Link>
    </div>
  );

  if (!app) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-300 dark:text-zinc-600" />
    </div>
  );

  const fmtStars = app.stars >= 1000 ? `${(app.stars / 1000).toFixed(1)}k` : String(app.stars);
  const features: string[] = Array.isArray(app.features) ? app.features : [];
  const c = CAT_COLOR[app.category] ?? DEFAULT_CAT;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      <Nav />

      <main className="flex-1">
        {/* app hero band */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Browse
            </Link>

            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                {app.logo_url
                  ? <img src={app.logo_url} alt={app.name} className="w-10 h-10 object-contain rounded-lg" />
                  : <AppIcon siSlug={app.si_slug} appSlug={app.slug} fallbackLetter={app.name.charAt(0)} size={32} className="text-zinc-500 dark:text-zinc-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{app.name}</h1>
                  {app.featured && (
                    <span className="inline-flex items-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wide">
                      Featured
                    </span>
                  )}
                  {app.replaces && (
                    <span className={`inline-flex items-center rounded-full ${c.bg} ${c.text} ${c.border} border text-[11px] font-semibold px-2.5 py-0.5`}>
                      vs {app.replaces}
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[15px] leading-relaxed">{app.tagline}</p>

                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {app.stars > 0 && (
                    <span className="flex items-center gap-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      {fmtStars} stars
                    </span>
                  )}
                  {app.license && (
                    <span className="flex items-center gap-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      <Shield className="w-3 h-3" /> {app.license}
                    </span>
                  )}
                  {app.language && (
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{app.language}</span>
                  )}
                  {app.category && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.text}`}>
                      <Package className="w-3 h-3" /> {app.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

            {/* Left */}
            <div className="flex-1 flex flex-col gap-6">

              {app.description && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                  <h2 className="text-[11px] font-bold mb-3 uppercase tracking-widest text-zinc-400 dark:text-zinc-600">About</h2>
                  <p className="text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{app.description}</p>
                </div>
              )}

              {features.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                  <h2 className="text-[11px] font-bold mb-4 uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Features</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                {app.github_url && (
                  <a href={app.github_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <GithubIcon className="w-4 h-4" /> View on GitHub <ExternalLink className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                  </a>
                )}
                {app.website_url && (
                  <a href={app.website_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <Globe className="w-4 h-4" /> Website <ExternalLink className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                  </a>
                )}
              </div>
            </div>

            {/* Right — deploy panel + Barfy */}
            <div className="w-full lg:w-72 shrink-0">
              <div className="sticky top-20 flex flex-col gap-4">
                <DeployPanel app={app} onLive={setLiveUrl} />
                {liveUrl && (
                  <Barfy appSlug={app.slug} appName={app.name} liveUrl={liveUrl} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-auto bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold text-zinc-400 dark:text-zinc-600">barf. © 2026</span>
          <Link href="/browse" className="text-[11px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Browse
          </Link>
        </div>
      </footer>
    </div>
  );
}
