"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "../components/Nav";
import { createClient } from "@/utils/supabase/client";

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: 12, padding: "10px 16px",
  border: "1px solid var(--line-2)", background: "var(--bg-2)",
  color: "var(--fg)", fontSize: 14, outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  boxSizing: "border-box",
};

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push(searchParams.get("next") ?? "/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-mute)" }}>Email</label>
        <input
          id="email" type="email" autoComplete="email" required
          value={email} onChange={e => setEmail(e.target.value)}
          style={inputStyle} placeholder="you@example.com"
          onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-mute)" }}>Password</label>
        <input
          id="password" type="password" autoComplete="new-password" required minLength={6}
          value={password} onChange={e => setPassword(e.target.value)}
          style={inputStyle} placeholder="••••••••"
          onFocus={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--red)" }}>{error}</p>}

      <button
        type="submit" disabled={loading}
        style={{
          borderRadius: 12, padding: "10px 0", fontWeight: 600, fontSize: 14,
          background: "var(--primary)", color: "var(--primary-ink)",
          border: "none", cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1, marginTop: 4, transition: "opacity .15s",
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = loading ? "0.6" : "1"; }}
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--fg)" }}>
      <Nav />

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 16px" }}>
        <div style={{
          width: "100%", maxWidth: 384,
          background: "var(--bg-1)", border: "1px solid var(--line)",
          borderRadius: 20, padding: 32,
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4, color: "var(--fg)" }}>Create account</h1>
          <p style={{ fontSize: 13, color: "var(--fg-mute)", marginBottom: 24 }}>Start deploying open-source apps in seconds.</p>

          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>

          <p style={{ fontSize: 13, color: "var(--fg-mute)", textAlign: "center", marginTop: 24 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--fg)", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
