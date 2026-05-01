"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { use } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Star,
  Loader2,
  CheckCircle2,
  Circle,
  Server,
  Globe,
  Shield,
  Package,
} from "lucide-react";
import { GithubIcon } from "../../components/GithubIcon";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface OssApp {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  replaces: string;
  github_url: string;
  website_url: string;
  docker_image: string;
  default_port: number;
  stars: number;
  license: string;
  language: string;
  logo_url: string | null;
  has_docker: boolean;
  self_hostable: boolean;
  featured: boolean;
  features: string[];
}

type DeployState = "idle" | "loading" | "success" | "error";

export default function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [app, setApp] = useState<OssApp | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deployState, setDeployState] = useState<DeployState>("idle");
  const [deployId, setDeployId] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/apps/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setApp(data.app ?? data); })
      .catch(() => setNotFound(true));
  }, [slug]);

  // poll deployment status
  useEffect(() => {
    if (!deployId || deployState !== "loading") return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/deploy/${deployId}`);
        const data = await r.json();
        setPollCount((c) => c + 1);
        if (data.status === "live") {
          setDeployUrl(data.live_url);
          setDeployState("success");
          clearInterval(id);
        } else if (data.status === "failed") {
          setDeployState("error");
          clearInterval(id);
        }
      } catch {
        // keep polling
      }
    }, 4000);
    return () => clearInterval(id);
  }, [deployId, deployState]);

  async function handleDeploy() {
    if (!app) return;
    setDeployState("loading");
    try {
      const r = await fetch(`${API}/api/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_slug: app.slug, app_id: app.id }),
      });
      if (!r.ok) throw new Error("Deploy failed");
      const data = await r.json();
      setDeployId(data.id);
    } catch {
      setDeployState("error");
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50">
        <span className="text-5xl">🤷</span>
        <h1 className="text-2xl font-bold">App not found</h1>
        <p className="text-zinc-500 text-sm">We don&apos;t have <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{slug}</code> in the directory yet.</p>
        <Link href="/browse" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4">
          <ArrowLeft className="w-4 h-4" /> Back to browse
        </Link>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const fmtStars = app.stars >= 1000 ? `${(app.stars / 1000).toFixed(1)}k` : String(app.stars);
  const features: string[] = Array.isArray(app.features) ? app.features : [];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50">

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/assets/logo.jpg" alt="barf" width={22} height={22} className="rounded-sm object-contain" />
            <span className="font-mono text-sm font-bold tracking-tight">barf.</span>
          </Link>

          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
            <Link href="/browse" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">browse</Link>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-50">{app.slug}</span>
          </div>

          <Link href="/browse"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm font-medium px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Browse
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">

          {/* ── Hero row ────────────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">

            {/* left — app info */}
            <div className="flex-1 flex flex-col gap-6">

              {/* app header */}
              <div className="flex items-start gap-4">
                {app.logo_url ? (
                  <img src={app.logo_url} alt={app.name} className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-500 font-mono shrink-0">
                    {app.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
                    {app.featured && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wide">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[15px]">{app.tagline}</p>
                </div>
              </div>

              {/* meta badges */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                  <Package className="w-3 h-3" />{app.category}
                </span>
                {app.replaces && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                    Replaces {app.replaces}
                  </span>
                )}
                {app.stars > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{fmtStars} stars
                  </span>
                )}
                {app.license && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                    <Shield className="w-3 h-3" />{app.license}
                  </span>
                )}
                {app.language && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                    {app.language}
                  </span>
                )}
              </div>

              {/* description */}
              {app.description && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                  <h2 className="text-sm font-semibold mb-3 uppercase tracking-widest text-zinc-400 font-mono text-[11px]">About</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{app.description}</p>
                </div>
              )}

              {/* features */}
              {features.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                  <h2 className="text-[11px] font-semibold mb-4 uppercase tracking-widest text-zinc-400 font-mono">Features</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* links */}
              <div className="flex flex-wrap gap-3">
                {app.github_url && (
                  <a href={app.github_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <GithubIcon className="w-4 h-4" />
                    View on GitHub
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>
                )}
                {app.website_url && (
                  <a href={app.website_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <Globe className="w-4 h-4" />
                    Website
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>
                )}
              </div>
            </div>

            {/* right — deploy card */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="sticky top-20">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-5">

                  <div>
                    <h2 className="text-lg font-bold">Host {app.name}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Deploy a fully managed instance in under 2 minutes. Free tier available.
                    </p>
                  </div>

                  {/* deployment checklist */}
                  <ul className="flex flex-col gap-2">
                    {[
                      { icon: Server, label: "Auto-configured Docker container" },
                      { icon: Globe, label: "Live URL on your own subdomain" },
                      { icon: Shield, label: "Your data, never ours" },
                    ].map(({ icon: Icon, label }) => (
                      <li key={label} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Icon className="w-4 h-4 text-emerald-500 shrink-0" />
                        {label}
                      </li>
                    ))}
                  </ul>

                  {/* deploy states */}
                  {deployState === "idle" && (
                    <button
                      onClick={handleDeploy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-semibold py-3 hover:opacity-90 transition-opacity text-[15px]"
                    >
                      Host This
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {deployState === "loading" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 justify-center py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Spinning up… {pollCount > 0 && `(${pollCount * 4}s)`}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono text-center">
                        Docker container deploying. Hang tight.
                      </p>
                    </div>
                  )}

                  {deployState === "success" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 justify-center py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Deployment live!
                      </div>
                      {deployUrl ? (
                        <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                          <Globe className="w-4 h-4" />
                          Open your app
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                        </a>
                      ) : (
                        <Link href="/dashboard"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                          View in dashboard
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  )}

                  {deployState === "error" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col items-center gap-1 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-600 dark:text-red-400 text-center">
                        <Circle className="w-4 h-4" />
                        Deployment failed
                      </div>
                      <button onClick={() => setDeployState("idle")}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        Try again
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] font-mono text-zinc-400 text-center">
                    Free tier: 10 deployments/mo · No card required
                  </p>
                </div>

                {app.has_docker && app.docker_image && (
                  <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 dark:bg-zinc-950 px-4 py-3">
                    <p className="text-[10px] font-mono text-zinc-500 mb-1 uppercase tracking-widest">Docker image</p>
                    <code className="text-xs font-mono text-emerald-400 break-all">{app.docker_image}</code>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-zinc-400">barf. © 2025</span>
          <Link href="/browse" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to browse
          </Link>
        </div>
      </footer>

    </div>
  );
}
