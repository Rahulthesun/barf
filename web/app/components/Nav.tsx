"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GithubIcon } from "./GithubIcon";
import { createClient } from "@/utils/supabase/client";

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const links = [
    { label: "Browse", href: "/browse" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Docs", href: "#" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#CFCFCF] bg-white/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/assets/logo.jpg" alt="barf" width={22} height={22} className="rounded-sm object-contain" />
          <span className="font-mono text-sm font-bold tracking-tight text-[#252525]">barf.</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6">
          {links.map(({ label, href }) => {
            const active = path === href || (href === "/browse" && path.startsWith("/browse"));
            return (
              <Link key={label} href={href}
                className={`text-sm transition-colors ${active ? "text-[#252525] font-medium" : "text-[#7D7D7D] hover:text-[#252525]"}`}>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="https://github.com" target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[#7D7D7D] hover:text-[#252525] transition-colors px-2 py-1">
            <GithubIcon className="w-4 h-4" />
            Star
          </Link>
          {email ? (
            <>
              <span className="hidden sm:block text-xs text-[#7D7D7D] max-w-[140px] truncate" title={email}>
                {email}
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#CFCFCF] text-[#545454] text-sm font-medium px-3.5 py-1.5 hover:border-[#7D7D7D] hover:text-[#252525] transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-[#CFCFCF] text-[#545454] text-sm font-medium px-3.5 py-1.5 hover:border-[#7D7D7D] hover:text-[#252525] transition-colors">
                Dashboard
              </Link>
              <Link href="/login"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#252525] text-white text-sm font-medium px-3.5 py-1.5 hover:bg-[#545454] transition-colors">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
