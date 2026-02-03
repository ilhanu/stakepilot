"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RisingStar {
  voteAccount: string;
  name: string | null;
  stakeSol: number;
  currentMevSol: number;
  predictedMevSol: number;
  confidence: number;
  trend: "rising" | "stable" | "falling";
  momentum: number;
  decentralizationScore: number;
  stakeCommission: number;
  mevCommission: number;
  netBaseApy: number;
  netMevApy: number;
  netTotalApy: number;
  history: { epoch: number; mevSol: number }[];
}

function TrendChart({ history }: { history: { epoch: number; mevSol: number }[] }) {
  if (history.length < 2) return null;
  
  const values = history.slice(-8).map(h => h.mevSol);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  
  const width = 80;
  const height = 32;
  const padding = 2;
  
  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--accent)]"
      />
    </svg>
  );
}

function ValidatorCard({ validator, rank }: { validator: RisingStar; rank: number }) {
  return (
    <div className="card p-6 hover:border-[var(--accent)]/30 transition-all">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Rank & Name */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--text-muted)]">{rank}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate text-lg">
              {validator.name || "Anonymous Validator"}
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-mono truncate">
              {validator.voteAccount.slice(0, 8)}...{validator.voteAccount.slice(-4)}
            </p>
          </div>
        </div>

        {/* Right: Net APY */}
        <div className="text-right shrink-0">
          <div className="stat-value text-[var(--accent)] !text-3xl">
            {validator.netTotalApy.toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--text-muted)]">Net APY</div>
        </div>
      </div>

      {/* Middle Row: Stats */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--border)]">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[var(--text-muted)]">Base</span>
            <span className="ml-2 font-medium">{validator.netBaseApy.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">MEV</span>
            <span className="ml-2 font-medium text-amber-400">+{validator.netMevApy.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Fee</span>
            <span className="ml-2 font-medium">{validator.stakeCommission}%</span>
          </div>
        </div>
        <TrendChart history={validator.history} />
      </div>

      {/* Bottom: Momentum & Action */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-3">
          <span className="badge">
            +{validator.momentum.toFixed(1)}% momentum
          </span>
        </div>
        <a
          href={`https://stakewiz.com/validator/${validator.voteAccount}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary !py-2 !px-4 !text-sm"
        >
          Stake →
        </a>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [validators, setValidators] = useState<RisingStar[]>([]);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/predictions?type=rising-stars&limit=20");
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        setValidators(data.validators || []);
        setCurrentEpoch(data.currentEpoch || 0);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

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
              Rising Stars
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
              Small validators with explosive MEV growth. Support decentralization.
            </p>
            
            {/* Mini stats */}
            <div className="flex items-center justify-center gap-8 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">Epoch </span>
                <span className="font-semibold">{currentEpoch || "—"}</span>
              </div>
              <div className="w-px h-4 bg-[var(--border)]" />
              <div>
                <span className="text-[var(--text-muted)]">Found </span>
                <span className="font-semibold text-[var(--accent)]">{validators.length}</span>
                <span className="text-[var(--text-muted)]"> rising stars</span>
              </div>
            </div>
          </div>
        </section>

        {/* What makes a Rising Star */}
        <section className="pb-12 px-6">
          <div className="container-lg">
            <div className="card p-8 bg-amber-500/5 border-amber-500/20">
              <h2 className="font-semibold mb-6 text-center text-lg">What makes a Rising Star?</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl mb-2">📉</div>
                  <p className="text-sm text-[var(--text-secondary)]">Below median stake</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">📈</div>
                  <p className="text-sm text-[var(--text-secondary)]">Rising MEV trend</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">💪</div>
                  <p className="text-sm text-[var(--text-secondary)]">Strong performance</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">💰</div>
                  <p className="text-sm text-[var(--text-secondary)]">Fair commission</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] text-center mt-6">
                All APYs shown are NET — what you actually earn after commissions.
              </p>
            </div>
          </div>
        </section>

        {/* Validators List */}
        <section className="pb-16 px-6">
          <div className="container-lg">
            {loading && (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="animate-spin text-4xl mb-4">🌟</div>
                <span className="text-[var(--text-muted)]">Discovering rising stars...</span>
              </div>
            )}

            {error && (
              <div className="card p-12 text-center border-red-500/30">
                <p className="text-red-400 mb-6">Failed to load: {error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="btn-secondary"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && validators.length === 0 && (
              <div className="card p-16 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-[var(--text-secondary)] text-lg">No rising stars found this epoch.</p>
                <p className="text-[var(--text-muted)] text-sm mt-2">Check back after more data accumulates.</p>
              </div>
            )}

            {!loading && !error && validators.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {validators.map((validator, index) => (
                  <ValidatorCard 
                    key={validator.voteAccount} 
                    validator={validator} 
                    rank={index + 1} 
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section Divider */}
        <div className="section-divider mx-6" />

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="container-lg">
            <div className="card p-12 bg-purple-500/5 border-purple-500/20 text-center">
              <h2 className="text-2xl font-bold mb-3">Champion the Underdogs</h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                80% of stake goes to top 20 validators. Help change that. Every SOL strengthens Solana.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/route" className="btn-primary">
                  🛤️ Route My Stake
                </Link>
                <Link href="/learn" className="btn-secondary">
                  📚 Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>
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
            <Link href="/discover" className="btn-ghost text-[var(--text-primary)]">
              Discover
            </Link>
            <Link href="/route" className="btn-ghost">
              Route
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
