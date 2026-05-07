"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon, Sun, LayoutDashboard, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { GithubIcon } from "./GithubIcon";
import { createClient } from "@/utils/supabase/client";

function ThemeButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
    >
      {theme === "dark"
        ? <Sun className="w-[15px] h-[15px]" />
        : <Moon className="w-[15px] h-[15px]" />}
    </button>
  );
}

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
    href === "/browse"
      ? path.startsWith("/browse")
      : path === href;

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${
      scrolled
        ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm"
        : "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-900"
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-6 h-6 rounded-md overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800 group-hover:ring-violet-400 transition-all">
            <Image src="/assets/logo.jpg" alt="barf" width={24} height={24} className="object-cover" />
          </div>
          <span className="font-mono text-[13px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            barf.
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {links.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                isActive(href)
                  ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            aria-label="GitHub"
          >
            <GithubIcon className="w-[15px] h-[15px]" />
          </a>

          {/* Theme toggle */}
          <ThemeButton />

          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-0.5 hidden sm:block" />

          {email ? (
            <>
              <Link
                href="/dashboard"
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  path === "/dashboard"
                    ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:flex px-3 py-1.5 rounded-lg text-[13px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm"
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
