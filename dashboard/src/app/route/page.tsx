"use client";

import { useState } from "react";
import Link from "next/link";

interface Allocation {
  voteAccount: string;
  name: string | null;
  allocationSol: number;
  allocationPercent: number;
  expectedYieldPercent: number;
  decentralizationScore: number;
  isRisingStar: boolean;
  reason: string;
}

interface RouteResult {
  allocations: Allocation[];
  summary: {
    expectedYieldPercent: number;
    avgDecentralizationScore: number;
    risingStarsCount: number;
    diversificationScore: number;
  };
  warnings: string[];
}

export default function RoutePage() {
  const [amount, setAmount] = useState(100);
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [decentralization, setDecentralization] = useState<"none" | "moderate" | "strong">("moderate");
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calculateRoute() {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/route-stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountSol: amount,
          riskTolerance,
          decentralizationPreference: decentralization,
          maxValidators: 5,
        }),
      });

      if (!res.ok) throw new Error("Failed to calculate route");

      const data = await res.json();
      setResult(data.route);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      <div className="absolute inset-x-0 top-0 h-[400px] bg-radial pointer-events-none" />
      
      <Header />

      <main className="relative">
        {/* Hero */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-16 px-6">
          <div className="container-lg text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm mb-8 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Route My Stake
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
              Smart allocation based on your goals. Tell us what matters to you.
            </p>
          </div>
        </section>

        <div className="container-lg px-6 pb-24">
          <div className="max-w-2xl mx-auto">
            {/* Input Form */}
            <section className="card p-8 mb-8">
              {/* Amount */}
              <div className="mb-10">
                <label className="block text-sm font-medium mb-4">
                  How much SOL to stake?
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="10"
                    max="5000"
                    step="10"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                    style={{
                      background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((amount - 10) / 4990) * 100}%, var(--border) ${((amount - 10) / 4990) * 100}%, var(--border) 100%)`
                    }}
                  />
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-[var(--text-muted)]">10 SOL</span>
                    <span className="stat-value !text-4xl">{amount.toLocaleString()}</span>
                    <span className="text-xs text-[var(--text-muted)]">5,000 SOL</span>
                  </div>
                </div>
              </div>

              {/* Risk Tolerance */}
              <div className="mb-10">
                <label className="block text-sm font-medium mb-4">
                  Risk tolerance
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: "low", label: "Conservative", desc: "Stable yields" },
                    { key: "medium", label: "Balanced", desc: "Mix of stable & growth" },
                    { key: "high", label: "Aggressive", desc: "Chase alpha" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setRiskTolerance(opt.key as typeof riskTolerance)}
                      className={`p-5 rounded-xl border text-center transition-all ${
                        riskTolerance === opt.key
                          ? "bg-[var(--accent)]/10 border-[var(--accent)]/50"
                          : "bg-[var(--bg-primary)] border-[var(--border)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <div className={`font-semibold ${riskTolerance === opt.key ? "text-[var(--accent)]" : ""}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Decentralization */}
              <div className="mb-10">
                <label className="block text-sm font-medium mb-4">
                  Decentralization preference
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: "none", label: "None", desc: "Pure yield focus" },
                    { key: "moderate", label: "Moderate", desc: "Some small validators" },
                    { key: "strong", label: "Strong", desc: "Prioritize underdogs" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setDecentralization(opt.key as typeof decentralization)}
                      className={`p-5 rounded-xl border text-center transition-all ${
                        decentralization === opt.key
                          ? "bg-purple-500/10 border-purple-500/50"
                          : "bg-[var(--bg-primary)] border-[var(--border)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <div className={`font-semibold ${decentralization === opt.key ? "text-purple-400" : ""}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate Button */}
              <button
                onClick={calculateRoute}
                disabled={loading}
                className="w-full btn-primary text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Calculating...
                  </span>
                ) : (
                  "Get Recommendation →"
                )}
              </button>
            </section>

            {/* Error */}
            {error && (
              <div className="card p-5 border-red-500/30 text-center mb-8">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <section className="animate-fade-in">
                {/* Summary */}
                <div className="card p-8 mb-6 bg-[var(--accent)]/5 border-[var(--accent)]/20">
                  <h2 className="text-xl font-bold mb-6 text-center">Your Optimized Allocation</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="stat-value !text-3xl text-[var(--accent)]">
                        {result.summary.expectedYieldPercent.toFixed(2)}%
                      </div>
                      <div className="stat-label">Expected Yield</div>
                    </div>
                    <div>
                      <div className="stat-value !text-3xl">
                        {result.summary.diversificationScore.toFixed(0)}
                      </div>
                      <div className="stat-label">Diversification</div>
                    </div>
                    <div>
                      <div className="stat-value !text-3xl text-amber-400">
                        {result.summary.risingStarsCount}
                      </div>
                      <div className="stat-label">Rising Stars</div>
                    </div>
                    <div>
                      <div className="stat-value !text-3xl">
                        {result.summary.avgDecentralizationScore.toFixed(0)}
                      </div>
                      <div className="stat-label">Decentralization</div>
                    </div>
                  </div>
                </div>

                {/* Allocations */}
                <div className="space-y-4 mb-8">
                  {result.allocations.map((alloc) => (
                    <div key={alloc.voteAccount} className="card p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-14 h-14 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center font-bold text-[var(--accent)] text-lg">
                            {alloc.allocationPercent.toFixed(0)}%
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate text-lg">
                                {alloc.name || "Validator"}
                              </h3>
                              {alloc.isRisingStar && (
                                <span className="badge">🌟 Rising</span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">{alloc.reason}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-bold">{alloc.allocationSol.toFixed(1)} SOL</div>
                          <div className="text-sm text-[var(--text-muted)]">
                            ~{alloc.expectedYieldPercent.toFixed(2)}% yield
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="card p-5 border-amber-500/30 mb-8">
                    <p className="text-sm text-amber-400">
                      ⚠️ {result.warnings.join(" ")}
                    </p>
                  </div>
                )}

                {/* Action */}
                <div className="text-center">
                  <p className="text-[var(--text-muted)] mb-6">
                    Execute this allocation via your preferred staking interface.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <a
                      href="https://jito.network/staking"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                    >
                      Stake on Jito
                    </a>
                    <a
                      href="https://marinade.finance/app/stake"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      Stake on Marinade
                    </a>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Header Component
function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border)]">
      <div className="container-lg">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-lg font-semibold hidden sm:inline">StakePilot</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/compare" className="btn-ghost">
              Compare
            </Link>
            <Link href="/discover" className="btn-ghost">
              Discover
            </Link>
            <Link href="/route" className="btn-ghost text-[var(--text-primary)]">
              Route
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
