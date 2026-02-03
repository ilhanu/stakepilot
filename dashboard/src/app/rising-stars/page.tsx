"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import Link from "next/link";

interface RisingStar {
  voteAccount: string;
  name: string | null;
  stakeSol: number;
  currentMevSol: number;
  predictedMevSol: number;
  confidence: number;
  trend: "rising" | "stable" | "falling";
  trendStrength: number;
  momentum: number;
  decentralizationScore: number;
  mevEfficiency: number;
  epochsAnalyzed: number;
  history: { epoch: number; mevSol: number }[];
}

interface ApiResponse {
  currentEpoch: number;
  count: number;
  validators: RisingStar[];
}

// Mini trend chart component
function TrendChart({ history }: { history: { epoch: number; mevSol: number }[] }) {
  if (history.length < 2) return null;
  
  const values = history.slice(-10).map(h => h.mevSol);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  
  const width = 120;
  const height = 40;
  const padding = 4;
  
  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Decentralization badge
function DecentralizationBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-blue-500 to-cyan-600";
    if (score >= 40) return "from-yellow-500 to-orange-600";
    return "from-red-500 to-pink-600";
  };
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getColor()} text-white`}>
      <span>🌐</span>
      <span>{score.toFixed(0)}</span>
    </div>
  );
}

export default function RisingStarsPage() {
  const [risingStars, setRisingStars] = useState<RisingStar[]>([]);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRisingStars() {
      try {
        const res = await fetch("/api/predictions?type=rising-stars&limit=30");
        if (!res.ok) throw new Error("Failed to fetch rising stars");
        
        const data: ApiResponse = await res.json();
        setRisingStars(data.validators);
        setCurrentEpoch(data.currentEpoch);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    
    fetchRisingStars();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
            Rising Stars
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
            Discover small validators with explosive MEV growth.
            Support the underdogs. Decentralize Solana.
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2">
              <span className="text-gray-400">Epoch</span>{" "}
              <span className="text-white font-bold">{currentEpoch || "..."}</span>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2">
              <span className="text-gray-400">Rising Stars</span>{" "}
              <span className="text-green-400 font-bold">{risingStars.length}</span>
            </div>
          </div>
        </section>

        {/* What are Rising Stars? */}
        <section className="mb-8 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-800/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>💡</span> What makes a Rising Star?
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-2xl">📉</span>
              <div>
                <div className="font-medium">Below Median Stake</div>
                <div className="text-gray-400">Small validators that need your support</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl">📈</span>
              <div>
                <div className="font-medium">Rising MEV Trend</div>
                <div className="text-gray-400">Consistent upward momentum over multiple epochs</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl">💪</span>
              <div>
                <div className="font-medium">Strong Performance</div>
                <div className="text-gray-400">Above-average MEV earnings despite smaller size</div>
              </div>
            </div>
          </div>
        </section>

        {/* Rising Stars List */}
        <section>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin text-4xl">🌟</div>
              <span className="ml-4 text-gray-400">Discovering rising stars...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
              <p className="text-red-400">Failed to load rising stars: {error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-700 rounded-lg hover:bg-red-600 transition"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && risingStars.length === 0 && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400">No rising stars found this epoch.</p>
              <p className="text-gray-500 text-sm mt-2">Check back after more epochs of data.</p>
            </div>
          )}

          {!loading && !error && risingStars.length > 0 && (
            <div className="space-y-4">
              {risingStars.map((validator, index) => (
                <div
                  key={validator.voteAccount}
                  className="bg-gray-900/50 border border-gray-800 hover:border-yellow-600/50 rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-yellow-900/20"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Rank & Name */}
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-yellow-500/50">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {validator.name || "Anonymous Validator"}
                          <span className="text-sm bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            🌟 Rising Star
                          </span>
                        </h3>
                        <Link 
                          href={`/validator/${validator.voteAccount}`}
                          className="text-gray-500 text-xs font-mono hover:text-gray-300 transition"
                        >
                          {validator.voteAccount.slice(0, 8)}...{validator.voteAccount.slice(-8)}
                        </Link>
                      </div>
                    </div>

                    {/* Center: Trend Chart */}
                    <div className="flex items-center gap-4">
                      <TrendChart history={validator.history} />
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          +{validator.momentum.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">momentum/epoch</div>
                      </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-sm text-gray-400">Current MEV</div>
                        <div className="font-semibold">{validator.currentMevSol.toFixed(2)} SOL</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Predicted</div>
                        <div className="font-semibold text-green-400">
                          {validator.predictedMevSol.toFixed(2)} SOL
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Decentralization</div>
                        <DecentralizationBadge score={validator.decentralizationScore} />
                      </div>
                    </div>
                  </div>

                  {/* Footer: More Details */}
                  <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap items-center justify-between gap-4 text-sm">
                    <div className="flex gap-4 text-gray-400">
                      <span>Stake: <span className="text-white">{validator.stakeSol.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL</span></span>
                      <span>Efficiency: <span className="text-white">{validator.mevEfficiency.toFixed(3)}</span></span>
                      <span>Confidence: <span className="text-white">{validator.confidence.toFixed(0)}%</span></span>
                      <span>Epochs analyzed: <span className="text-white">{validator.epochsAnalyzed}</span></span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/validator/${validator.voteAccount}`}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
                      >
                        View Profile
                      </Link>
                      <a
                        href={`https://stakewiz.com/validator/${validator.voteAccount}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg transition text-sm font-medium"
                      >
                        🚀 Support This Validator
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Call to Action */}
        <section className="mt-12 text-center bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-800/30 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-2">Champion the Underdogs</h2>
          <p className="text-gray-400 mb-4">
            80% of stake goes to the top 20 validators. Help change that.
            Every SOL you stake with a small validator strengthens Solana.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/learn"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition font-medium"
            >
              Learn About Decentralization
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
