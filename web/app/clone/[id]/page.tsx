import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

const mono = "'GeistMono', 'Fira Code', monospace";
const sans = "'Geist', 'DM Sans', system-ui, sans-serif";

async function startBuild(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/build/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  redirect(`/clone/${id}`);
}

export default async function Page({ params }: any) {
  const { id } = await params;

  const supabase = createClient(await cookies());

  const { data: target } = await supabase
    .from("extractions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return (
      <div style={{
        background: "#0a0a0a", minHeight: "100vh", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: mono, color: "#fff", gap: "16px",
      }}>
        <p style={{ fontSize: "12px", color: "#666", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          404 — Extraction not found
        </p>
        <Link href="/" style={{
          color: "#fff", fontSize: "13px", border: "1px solid #333",
          padding: "8px 18px", borderRadius: "999px", textDecoration: "none",
        }}>
          ← Back home
        </Link>
      </div>
    );
  }

  const cost = target.cost_report || {};
  const features: string[] = cost?.userReport?.whatYouGet || [];
  const limitations: string[] = cost?.userReport?.limitations || [];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: sans, color: "#fff" }}>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: "56px", borderBottom: "1px solid #1f1f1f",
        position: "sticky", top: 0, zIndex: 50, background: "#0a0a0a",
      }}>
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: "8px",
          color: "#fff", textDecoration: "none", fontSize: "14px",
          fontWeight: 600, letterSpacing: "-0.02em",
        }}>
          <span style={{ width: "22px", height: "22px", background: "#fff", borderRadius: "5px", display: "inline-block" }} />
          barf
        </Link>
        <Link href="/" style={{ color: "#555", fontSize: "13px", textDecoration: "none", letterSpacing: "0.02em" }}>
          ← Back
        </Link>
      </nav>

      {/* BODY */}
      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "52px 32px 96px" }}>

        {/* HERO */}
        <div style={{ marginBottom: "52px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "#141414", border: "1px solid #222", borderRadius: "999px",
            padding: "5px 13px", marginBottom: "18px",
            fontSize: "11px", fontFamily: mono, color: "#555", letterSpacing: "0.02em",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
            {target.product_url}
          </div>

          <h1 style={{ fontSize: "clamp(30px, 5vw, 50px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05, margin: 0 }}>
            {target.product_name}
          </h1>
          <div style={{ width: "44px", height: "3px", background: "#4ade80", borderRadius: "2px", marginTop: "14px" }} />

          {/* BUILD BUTTON */}
          <form action={startBuild} style={{ marginTop: "28px" }}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "#4ade80", color: "#000",
                fontSize: "13px", fontWeight: 700, letterSpacing: "0.02em",
                border: "none", borderRadius: "999px",
                padding: "10px 22px", cursor: "pointer",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Start Build
            </button>
          </form>
        </div>

        {/* COST */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "40px" }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#555", fontFamily: mono, marginBottom: "8px" }}>Build Cost</div>
            <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em" }}>{cost?.userReport?.barfGenerationCost || "—"}</div>
          </div>
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(74,222,128,0.6)", fontFamily: mono, marginBottom: "8px" }}>SaaS Monthly</div>
            <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", color: "#4ade80" }}>{cost?.userReport?.currentToolMonthlyCost || "—"}</div>
          </div>
        </div>

        {/* ARCHITECTURE */}
        <Section title="Architecture">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
            {[
              { label: "Auth",      value: String(cost?.compute?.hasAuth ?? "—") },
              { label: "Database",  value: cost?.compute?.database || "—" },
              { label: "Email",     value: String(cost?.compute?.hasEmail ?? "—") },
              { label: "Realtime",  value: String(cost?.compute?.hasRealtime ?? "—") },
              { label: "DB Tables", value: String(cost?.compute?.estimatedDbTables ?? "—") },
            ].map((item) => (
              <div key={item.label} style={{ background: "#111", border: "1px solid #222", borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px", fontFamily: mono }}>{item.label}</div>
                <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: mono, color: item.value === "true" ? "#4ade80" : item.value === "false" ? "#333" : "#fff" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* FEATURES */}
        {features.length > 0 && (
          <Section title={`Features · ${features.length}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 14px", background: "#111", border: "1px solid #222", borderRadius: "8px", fontSize: "14px", lineHeight: 1.5 }}>
                  <span style={{ color: "#4ade80", fontSize: "11px", fontFamily: mono, marginTop: "2px", flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* LIMITATIONS */}
        {limitations.length > 0 && (
          <Section title="Limitations">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {limitations.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 14px", background: "#111", border: "1px solid #222", borderRadius: "8px", fontSize: "14px", lineHeight: 1.5 }}>
                  <span style={{ color: "#444", fontSize: "11px", fontFamily: mono, marginTop: "2px", flexShrink: 0 }}>⚠</span>
                  <span style={{ color: "#666" }}>{l}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* RAW */}
        <Section title="Raw Data">
          <pre style={{ background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "20px", fontSize: "11px", fontFamily: mono, color: "#555", overflowX: "auto", lineHeight: 1.6, margin: 0 }}>
            {JSON.stringify(cost, null, 2)}
          </pre>
        </Section>

      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "36px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
        <h2 style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555", margin: 0, whiteSpace: "nowrap", fontFamily: mono }}>
          {title}
        </h2>
        <div style={{ flex: 1, height: "1px", background: "#1f1f1f" }} />
      </div>
      {children}
    </div>
  );
}