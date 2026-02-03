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
  totalStakeSol?: number;
  stakeRank?: string;
  mevDilution?: string;
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

// Advanced filter options
interface AdvancedFilters {
  minUptime: number;      // Minimum uptime % (default 95)
  minAge: number;         // Minimum days online (default 30)
  maxCommission: number;  // Max stake commission % (default 10)
  location: string;       // Country filter ("" = all)
  excludeCountries: string[]; // Countries to exclude
  requireJito: boolean;   // Must run Jito
}

const COUNTRY_OPTIONS = [
  { code: "", label: "🌍 All Locations" },
  { code: "US", label: "🇺🇸 United States" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "FI", label: "🇫🇮 Finland" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "SG", label: "🇸🇬 Singapore" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "FR", label: "🇫🇷 France" },
];

export default function RoutePage() {
  const [amount, setAmount] = useState(100);
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [decentralization, setDecentralization] = useState<"none" | "moderate" | "strong">("moderate");
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced filters
  const [filters, setFilters] = useState<AdvancedFilters>({
    minUptime: 95,
    minAge: 30,
    maxCommission: 10,
    location: "",
    excludeCountries: [],
    requireJito: false,
  });

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
          // Pass advanced filters
          filters: showAdvanced ? filters : undefined,
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

  // Generate native staking URL for Phantom
  function getPhantomStakeUrl(voteAccount: string) {
    return `https://phantom.app/ul/stake/${voteAccount}`;
  }

  // Generate Solflare stake URL
  function getSolflareStakeUrl(voteAccount: string) {
    return `https://solflare.com/stake/${voteAccount}`;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      <div className="absolute inset-x-0 top-0 h-[400px] bg-radial pointer-events-none" />
      
      

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
              Smart native staking allocation. Get recommendations, then stake directly with Phantom or Solflare.
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
                    { key: "low", label: "Conservative", desc: "Stable yields", emoji: "🛡️" },
                    { key: "medium", label: "Balanced", desc: "Mix of stable & growth", emoji: "⚖️" },
                    { key: "high", label: "Aggressive", desc: "Chase alpha", emoji: "🚀" },
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
                      <div className="text-2xl mb-2">{opt.emoji}</div>
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
                    { key: "none", label: "None", desc: "Pure yield focus", emoji: "💰" },
                    { key: "moderate", label: "Moderate", desc: "Some small validators", emoji: "🌱" },
                    { key: "strong", label: "Strong", desc: "Prioritize underdogs", emoji: "🌍" },
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
                      <div className="text-2xl mb-2">{opt.emoji}</div>
                      <div className={`font-semibold ${decentralization === opt.key ? "text-purple-400" : ""}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Filters Toggle */}
              <div className="mb-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced Filters
                </button>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvanced && (
                <div className="mb-10 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-6 animate-fade-in">
                  {/* Uptime */}
                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span>⏱️ Minimum Uptime</span>
                      <span className="font-mono text-[var(--accent)]">{filters.minUptime}%</span>
                    </label>
                    <input
                      type="range"
                      min="90"
                      max="99.9"
                      step="0.1"
                      value={filters.minUptime}
                      onChange={(e) => setFilters({ ...filters, minUptime: parseFloat(e.target.value) })}
                      className="w-full h-2 rounded-lg accent-[var(--accent)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Exclude validators with poor uptime/skipped slots
                    </p>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span>📅 Minimum Age</span>
                      <span className="font-mono text-[var(--accent)]">{filters.minAge} days</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="365"
                      step="7"
                      value={filters.minAge}
                      onChange={(e) => setFilters({ ...filters, minAge: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg accent-[var(--accent)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      How long the validator has been operating
                    </p>
                  </div>

                  {/* Max Commission */}
                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span>💸 Max Commission</span>
                      <span className="font-mono text-[var(--accent)]">{filters.maxCommission}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={filters.maxCommission}
                      onChange={(e) => setFilters({ ...filters, maxCommission: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg accent-[var(--accent)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Maximum stake commission (typical: 5-10%)
                    </p>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm mb-2">
                      📍 Validator Location
                    </label>
                    <select
                      value={filters.location}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                      className="w-full p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Filter by datacenter country (supports decentralization)
                    </p>
                  </div>

                  {/* Jito Requirement */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.requireJito}
                      onChange={(e) => setFilters({ ...filters, requireJito: e.target.checked })}
                      className="w-5 h-5 accent-[var(--accent)]"
                    />
                    <div>
                      <span className="text-sm font-medium">🔥 Require Jito MEV</span>
                      <p className="text-xs text-[var(--text-muted)]">
                        Only validators running Jito client (for MEV rewards)
                      </p>
                    </div>
                  </label>
                </div>
              )}

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

                {/* Allocations with Native Staking */}
                <div className="space-y-4 mb-8">
                  {result.allocations.map((alloc) => (
                    <div key={alloc.voteAccount} className="card p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-14 h-14 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center font-bold text-[var(--accent)] text-lg shrink-0">
                            {alloc.allocationPercent.toFixed(0)}%
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">
                                {alloc.name || "Validator"}
                              </h3>
                              {alloc.isRisingStar && (
                                <span className="badge bg-amber-500/20 text-amber-400 border-amber-500/30">🌟 Rising</span>
                              )}
                              {alloc.stakeRank && (
                                <span className={`badge ${
                                  alloc.stakeRank === "small" ? "bg-green-500/20 text-green-400" :
                                  alloc.stakeRank === "medium" ? "bg-blue-500/20 text-blue-400" :
                                  alloc.stakeRank === "large" ? "bg-orange-500/20 text-orange-400" :
                                  "bg-red-500/20 text-red-400"
                                }`}>
                                  {alloc.stakeRank === "small" ? "🎯 Small" :
                                   alloc.stakeRank === "medium" ? "📊 Medium" :
                                   alloc.stakeRank === "large" ? "🏢 Large" : "🐋 Whale"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">{alloc.reason}</p>
                            {alloc.mevDilution && (
                              <p className="text-xs text-[var(--text-muted)] mt-1 italic">
                                💎 {alloc.mevDilution}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-bold">{alloc.allocationSol.toFixed(1)} SOL</div>
                          <div className="text-sm text-[var(--accent)] font-medium">
                            ~{alloc.expectedYieldPercent.toFixed(2)}% APY
                          </div>
                          {alloc.totalStakeSol && (
                            <div className="text-xs text-[var(--text-muted)]">
                              {(alloc.totalStakeSol / 1000).toFixed(0)}k SOL stake
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Native Staking Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                        <a
                          href={getPhantomStakeUrl(alloc.voteAccount)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-4 py-2 text-center text-sm rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                        >
                          👻 Stake with Phantom
                        </a>
                        <a
                          href={getSolflareStakeUrl(alloc.voteAccount)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-4 py-2 text-center text-sm rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                        >
                          🔥 Stake with Solflare
                        </a>
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

                {/* Info Box */}
                <div className="card p-6 bg-[var(--bg-secondary)]">
                  <h3 className="font-semibold mb-3">📚 About Native Staking</h3>
                  <ul className="text-sm text-[var(--text-secondary)] space-y-2">
                    <li>✅ <strong>Direct staking</strong> — No LST smart contract risk</li>
                    <li>✅ <strong>Full MEV rewards</strong> — Get 100% of MEV the validator shares</li>
                    <li>✅ <strong>Support validators</strong> — Your stake directly helps decentralization</li>
                    <li>⏳ <strong>Warmup period</strong> — Stakes activate next epoch (~2 days)</li>
                    <li>⏳ <strong>Cooldown</strong> — Unstaking takes ~2-3 days</li>
                  </ul>
                  <p className="text-xs text-[var(--text-muted)] mt-4">
                    Want instant liquidity instead? Consider LSTs like 
                    <a href="https://jito.network/staking" target="_blank" className="text-[var(--accent)] hover:underline ml-1">jitoSOL</a> or 
                    <a href="https://marinade.finance" target="_blank" className="text-[var(--accent)] hover:underline ml-1">mSOL</a>.
                  </p>
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
// Header imported from @/components/Header
