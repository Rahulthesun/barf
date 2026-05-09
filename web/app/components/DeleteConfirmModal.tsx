"use client";

import { Trash2, RefreshCw } from "lucide-react";

const modalCard: React.CSSProperties = {
  background: "var(--bg-1)", border: "1px solid var(--line)",
  borderRadius: 20, maxWidth: 380, width: "100%", margin: "0 16px",
  padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
};

const cancelBtn: React.CSSProperties = {
  flex: 1, borderRadius: 12, border: "1px solid var(--line-2)",
  background: "transparent", padding: "10px 0",
  fontSize: 14, fontWeight: 500, color: "var(--fg-mute)",
  cursor: "pointer", transition: "background .15s, color .15s",
};

export function DeleteConfirmModal({
  appName,
  onConfirm,
  onCancel,
}: {
  appName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 style={{ width: 20, height: 20, color: "#f87171" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--fg)" }}>Delete {appName}?</h2>
            <p style={{ fontSize: 13, color: "var(--fg-mute)", marginTop: 8, lineHeight: 1.6 }}>
              This will permanently destroy your{" "}
              <span style={{ fontWeight: 600, color: "var(--fg)" }}>{appName}</span>{" "}
              container and{" "}
              <span style={{ fontWeight: 600, color: "#f87171" }}>all its data</span>.
              There is no way to recover it.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, width: "100%", paddingTop: 4 }}>
            <button
              onClick={onCancel}
              style={cancelBtn}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{ flex: 1, borderRadius: 12, background: "#dc2626", padding: "10px 0", fontSize: 14, fontWeight: 600, color: "#fff", border: "none", cursor: "pointer", transition: "background .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#b91c1c"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#dc2626"; }}
            >
              Delete &amp; lose all data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RedeployConfirmModal({
  appName,
  onConfirm,
  onCancel,
}: {
  appName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw style={{ width: 20, height: 20, color: "#fbbf24" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--fg)" }}>Redeploy {appName}?</h2>
            <p style={{ fontSize: 13, color: "var(--fg-mute)", marginTop: 8, lineHeight: 1.6 }}>
              This will destroy your current container and{" "}
              <span style={{ fontWeight: 600, color: "#fbbf24" }}>all its data</span>,
              then fresh-install{" "}
              <span style={{ fontWeight: 600, color: "var(--fg)" }}>{appName}</span>.
              There is no way to recover existing data.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, width: "100%", paddingTop: 4 }}>
            <button
              onClick={onCancel}
              style={cancelBtn}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLElement).style.color = "var(--fg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{ flex: 1, borderRadius: 12, background: "var(--primary)", padding: "10px 0", fontSize: 14, fontWeight: 600, color: "var(--primary-ink)", border: "none", cursor: "pointer", transition: "opacity .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              Redeploy from scratch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
