"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, CheckCircle2, AlertCircle, Database, Lock, Cpu, Globe, ArrowRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ExtractionState = "idle" | "scraping" | "success" | "error";

export default function NewExtraction() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [state, setState] = useState<ExtractionState>("idle");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productUrl) return;

    setState("scraping");
    setError("");
    setLogs([]);

    try {
      const response = await fetch("http://localhost:3001/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, productUrl }),
      });

      if (!response.body) throw new Error("ReadableStream not supported by browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'log') {
                setLogs(prev => [...prev, parsed.message]);
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message);
              } else if (parsed.type === 'result') {
                setState("success");
                // Navigate to the clone detail page after a brief delay
                setTimeout(() => {
                  router.push(`/clone/${parsed.data.id}`);
                }, 1000);
              }
            } catch (err: any) {
              if (err.message !== "Unexpected end of JSON input" && !err.message.includes("JSON")) throw err;
            }
          }
        }
      }
    } catch (err: any) {
      setState("error");
      setError(err.message);
    }
  };

  const reset = () => {
    setState("idle");
    setProductName("");
    setProductUrl("");
    setLogs([]);
  };

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative flex flex-col items-center py-20 px-4 sm:px-8">
      {/* Brighter Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sky-400/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 space-y-4"
        >
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Link href="/" className="inline-flex items-center justify-center space-x-2 bg-white/50 backdrop-blur-md border border-zinc-200 px-4 py-1.5 rounded-full hover:bg-white transition-colors cursor-pointer text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <div className="inline-flex items-center justify-center space-x-2 bg-white/50 backdrop-blur-md border border-indigo-200 px-4 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-indigo-700">New Analysis</span>
            </div>
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-indigo-900 to-zinc-600 bg-clip-text text-transparent">
            Analyze a Product
          </h1>
          <p className="text-lg text-zinc-600 max-w-xl mx-auto">
            Input a SaaS product and watch as our AI analyzes its features, pricing, and technical architecture in seconds.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* IDLE STATE */}
          {state === "idle" && (
            <motion.form 
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              onSubmit={handleExtract} 
              className="w-full max-w-md bg-white/60 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 ml-1">Product Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Typeform"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm"
                    />
                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-zinc-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 ml-1">Website URL</label>
                  <div className="relative">
                    <input 
                      type="url" 
                      required
                      placeholder="https://typeform.com"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/80 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm"
                    />
                    <Globe className="absolute left-3 top-3.5 w-5 h-5 text-zinc-400" />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full group relative flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 px-4 rounded-xl hover:bg-indigo-700 transition-all overflow-hidden shadow-lg shadow-indigo-600/20"
              >
                <span>Extract Knowledge</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.form>
          )}

          {/* LOADING STATE */}
          {(state === "scraping" || state === "success") && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md flex flex-col items-center justify-center py-12"
            >
              <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-t-4 border-indigo-500 border-r-4 border-transparent"
                />
                <motion.div 
                  animate={{ rotate: -360 }} 
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-2 rounded-full border-b-4 border-sky-400 border-l-4 border-transparent opacity-60"
                />
                {state === "success" ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : (
                  <Cpu className="w-8 h-8 text-indigo-600" />
                )}
              </div>
              
              <h3 className="text-xl font-bold text-zinc-800 mb-2">
                {state === "success" ? "Analysis Complete!" : "Pipeline Active"}
              </h3>
              <p className="text-zinc-500 text-sm text-center max-w-xs mb-8">
                {state === "success" ? "Redirecting to clone dashboard..." : "Streaming real-time logs from Azure AI Foundry."}
              </p>

              {/* Sleek Terminal Log View */}
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 h-48 overflow-y-auto font-mono text-xs shadow-xl flex flex-col">
                <div className="flex gap-2 mb-3 px-1 border-b border-zinc-800 pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                {logs.length === 0 ? (
                  <div className="animate-pulse flex items-center gap-2 text-zinc-400 mt-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    Connecting to engine...
                  </div>
                ) : (
                  <div className="space-y-1.5 flex-1">
                    {logs.map((log, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={log.includes('✓') ? 'text-emerald-400' : log.includes('⚠') ? 'text-amber-400' : log.includes('❌') ? 'text-red-400' : 'text-zinc-300'}
                      >
                        <span className="text-zinc-600 mr-2">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                        {log}
                      </motion.div>
                    ))}
                    <div className="h-4" /> {/* Auto-scroll padding */}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ERROR STATE */}
          {state === "error" && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-red-100 p-8 rounded-3xl shadow-xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Extraction Failed</h3>
                <p className="text-zinc-500 text-sm">{error}</p>
              </div>
              <button 
                onClick={reset}
                className="w-full bg-zinc-900 text-white font-semibold py-3.5 rounded-xl hover:bg-zinc-800 transition-colors shadow-md"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
