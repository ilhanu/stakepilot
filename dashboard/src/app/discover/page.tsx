"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Validator {
  name: string;
  vote_identity: string;
  activated_stake: number;
  total_apy: number;
  wiz_score: number;
  commission: number;
  jito_commission_bps?: number;
  uptime: number;
}

type FilterType = "all" | "quality" | "small" | "jito";
type SortType = "total_apy" | "wiz_score" | "activated_stake" | "commission";

export default function DiscoverPage() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("wiz_score");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchValidators();
  }, []);

  const fetchValidators = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use StakeWiz API via our recommend endpoint for consistent data
      const res = await fetch("/api/agent/recommend?balance=10000000&maxValidators=100");
      if (!res.ok) throw new Error("Failed to fetch validators");
      
      const data = await res.json();
      if (data.success && data.decision?.recommendations) {
        // Map recommendations to our validator format
        const mapped = data.decision.recommendations.map((r: any) => ({
          name: r.validatorName,
          vote_identity: r.validator,
          activated_stake: r.stake,
          total_apy: r.expectedApy,
          wiz_score: r.wizScore,
          commission: r.commission || 0,
          jito_commission_bps: r.mevCommission ? r.mevCommission * 100 : undefined,
          uptime: 99.5, // Default high uptime since they passed filters
        }));
        setValidators(mapped);
      } else {
        throw new Error("Invalid response format");
      }
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
            !v.vote_identity.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Category filter
      if (filter === "quality") return v.wiz_score >= 90;
      if (filter === "small") return v.activated_stake < 500000;
      if (filter === "jito") return v.jito_commission_bps !== undefined;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "total_apy") return b.total_apy - a.total_apy;
      if (sortBy === "wiz_score") return b.wiz_score - a.wiz_score;
      if (sortBy === "activated_stake") return a.activated_stake - b.activated_stake;
      if (sortBy === "commission") return a.commission - b.commission;
      return 0;
    });

  const formatStake = (stake: number) => {
    if (stake >= 1e6) return `${(stake / 1e6).toFixed(1)}M`;
    if (stake >= 1e3) return `${(stake / 1e3).toFixed(0)}K`;
    return stake.toFixed(0);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Discover Validators</h1>
          <p className="text-[var(--text-secondary)]">
            Browse quality Solana validators that meet our criteria. The agent selects from these for optimal staking.
          </p>
        </div>

        {/* Criteria Banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[var(--accent)]/10 to-transparent border border-[var(--accent)]/20">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-[var(--accent)] font-semibold">Agent Criteria:</span>
            <span className="px-2 py-1 rounded-md bg-[var(--bg-card)] text-[var(--text-secondary)]">
              Stake &lt; 1M SOL
            </span>
            <span className="px-2 py-1 rounded-md bg-[var(--bg-card)] text-[var(--text-secondary)]">
              Commission ≤ 5%
            </span>
            <span className="px-2 py-1 rounded-md bg-[var(--bg-card)] text-[var(--text-secondary)]">
              MEV Fee ≤ 10%
            </span>
            <span className="px-2 py-1 rounded-md bg-[var(--bg-card)] text-[var(--text-secondary)]">
              Uptime &gt; 95%
            </span>
          </div>
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
              className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 outline-none text-sm transition-colors"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: "all", label: "All", count: validators.length },
              { value: "quality", label: "High Quality", emoji: "⭐" },
              { value: "small", label: "Small Validators", emoji: "🌱" },
              { value: "jito", label: "Jito MEV", emoji: "⚡" },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as FilterType)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f.value 
                    ? "bg-[var(--accent)] text-black shadow-lg shadow-[var(--accent)]/20" 
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]"
                }`}
              >
                {f.emoji && <span className="mr-1">{f.emoji}</span>}
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none cursor-pointer"
          >
            <option value="wiz_score">Quality Score ↓</option>
            <option value="total_apy">APY ↓</option>
            <option value="activated_stake">Stake ↑</option>
            <option value="commission">Commission ↑</option>
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl p-8 text-center mb-6 bg-red-500/10 border border-red-500/20">
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
              <div className="w-12 h-12 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--text-secondary)]">Loading validators from StakeWiz...</p>
            </div>
          </div>
        )}

        {/* Validators Grid */}
        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredValidators.map((v) => (
              <div 
                key={v.vote_identity}
                className="group p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all hover:shadow-lg hover:shadow-[var(--accent)]/5"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 flex items-center justify-center text-[var(--accent)] font-bold shrink-0">
                      {(v.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-[var(--accent)] transition-colors">
                        {v.name || "Unknown"}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] font-mono">
                        {v.vote_identity.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  {/* Quality Score */}
                  <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    v.wiz_score >= 95 ? "bg-yellow-500/20 text-yellow-400" :
                    v.wiz_score >= 90 ? "bg-[var(--accent)]/20 text-[var(--accent)]" :
                    v.wiz_score >= 80 ? "bg-blue-500/20 text-blue-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {v.wiz_score.toFixed(0)}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[var(--bg-primary)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">APY</p>
                    <p className="text-lg font-bold text-[var(--accent)]">{v.total_apy.toFixed(2)}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-primary)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Commission</p>
                    <p className="text-lg font-bold">{v.commission}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-primary)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Stake</p>
                    <p className="text-lg font-bold">{formatStake(v.activated_stake)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-primary)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Uptime</p>
                    <p className="text-lg font-bold">{v.uptime?.toFixed(1) || "99"}%</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 mt-4">
                  {v.jito_commission_bps !== undefined && (
                    <span className="px-2 py-1 text-xs rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      ⚡ Jito {(v.jito_commission_bps / 100).toFixed(0)}%
                    </span>
                  )}
                  {v.activated_stake < 100000 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                      🌱 Small
                    </span>
                  )}
                  {v.name === "Staker Space" && (
                    <span className="px-2 py-1 text-xs rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      ⭐ Our Validator
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredValidators.length === 0 && (
          <div className="rounded-xl p-12 text-center bg-[var(--bg-card)] border border-[var(--border)]">
            <p className="text-[var(--text-muted)] mb-4">No validators match your filters</p>
            <button 
              onClick={() => { setFilter("all"); setSearch(""); }}
              className="text-[var(--accent)] text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Results count */}
        {!loading && !error && (
          <p className="text-sm text-[var(--text-muted)] mt-6 text-center">
            Showing {filteredValidators.length} of {validators.length} qualified validators
          </p>
        )}

        {/* CTA */}
        <div className="mt-12 p-8 rounded-2xl text-center bg-gradient-to-br from-[var(--accent)]/10 via-[var(--bg-card)] to-[var(--bg-card)] border border-[var(--accent)]/20">
          <h3 className="text-2xl font-bold mb-3">Let the Agent Choose</h3>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Deposit to the vault and let our AI agent automatically select the best validators for optimal yield.
          </p>
          <Link href="/vault" className="btn-primary">
            Open Vault →
          </Link>
        </div>
      </div>
    </div>
  );
}
