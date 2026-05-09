"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, RefreshCw, Sparkles,
  Send, Loader2, User, PanelRightClose, PanelRightOpen, RotateCcw,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { RedeployConfirmModal } from "@/app/components/DeleteConfirmModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Deployment {
  id: string;
  app_slug: string;
  status: string;
  live_url: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer (bold + inline code)
// ─────────────────────────────────────────────────────────────────────────────

function MarkdownText({ text, isUser }: { text: string; isUser: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code
              key={i}
              className={`rounded px-1 py-0.5 text-[11px] font-mono ${
                isUser
                  ? "bg-black/20 text-white/90"
                  : "bg-zinc-700/60 text-zinc-200"
              }`}
            >
              {part.slice(1, -1)}
            </code>
          );
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Context helpers — map iframe URL path → human-readable state + quick prompts
// ─────────────────────────────────────────────────────────────────────────────

function describeIframePath(appSlug: string, path: string): string {
  if (appSlug === "n8n") {
    if (path === "/" || path === "")               return "n8n home — probably the setup wizard or workflow list";
    if (path.startsWith("/setup"))                 return "first-time owner setup page — user needs to create their account before anything else";
    if (path.startsWith("/home"))                  return "workflow dashboard — showing list of all workflows";
    if (path.includes("/workflow/new"))            return "new workflow editor — blank canvas, user is building a workflow from scratch";
    if (/\/workflow\/[^/]+/.test(path))            return "workflow editor — user is editing an existing workflow";
    if (path.startsWith("/workflows"))             return "workflows list page";
    if (path.startsWith("/credentials"))           return "credentials manager — user is adding or managing API keys/connections";
    if (path.startsWith("/executions"))            return "execution history — user is reviewing past workflow runs / debugging";
    if (path.startsWith("/settings/users"))        return "user management — user wants to invite team members or manage roles";
    if (path.startsWith("/settings/api"))          return "API keys settings";
    if (path.startsWith("/settings"))              return "settings page";
    if (path.startsWith("/templates"))             return "templates library — user is browsing pre-built workflows";
  }
  return `current path: ${path}`;
}

function getQuickPrompts(appSlug: string, path?: string): string[] {
  if (appSlug === "n8n") {
    if (path?.startsWith("/setup"))
      return ["How do I fill this in?", "What password rules?", "What happens after setup?"];
    if (path?.startsWith("/home") || path === "/" || !path)
      return ["Create my first workflow", "What can I automate?", "How do webhooks work?", "Invite a team member"];
    if (path?.includes("/workflow"))
      return ["Add a trigger", "Connect to another app", "How do I test this?", "Schedule this workflow"];
    if (path?.startsWith("/credentials"))
      return ["Add a Google account", "Where do I find my API key?", "Connect Slack"];
    if (path?.startsWith("/executions"))
      return ["Why did this run fail?", "How do I retry a failed run?", "Read the error log"];
    if (path?.startsWith("/settings/users"))
      return ["Invite someone", "What can members do?", "Remove a user"];
  }
  return ["What do I do first?", "Walk me through the setup", "What are the default credentials?"];
}

export default function AppEmbedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Deployment + app meta
  const [dep, setDep] = useState<Deployment | null>(null);
  const [appName, setAppName] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Iframe controls
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showRedeployModal, setShowRedeployModal] = useState(false);
  const [redeploying, setRedeploying] = useState(false);

  // Barfy panel
  const [panelOpen, setPanelOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live iframe context — updated via postMessage bridge injected by nginx
  const [iframePath, setIframePath] = useState<string | undefined>(undefined);
  const [iframeTitle, setIframeTitle] = useState<string | undefined>(undefined);
  const iframePathRef = useRef<string | undefined>(undefined);

  // ── Load deployment ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) { router.push("/login"); return; }

      const r = await fetch(`${API}/api/deploy/${id}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      if (!r.ok) { setNotFound(true); setLoading(false); return; }

      const data: Deployment = await r.json();
      setDep(data);

      // Fetch readable app name
      const ar = await fetch(`${API}/api/apps/${data.app_slug}`);
      if (ar.ok) {
        const app = await ar.json();
        setAppName(app.name ?? data.app_slug);
      } else {
        setAppName(data.app_slug);
      }

      setLoading(false);
    }
    load();
  }, [id, router]);

  // ── Bridge: receive page context from the injected script in the iframe ────
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type !== "barf" || !e.data.url) return;
      try {
        const path = new URL(e.data.url).pathname;
        iframePathRef.current = path;
        setIframePath(path);
        setIframeTitle(e.data.title ?? undefined);
        setIframeLoaded(true); // navigation inside the app = definitely loaded
      } catch { /* ignore malformed URLs */ }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Reset iframe loaded state on refresh ──────────────────────────────────
  useEffect(() => { setIframeLoaded(false); }, [iframeKey]);

  // ── Auto-retry iframe after 20s if still not loaded (app warming up) ──────
  useEffect(() => {
    if (iframeLoaded) return;
    const t = setTimeout(() => setIframeKey(k => k + 1), 20_000);
    return () => clearTimeout(t);
  }, [iframeKey, iframeLoaded]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Kick off Barfy when panel opens ───────────────────────────────────────
  useEffect(() => {
    if (panelOpen && dep?.live_url && !hasStarted) {
      setHasStarted(true);
      sendMessage(
        "Give me a quick 2-sentence welcome and tell me the very first thing I should do to get started.",
        true
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen, dep?.live_url]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string, isAuto = false) => {
      if (!dep) return;

      if (!isAuto) {
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setInput("");
      }

      const apiMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);
      setChatLoading(true);

      try {
        const currentPath = iframePathRef.current;
        const pageContext = [
          `App: ${appName || dep.app_slug}`,
          `Live URL: ${dep.live_url}`,
          `Status: ${dep.status}`,
          currentPath
            ? `User is currently on: ${describeIframePath(dep.app_slug, currentPath)} (path: ${currentPath})`
            : iframeLoaded
              ? `The user is actively using ${appName || dep.app_slug} in the embedded view.`
              : `The app is still loading — the user may be seeing the setup wizard or loading screen.`,
          iframeTitle ? `Page title: "${iframeTitle}"` : "",
        ].filter(Boolean).join("\n");

        const res = await fetch(`${API}/api/ai/onboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_slug: dep.app_slug,
            live_url: dep.live_url,
            context: pageContext,
            messages: apiMessages,
          }),
        });

        if (!res.ok || !res.body) throw new Error("Barfy unavailable");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === "delta" && evt.content) {
                assembled += evt.content;
                setMessages(prev => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant")
                    next[next.length - 1] = { ...last, content: assembled, streaming: false };
                  return next;
                });
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant")
            next[next.length - 1] = {
              ...last,
              content: "Couldn't reach Barfy right now. Try again in a moment.",
              streaming: false,
            };
          return next;
        });
      } finally {
        setChatLoading(false);
        inputRef.current?.focus();
      }
    },
    [dep, messages]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || chatLoading) return;
    sendMessage(text);
  }

  async function handleRedeploy() {
    if (!dep) return;
    setRedeploying(true);
    const { data: { session } } = await createClient().auth.getSession();
    if (!session) { router.push("/login"); return; }
    const r = await fetch(`${API}/api/deploy/${dep.id}/redeploy`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${session.access_token}` },
    });
    if (r.ok) {
      const newDep = await r.json();
      router.push(`/apps/${newDep.id}`);
    } else {
      setRedeploying(false);
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  if (notFound || !dep || !dep.live_url) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-zinc-950 text-center px-4">
        <p className="text-white font-bold text-lg">App not available</p>
        <p className="text-zinc-400 text-sm">
          {dep?.status === "stopped"
            ? "This app is sleeping. Start it from the dashboard first."
            : "Deployment not found or not yet live."}
        </p>
        <Link href="/dashboard" className="text-[var(--primary)] hover:opacity-80 text-sm underline underline-offset-2">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
    {showRedeployModal && dep && (
      <RedeployConfirmModal
        appName={appName || dep.app_slug}
        onConfirm={() => { setShowRedeployModal(false); handleRedeploy(); }}
        onCancel={() => setShowRedeployModal(false)}
      />
    )}
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">

        {/* Back */}
        <Link
          href="/dashboard"
          className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>

        <div className="w-px h-4 bg-zinc-800 mx-0.5" />

        {/* App indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[13px] font-semibold text-zinc-100">{appName}</span>
        </div>

        {/* URL bar */}
        <div className="flex-1 mx-3 max-w-lg">
          <div className="h-6 bg-zinc-800/60 border border-zinc-700/40 rounded-md px-2.5 flex items-center">
            <span className="text-[11px] font-mono text-zinc-400 truncate">{dep.live_url}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setIframeKey(k => k + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={dep.live_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setShowRedeployModal(true)}
            disabled={redeploying}
            className="w-7 h-7 flex items-center justify-center rounded-md text-amber-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
            title="Redeploy from scratch"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${redeploying ? "animate-spin" : ""}`} />
          </button>

          <div className="w-px h-4 bg-zinc-800 mx-1" />

          {/* Barfy toggle */}
          <button
            onClick={() => setPanelOpen(o => !o)}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-semibold transition-all ${
              panelOpen
                ? "text-white hover:opacity-90"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700"
            }`}
            style={panelOpen ? { background: "var(--primary)" } : undefined}
          >
            <Sparkles className="w-3 h-3" />
            Barfy
            {panelOpen
              ? <PanelRightClose className="w-3 h-3 opacity-70" />
              : <PanelRightOpen  className="w-3 h-3 opacity-70" />
            }
          </button>
        </div>
      </div>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Iframe */}
        <div className="flex-1 relative bg-zinc-950">
          <iframe
            key={iframeKey}
            src={dep.live_url}
            className="absolute inset-0 w-full h-full border-0"
            title={appName}
            allow="fullscreen"
            onLoad={() => setIframeLoaded(true)}
          />
          {/* Loading overlay — shown until iframe fires onLoad */}
          {!iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 z-10">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-300">{appName} is warming up…</p>
                <p className="text-xs text-zinc-600 mt-1">Usually ready in under 30 seconds</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Barfy panel ─────────────────────────────────────────────────── */}
        {panelOpen && (
          <div className="w-[340px] shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-900">

            {/* Panel header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-800 shrink-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm shadow-[var(--primary)]/30" style={{ background: "var(--primary)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-zinc-100">Barfy</p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {iframePath
                    ? describeIframePath(dep.app_slug, iframePath).split("—")[0].trim()
                    : `AI guide for ${appName}`}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-zinc-500">live</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 no-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <Sparkles className="w-5 h-5 text-[var(--primary)] animate-pulse" />
                  <p className="text-[13px] text-zinc-500">Starting up…</p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div key={i} className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      isUser ? "bg-[var(--primary)]" : "bg-[var(--primary)]/15"
                    }`}>
                      {isUser
                        ? <User className="w-2.5 h-2.5 text-white" />
                        : <Sparkles className="w-2.5 h-2.5 text-[var(--primary)]" />
                      }
                    </div>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                      isUser
                        ? "bg-[var(--primary)] text-white rounded-tr-sm"
                        : "bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700/50"
                    }`}>
                      {msg.content ? (
                        <MarkdownText text={msg.content} isUser={isUser} />
                      ) : msg.streaming ? (
                        <span className="flex items-center gap-1.5 text-zinc-500">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-[12px]">Thinking…</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>

            {/* Quick prompts — context-aware based on current iframe page */}
            {messages.length <= 2 && !chatLoading && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {getQuickPrompts(dep.app_slug, iframePath).map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-[11px] rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)] px-2.5 py-1 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/50 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-3 border-t border-zinc-800 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Ask anything about ${appName}…`}
                disabled={chatLoading}
                className="flex-1 text-[13px] border border-zinc-700 rounded-lg px-3 py-2 bg-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !input.trim()}
                className="w-8 h-8 rounded-lg text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                style={{ background: "var(--primary)" }}
              >
                {chatLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
