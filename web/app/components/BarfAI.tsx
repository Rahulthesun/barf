"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, ChevronDown, ChevronUp, Loader2, Bot, User } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const QUICK_PROMPTS = [
  "How do I log in for the first time?",
  "Walk me through the first steps",
  "What are the default credentials?",
  "How do I invite team members?",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser
          ? "bg-violet-600 dark:bg-violet-500"
          : "bg-violet-100 dark:bg-violet-950/60"
      }`}>
        {isUser
          ? <User className="w-3 h-3 text-white" />
          : <Bot className="w-3 h-3 text-violet-600 dark:text-violet-400" />
        }
      </div>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "bg-violet-600 dark:bg-violet-500 text-white rounded-tr-sm"
          : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-tl-sm"
      }`}>
        {msg.content
          ? <MarkdownText text={msg.content} isUser={isUser} />
          : msg.streaming
            ? <span className="inline-flex gap-1 items-center text-zinc-400 dark:text-zinc-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
              </span>
            : null
        }
      </div>
    </div>
  );
}

function MarkdownText({ text, isUser }: { text: string; isUser: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className={`rounded px-1 py-0.5 text-[11px] font-mono ${
              isUser
                ? "bg-violet-700/40 text-violet-100"
                : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200"
            }`}>
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
      })}
    </>
  );
}

export function Barfy({ appSlug, appName, liveUrl }: {
  appSlug: string;
  appName: string;
  liveUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !hasStarted) {
      setHasStarted(true);
      sendMessage("Hello! Give me a quick 2-sentence welcome and tell me the very first thing I should do to get started.", true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string, isAuto = false) => {
    const userMsg: Message = { role: "user", content: text };

    if (!isAuto) {
      setMessages(prev => [...prev, userMsg]);
      setInput("");
    }

    const apiMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/ai/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_slug: appSlug,
          live_url: liveUrl,
          messages: apiMessages,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("AI service unavailable");
      }

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
                if (last?.role === "assistant") {
                  next[next.length - 1] = { ...last, content: assembled, streaming: false };
                }
                return next;
              });
            } else if (evt.type === "error") {
              throw new Error(evt.message);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: "Sorry, I couldn't reach the AI right now. Try again in a moment.", streaming: false };
        }
        return next;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [appSlug, liveUrl, messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    sendMessage(text);
  }

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* header — always visible, click to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Barfy</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">AI setup guide for {appName}</p>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          : <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        }
      </button>

      {open && (
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          {/* message list */}
          <div className="h-72 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <Sparkles className="w-5 h-5 text-violet-400 dark:text-violet-500" />
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading your guide…</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* quick prompts */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-[11px] rounded-full border border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 px-2.5 py-1 hover:bg-violet-100 dark:hover:bg-violet-950/60 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Ask anything about ${appName}…`}
              disabled={loading}
              className="flex-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-40 shrink-0"
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
