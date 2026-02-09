"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-32 bg-[var(--bg-elevated)] rounded-xl animate-pulse" /> }
);
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface VaultData {
  balance: number;
  totalStaked: number;
  owner: string;
  agent: string;
}

interface StrategyData {
  riskTolerance: "Low" | "Medium" | "High";
  targetApy: number;
  maxValidators: number;
  preferDecentralization: boolean;
}

interface StakePosition {
  stakeAccount: string;
  validator: string;
  validatorName: string;
  amount: number;
  status: "active" | "activating" | "deactivating" | "inactive";
  activationEpoch: number | null;
  netApy?: number;
  commission?: number;
}

interface AgentActivity {
  id: string;
  type: "stake" | "unstake" | "rebalance" | "deposit" | "withdraw" | "strategy_update" | "check";
  summary: string;
  timestamp: string;
  txSignature: string;
  details?: string;
  amount?: number;
}

interface AgentStats {
  status: "active" | "paused" | "idle";
  lastExecution: string;
  totalDecisions: number;
  successRate: number;
  avgApyAchieved: number;
  nextCheck: string;
}

// ============================================
// API CALLS
// ============================================

async function fetchVaultStatus(owner: string): Promise<{
  exists: boolean;
  vault: VaultData | null;
  strategy: StrategyData | null;
}> {
  const res = await fetch(`/api/vault/status?owner=${owner}`);
  if (!res.ok) throw new Error("Failed to fetch vault status");
  return res.json();
}

async function fetchPositions(owner: string): Promise<{
  positions: StakePosition[];
  totalStaked: number;
  currentEpoch: number;
}> {
  const res = await fetch(`/api/vault/positions?owner=${owner}`);
  if (!res.ok) throw new Error("Failed to fetch positions");
  return res.json();
}

async function fetchActivity(owner: string, limit = 20): Promise<{
  activities: AgentActivity[];
  count: number;
}> {
  const res = await fetch(`/api/vault/activity?owner=${owner}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

async function fetchValidatorApy(validators: string[]): Promise<Map<string, { netApy: number; commission: number }>> {
  // Fetch from our validators API to get APY data
  try {
    const res = await fetch("/api/validators");
    if (!res.ok) return new Map();
    const data = await res.json();
    
    const apyMap = new Map<string, { netApy: number; commission: number }>();
    for (const v of data.validators || []) {
      apyMap.set(v.voteAccount, {
        netApy: v.totalApy || 7.0,
        commission: 5, // Default, would come from validator data
      });
    }
    return apyMap;
  } catch {
    return new Map();
  }
}

// ============================================
// COMPONENT
// ============================================

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  
  // Data state
  const [vault, setVault] = useState<VaultData | null>(null);
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"positions" | "activity">("positions");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Agent stats (derived from activity)
  const lastCheckActivity = activities.find(a => a.type === "check");
  const lastActionActivity = activities.find(a => ["stake", "unstake", "rebalance"].includes(a.type));
  
  const agentStats: AgentStats = {
    status: activities.length > 0 ? "active" : "idle",
    lastExecution: lastCheckActivity?.timestamp 
      ? formatTimeAgo(new Date(lastCheckActivity.timestamp))
      : "Never",
    totalDecisions: activities.filter(a => ["stake", "unstake", "rebalance"].includes(a.type)).length,
    successRate: 100, // All fetched txs succeeded
    avgApyAchieved: positions.length > 0 
      ? positions.reduce((sum, p) => sum + (p.netApy || 7), 0) / positions.length
      : 0,
    nextCheck: lastCheckActivity?.timestamp
      ? getNextRunEstimate(new Date(lastCheckActivity.timestamp))
      : "~1 hour",
  };

  // Action summary counts
  const actionSummary = {
    totalStakes: activities.filter(a => a.type === "stake").length,
    totalDeactivations: activities.filter(a => a.type === "unstake" || a.type === "rebalance").length,
    totalChecks: activities.filter(a => a.type === "check").length,
    totalDeposits: activities.filter(a => a.type === "deposit").length,
    solStaked: activities.filter(a => a.type === "stake").reduce((sum, a) => sum + (a.amount || 0), 0),
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const owner = publicKey.toBase58();
      
      // Fetch vault status
      const vaultStatus = await fetchVaultStatus(owner);
      
      if (!vaultStatus.exists || !vaultStatus.vault) {
        setVault(null);
        setStrategy(null);
        setPositions([]);
        setActivities([]);
        setLoading(false);
        return;
      }
      
      setVault(vaultStatus.vault);
      setStrategy(vaultStatus.strategy);
      
      // Fetch positions and activity in parallel
      const [positionsData, activityData] = await Promise.all([
        fetchPositions(owner),
        fetchActivity(owner),
      ]);
      
      setCurrentEpoch(positionsData.currentEpoch);
      
      // Enrich positions with APY data
      if (positionsData.positions.length > 0) {
        const validators = positionsData.positions.map(p => p.validator);
        const apyMap = await fetchValidatorApy(validators);
        
        const enrichedPositions = positionsData.positions.map(p => ({
          ...p,
          netApy: apyMap.get(p.validator)?.netApy || 7.0,
          commission: apyMap.get(p.validator)?.commission || 5,
        }));
        
        setPositions(enrichedPositions);
      } else {
        setPositions([]);
      }
      
      setActivities(activityData.activities);
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Initial fetch
  useEffect(() => {
    if (connected && publicKey) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey, fetchData]);

  // Computed values
  const totalValue = vault ? vault.balance + vault.totalStaked : 0;
  const weightedApy = positions.length > 0
    ? positions.reduce((sum, p) => sum + (p.netApy || 7) * p.amount, 0) / 
      positions.reduce((sum, p) => sum + p.amount, 0)
    : 0;

  // ============================================
  // RENDER: Not connected
  // ============================================
  if (!connected) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">Connect Your Wallet</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Connect your Solana wallet to view your Agent Vault dashboard
          </p>
          <WalletMultiButton className="!bg-[var(--accent)] !text-black hover:!bg-[var(--accent-hover)]" />
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Loading
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)]">Loading vault data...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Error
  // ============================================
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">Error Loading Data</h1>
          <p className="text-[var(--text-secondary)] mb-8">{error}</p>
          <button onClick={fetchData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: No vault
  // ============================================
  if (!vault) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">No Vault Found</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Create your Agent Vault to start autonomous staking
          </p>
          <Link href="/vault" className="btn-primary">
            Create Vault
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Dashboard
  // ============================================
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="container-lg py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Agent Vault</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
              {lastRefresh && (
                <span className="ml-2 text-[var(--text-muted)]">
                  · Updated {formatTimeAgo(lastRefresh)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              className="btn-ghost text-sm"
              disabled={loading}
            >
              ↻ Refresh
            </button>
            <Link href="/vault" className="btn-secondary text-sm !py-2 !px-4">
              Manage
            </Link>
          </div>
        </div>

        {/* Network Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-xs">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
          Devnet · Epoch {currentEpoch}
        </div>

        {/* Agent Monitor Bar */}
        <div className="mb-6 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${agentStats.status === "active" ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--text-muted)]"}`} />
              <div>
                <span className="text-sm font-medium">Agent {agentStats.status === "active" ? "Active" : "Idle"}</span>
                <span className="text-xs text-[var(--text-muted)] ml-2">
                  Last run: {agentStats.lastExecution}
                  {lastCheckActivity?.timestamp && (
                    <span className="ml-1">({formatTimestamp(lastCheckActivity.timestamp)})</span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span>Next run: <span className="text-[var(--accent)] font-medium">{agentStats.nextCheck}</span></span>
              <span>·</span>
              <span>Cycle: hourly</span>
            </div>
          </div>
        </div>

        {/* Action Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Stake Actions", value: actionSummary.totalStakes, color: "text-[var(--accent)]" },
            { label: "Rebalances", value: actionSummary.totalDeactivations, color: "text-blue-400" },
            { label: "Agent Checks", value: actionSummary.totalChecks, color: "text-[var(--text-muted)]" },
            { label: "SOL Staked", value: actionSummary.solStaked.toFixed(1), color: "text-[var(--accent-secondary)]" },
            { label: "Deposits", value: actionSummary.totalDeposits, color: "text-green-400" },
          ].map((stat, i) => (
            <div key={i} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-center">
              <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Value"
            value={totalValue.toFixed(2)}
            suffix="SOL"
            subtext={`~$${(totalValue * 120).toLocaleString()}`}
          />
          <StatCard
            label="Staked"
            value={vault.totalStaked.toFixed(2)}
            suffix="SOL"
            subtext={totalValue > 0 ? `${((vault.totalStaked / totalValue) * 100).toFixed(0)}% deployed` : "0% deployed"}
            accent
          />
          <StatCard
            label="Available"
            value={vault.balance.toFixed(2)}
            suffix="SOL"
            subtext="Ready to stake"
          />
          <StatCard
            label="Net APY"
            value={weightedApy.toFixed(1)}
            suffix="%"
            subtext="Weighted average"
            accent
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Positions & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Switcher */}
            <div className="card overflow-hidden">
              <div className="flex border-b border-[var(--border)]">
                <button
                  onClick={() => setActiveTab("positions")}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "positions"
                      ? "text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Stake Positions ({positions.length})
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "activity"
                      ? "text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Agent Activity ({activities.length})
                </button>
              </div>

              {activeTab === "positions" ? (
                <div className="divide-y divide-[var(--border)]">
                  {positions.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">
                      <p>No stake positions yet</p>
                      <p className="text-sm mt-1">Agent will stake based on your strategy</p>
                    </div>
                  ) : (
                    positions.map((position, i) => (
                      <div key={position.stakeAccount} className="p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-sm">
                              {position.validatorName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{position.validatorName}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {position.validator.slice(0, 8)}...{position.validator.slice(-4)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{position.amount.toFixed(4)} SOL</p>
                            <p className="text-xs text-[var(--accent)]">
                              {position.netApy?.toFixed(1) || "~7"}% NET
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <span>{position.commission || 5}% commission</span>
                          <span>•</span>
                          <span className={`${
                            position.status === "active" ? "text-[var(--accent)]" : 
                            position.status === "activating" ? "text-yellow-400" :
                            "text-[var(--text-muted)]"
                          }`}>
                            {position.status}
                          </span>
                          {position.activationEpoch && (
                            <>
                              <span>•</span>
                              <span>Epoch {position.activationEpoch}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">
                      <p>No activity yet</p>
                      <p className="text-sm mt-1">Transactions will appear here</p>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
                        <div className="flex items-start gap-3">
                          <ActivityIcon type={activity.type} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{activity.summary}</p>
                              <a
                                href={`https://solscan.io/tx/${activity.txSignature}?cluster=testnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--accent)] hover:underline shrink-0"
                              >
                                View TX →
                              </a>
                            </div>
                            {activity.details && (
                              <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                                {activity.details}
                              </p>
                            )}
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                              {formatTimestamp(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Projected Earnings */}
            {positions.length > 0 && (
              <div className="card p-6">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
                  Projected Earnings
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-[var(--accent)]">
                      {((vault.totalStaked * weightedApy) / 100 / 12).toFixed(3)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">SOL / month</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--accent)]">
                      {((vault.totalStaked * weightedApy) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">SOL / year</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--accent)]">
                      ${((vault.totalStaked * weightedApy / 100) * 120).toFixed(0)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">USD / year</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Agent & Strategy */}
          <div className="space-y-6">
            {/* Agent Status */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Agent Status</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  agentStats.status === "active"
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "bg-[var(--text-muted)]/10 text-[var(--text-muted)]"
                }`}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                  {agentStats.status.charAt(0).toUpperCase() + agentStats.status.slice(1)}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Agent wallet</span>
                  <span className="font-mono text-xs">
                    {vault.agent.slice(0, 4)}...{vault.agent.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Last activity</span>
                  <span>{agentStats.lastExecution}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Next run</span>
                  <span className="text-[var(--accent)]">{agentStats.nextCheck}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Decisions</span>
                  <span>{agentStats.totalDecisions}</span>
                </div>
                {positions.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Avg APY achieved</span>
                    <span className="text-[var(--accent)]">{agentStats.avgApyAchieved.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Strategy Summary */}
            {strategy && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Strategy</h3>
                  <Link href="/vault" className="text-xs text-[var(--accent)] hover:underline">
                    Edit →
                  </Link>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Risk</span>
                    <span className={`${
                      strategy.riskTolerance === "Low"
                        ? "text-blue-400"
                        : strategy.riskTolerance === "Medium"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}>
                      {strategy.riskTolerance}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Target APY</span>
                    <span>{(strategy.targetApy / 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Max validators</span>
                    <span>{strategy.maxValidators}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Decentralization</span>
                    <span className={strategy.preferDecentralization ? "text-[var(--accent)]" : ""}>
                      {strategy.preferDecentralization ? "Preferred" : "Off"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/vault"
                  className="block w-full py-3 px-4 text-sm text-center bg-[var(--accent)] text-black font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Deposit SOL
                </Link>
                <Link
                  href="/vault"
                  className="block w-full py-3 px-4 text-sm text-center border border-[var(--border)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  Withdraw
                </Link>
                <Link
                  href="/discover"
                  className="block w-full py-3 px-4 text-sm text-center border border-[var(--border)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  Browse Validators
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({
  label,
  value,
  suffix,
  subtext,
  accent,
}: {
  label: string;
  value: string;
  suffix: string;
  subtext: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${accent ? "text-[var(--accent)]" : ""}`}>
          {value}
        </span>
        <span className="text-sm text-[var(--text-muted)]">{suffix}</span>
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>
    </div>
  );
}

function ActivityIcon({ type }: { type: AgentActivity["type"] }) {
  const config: Record<AgentActivity["type"], { bg: string; color: string; icon: string }> = {
    stake: { bg: "bg-[var(--accent)]/10", color: "text-[var(--accent)]", icon: "↗" },
    unstake: { bg: "bg-red-500/10", color: "text-red-400", icon: "↙" },
    rebalance: { bg: "bg-blue-500/10", color: "text-blue-400", icon: "⇄" },
    deposit: { bg: "bg-green-500/10", color: "text-green-400", icon: "+" },
    withdraw: { bg: "bg-orange-500/10", color: "text-orange-400", icon: "−" },
    strategy_update: { bg: "bg-purple-500/10", color: "text-purple-400", icon: "⚙" },
    check: { bg: "bg-[var(--text-muted)]/10", color: "text-[var(--text-muted)]", icon: "◉" },
  };

  const { bg, color, icon } = config[type];

  return (
    <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center text-sm font-bold shrink-0`}>
      {icon}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getNextRunEstimate(lastRun: Date): string {
  const nextRun = new Date(lastRun.getTime() + 60 * 60 * 1000); // +1 hour
  const now = new Date();
  const diffMs = nextRun.getTime() - now.getTime();
  if (diffMs <= 0) return "Any moment";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `~${diffMin}m`;
  return `~${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
