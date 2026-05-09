"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  Sparkles,
} from "lucide-react";
import { AppIcon } from "../components/AppIcon";
import { Nav } from "../components/Nav";
import { BarfyWidget } from "../components/BarfyWidget";
import { DeleteConfirmModal, RedeployConfirmModal } from "../components/DeleteConfirmModal";
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
  type BadgeCfg = { label: string; color: string; bg: string; border: string; icon: React.ReactNode };
  const map: Record<DeployStatus, BadgeCfg> = {
    queued:    { label: "Queued",     color: "var(--fg-mute)", bg: "var(--bg-2)", border: "var(--line-2)", icon: <Clock className="w-3 h-3" /> },
    deploying: { label: "Deploying",  color: "#60a5fa",        bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    live:      { label: "Live",       color: "#34d399",        bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", icon: <CheckCircle2 className="w-3 h-3" /> },
    stopping:  { label: "Stopping",   color: "#fbbf24",        bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    stopped:   { label: "Sleeping",   color: "var(--fg-mute)", bg: "var(--bg-2)", border: "var(--line-2)", icon: <Moon className="w-3 h-3" /> },
    starting:  { label: "Waking up",  color: "#60a5fa",        bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    deleting:  { label: "Deleting",   color: "#f87171",        bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.3)",  icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    failed:    { label: "Failed",     color: "#f87171",        bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.3)",  icon: <XCircle className="w-3 h-3" /> },
  };
  const cfg = map[status] ?? map.failed;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      borderRadius: 999, border: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.color,
      padding: "4px 10px", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
    }}>
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

const iconBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 32, height: 32, borderRadius: 12,
  border: "1px solid var(--line-2)", background: "var(--bg-1)",
  color: "var(--fg-mute)", cursor: "pointer", transition: "background .15s, color .15s",
};

function DeploymentCard({
  dep,
  onRefresh,
  onDelete,
  onStop,
  onStart,
  onKeepAlive,
  onRedeploy,
}: {
  dep: Deployment;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onStop: (id: string) => void;
  onStart: (id: string) => void;
  onKeepAlive: (id: string) => void;
  onRedeploy: (id: string) => void;
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRedeployModal, setShowRedeployModal] = useState(false);

  const isTransient = dep.status === "deploying" || dep.status === "queued"
    || dep.status === "stopping" || dep.status === "starting" || dep.status === "deleting";

  const base = new Date(dep.last_accessed_at ?? dep.live_since ?? dep.created_at).getTime();
  const shutdownMs = dep.status === "live"
    ? Math.max(0, base + AUTO_STOP_HOURS * 3_600_000 - Date.now())
    : 0;

  return (
    <>
    {showDeleteModal && (
      <DeleteConfirmModal
        appName={dep.app_slug}
        onConfirm={() => { setShowDeleteModal(false); onDelete(dep.id); }}
        onCancel={() => setShowDeleteModal(false)}
      />
    )}
    {showRedeployModal && (
      <RedeployConfirmModal
        appName={dep.app_slug}
        onConfirm={() => { setShowRedeployModal(false); onRedeploy(dep.id); }}
        onCancel={() => setShowRedeployModal(false)}
      />
    )}
    <div style={{
      borderRadius: 16, border: "1px solid var(--line)",
      background: "var(--bg-1)", display: "flex", flexDirection: "column",
      transition: "border-color .15s, box-shadow .15s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.18)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      {/* Card body */}
      <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AppIcon appSlug={dep.app_slug} fallbackLetter={dep.app_slug.charAt(0).toUpperCase()} size={22} className="" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 15, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" }}>{dep.app_slug}</p>
              <p style={{ fontSize: 11, color: "var(--fg-dim)", fontFamily: "var(--font-geist-mono)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>id: {dep.id.slice(0, 8)}…</p>
            </div>
          </div>
          {statusBadge(dep.status)}
        </div>

        {/* Live URL pill */}
        {dep.live_url && dep.status === "live" && (
          <a
            href={dep.live_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg-2)",
              padding: "8px 12px", fontSize: 11, fontFamily: "var(--font-geist-mono)",
              color: "#34d399", textDecoration: "none", overflow: "hidden",
              transition: "background .15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
          >
            <Globe style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dep.live_url}</span>
            <ExternalLink style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.5 }} />
          </a>
        )}

        {dep.azure_app_name && !dep.live_url && dep.status !== "stopped" && (
          <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono)", color: "var(--fg-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--fg-dim)" }}>container:</span> {dep.azure_app_name}
          </p>
        )}

        {/* Countdown + deployed time */}
        <p style={{ fontSize: 11, fontFamily: "var(--font-geist-mono)", color: "var(--fg-dim)" }}>
          Deployed {timeSince(dep.created_at)}
          {dep.status === "live" && shutdownMs > 0 && (
            <> · Stops in <span style={{ color: "var(--fg-mute)" }}>{fmtCountdown(shutdownMs)}</span></>
          )}
        </p>
      </div>

      {/* Footer actions */}
      <div style={{ padding: "10px 20px 14px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>

        {/* Transient state */}
        {isTransient && (
          <>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-mute)" }}>
              <Loader2 style={{ width: 14, height: 14, color: "#60a5fa" }} className="animate-spin" />
              <span style={{ textTransform: "capitalize" }}>{dep.status}…</span>
            </div>
            <button
              onClick={onRefresh}
              style={{ ...iconBtn, width: "auto", padding: "0 12px", gap: 6, fontSize: 12 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
            >
              <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
            </button>
          </>
        )}

        {/* Live state */}
        {dep.status === "live" && (
          <>
            <Link
              href={`/apps/${dep.id}`}
              style={{
                flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: 6, borderRadius: 12, background: "var(--primary)", color: "var(--primary-ink)",
                fontSize: 12, fontWeight: 600, padding: "8px 12px", textDecoration: "none",
                transition: "opacity .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              <Sparkles style={{ width: 14, height: 14 }} /> Open with Barfy
            </Link>
            {dep.live_url && (
              <a
                href={dep.live_url}
                target="_blank"
                rel="noopener noreferrer"
                style={iconBtn}
                title="Open app"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
              >
                <ExternalLink style={{ width: 14, height: 14 }} />
              </a>
            )}
            <button
              onClick={() => onKeepAlive(dep.id)}
              style={iconBtn}
              title="Keep alive"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; }}
            >
              <Zap style={{ width: 14, height: 14, color: "#fbbf24" }} />
            </button>
            <button
              onClick={() => onStop(dep.id)}
              style={iconBtn}
              title="Stop"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
            >
              <Square style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={() => setShowRedeployModal(true)}
              style={{ ...iconBtn, color: "#f59e0b" }}
              title="Redeploy"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.12)"; (e.currentTarget as HTMLElement).style.color = "#fbbf24"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "#f59e0b"; }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
          </>
        )}

        {/* Stopped state */}
        {dep.status === "stopped" && (
          <>
            <button
              onClick={() => onStart(dep.id)}
              style={{
                flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: 6, borderRadius: 12, background: "#059669", color: "#fff",
                fontSize: 12, fontWeight: 600, padding: "8px 12px", border: "none",
                cursor: "pointer", transition: "background .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#047857"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#059669"; }}
            >
              <Play style={{ width: 14, height: 14 }} /> Wake up
            </button>
            <button
              onClick={() => setShowRedeployModal(true)}
              style={{ ...iconBtn, color: "#f59e0b" }}
              title="Redeploy"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.12)"; (e.currentTarget as HTMLElement).style.color = "#fbbf24"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "#f59e0b"; }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{ ...iconBtn, color: "#f87171" }}
              title="Delete"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </>
        )}

        {/* Failed state */}
        {dep.status === "failed" && (
          <>
            <button
              onClick={() => setShowRedeployModal(true)}
              style={{
                flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: 6, borderRadius: 12, background: "var(--primary)", color: "var(--primary-ink)",
                fontSize: 12, fontWeight: 600, padding: "8px 12px", border: "none",
                cursor: "pointer", transition: "opacity .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} /> Redeploy
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{ ...iconBtn, color: "#f87171" }}
              title="Delete"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </>
        )}
      </div>
    </div>
    </>
  );
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "128px 0", gap: 20, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Server style={{ width: 28, height: 28, color: "var(--fg-dim)" }} />
      </div>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)" }}>No deployments yet</h3>
        <p style={{ fontSize: 14, color: "var(--fg-mute)", marginTop: 4, maxWidth: 280 }}>
          Browse open-source alternatives and hit &quot;Host This&quot; to spin up your first deployment.
        </p>
      </div>
      <Link
        href="/browse"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          borderRadius: 12, background: "var(--primary)", color: "var(--primary-ink)",
          fontWeight: 600, padding: "12px 24px", fontSize: 14, textDecoration: "none",
          transition: "opacity .15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      >
        Browse apps
        <ArrowRight style={{ width: 16, height: 16 }} />
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

  const redeployDeployment = useCallback(async (id: string) => {
    const headers = await authHeaders();
    const r = await fetch(`${API}/api/deploy/${id}/redeploy`, { method: "POST", headers });
    if (r.ok) fetchDeployments();
  }, [fetchDeployments]);

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
  const active  = deployments.filter(d => ["deploying", "queued", "starting", "stopping", "deleting"].includes(d.status));
  const stopped = deployments.filter(d => d.status === "stopped");
  const failed  = deployments.filter(d => d.status === "failed");

  const sorted = [...live, ...active, ...stopped, ...failed];

  const cardProps = {
    onRefresh: fetchDeployments,
    onDelete: deleteDeployment,
    onStop: stopDeployment,
    onStart: startDeployment,
    onKeepAlive: keepAlive,
    onRedeploy: redeployDeployment,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--fg)" }}>

      <Nav />

      <main style={{ flex: 1, maxWidth: 1152, margin: "0 auto", width: "100%", padding: "40px 32px" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--fg)" }}>My Deployments</h1>
          <button
            onClick={fetchDeployments}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-1)",
              color: "var(--fg-mute)", fontSize: 13, fontWeight: 500,
              padding: "8px 14px", cursor: "pointer", transition: "background .15s, color .15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            Refresh
          </button>
        </div>

        {/* Stats bar */}
        {!loading && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 32 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)", color: "#34d399", fontSize: 12, fontWeight: 500, padding: "4px 12px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              {live.length} Live
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--fg-mute)", fontSize: 12, fontWeight: 500, padding: "4px 12px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid var(--fg-dim)", display: "inline-block" }} />
              {stopped.length} Sleeping
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)", color: "#60a5fa", fontSize: 12, fontWeight: 500, padding: "4px 12px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
              {active.length} In progress
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12, fontWeight: 500, padding: "4px 12px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
              {failed.length} Failed
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 16, border: "1px solid var(--line)", background: "var(--bg-1)", height: 192 }} className="animate-pulse" />
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {sorted.map(d => (
              <DeploymentCard key={d.id} dep={d} {...cardProps} />
            ))}
          </div>
        )}

      </main>

      <footer style={{ borderTop: "1px solid var(--line)", background: "color-mix(in oklab, var(--bg) 90%, black)", marginTop: "auto" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, fontWeight: 700, color: "var(--fg-dim)" }}>barf. © 2026</span>
          <Link href="/browse" style={{ fontSize: 11, color: "var(--fg-dim)", textDecoration: "none", transition: "color .15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg-dim)"; }}
          >
            Browse apps →
          </Link>
        </div>
      </footer>

      {!loading && (
        <BarfyWidget
          title="Dashboard"
          context={`The user is on their barf.dev dashboard. They have ${deployments.length} total deployments: ${live.length} live (${live.map(d => d.app_slug).join(', ') || 'none'}), ${stopped.length} sleeping, ${active.length} in progress, ${failed.length} failed. Help them manage their deployments, understand their options, wake up sleeping apps, or decide what to deploy next. barf.dev lets you deploy open-source apps like n8n, Gitea, Umami, Vaultwarden in one click on your own Azure account.`}
        />
      )}

    </div>
  );
}
