"use client";

import { useState, useEffect } from "react";

interface Validator {
  voteAccount: string;
  identity: string;
  name: string;
  commission: number;
  mevCommission: number | null;
  activatedStake: number;
  stakeFormatted: string;
  estimatedApy: number;
  delinquent: boolean;
  isJito: boolean;
  isDz: boolean;
  uptime: number;
  totalScore: number;
  stakepilotScore: number;
  ibrlScore: number | null;
  location: {
    city: string | null;
    country: string | null;
    datacenter: string;
  };
  avatarUrl: string | null;
  website: string | null;
}

type FilterType = "qualified" | "all" | "top";
type SortType = "stakepilotScore" | "estimatedApy" | "activatedStake" | "commission";

const STAKER_SPACE_VALIDATOR = "3S4jVg5p1rw7t8MS5UtjhnChmo6ABdmh3nyXTVzAyP9f";

export default function DiscoverPage() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("qualified");
  const [sortBy, setSortBy] = useState<SortType>("stakepilotScore");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchValidators();
  }, [filter]);

  const fetchValidators = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/validators?filter=${filter}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch validators");
      
      const data = await res.json();
      if (data.success && data.validators) {
        setValidators(data.validators);
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

  const sortedValidators = [...validators]
    .filter(v => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return v.name.toLowerCase().includes(searchLower) || 
             v.voteAccount.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => {
      const aIsStakerSpace = a.voteAccount === STAKER_SPACE_VALIDATOR;
      const bIsStakerSpace = b.voteAccount === STAKER_SPACE_VALIDATOR;
      
      // Always put Staker Space first
      if (aIsStakerSpace) return -1;
      if (bIsStakerSpace) return 1;
      
      switch (sortBy) {
        case "stakepilotScore": return b.stakepilotScore - a.stakepilotScore;
        case "estimatedApy": return b.estimatedApy - a.estimatedApy;
        case "activatedStake": return b.activatedStake - a.activatedStake;
        case "commission": return a.commission - b.commission;
        default: return 0;
      }
    });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Testnet Banner */}
      <div className="bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 py-2 px-4 text-center">
        <span className="text-[var(--accent)] text-sm font-medium">
          🧪 Testnet Validators — Data from validators.app
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Discover Validators</h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-base">
            Browse testnet validators that match StakePilot's quality criteria
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          
          {/* Filter */}
          <div className="flex gap-2">
            {[
              { value: "qualified", label: "Qualified" },
              { value: "top", label: "Top 20" },
              { value: "all", label: "All" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as FilterType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.value
                    ? "bg-[var(--accent)] text-black"
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]"
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
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="stakepilotScore">Sort by Score</option>
            <option value="estimatedApy">Sort by APY</option>
            <option value="activatedStake">Sort by Stake</option>
            <option value="commission">Sort by Commission</option>
          </select>
        </div>

        {/* Criteria Info */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm">
            <span className="text-[var(--text-secondary)]">StakePilot Criteria:</span>
            <span className="text-[var(--accent)]">✓ Stake &lt; 1M SOL</span>
            <span className="text-[var(--accent)]">✓ Commission ≤ 5%</span>
            <span className="text-[var(--accent)]">✓ MEV ≤ 10%</span>
            <span className="text-[var(--accent)]">✓ Uptime &gt; 95%</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
            <button onClick={fetchValidators} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-[var(--bg-card)] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Validators List */}
        {!loading && (
          <div className="space-y-3">
            {sortedValidators.map((v) => {
              const isStakerSpace = v.voteAccount === STAKER_SPACE_VALIDATOR;
              
              return (
                <div
                  key={v.voteAccount}
                  className={`p-4 rounded-xl border transition-colors ${
                    isStakerSpace
                      ? "bg-[var(--accent)]/5 border-[var(--accent)]/30"
                      : "bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)]/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Avatar & Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {v.avatarUrl ? (
                          <img src={v.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-black font-bold text-sm">{v.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{v.name}</span>
                          {isStakerSpace && <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 rounded">Our Validator</span>}
                          {v.isDz && <span className="text-xs text-blue-400">DZ</span>}
                          {v.isJito && <span className="text-xs text-orange-400">Jito</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="font-mono">{v.voteAccount.slice(0, 8)}...</span>
                          {v.location.country && <span>{v.location.country === "NL" ? "🇳🇱" : v.location.country === "US" ? "🇺🇸" : v.location.country === "DE" ? "🇩🇪" : v.location.country}</span>}
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 text-center sm:text-right">
                      <div>
                        <div className="text-lg font-bold text-[var(--accent)]">{v.estimatedApy.toFixed(1)}%</div>
                        <div className="text-xs text-[var(--text-secondary)]">Est. APY</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{v.commission}%</div>
                        <div className="text-xs text-[var(--text-secondary)]">Commission</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{Math.round(v.stakepilotScore * 10) / 10}</div>
                        <div className="text-xs text-[var(--text-secondary)]">SP Score</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{v.stakeFormatted}</div>
                        <div className="text-xs text-[var(--text-secondary)]">Stake</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span>Uptime: {v.uptime.toFixed(1)}%</span>
                      {v.mevCommission !== null && <span>MEV: {v.mevCommission}%</span>}
                    </div>
                    <a
                      href={`https://www.validators.app/validators/testnet/${v.identity}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      View on validators.app →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && sortedValidators.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <div className="text-4xl mb-4">🔍</div>
            <div>No validators found matching your criteria</div>
          </div>
        )}

        {/* SP Score Explanation */}
        <div className="mt-8 bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
          <h3 className="text-sm md:text-base font-semibold mb-3">How the SP Score works</h3>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-3">
            The StakePilot Score ranks validators by what matters most to stakers — yield, reliability, and network health. Higher is better.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 text-xs">
            {[
              { factor: "Decentralization", weight: "up to 40 pts", desc: "Lower stake = higher score" },
              { factor: "Commission", weight: "up to 25 pts", desc: "0% = max, 10%+ = 0" },
              { factor: "MEV Fairness", weight: "up to 20 pts", desc: "Low Jito MEV commission" },
              { factor: "Uptime", weight: "up to 15 pts", desc: "Vote performance >90%" },
              { factor: "Reputation", weight: "up to 10 pts", desc: "validators.app total score" },
              { factor: "Infrastructure", weight: "up to 30 pts", desc: "DoubleZero + IBRL block quality" },
            ].map((f) => (
              <div key={f.factor} className="p-2 md:p-3 rounded-lg bg-[var(--bg-elevated)]">
                <div className="font-medium text-[var(--text-primary)]">{f.factor}</div>
                <div className="text-[var(--accent)] font-medium">{f.weight}</div>
                <div className="text-[var(--text-muted)] mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] md:text-xs text-[var(--text-muted)] mt-3">
            The agent uses this score to decide where to stake. Validators that raise commission or go delinquent get deactivated — protecting your APY.
          </p>
        </div>
      </div>
    </div>
  );
}
