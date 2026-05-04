"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "../components/Nav";
import { createClient } from "@/utils/supabase/client";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-[#252525]">Email</label>
        <input
          id="email" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="border border-[#CFCFCF] rounded-xl px-4 py-2.5 text-[#252525] text-sm placeholder:text-[#CFCFCF] focus:outline-none focus:ring-2 focus:ring-[#252525] transition"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-[#252525]">Password</label>
        <input
          id="password" type="password" autoComplete="new-password" required minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="border border-[#CFCFCF] rounded-xl px-4 py-2.5 text-[#252525] text-sm placeholder:text-[#CFCFCF] focus:outline-none focus:ring-2 focus:ring-[#252525] transition"
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit" disabled={loading}
        className="bg-[#252525] text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-[#545454] transition-colors disabled:opacity-50 mt-1"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F8] text-[#252525]">
      <Nav />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm bg-white border border-[#CFCFCF] rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Create account</h1>
          <p className="text-sm text-[#7D7D7D] mb-6">Start deploying open-source apps in seconds.</p>

          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>

          <p className="text-sm text-[#7D7D7D] text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#252525] font-medium hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
