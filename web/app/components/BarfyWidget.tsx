"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, Loader2, Bot, User } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
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
        }
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {part}
          </span>
        );
      })}
    </>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? "bg-violet-600" : "bg-violet-900/60"
        }`}
      >
        {isUser ? (
          <User className="w-3 h-3 text-white" />
        ) : (
          <Bot className="w-3 h-3 text-violet-400" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-violet-600 text-white rounded-tr-sm"
            : "bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-tl-sm"
        }`}
      >
        {msg.content ? (
          <MarkdownText text={msg.content} isUser={isUser} />
        ) : msg.streaming ? (
          <span className="inline-flex gap-1 items-center text-zinc-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
          </span>
        ) : null}
      </div>
    </div>
  );
}

function deriveQuickPrompts(title?: string): string[] {
  if (!title) {
    return [
      "What can I deploy?",
      "How does billing work?",
      "Help me manage my apps",
    ];
  }
  const t = title.toLowerCase();
  if (t.includes("dashboard")) {
    return [
      "Wake up a sleeping app",
      "What can I deploy next?",
      "How does auto-stop work?",
    ];
  }
  if (t.includes("n8n")) {
    return [
      "How do I create a workflow?",
      "How do I connect to external services?",
      "What are webhooks?",
    ];
  }
  if (t.includes("gitea")) {
    return [
      "How do I create a repository?",
      "How do I add team members?",
      "How do I set up SSH keys?",
    ];
  }
  if (t.includes("umami")) {
    return [
      "How do I add a website?",
      "How do I read the analytics?",
      "How do I share a report?",
    ];
  }
  if (t.includes("vaultwarden")) {
    return [
      "How do I create a vault?",
      "How do I add team members?",
      "How do I set up 2FA?",
    ];
  }
  return [
    "What can I deploy?",
    "How does billing work?",
    "Help me manage my apps",
  ];
}

export function BarfyWidget({
  context,
  title,
}: {
  context: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickPrompts = deriveQuickPrompts(title);
  const displayTitle = title ?? "Barfy";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string, isAuto = false) => {
      if (!isAuto) {
        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setInput("");
      }

      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", streaming: true },
      ]);
      setLoading(true);

      try {
        const res = await fetch(`${API}/api/ai/onboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_slug: "barf",
            context,
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
              const evt = JSON.parse(line.slice(6)) as {
                type: string;
                content?: string;
                message?: string;
              };
              if (evt.type === "delta" && evt.content) {
                assembled += evt.content;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = {
                      ...last,
                      content: assembled,
                      streaming: false,
                    };
                  }
                  return next;
                });
              } else if (evt.type === "error") {
                throw new Error(evt.message ?? "Unknown error");
              }
            } catch {
              /* skip malformed */
            }
          }
        }

        // If this was an auto-greeting and widget is closed, show unread dot
        if (isAuto) {
          setHasUnread(true);
        }
      } catch {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content:
                "Sorry, I couldn't reach the AI right now. Try again in a moment.",
              streaming: false,
            };
          }
          return next;
        });
      } finally {
        setLoading(false);
        if (!isAuto) {
          inputRef.current?.focus();
        }
      }
    },
    [context, messages]
  );

  // Fire auto-greeting on first open
  useEffect(() => {
    if (open && !hasStarted) {
      setHasStarted(true);
      setHasUnread(false);
      sendMessage(
        "Give me a very brief 1-sentence greeting and ask what I can help with.",
        true
      );
    }
    if (open) {
      setHasUnread(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    sendMessage(text);
  }

  return (
    <>
      {/* Expanded panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[360px] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ height: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-900/60 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <span className="font-semibold text-sm text-zinc-100">
              {displayTitle}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              live
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <p className="text-sm text-zinc-500">Loading your guide…</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && !loading && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-[11px] rounded-full border border-violet-800/60 bg-violet-950/40 text-violet-400 px-2.5 py-1 hover:bg-violet-950/60 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Barfy anything…"
            disabled={loading}
            className="flex-1 text-sm border border-zinc-700 rounded-xl px-3.5 py-2 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-40 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label={open ? "Close Barfy" : "Open Barfy"}
      >
        <Sparkles className="w-6 h-6" />
        {hasUnread && !open && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
        )}
      </button>
    </>
  );
}
