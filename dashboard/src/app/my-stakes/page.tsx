"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  getUserStakeAccounts,
  calculateStakeSummary,
  UserStakeAccount,
  StakeSummary,
} from "@/lib/user-stakes";

interface ValidatorYield {
  name: string | null;
  netTotalApy: number;
  netMevApy: number;
}

export default function MyStakesPage() {
  const { publicKey, connected } = useWallet();
  const [stakes, setStakes] = useState<UserStakeAccount[]>([]);
  const [summary, setSummary] = useState<StakeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatorYields, setValidatorYields] = useState<Map<string, ValidatorYield>>(new Map());
  const [bestAvailableApy, setBestAvailableApy] = useState(8.0);

  // Fetch validator yields for comparison
  useEffect(() => {
    async function fetchYields() {
      try {
        const res = await fetch("/api/predictions");
        if (res.ok) {
          const data = await res.json();
          const yieldsMap = new Map<string, ValidatorYield>();
          let maxApy = 7.0;
          
          for (const pred of data.predictions || []) {
            yieldsMap.set(pred.voteAccount, {
              name: pred.name,
              netTotalApy: pred.netTotalApy || 7.0,
              netMevApy: pred.netMevApy || 0,
            });
            if (pred.netTotalApy > maxApy && pred.isViable) {
              maxApy = pred.netTotalApy;
            }
          }
          
          setValidatorYields(yieldsMap);
          setBestAvailableApy(Math.min(maxApy, 12)); // Cap at 12% to be realistic
        }
      } catch (e) {
        console.error("Failed to fetch yields:", e);
      }
    }
    fetchYields();
  }, []);

  // Fetch user stakes when wallet connects
  const fetchStakes = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const userStakes = await getUserStakeAccounts(publicKey.toBase58());
      
      // Enrich with validator names and yields
      const enrichedStakes = userStakes.map((stake) => {
        const validatorInfo = validatorYields.get(stake.validator.voteAccount);
        return {
          ...stake,
          validator: {
            ...stake.validator,
            name: validatorInfo?.name || stake.validator.name,
          },
          estimatedApy: validatorInfo?.netTotalApy || 6.5,
          mevShare: validatorInfo?.netMevApy || 0,
        };
      });

      setStakes(enrichedStakes);
      setSummary(calculateStakeSummary(enrichedStakes, bestAvailableApy));
    } catch (e) {
      console.error("Failed to fetch stakes:", e);
      setError("Failed to fetch stake accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [publicKey, validatorYields, bestAvailableApy]);

  useEffect(() => {
    if (connected && publicKey && validatorYields.size > 0) {
      fetchStakes();
    }
  }, [connected, publicKey, validatorYields, fetchStakes]);

  // Calculate opportunity cost for a single stake
  const getOpportunityCost = (stake: UserStakeAccount) => {
    const currentApy = stake.estimatedApy || 6.5;
    const diff = bestAvailableApy - currentApy;
    const annualGain = (stake.solAmount * diff) / 100;
    return { diff, annualGain };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial pointer-events-none" />
      
      <Header />

      <main className="relative pt-8 pb-16 px-6">
        <div className="container-lg">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              💼 My Stakes
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
              See your current staking positions and discover how much more you could be earning.
            </p>
          </div>

          {/* Wallet Connection */}
          {!connected ? (
            <div className="max-w-md mx-auto">
              <div className="card p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                  <span className="text-4xl">👛</span>
                </div>
                <h2 className="text-xl font-semibold mb-3">Connect Your Wallet</h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  Connect your Solana wallet to view your staking positions and see optimization opportunities.
                </p>
                <div className="flex justify-center">
                  <WalletMultiButton className="!bg-[var(--accent)] hover:!bg-[var(--accent-hover)] !rounded-lg !h-12 !px-6" />
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
              <p className="text-[var(--text-muted)]">Loading your stake accounts...</p>
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto">
              <div className="card p-6 border-red-500/30 text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={fetchStakes} className="btn-secondary">
                  Try Again
                </button>
              </div>
            </div>
          ) : stakes.length === 0 ? (
            <div className="max-w-md mx-auto">
              <div className="card p-8 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h2 className="text-xl font-semibold mb-3">No Stake Accounts Found</h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  You don't have any native stake accounts yet. Start staking to earn yield!
                </p>
                <Link href="/route" className="btn-primary">
                  Get Staking Recommendations →
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="card p-6">
                    <div className="text-sm text-[var(--text-muted)] mb-1">Total Staked</div>
                    <div className="text-3xl font-bold">{summary.totalStakedSol.toFixed(2)}</div>
                    <div className="text-sm text-[var(--text-muted)]">SOL</div>
                  </div>
                  <div className="card p-6">
                    <div className="text-sm text-[var(--text-muted)] mb-1">Current Avg APY</div>
                    <div className="text-3xl font-bold">{summary.avgEstimatedApy.toFixed(2)}%</div>
                    <div className="text-sm text-[var(--text-muted)]">estimated</div>
                  </div>
                  <div className="card p-6 bg-[var(--accent)]/5 border-[var(--accent)]/30">
                    <div className="text-sm text-[var(--text-muted)] mb-1">Best Available</div>
                    <div className="text-3xl font-bold text-[var(--accent)]">{bestAvailableApy.toFixed(2)}%</div>
                    <div className="text-sm text-[var(--text-muted)]">APY</div>
                  </div>
                  <div className="card p-6 bg-green-500/5 border-green-500/30">
                    <div className="text-sm text-[var(--text-muted)] mb-1">Potential Extra</div>
                    <div className="text-3xl font-bold text-green-400">+{summary.potentialGainSol.toFixed(2)}</div>
                    <div className="text-sm text-[var(--text-muted)]">SOL/year</div>
                  </div>
                </div>
              )}

              {/* Opportunity Alert */}
              {summary && summary.potentialGainApy > 0.5 && (
                <div className="card p-6 mb-8 bg-gradient-to-r from-[var(--accent)]/10 to-green-500/10 border-[var(--accent)]/30">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">💡</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        You could be earning {summary.potentialGainApy.toFixed(2)}% more!
                      </h3>
                      <p className="text-[var(--text-secondary)]">
                        That's an extra <span className="text-green-400 font-semibold">{summary.potentialGainSol.toFixed(2)} SOL</span> per year.
                        Optimize your stakes to maximize yield.
                      </p>
                    </div>
                    <Link href="/route" className="btn-primary shrink-0">
                      Optimize Now →
                    </Link>
                  </div>
                </div>
              )}

              {/* Stake Accounts List */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Stake Accounts ({stakes.length})</h2>
                <button
                  onClick={fetchStakes}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="space-y-4">
                {stakes.map((stake) => {
                  const { diff, annualGain } = getOpportunityCost(stake);
                  const hasOpportunity = diff > 0.3;
                  
                  return (
                    <div
                      key={stake.pubkey}
                      className={`card p-5 ${hasOpportunity ? "border-amber-500/30" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              stake.state === "active" ? "bg-green-500/20 text-green-400" :
                              stake.state === "activating" ? "bg-blue-500/20 text-blue-400" :
                              stake.state === "deactivating" ? "bg-orange-500/20 text-orange-400" :
                              "bg-gray-500/20 text-gray-400"
                            }`}>
                              {stake.state.toUpperCase()}
                            </span>
                            {hasOpportunity && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                                ⚡ Can optimize
                              </span>
                            )}
                          </div>
                          
                          <h3 className="font-semibold text-lg mb-1">
                            {stake.validator.name || `Validator ${stake.validator.voteAccount.slice(0, 8)}...`}
                          </h3>
                          
                          <p className="text-sm text-[var(--text-muted)] font-mono truncate">
                            {stake.validator.voteAccount}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold">{stake.solAmount.toFixed(2)} SOL</div>
                          <div className="text-sm">
                            <span className={hasOpportunity ? "text-amber-400" : "text-[var(--text-muted)]"}>
                              {stake.estimatedApy?.toFixed(2) || "~6.5"}% APY
                            </span>
                            {stake.mevShare && stake.mevShare > 0 && (
                              <span className="text-[var(--text-muted)] ml-2">
                                (+{stake.mevShare.toFixed(1)}% MEV)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Opportunity Cost */}
                      {hasOpportunity && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-[var(--text-muted)]">Switching to top validator: </span>
                            <span className="text-green-400 font-medium">
                              +{diff.toFixed(2)}% APY → +{annualGain.toFixed(3)} SOL/year
                            </span>
                          </div>
                          <Link
                            href={`/route?amount=${Math.ceil(stake.solAmount)}`}
                            className="text-sm text-[var(--accent)] hover:underline"
                          >
                            Find better →
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Footer */}
              <div className="mt-8 text-center">
                <p className="text-[var(--text-muted)] mb-4">
                  Ready to optimize? Get personalized recommendations based on your preferences.
                </p>
                <Link href="/route" className="btn-primary">
                  🎯 Get Staking Recommendations
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Header() {
  const { connected } = useWallet();
  
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border)]">
      <div className="container-lg">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-lg font-semibold hidden sm:inline">StakePilot</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/compare" className="btn-ghost">Compare</Link>
            <Link href="/discover" className="btn-ghost">Discover</Link>
            <Link href="/autopilot" className="btn-ghost">Autopilot</Link>
            <Link href="/my-stakes" className="btn-ghost text-[var(--accent)]">My Stakes</Link>
            {connected && (
              <div className="ml-2">
                <WalletMultiButton className="!bg-[var(--bg-secondary)] !border !border-[var(--border)] !rounded-lg !h-10 !text-sm" />
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
