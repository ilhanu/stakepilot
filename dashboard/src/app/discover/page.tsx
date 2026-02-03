"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BacktestDetail {
  epoch: number;
  predicted: number;
  actual: number;
  error: number;
}

interface BacktestData {
  accuracy: number;
  details: BacktestDetail[];
}

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

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 80 ? "text-green-400" : accuracy >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <span className={`font-bold ${color}`}>{accuracy.toFixed(1)}%</span>
  );
}

function BacktestChart({ details }: { details: BacktestDetail[] }) {
  if (details.length < 2) return null;
  
  const maxVal = Math.max(...details.flatMap(d => [d.predicted, d.actual]));
  const width = 280;
  const height = 120;
  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const getX = (i: number) => padding + (i / (details.length - 1)) * chartWidth;
  const getY = (val: number) => padding + (1 - val / maxVal) * chartHeight;
  
  const predictedPoints = details.map((d, i) => `${getX(i)},${getY(d.predicted)}`).join(" ");
  const actualPoints = details.map((d, i) => `${getX(i)},${getY(d.actual)}`).join(" ");
  
  return (
    <div className="relative">
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        {[0, 0.5, 1].map((y) => (
          <line
            key={y}
            x1={padding}
            y1={padding + y * chartHeight}
            x2={width - padding}
            y2={padding + y * chartHeight}
            stroke="var(--border)"
            strokeDasharray="4"
          />
        ))}
        
        {/* Predicted line (dashed) */}
        <polyline
          points={predictedPoints}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          strokeDasharray="6"
          strokeLinecap="round"
        />
        
        {/* Actual line (solid) */}
        <polyline
          points={actualPoints}
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Points */}
        {details.map((d, i) => (
          <g key={d.epoch}>
            <circle cx={getX(i)} cy={getY(d.actual)} r="4" fill="#14b8a6" />
            <circle cx={getX(i)} cy={getY(d.predicted)} r="3" fill="#8b5cf6" />
          </g>
        ))}
        
        {/* Epoch labels */}
        {details.map((d, i) => (
          <text
            key={d.epoch}
            x={getX(i)}
            y={height - 4}
            textAnchor="middle"
            className="fill-[var(--text-muted)]"
            fontSize="10"
          >
            {d.epoch}
          </text>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-teal-500 rounded"></span>
          Actual MEV
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-purple-500 rounded" style={{ borderStyle: 'dashed' }}></span>
          Predicted
        </span>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [validators, setValidators] = useState<RisingStar[]>([]);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [backtest, setBacktest] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch both rising stars and backtest data in parallel
        const [starsRes, backtestRes] = await Promise.all([
          fetch("/api/predictions?type=rising-stars&limit=20"),
          fetch("/api/predictions?type=backtest")
        ]);
        
        if (!starsRes.ok) throw new Error("Failed to fetch rising stars");
        
        const starsData = await starsRes.json();
        setValidators(starsData.validators || []);
        setCurrentEpoch(starsData.currentEpoch || 0);
        
        if (backtestRes.ok) {
          const backtestData = await backtestRes.json();
          setBacktest({
            accuracy: backtestData.accuracy,
            details: backtestData.details,
          });
        }
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

        {/* Prediction Accuracy Section */}
        {backtest && (
          <section className="pb-12 px-6">
            <div className="container-lg">
              <div className="card p-8 bg-teal-500/5 border-teal-500/20">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Left: Stats */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                      <span className="text-2xl">🎯</span>
                      <h2 className="font-semibold text-lg">Prediction Accuracy</h2>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Our MEV predictions have been backtested against real data.
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-6">
                      <div>
                        <div className="text-3xl font-bold">
                          <AccuracyBadge accuracy={backtest.accuracy} />
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Overall Accuracy</div>
                      </div>
                      <div className="h-10 w-px bg-[var(--border)]"></div>
                      <div>
                        <div className="text-lg font-semibold text-[var(--text-primary)]">
                          {backtest.details.length}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Epochs Tested</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: Chart */}
                  <div className="flex-1">
                    <BacktestChart details={backtest.details} />
                  </div>
                </div>
                
                {/* Detailed breakdown */}
                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                  <h3 className="text-sm font-medium mb-4 text-center">Epoch-by-Epoch Results</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {backtest.details.map((d) => (
                      <div key={d.epoch} className="bg-[var(--bg-primary)]/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-[var(--text-muted)] mb-1">Epoch {d.epoch}</div>
                        <div className="text-xs">
                          <span className="text-purple-400">{d.predicted.toFixed(0)}</span>
                          {" → "}
                          <span className="text-teal-400">{d.actual.toFixed(0)}</span>
                        </div>
                        <div className="text-xs mt-1">
                          {d.error < 0.15 ? (
                            <span className="text-green-400">✓ {((1-d.error)*100).toFixed(0)}%</span>
                          ) : d.error < 0.3 ? (
                            <span className="text-amber-400">≈ {((1-d.error)*100).toFixed(0)}%</span>
                          ) : (
                            <span className="text-red-400">↓ {((1-d.error)*100).toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

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
// Header imported from @/components/Header
