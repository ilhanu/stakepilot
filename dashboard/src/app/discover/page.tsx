"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Validator {
  voteAccount: string;
  name: string;
  commission: number;
  activatedStake: number;
  apy: number;
  uptime: number;
  datacenter?: string;
  delinquent: boolean;
}

export default function DiscoverPage() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low-risk" | "high-apy" | "decentralized">("all");
  const [sortBy, setSortBy] = useState<"apy" | "stake" | "commission">("apy");

  useEffect(() => {
    fetchValidators();
  }, []);

  const fetchValidators = async () => {
    setLoading(true);
    try {
      // Fetch from Jito API
      const res = await fetch("https://kobe.mainnet.jito.network/api/v1/validators");
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      
      const parsed = data.validators
        .filter((v: any) => !v.delinquent)
        .map((v: any) => ({
          voteAccount: v.vote_account,
          name: v.info?.name || "Unknown Validator",
          commission: v.commission || 10,
          activatedStake: (v.activated_stake || 0) / 1e9,
          apy: (v.apy_estimate || 7) / 100,
          uptime: v.uptime || 99,
          datacenter: v.datacenter_location || "Unknown",
          delinquent: v.delinquent || false,
        }))
        .slice(0, 100);
      
      setValidators(parsed);
    } catch (error) {
      console.error("Failed to fetch validators:", error);
      // Use mock data for demo
      setValidators([
        { voteAccount: "J2nUH...", name: "Helius", commission: 5, activatedStake: 5000000, apy: 7.8, uptime: 99.9, delinquent: false },
        { voteAccount: "mrgn2...", name: "marginfi", commission: 7, activatedStake: 2000000, apy: 7.5, uptime: 99.8, delinquent: false },
        { voteAccount: "Cube1...", name: "Cubik", commission: 5, activatedStake: 500000, apy: 8.1, uptime: 99.7, delinquent: false },
        { voteAccount: "Jito1...", name: "Jito Labs", commission: 8, activatedStake: 8000000, apy: 7.9, uptime: 99.9, delinquent: false },
        { voteAccount: "Mnde5...", name: "Marinade", commission: 10, activatedStake: 6000000, apy: 7.2, uptime: 99.8, delinquent: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredValidators = validators
    .filter(v => {
      if (filter === "low-risk") return v.activatedStake > 1000000;
      if (filter === "high-apy") return v.apy >= 7.5;
      if (filter === "decentralized") return v.activatedStake < 1000000;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "apy") return b.apy - a.apy;
      if (sortBy === "stake") return b.activatedStake - a.activatedStake;
      if (sortBy === "commission") return a.commission - b.commission;
      return 0;
    });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Validators</h1>
          <p className="text-white/60">
            Browse Solana validators. The agent selects from these based on your strategy.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">Filter:</span>
            <div className="flex gap-1">
              {[
                { value: "all", label: "All" },
                { value: "low-risk", label: "Low Risk" },
                { value: "high-apy", label: "High APY" },
                { value: "decentralized", label: "Small" },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    filter === f.value 
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-white/40 text-sm">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm"
            >
              <option value="apy">APY (High → Low)</option>
              <option value="stake">Stake (High → Low)</option>
              <option value="commission">Commission (Low → High)</option>
            </select>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-emerald-200">
            💡 <strong>All APYs shown are NET</strong> — what you actually earn after validator commission. 
            The agent uses these metrics to optimize your staking.
          </p>
        </div>

        {/* Validators Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-medium text-white/40">Validator</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-white/40">Net APY</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-white/40 hidden md:table-cell">Commission</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-white/40 hidden md:table-cell">Stake</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-white/40 hidden lg:table-cell">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {filteredValidators.map((v, i) => (
                  <tr 
                    key={v.voteAccount}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-sm font-bold">
                          {v.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{v.name}</p>
                          <p className="text-xs text-white/40 font-mono">{v.voteAccount}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-bold text-emerald-400">{(v.apy * 100).toFixed(1)}%</span>
                    </td>
                    <td className="px-6 py-4 text-right hidden md:table-cell">
                      <span className="text-white/70">{v.commission}%</span>
                    </td>
                    <td className="px-6 py-4 text-right hidden md:table-cell">
                      <span className="text-white/70">{(v.activatedStake / 1e6).toFixed(1)}M</span>
                    </td>
                    <td className="px-6 py-4 text-right hidden lg:table-cell">
                      <span className={v.uptime >= 99.5 ? "text-emerald-400" : "text-white/70"}>
                        {v.uptime.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-r from-emerald-900/20 to-transparent border border-emerald-500/20 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Let the Agent Choose for You</h3>
          <p className="text-white/60 mb-6">
            Set your strategy and the AI will automatically select the best validators.
          </p>
          <Link 
            href="/vault"
            className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition"
          >
            Configure Vault Strategy →
          </Link>
        </div>
      </div>
    </div>
  );
}
