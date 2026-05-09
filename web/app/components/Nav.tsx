"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut } from "lucide-react";
import { GithubIcon } from "./GithubIcon";
import { createClient } from "@/utils/supabase/client";

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const links = [
    { label: "Browse", href: "/browse" },
    { label: "Pricing", href: "/#pricing" },
  ];

  const isActive = (href: string) =>
    href === "/browse" ? path.startsWith("/browse") : path === href;

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      backdropFilter: "blur(14px)",
      background: scrolled
        ? "color-mix(in oklab, var(--bg) 92%, transparent)"
        : "color-mix(in oklab, var(--bg) 78%, transparent)",
      borderBottom: `1px solid ${scrolled ? "var(--line-2)" : "var(--line)"}`,
      transition: "background .2s ease, border-color .2s ease",
    }}>
      <div style={{
        maxWidth: 1240, margin: "0 auto", padding: "0 32px",
        height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16,
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line-2)", flexShrink: 0 }}>
            <Image src="/assets/logo.jpg" alt="barf" width={26} height={26} style={{ objectFit: "cover", display: "block" }} />
          </div>
          <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 15, fontWeight: 900, letterSpacing: "-0.04em", color: "var(--fg)" }}>
            barf<span style={{ color: "var(--primary)", display: "inline-block", animation: "dotPulse 2.4s var(--ease) infinite" }}>.</span>
          </span>
        </Link>

        {/* Center nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {links.map(({ label, href }) => {
            const active = isActive(href);
            return (
              <Link
                key={label}
                href={href}
                style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  textDecoration: "none", transition: "background .15s ease, color .15s ease",
                  background: active ? "color-mix(in oklab, var(--primary) 10%, var(--bg-2))" : "transparent",
                  color: active ? "var(--fg)" : "var(--fg-mute)",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--fg)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a
            href="https://github.com/Rahulthesun/barf"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            style={{ display: "flex", width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", color: "var(--fg-mute)", textDecoration: "none", transition: "background .15s ease, color .15s ease" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <GithubIcon className="w-[15px] h-[15px]" />
          </a>

          <div style={{ width: 1, height: 20, background: "var(--line-2)" }} />

          {email ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
                  transition: "background .15s ease, color .15s ease",
                  background: path === "/dashboard" ? "color-mix(in oklab, var(--primary) 10%, var(--bg-2))" : "transparent",
                  color: path === "/dashboard" ? "var(--fg)" : "var(--fg-mute)",
                }}
                onMouseEnter={e => {
                  if (path !== "/dashboard") {
                    (e.currentTarget as HTMLElement).style.color = "var(--fg)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-2)";
                  }
                }}
                onMouseLeave={e => {
                  if (path !== "/dashboard") {
                    (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <LayoutDashboard style={{ width: 14, height: 14 }} />
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "transparent", color: "var(--fg-mute)", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "background .15s ease, color .15s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,91,91,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <LogOut style={{ width: 14, height: 14 }} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "var(--fg-mute)", textDecoration: "none", transition: "color .15s ease, background .15s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg-mute)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, color: "var(--primary-ink)", textDecoration: "none", background: "var(--primary)", boxShadow: "0 0 0 1px var(--primary-glow), 0 4px 16px -4px var(--primary-glow)", transition: "transform .15s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
