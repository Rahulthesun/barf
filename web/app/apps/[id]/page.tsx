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
                  ? "bg-violet-700/40 text-violet-100"
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
// Page
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "What do I do first?",
  "What are the default credentials?",
  "Walk me through the setup",
  "How do I invite team members?",
];

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
        const res = await fetch(`${API}/api/ai/onboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_slug: dep.app_slug,
            live_url: dep.live_url,
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
        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
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
        <Link href="/dashboard" className="text-violet-400 hover:text-violet-300 text-sm underline underline-offset-2">
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
                ? "bg-violet-600 text-white hover:bg-violet-500"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700"
            }`}
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
        <div className="flex-1 relative bg-white">
          <iframe
            key={iframeKey}
            src={dep.live_url}
            className="absolute inset-0 w-full h-full border-0"
            title={appName}
            allow="fullscreen"
          />
        </div>

        {/* ── Barfy panel ─────────────────────────────────────────────────── */}
        {panelOpen && (
          <div className="w-[340px] shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-900">

            {/* Panel header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-800 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm shadow-violet-500/30">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-zinc-100">Barfy</p>
                <p className="text-[10px] text-zinc-500">AI guide for {appName}</p>
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
                  <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                  <p className="text-[13px] text-zinc-500">Starting up…</p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div key={i} className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      isUser ? "bg-violet-600" : "bg-violet-900/50"
                    }`}>
                      {isUser
                        ? <User className="w-2.5 h-2.5 text-white" />
                        : <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                      }
                    </div>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                      isUser
                        ? "bg-violet-600 text-white rounded-tr-sm"
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

            {/* Quick prompts — visible until conversation is going */}
            {messages.length <= 2 && !chatLoading && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-[11px] rounded-full border border-violet-700/50 bg-violet-950/40 text-violet-400 px-2.5 py-1 hover:bg-violet-950/80 hover:border-violet-500 transition-colors"
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
                className="flex-1 text-[13px] border border-zinc-700 rounded-lg px-3 py-2 bg-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-600 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !input.trim()}
                className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
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
