"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";

const STORAGE_KEY = "barf_launch_banner_dismissed_v1";
const FREE_UNTIL = new Date("2026-05-12T23:59:59Z");

export function LaunchBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed && Date.now() < FREE_UNTIL.getTime()) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const daysLeft = Math.ceil((FREE_UNTIL.getTime() - Date.now()) / 86_400_000);

  return (
    <div className="relative z-50 text-white" style={{ background: "linear-gradient(90deg, var(--primary) 0%, var(--spark) 100%)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-10 flex items-center justify-center gap-2.5 text-sm">
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-white/70" />
        <span className="font-medium">
          Launch week: <span className="font-bold">unlimited free deploys</span> until May 12, 2026
          {daysLeft <= 7 && daysLeft > 0 && (
            <span className="ml-1.5 text-white/70">— {daysLeft}d left</span>
          )}
        </span>
        <span className="hidden sm:inline text-white/70 text-xs font-mono">· No credit card · Your server · Your data</span>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
