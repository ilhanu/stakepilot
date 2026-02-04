"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Validator {
  voteAccount: string;
  name: string | null;
  commission: number;
  stakeSol: number;
  location: string;
  datacenter: string | null;
  qualityTier: "S" | "A" | "B" | "C" | "D";
  uptimePercent: number;
  ageInDays: number;
  jito: boolean;
  jitoCommission: number | null;
  netBaseApy: number;
  netMevApy: number;
  netTotalApy: number;
  delinquent: boolean;
}

type FilterType = "all" | "low-risk" | "high-apy" | "small" | "jito";
type SortType = "netTotalApy" | "stakeSol" | "commission" | "qualityTier";

export default function DiscoverPage() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("netTotalApy");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchValidators();
  }, []);

  const fetchValidators = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/validators-full?limit=200&excludeDelinquent=true");
      if (!res.ok) throw new Error("Failed to fetch validators");
      
      const data = await res.json();
      setValidators(data.validators || []);
    } catch (err) {
      console.error("Failed to fetch validators:", err);
      setError("Failed to load validators. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredValidators = validators
    .filter(v => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (!(v.name || "").toLowerCase().includes(searchLower) && 
            !v.voteAccount.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Category filter
      if (filter === "low-risk") return v.stakeSol > 1000000 && v.qualityTier <= "B";
      if (filter === "high-apy") return v.netTotalApy >= 7.5;
      if (filter === "small") return v.stakeSol < 500000;
      if (filter === "jito") return v.jito;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "netTotalApy") return b.netTotalApy - a.netTotalApy;
      if (sortBy === "stakeSol") return b.stakeSol - a.stakeSol;
      if (sortBy === "commission") return a.commission - b.commission;
      if (sortBy === "qualityTier") {
        const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
        return tierOrder[a.qualityTier] - tierOrder[b.qualityTier];
      }
      return 0;
    });

  const tierColors: Record<string, string> = {
    S: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    A: "text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30",
    B: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    C: "text-[var(--text-secondary)] bg-[var(--text-muted)]/10 border-[var(--border)]",
    D: "text-red-400 bg-red-400/10 border-red-400/30",
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="container-lg py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Discover Validators</h1>
          <p className="text-[var(--text-secondary)]">
            Browse {validators.length.toLocaleString()} Solana validators. The agent selects from these based on your strategy.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or vote account..."
              className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none text-sm"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: "all", label: "All" },
              { value: "low-risk", label: "Low Risk" },
              { value: "high-apy", label: "High APY" },
              { value: "small", label: "Small" },
              { value: "jito", label: "Jito MEV" },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as FilterType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f.value 
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30" 
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm focus:border-[var(--accent)] outline-none"
          >
            <option value="netTotalApy">APY (High → Low)</option>
            <option value="stakeSol">Stake (High → Low)</option>
            <option value="commission">Commission (Low → High)</option>
            <option value="qualityTier">Quality (S → D)</option>
          </select>
        </div>

        {/* Info Box */}
        <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="text-[var(--accent)] font-medium">💡 All APYs shown are NET</span> — what you actually earn after validator commission and MEV fees. 
            Quality tiers (S-D) are based on uptime, skip rate, and overall performance.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="card p-8 text-center mb-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchValidators} className="btn-secondary">
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--text-secondary)]">Loading validators...</p>
            </div>
          </div>
        )}

        {/* Validators Table */}
        {!loading && !error && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Validator</th>
                    <th className="text-center px-4 py-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Tier</th>
                    <th className="text-right px-4 py-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Net APY</th>
                    <th className="text-right px-4 py-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Commission</th>
                    <th className="text-right px-4 py-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Stake</th>
                    <th className="text-right px-4 py-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden lg:table-cell">Location</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden lg:table-cell">Features</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredValidators.map((v) => (
                    <tr 
                      key={v.voteAccount}
                      className="border-b border-[var(--border)] hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[var(--accent)]/10 rounded-full flex items-center justify-center text-[var(--accent)] text-sm font-bold shrink-0">
                            {(v.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{v.name || "Unknown"}</p>
                            <p className="text-xs text-[var(--text-muted)] font-mono truncate">
                              {v.voteAccount.slice(0, 8)}...{v.voteAccount.slice(-4)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-2 py-1 text-xs font-bold rounded border ${tierColors[v.qualityTier]}`}>
                          {v.qualityTier}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-lg font-bold text-[var(--accent)]">
                          {v.netTotalApy.toFixed(1)}%
                        </span>
                        {v.jito && v.netMevApy > 0 && (
                          <p className="text-xs text-[var(--text-muted)]">
                            +{v.netMevApy.toFixed(1)}% MEV
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        <span className={v.commission <= 5 ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}>
                          {v.commission}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        <span className="text-[var(--text-secondary)]">
                          {v.stakeSol >= 1e6 
                            ? `${(v.stakeSol / 1e6).toFixed(1)}M`
                            : v.stakeSol >= 1e3 
                            ? `${(v.stakeSol / 1e3).toFixed(0)}K`
                            : v.stakeSol.toFixed(0)
                          }
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right hidden lg:table-cell">
                        <span className="text-[var(--text-muted)] text-sm truncate">
                          {v.location || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right hidden lg:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          {v.jito && (
                            <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 rounded">
                              Jito
                            </span>
                          )}
                          {v.uptimePercent >= 99.5 && (
                            <span className="px-2 py-0.5 text-xs bg-[var(--accent)]/10 text-[var(--accent)] rounded">
                              99.5%+
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredValidators.length === 0 && !loading && (
              <div className="p-12 text-center text-[var(--text-muted)]">
                <p>No validators match your filters</p>
                <button 
                  onClick={() => { setFilter("all"); setSearch(""); }}
                  className="text-[var(--accent)] text-sm mt-2 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-[var(--text-muted)] mt-4 text-center">
            Showing {filteredValidators.length} of {validators.length} validators
          </p>
        )}

        {/* CTA */}
        <div className="mt-12 card p-8 text-center bg-gradient-to-r from-[var(--accent)]/5 to-transparent">
          <h3 className="text-xl font-bold mb-2">Let the Agent Choose for You</h3>
          <p className="text-[var(--text-secondary)] mb-6">
            Set your strategy and the AI will automatically select the best validators.
          </p>
          <Link href="/vault" className="btn-primary">
            Configure Vault Strategy →
          </Link>
        </div>
      </div>
    </div>
  );
}
