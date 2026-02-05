"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-32 bg-[var(--bg-elevated)] rounded-xl animate-pulse" /> }
);
import {
  getUserStakeAccounts,
  calculateStakeSummary,
  UserStakeAccount,
  StakeSummary,
} from "@/lib/user-stakes";
import {
  analyzePortfolio,
  getHealthStatus,
  IntelligenceReport,
  ValidatorSnapshot,
  Trigger,
  Recommendation,
} from "@/lib/intelligence";

export default function MyStakesPage() {
  const { publicKey, connected } = useWallet();
  const [stakes, setStakes] = useState<UserStakeAccount[]>([]);
  const [summary, setSummary] = useState<StakeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatorSnapshots, setValidatorSnapshots] = useState<ValidatorSnapshot[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceReport | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "triggers" | "recommendations">("overview");

  // Fetch validator data for intelligence
  useEffect(() => {
    async function fetchValidators() {
      try {
        const res = await fetch("/api/predictions");
        if (res.ok) {
          const data = await res.json();
          const snapshots: ValidatorSnapshot[] = (data.predictions || []).map((p: any) => ({
            voteAccount: p.voteAccount,
            name: p.name,
            netTotalApy: p.netTotalApy || 7.0,
            netMevApy: p.netMevApy || 0,
            stakeCommission: p.stakeCommission || 10,
            mevCommission: p.mevCommission || 0,
            stakeSol: p.stakeSol || 0,
            trend: p.trend || "stable",
            isRisingStar: p.isRisingStar || false,
            isViable: p.isViable !== false,
            decentralizationScore: p.decentralizationScore || 50,
          }));
          setValidatorSnapshots(snapshots);
        }
      } catch (e) {
        console.error("Failed to fetch validators:", e);
      }
    }
    fetchValidators();
  }, []);

  // Fetch user stakes when wallet connects
  const fetchStakes = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const userStakes = await getUserStakeAccounts(publicKey.toBase58());
      
      // Enrich with validator data
      const enrichedStakes = userStakes.map((stake) => {
        const validator = validatorSnapshots.find(v => v.voteAccount === stake.validator.voteAccount);
        return {
          ...stake,
          validator: {
            ...stake.validator,
            name: validator?.name || stake.validator.name,
          },
          estimatedApy: validator?.netTotalApy || 6.5,
          mevShare: validator?.netMevApy || 0,
        };
      });

      setStakes(enrichedStakes);
      
      // Calculate summary
      const bestApy = validatorSnapshots.length > 0 
        ? Math.max(...validatorSnapshots.filter(v => v.isViable).map(v => v.netTotalApy))
        : 8.0;
      setSummary(calculateStakeSummary(enrichedStakes, Math.min(bestApy, 12)));
      
      // Run intelligence analysis
      const report = analyzePortfolio(enrichedStakes, validatorSnapshots);
      setIntelligence(report);
      
    } catch (e) {
      console.error("Failed to fetch stakes:", e);
      setError("Failed to fetch stake accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [publicKey, validatorSnapshots]);

  useEffect(() => {
    if (connected && publicKey && validatorSnapshots.length > 0) {
      fetchStakes();
    }
  }, [connected, publicKey, validatorSnapshots, fetchStakes]);

  const healthStatus = intelligence ? getHealthStatus(intelligence.summary.healthScore) : null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial pointer-events-none" />
      
      

      <main className="relative pt-8 pb-16 px-6">
        <div className="container-lg">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              💼 My Stakes
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
              Smart portfolio analysis with AI-powered recommendations
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
                  Connect to analyze your staking positions and get personalized AI recommendations.
                </p>
                <div className="flex justify-center">
                  <WalletMultiButton className="!bg-[var(--accent)] hover:!bg-[var(--accent-hover)] !rounded-lg !h-12 !px-6" />
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
              <p className="text-[var(--text-muted)]">Analyzing your portfolio...</p>
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
          ) : (
            <>
              {/* Health Score Banner */}
              {intelligence && healthStatus && (
                <div className={`card p-6 mb-6 ${
                  intelligence.summary.healthScore >= 70 ? "bg-green-500/5 border-green-500/30" :
                  intelligence.summary.healthScore >= 50 ? "bg-yellow-500/5 border-yellow-500/30" :
                  "bg-red-500/5 border-red-500/30"
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{healthStatus.emoji}</div>
                      <div>
                        <h2 className="text-lg font-semibold">
                          Portfolio Health: <span className={healthStatus.color}>{healthStatus.label}</span>
                        </h2>
                        <p className="text-sm text-[var(--text-muted)]">
                          {intelligence.summary.totalTriggers === 0 
                            ? "Your staking is well optimized!"
                            : `${intelligence.summary.criticalCount} critical, ${intelligence.summary.warningCount} warnings`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{intelligence.summary.healthScore}</div>
                      <div className="text-xs text-[var(--text-muted)]">/ 100</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="card p-5">
                    <div className="text-sm text-[var(--text-muted)] mb-1">Total Staked</div>
                    <div className="text-2xl font-bold">{summary.totalStakedSol.toFixed(2)}</div>
                    <div className="text-xs text-[var(--text-muted)]">SOL</div>
                  </div>
                  <div className="card p-5">
                    <div className="text-sm text-[var(--text-muted)] mb-1">Current APY</div>
                    <div className="text-2xl font-bold">{summary.avgEstimatedApy.toFixed(2)}%</div>
                    <div className="text-xs text-[var(--text-muted)]">weighted avg</div>
                  </div>
                  <div className="card p-5">
                    <div className="text-sm text-[var(--text-muted)] mb-1">Validators</div>
                    <div className="text-2xl font-bold">{summary.uniqueValidators}</div>
                    <div className="text-xs text-[var(--text-muted)]">{summary.accountCount} accounts</div>
                  </div>
                  <div className="card p-5 bg-green-500/5 border-green-500/30">
                    <div className="text-sm text-[var(--text-muted)] mb-1">Potential Extra</div>
                    <div className="text-2xl font-bold text-green-400">+{summary.potentialGainSol.toFixed(2)}</div>
                    <div className="text-xs text-[var(--text-muted)]">SOL/year</div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-[var(--border)] pb-2">
                {[
                  { id: "overview", label: "Overview", count: stakes.length },
                  { id: "triggers", label: "🔔 Alerts", count: intelligence?.summary.totalTriggers || 0 },
                  { id: "recommendations", label: "💡 Recommendations", count: intelligence?.recommendations.length || 0 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-[var(--accent)] text-black"
                        : "bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                        activeTab === tab.id ? "bg-black/20" : "bg-[var(--accent)]/20 text-[var(--accent)]"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <StakesList stakes={stakes} validatorSnapshots={validatorSnapshots} />
              )}

              {activeTab === "triggers" && intelligence && (
                <TriggersList triggers={intelligence.triggers} />
              )}

              {activeTab === "recommendations" && intelligence && (
                <RecommendationsList recommendations={intelligence.recommendations} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Stakes List Component
function StakesList({ stakes, validatorSnapshots }: { stakes: UserStakeAccount[]; validatorSnapshots: ValidatorSnapshot[] }) {
  if (stakes.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">📭</div>
        <h3 className="text-lg font-semibold mb-2">No Stake Accounts Found</h3>
        <p className="text-[var(--text-secondary)] mb-6">
          Start staking to earn yield on your SOL!
        </p>
        <Link href="/route" className="btn-primary">
          Get Recommendations →
        </Link>
      </div>
    );
  }

  const bestApy = Math.max(...validatorSnapshots.filter(v => v.isViable).map(v => v.netTotalApy), 7);

  return (
    <div className="space-y-4">
      {stakes.map((stake) => {
        const validator = validatorSnapshots.find(v => v.voteAccount === stake.validator.voteAccount);
        const currentApy = validator?.netTotalApy || stake.estimatedApy || 6.5;
        const canOptimize = bestApy - currentApy > 0.5;
        
        return (
          <div key={stake.pubkey} className={`card p-5 ${canOptimize ? "border-amber-500/30" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    stake.state === "active" ? "bg-green-500/20 text-green-400" :
                    stake.state === "activating" ? "bg-blue-500/20 text-blue-400" :
                    stake.state === "deactivating" ? "bg-orange-500/20 text-orange-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {stake.state.toUpperCase()}
                  </span>
                  {validator?.isRisingStar && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                      🌟 Rising Star
                    </span>
                  )}
                  {canOptimize && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent)]">
                      ⚡ Can optimize
                    </span>
                  )}
                  {validator && !validator.isViable && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                      🚫 High commission
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
                  <span className={canOptimize ? "text-amber-400" : "text-[var(--accent)]"}>
                    {currentApy.toFixed(2)}% APY
                  </span>
                </div>
                {validator?.netMevApy && validator.netMevApy > 0 && (
                  <div className="text-xs text-[var(--text-muted)]">
                    incl. {validator.netMevApy.toFixed(1)}% MEV
                  </div>
                )}
              </div>
            </div>

            {canOptimize && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-green-400 font-medium">
                    +{(bestApy - currentApy).toFixed(2)}% APY available → +{((stake.solAmount * (bestApy - currentApy)) / 100).toFixed(3)} SOL/year
                  </span>
                </div>
                <Link
                  href={`/route?amount=${Math.ceil(stake.solAmount)}`}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  Optimize →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Triggers List Component
function TriggersList({ triggers }: { triggers: Trigger[] }) {
  if (triggers.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
        <p className="text-[var(--text-secondary)]">
          Your staking portfolio looks good! We'll notify you when opportunities arise.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {triggers.map((trigger) => (
        <div
          key={trigger.id}
          className={`card p-5 ${
            trigger.severity === "critical" ? "border-red-500/50 bg-red-500/5" :
            trigger.severity === "warning" ? "border-amber-500/50 bg-amber-500/5" :
            "border-blue-500/30"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-3 h-3 mt-1.5 rounded-full shrink-0 ${
              trigger.severity === "critical" ? "bg-red-500 animate-pulse" :
              trigger.severity === "warning" ? "bg-amber-500" :
              "bg-blue-500"
            }`} />
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">{trigger.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                {trigger.description}
              </p>
              
              <div className="flex items-center gap-4 flex-wrap">
                <span className={`text-sm font-medium ${
                  trigger.impact.includes("+") ? "text-green-400" :
                  trigger.impact.includes("-") || trigger.impact.includes("Risk") ? "text-red-400" :
                  "text-[var(--text-muted)]"
                }`}>
                  {trigger.impact}
                </span>
                
                <Link
                  href={trigger.action.href}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  {trigger.action.label} →
                </Link>
              </div>
              
              {trigger.suggestedValidator && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Suggested Alternative</div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{trigger.suggestedValidator.name || "Top Validator"}</span>
                    <span className="text-[var(--accent)] font-medium">{trigger.suggestedValidator.apy.toFixed(2)}% APY</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Recommendations List Component
function RecommendationsList({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">🎯</div>
        <h3 className="text-lg font-semibold mb-2">Fully Optimized!</h3>
        <p className="text-[var(--text-secondary)]">
          Your staking strategy is already optimal. Keep monitoring for new opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {recommendations.map((rec, index) => (
        <div key={rec.id} className="card p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center font-bold text-[var(--accent)] shrink-0">
              {index + 1}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">{rec.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{rec.description}</p>
            </div>
          </div>

          {/* Expected Gain */}
          <div className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
            <div>
              <div className="text-xs text-[var(--text-muted)]">APY Increase</div>
              <div className="text-xl font-bold text-green-400">+{rec.expectedGain.apyIncrease.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">Annual Gain</div>
              <div className="text-xl font-bold text-green-400">+{rec.expectedGain.annualSolGain.toFixed(2)} SOL</div>
            </div>
          </div>

          {/* Steps */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Steps to Execute:</div>
            <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--text-secondary)]">
              {rec.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Target Validator */}
          {rec.validators.to.voteAccount && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)]">
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  {rec.validators.from ? "Switch to" : "Recommended"}
                </div>
                <div className="font-medium">{rec.validators.to.name || "Top Validator"}</div>
              </div>
              <div className="text-right">
                <div className="text-[var(--accent)] font-bold">{rec.validators.to.apy.toFixed(2)}%</div>
                <div className="text-xs text-[var(--text-muted)]">APY</div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-4">
            <Link
              href={rec.type === "switch" ? `/route?amount=100` : rec.type === "diversify" ? "/route" : "/discover"}
              className="btn-primary w-full text-center"
            >
              {rec.type === "switch" ? "Find Best Validator →" :
               rec.type === "diversify" ? "Plan Diversification →" :
               rec.type === "new_stake" ? "Start Staking →" :
               "Take Action →"}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// Header is imported from layout
