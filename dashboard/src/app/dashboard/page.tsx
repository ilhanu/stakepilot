"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

// Types for vault data
interface VaultData {
  balance: number;
  totalStaked: number;
  strategy: {
    riskTolerance: "low" | "medium" | "high";
    targetApy: number;
    maxValidators: number;
    preferDecentralization: boolean;
  };
  createdAt: string;
}

interface StakePosition {
  validator: string;
  validatorName: string;
  amount: number;
  netApy: number;
  commission: number;
  status: "active" | "activating" | "deactivating";
  stakedAt: string;
}

interface AgentStats {
  status: "active" | "paused" | "idle";
  lastExecution: string;
  totalDecisions: number;
  successRate: number;
  avgApyAchieved: number;
  nextCheck: string;
}

interface AgentActivity {
  id: string;
  type: "stake" | "unstake" | "rebalance" | "check" | "skip";
  summary: string;
  timestamp: string;
  txSignature?: string;
  details?: string;
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"positions" | "activity">("positions");

  useEffect(() => {
    if (connected && publicKey) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data - will be replaced with real chain data
      setVault({
        balance: 12.5,
        totalStaked: 87.5,
        strategy: {
          riskTolerance: "medium",
          targetApy: 7.5,
          maxValidators: 5,
          preferDecentralization: true,
        },
        createdAt: "2026-02-01",
      });

      setPositions([
        {
          validator: "J2nUHv...aKm3",
          validatorName: "Helius",
          amount: 25,
          netApy: 7.8,
          commission: 5,
          status: "active",
          stakedAt: "2026-02-01",
        },
        {
          validator: "mrgn2v...pQx9",
          validatorName: "marginfi",
          amount: 30,
          netApy: 7.5,
          commission: 7,
          status: "active",
          stakedAt: "2026-02-01",
        },
        {
          validator: "Cube1x...kL7n",
          validatorName: "Cubik",
          amount: 32.5,
          netApy: 8.1,
          commission: 5,
          status: "active",
          stakedAt: "2026-02-02",
        },
      ]);

      setAgentStats({
        status: "active",
        lastExecution: "2 hours ago",
        totalDecisions: 12,
        successRate: 100,
        avgApyAchieved: 7.8,
        nextCheck: "58 min",
      });

      setActivities([
        {
          id: "1",
          type: "stake",
          summary: "Staked 32.5 SOL to Cubik",
          timestamp: "2026-02-02 14:30 UTC",
          txSignature: "3xK2j...mN9p",
          details: "Selected based on 8.1% APY and low concentration score",
        },
        {
          id: "2",
          type: "rebalance",
          summary: "Moved 5 SOL from Jito to marginfi",
          timestamp: "2026-02-01 22:15 UTC",
          txSignature: "7mNp2...qR4x",
          details: "marginfi offering better APY (7.5% vs 7.1%)",
        },
        {
          id: "3",
          type: "check",
          summary: "Analyzed 1,247 validators, no action needed",
          timestamp: "2026-02-01 18:00 UTC",
          details: "Current allocation optimal for strategy",
        },
        {
          id: "4",
          type: "stake",
          summary: "Initial stake: 55 SOL across 2 validators",
          timestamp: "2026-02-01 10:00 UTC",
          txSignature: "9xQr4...vT2m",
          details: "Helius (25 SOL) + marginfi (30 SOL)",
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = vault ? vault.balance + vault.totalStaked : 0;
  const weightedApy =
    positions.length > 0
      ? positions.reduce((sum, p) => sum + p.netApy * p.amount, 0) /
        (vault?.totalStaked || 1)
      : 0;

  // Not connected state
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

  // Loading state
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

  // No vault state
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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="container-lg py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Agent Vault</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
            </p>
          </div>
          <Link href="/vault" className="btn-secondary text-sm !py-2 !px-4">
            Manage
          </Link>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Value"
            value={`${totalValue.toFixed(2)}`}
            suffix="SOL"
            subtext={`~$${(totalValue * 120).toLocaleString()}`}
          />
          <StatCard
            label="Staked"
            value={`${vault.totalStaked.toFixed(2)}`}
            suffix="SOL"
            subtext={`${((vault.totalStaked / totalValue) * 100).toFixed(0)}% deployed`}
            accent
          />
          <StatCard
            label="Available"
            value={`${vault.balance.toFixed(2)}`}
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
                  Agent Activity
                </button>
              </div>

              {activeTab === "positions" ? (
                <div className="divide-y divide-[var(--border)]">
                  {positions.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">
                      <p>No positions yet</p>
                      <p className="text-sm mt-1">Agent will stake based on your strategy</p>
                    </div>
                  ) : (
                    positions.map((position, i) => (
                      <div key={i} className="p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-sm">
                              {position.validatorName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{position.validatorName}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {position.validator}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{position.amount.toFixed(2)} SOL</p>
                            <p className="text-xs text-[var(--accent)]">
                              {position.netApy.toFixed(1)}% NET
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <span>{position.commission}% commission</span>
                          <span>•</span>
                          <span className={`${
                            position.status === "active" ? "text-[var(--accent)]" : "text-yellow-400"
                          }`}>
                            {position.status}
                          </span>
                          <span>•</span>
                          <span>Since {position.stakedAt}</span>
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
                      <p className="text-sm mt-1">Agent is monitoring validators...</p>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
                        <div className="flex items-start gap-3">
                          <ActivityIcon type={activity.type} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{activity.summary}</p>
                              {activity.txSignature && (
                                <a
                                  href={`https://solscan.io/tx/${activity.txSignature}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[var(--accent)] hover:underline shrink-0"
                                >
                                  View TX →
                                </a>
                              )}
                            </div>
                            {activity.details && (
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {activity.details}
                              </p>
                            )}
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                              {activity.timestamp}
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
          </div>

          {/* Right: Agent & Strategy */}
          <div className="space-y-6">
            {/* Agent Status */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Agent Status</h3>
                {agentStats && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    agentStats.status === "active"
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : agentStats.status === "paused"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-[var(--text-muted)]/10 text-[var(--text-muted)]"
                  }`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                    {agentStats.status.charAt(0).toUpperCase() + agentStats.status.slice(1)}
                  </span>
                )}
              </div>

              {agentStats && (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Last check</span>
                    <span>{agentStats.lastExecution}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Next check</span>
                    <span>{agentStats.nextCheck}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Decisions</span>
                    <span>{agentStats.totalDecisions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Success rate</span>
                    <span className="text-[var(--accent)]">{agentStats.successRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Avg APY achieved</span>
                    <span className="text-[var(--accent)]">{agentStats.avgApyAchieved.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Strategy Summary */}
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
                  <span className={`capitalize ${
                    vault.strategy.riskTolerance === "low"
                      ? "text-blue-400"
                      : vault.strategy.riskTolerance === "medium"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}>
                    {vault.strategy.riskTolerance}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Target APY</span>
                  <span>{vault.strategy.targetApy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Max validators</span>
                  <span>{vault.strategy.maxValidators}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Decentralization</span>
                  <span className={vault.strategy.preferDecentralization ? "text-[var(--accent)]" : ""}>
                    {vault.strategy.preferDecentralization ? "Preferred" : "Off"}
                  </span>
                </div>
              </div>
            </div>

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

// Stat Card Component
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

// Activity Icon Component
function ActivityIcon({ type }: { type: AgentActivity["type"] }) {
  const config = {
    stake: { bg: "bg-[var(--accent)]/10", color: "text-[var(--accent)]", icon: "↗" },
    unstake: { bg: "bg-red-500/10", color: "text-red-400", icon: "↙" },
    rebalance: { bg: "bg-blue-500/10", color: "text-blue-400", icon: "⇄" },
    check: { bg: "bg-[var(--text-muted)]/10", color: "text-[var(--text-muted)]", icon: "◉" },
    skip: { bg: "bg-[var(--text-muted)]/10", color: "text-[var(--text-muted)]", icon: "–" },
  };

  const { bg, color, icon } = config[type];

  return (
    <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center text-sm font-bold shrink-0`}>
      {icon}
    </div>
  );
}
