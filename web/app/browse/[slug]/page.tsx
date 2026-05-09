"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { use } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Star, Loader2, CheckCircle2,
  Server, Globe, Shield, Package, Square, Play, Trash2, Zap, ArrowUpRight, Sparkles,
} from "lucide-react";
import { GithubIcon } from "../../components/GithubIcon";
import { AppIcon } from "../../components/AppIcon";
import { Nav } from "../../components/Nav";
import { Barfy } from "../../components/BarfAI";
import { DeleteConfirmModal } from "../../components/DeleteConfirmModal";
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
  bg: "bg-[var(--bg-2)]",
  text: "text-[var(--fg-mute)]",
  border: "border-[var(--line-2)]",
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  async function authHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await createClient().auth.getSession();
    return session ? { "Authorization": `Bearer ${session.access_token}` } : {};
  }

  const fetchStatus = useCallback(async (id: string) => {
    const headers = await authHeaders();
    const r = await fetch(`${API}/api/deploy/${id}`, { headers });
    if (!r.ok) return;
    const d: Deployment = await r.json();
    setDep(d);
    if (d.status === "live" || d.status === "stopped" || d.status === "failed") stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    authHeaders()
      .then(headers => fetch(`${API}/api/deploy/${stored}`, { headers }))
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
      // Already have one — load the existing deployment instead of showing an error
      if (r.status === 409 && body.existing_id) {
        const headers = await authHeaders();
        const existing = await fetch(`${API}/api/deploy/${body.existing_id}`, { headers })
          .then(res => res.ok ? res.json() : null);
        if (existing) {
          localStorage.setItem(storageKey, existing.id);
          setDep(existing);
          if (existing.status === "queued" || existing.status === "deploying" || existing.status === "starting") {
            startTick(); startPolling(existing.id);
          }
          return;
        }
      }
      setDeployError(body.error ?? "Deployment failed. Please try again.");
      return;
    }
    const data: Deployment = await r.json();
    localStorage.setItem(storageKey, data.id);
    setDep(data); startTick(); startPolling(data.id);
  }

  async function handleStop() {
    if (!dep) return;
    const headers = await authHeaders();
    await fetch(`${API}/api/deploy/${dep.id}/stop`, { method: "POST", headers });
    setDep(d => d ? { ...d, status: "stopping" } : d);
    startPolling(dep.id);
  }

  async function handleStart() {
    if (!dep) return;
    const headers = await authHeaders();
    await fetch(`${API}/api/deploy/${dep.id}/start`, { method: "POST", headers });
    setElapsed(0); startTick();
    setDep(d => d ? { ...d, status: "starting" } : d);
    startPolling(dep.id);
  }

  async function handleKeepAlive() {
    if (!dep) return;
    const headers = await authHeaders();
    await fetch(`${API}/api/deploy/${dep.id}/keepalive`, { method: "POST", headers });
    setDep(d => d ? { ...d, last_accessed_at: new Date().toISOString() } : d);
  }

  async function handleTearDown() {
    if (!dep) return;
    setShowDeleteModal(true);
  }

  async function confirmTearDown() {
    setShowDeleteModal(false);
    if (!dep) return;
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
    <>
    {showDeleteModal && (
      <DeleteConfirmModal
        appName={app.name}
        onConfirm={confirmTearDown}
        onCancel={() => setShowDeleteModal(false)}
      />
    )}
    <div style={{ borderRadius: 16, border: "1px solid var(--line-2)", background: "var(--bg-1)", overflow: "hidden" }}>

      {/* header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AppIcon siSlug={app.si_slug} appSlug={app.slug} fallbackLetter={app.name.charAt(0)} size={16} className="text-[var(--fg-mute)]" />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)", margin: 0 }}>Host {app.name}</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--fg-mute)", paddingLeft: 44, margin: 0 }}>
          {st === "idle"    ? "Your own instance in ~2 minutes." : ""}
          {isDeploying      ? `Setting up… ${fmtElapsed(elapsed)}` : ""}
          {isStarting       ? `Waking up… ${fmtElapsed(elapsed)}` : ""}
          {isStopping       ? "Stopping container…" : ""}
          {st === "live"    ? "Your instance is running." : ""}
          {st === "stopped" ? "Your instance is sleeping." : ""}
          {st === "failed"  ? "Something went wrong." : ""}
        </p>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {checking && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
            <Loader2 style={{ width: 20, height: 20, color: "var(--fg-dim)", animation: "spin 1s linear infinite" }} />
          </div>
        )}

        {!checking && st === "idle" && (
          <>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: Server, text: "1 vCPU · 1.5 GB RAM" },
                { icon: Globe,  text: "Your own public URL" },
                { icon: Zap,    text: "Auto-stops after 4 hours" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--fg-mute)" }}>
                  <Icon style={{ width: 16, height: 16, color: "var(--primary)", flexShrink: 0 }} />{text}
                </li>
              ))}
            </ul>

            {app.deployable !== false ? (
              <>
                <button onClick={handleDeploy}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, background: "var(--primary)", color: "var(--primary-ink)", fontWeight: 700, padding: "12px 0", fontSize: 15, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "opacity .15s ease" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  Host This <ArrowUpRight style={{ width: 16, height: 16 }} />
                </button>
                {deployError && (
                  <div style={{ borderRadius: 12, background: "rgba(255,91,91,0.08)", border: "1px solid rgba(255,91,91,0.3)", padding: "12px 16px", fontSize: 14, color: "var(--red)" }}>
                    {deployError}
                  </div>
                )}
                <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono)", color: "var(--fg-dim)", textAlign: "center", margin: 0 }}>Free tier · No card required</p>
              </>
            ) : (
              <div style={{ borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line)", padding: "12px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-mute)", margin: 0 }}>Coming soon</p>
                <p style={{ fontSize: 12, color: "var(--fg-dim)", marginTop: 4, margin: "4px 0 0" }}>One-click hosting for this app is being verified</p>
              </div>
            )}
          </>
        )}

        {isDeploying && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {STEPS.map((step, i) => {
                const cur = currentStep(elapsed);
                const done = i < cur;
                const active = i === cur;
                return (
                  <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {done
                      ? <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981", flexShrink: 0 }} />
                      : active
                        ? <Loader2 style={{ width: 16, height: 16, color: "var(--fg)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                        : <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--line-2)", flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 14, color: done ? "var(--fg-dim)" : active ? "var(--fg)" : "var(--fg-mute)", fontWeight: active ? 500 : 400, textDecoration: done ? "line-through" : "none" }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line)", padding: "10px 16px", fontSize: 12, fontFamily: "var(--font-geist-mono)", color: "var(--fg-mute)", textAlign: "center" }}>
              Usually 2–3 minutes total
            </div>
          </>
        )}

        {isStarting && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 0" }}>
            <Loader2 style={{ width: 28, height: 28, color: "var(--fg)", animation: "spin 1s linear infinite" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--fg)", margin: 0 }}>Waking up…</p>
              <p style={{ fontSize: 12, color: "var(--fg-mute)", marginTop: 4 }}>Usually under 30 seconds · {fmtElapsed(elapsed)}</p>
            </div>
          </div>
        )}

        {isStopping && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", justifyContent: "center" }}>
            <Loader2 style={{ width: 20, height: 20, color: "var(--fg-mute)", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 14, color: "var(--fg-mute)" }}>Stopping container…</span>
          </div>
        )}

        {st === "live" && dep?.live_url && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", animation: "pulse 1.6s infinite" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>Live</span>
              </div>
              {shutdownMs > 0 && (
                <span style={{ fontSize: 12, fontFamily: "var(--font-geist-mono)", color: "var(--fg-dim)" }}>Stops in {fmtCountdown(shutdownMs)}</span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/apps/${dep.id}`}
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, background: "var(--primary)", color: "var(--primary-ink)", fontWeight: 700, padding: "12px 0", fontSize: 15, textDecoration: "none", transition: "opacity .15s ease" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              >
                <Sparkles style={{ width: 16, height: 16 }} /> Open with Barfy
              </Link>
              <a href={dep.live_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--fg-mute)", textDecoration: "none", transition: "background .15s ease, color .15s ease" }}
                title="Open without Barfy"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
              >
                <ExternalLink style={{ width: 16, height: 16 }} />
              </a>
            </div>

            <div style={{ borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line)", padding: "8px 12px" }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-geist-mono)", color: "var(--fg-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{dep.live_url}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={handleKeepAlive}
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, border: "1px solid var(--line-2)", padding: "8px 0", fontSize: 12, fontWeight: 500, color: "var(--fg-mute)", background: "transparent", cursor: "pointer", fontFamily: "inherit", transition: "background .15s ease" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--bg-2)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <Zap style={{ width: 14, height: 14, color: "#facc15" }} /> Keep alive
              </button>
              <button onClick={handleStop}
                style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, border: "1px solid var(--line-2)", padding: "8px 0", fontSize: 12, fontWeight: 500, color: "var(--fg-mute)", background: "transparent", cursor: "pointer", fontFamily: "inherit", transition: "background .15s ease" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--bg-2)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <Square style={{ width: 14, height: 14 }} /> Stop
              </button>
            </div>
          </>
        )}

        {st === "stopped" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid var(--fg-dim)" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-mute)" }}>Sleeping</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--fg-dim)", margin: 0 }}>Container is paused. Wake it up in under 30 seconds.</p>
            </div>
            <button onClick={handleStart}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, background: "var(--primary)", color: "var(--primary-ink)", fontWeight: 700, padding: "12px 0", fontSize: 15, border: "none", cursor: "pointer", fontFamily: "inherit", transition: "opacity .15s ease" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              <Play style={{ width: 16, height: 16 }} /> Wake Up
            </button>
            <button onClick={handleTearDown}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "var(--red)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 0", transition: "opacity .15s ease" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              <Trash2 style={{ width: 14, height: 14 }} /> Permanently delete
            </button>
          </>
        )}

        {st === "failed" && (
          <>
            <div style={{ borderRadius: 12, background: "rgba(255,91,91,0.08)", border: "1px solid rgba(255,91,91,0.2)", padding: 16, textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--red)", margin: 0 }}>Deployment failed</p>
              <p style={{ fontSize: 12, color: "var(--fg-dim)", marginTop: 4 }}>Check your Azure resource group for details.</p>
            </div>
            <button onClick={() => { setDep(null); stopPolling(); }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 12, border: "1px solid var(--line-2)", padding: "10px 0", fontSize: 14, fontWeight: 500, color: "var(--fg-mute)", background: "transparent", cursor: "pointer", fontFamily: "inherit", transition: "background .15s ease" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--bg-2)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
    </>
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--bg)", color: "var(--fg)" }}>
      <span style={{ fontSize: 48 }}>🤷</span>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>App not found</h1>
      <Link href="/browse" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--fg-mute)", textDecoration: "underline" }}>
        <ArrowLeft style={{ width: 16, height: 16 }} /> Back to browse
      </Link>
    </div>
  );

  if (!app) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <Loader2 style={{ width: 24, height: 24, color: "var(--fg-dim)", animation: "spin 1s linear infinite" }} />
    </div>
  );

  const fmtStars = app.stars >= 1000 ? `${(app.stars / 1000).toFixed(1)}k` : String(app.stars);
  const features: string[] = Array.isArray(app.features) ? app.features : [];
  const c = CAT_COLOR[app.category] ?? DEFAULT_CAT;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--fg)" }}>

      <Nav />

      <main style={{ flex: 1 }}>
        {/* app hero band */}
        <div style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-1)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 32px" }}>
            <Link
              href="/browse"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--fg-dim)", textDecoration: "none", marginBottom: 24, transition: "color .15s ease" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-mute)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-dim)")}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} /> Browse
            </Link>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {app.logo_url
                  ? <img src={app.logo_url} alt={app.name} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 10 }} />
                  : <AppIcon siSlug={app.si_slug} appSlug={app.slug} fallbackLetter={app.name.charAt(0)} size={32} className="text-[var(--fg-mute)]" />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)", margin: 0 }}>{app.name}</h1>
                  {app.featured && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "var(--primary)", color: "var(--primary-ink)", borderRadius: 999, padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Featured
                    </span>
                  )}
                  {app.replaces && (
                    <span className={`${c.bg} ${c.text} ${c.border}`} style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, border: "1px solid", fontSize: 11, fontWeight: 600, padding: "3px 10px" }}>
                      vs {app.replaces}
                    </span>
                  )}
                </div>
                <p style={{ color: "var(--fg-mute)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{app.tagline}</p>

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 12 }}>
                  {app.stars > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "var(--font-geist-mono)", color: "var(--fg-mute)" }}>
                      <Star style={{ width: 14, height: 14, fill: "#facc15", color: "#facc15" }} />
                      {fmtStars} stars
                    </span>
                  )}
                  {app.license && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "var(--font-geist-mono)", color: "var(--fg-mute)" }}>
                      <Shield style={{ width: 12, height: 12 }} /> {app.license}
                    </span>
                  )}
                  {app.language && (
                    <span style={{ fontSize: 12, fontFamily: "var(--font-geist-mono)", color: "var(--fg-mute)" }}>{app.language}</span>
                  )}
                  {app.category && (
                    <span className={c.text} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500 }}>
                      <Package style={{ width: 12, height: 12 }} /> {app.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }} className="lg:flex-row lg:gap-48">
            <div className="flex flex-col gap-6 flex-1">

              {app.description && (
                <div style={{ borderRadius: 16, border: "1px solid var(--line)", background: "var(--bg-1)", padding: 24 }}>
                  <h2 style={{ fontSize: 11, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--fg-dim)", margin: "0 0 12px" }}>About</h2>
                  <p style={{ fontSize: 15, color: "var(--fg-mute)", lineHeight: 1.6, margin: 0 }}>{app.description}</p>
                </div>
              )}

              {features.length > 0 && (
                <div style={{ borderRadius: 16, border: "1px solid var(--line)", background: "var(--bg-1)", padding: 24 }}>
                  <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--fg-dim)", margin: "0 0 16px" }}>Features</h2>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {features.map((f, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--fg-mute)" }}>
                        <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981", marginTop: 2, flexShrink: 0 }} />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {app.github_url && (
                  <a href={app.github_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-1)", padding: "10px 16px", fontSize: 14, fontWeight: 500, color: "var(--fg-mute)", textDecoration: "none", transition: "background .15s ease, color .15s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
                  >
                    <GithubIcon className="w-4 h-4" /> View on GitHub <ExternalLink style={{ width: 12, height: 12, color: "var(--fg-dim)" }} />
                  </a>
                )}
                {app.website_url && (
                  <a href={app.website_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-1)", padding: "10px 16px", fontSize: 14, fontWeight: 500, color: "var(--fg-mute)", textDecoration: "none", transition: "background .15s ease, color .15s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
                  >
                    <Globe style={{ width: 16, height: 16 }} /> Website <ExternalLink style={{ width: 12, height: 12, color: "var(--fg-dim)" }} />
                  </a>
                )}
              </div>
            </div>

            {/* Right — deploy panel + Barfy */}
            <div style={{ width: "100%", maxWidth: 288, flexShrink: 0 }}>
              <div style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
                <DeployPanel app={app} onLive={setLiveUrl} />
                {liveUrl && (
                  <Barfy appSlug={app.slug} appName={app.name} liveUrl={liveUrl} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--line)", marginTop: "auto", background: "color-mix(in oklab, var(--bg) 90%, black)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, fontWeight: 700, color: "var(--fg-dim)" }}>barf. © 2026</span>
          <Link href="/browse" style={{ fontSize: 11, color: "var(--fg-dim)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, transition: "color .2s ease" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-mute)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--fg-dim)")}
          >
            <ArrowLeft style={{ width: 12, height: 12 }} /> Browse
          </Link>
        </div>
      </footer>
    </div>
  );
}
