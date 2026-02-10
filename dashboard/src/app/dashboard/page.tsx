"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ActivityEntry {
  type: string;
  summary: string;
  timestamp: string;
  txSignature?: string;
  details?: string;
  amount?: number;
}

interface ScheduleData {
  epoch: number;
  epochProgress: number;
  epochHoursRemaining: number;
  nextAgentRun: string;
  lastAgentRun: string | null;
  cronIntervalHours: number;
}

interface PositionData {
  status: string;
  stakedAmount: number;
  validator: string;
  validatorName?: string;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  stake: { icon: "↗", color: "text-[var(--accent)]", bg: "bg-[var(--accent)]/10" },
  deactivate: { icon: "⏸", color: "text-orange-400", bg: "bg-orange-400/10" },
  withdraw: { icon: "↙", color: "text-blue-400", bg: "bg-blue-400/10" },
  rebalance: { icon: "⇄", color: "text-blue-400", bg: "bg-blue-400/10" },
  unstake: { icon: "↙", color: "text-red-400", bg: "bg-red-400/10" },
  check: { icon: "◉", color: "text-[var(--text-muted)]", bg: "bg-[var(--text-muted)]/10" },
  error: { icon: "✗", color: "text-red-400", bg: "bg-red-400/10" },
  deposit: { icon: "+", color: "text-green-400", bg: "bg-green-400/10" },
};

export default function MonitorPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [actRes, schedRes, posRes, vaultRes] = await Promise.all([
          fetch("/api/agent/activity?limit=100").then(r => r.json()).catch(() => null),
          fetch("/api/agent/schedule").then(r => r.json()).catch(() => null),
          fetch("/api/agent/positions").then(r => r.json()).catch(() => null),
          fetch("/api/agent/vault").then(r => r.json()).catch(() => null),
        ]);
        if (actRes?.activities) setActivities(actRes.activities);
        if (schedRes) setSchedule(schedRes);
        if (posRes?.positions) setPositions(posRes.positions);
        if (vaultRes) setVaultBalance(vaultRes.balance ?? vaultRes.vaultBalance ?? 0);
      } catch (e) {
        console.error("Failed to fetch monitor data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredActivities = filterType === "all"
    ? activities
    : activities.filter(a => a.type === filterType);

  const stakeActions = activities.filter(a => a.type === "stake").length;
  const rebalanceActions = activities.filter(a => ["deactivate", "rebalance", "unstake"].includes(a.type)).length;
  const checkActions = activities.filter(a => a.type === "check").length;
  const totalStaked = positions.reduce((sum, p) => sum + (p.status === "active" ? p.stakedAmount : 0), 0);
  const epochPct = schedule?.epochProgress ?? 0;

  const commissionTracked = positions.length; // number of validators being tracked

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Testnet Banner */}
      <div className="bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 py-2 px-4 text-center">
        <span className="text-[var(--accent)] text-sm font-medium">
          🧪 Running on Solana Testnet — Agent Monitor
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Agent Monitor</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Full activity log and operational state of the autonomous staking agent
            </p>
          </div>
          <Link href="/vault" className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black rounded-xl text-sm font-semibold transition">
            ← Back to Vault
          </Link>
        </div>

        {/* Agent State Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Status</span>
            </div>
            <div className="text-2xl font-bold text-[var(--accent)]">Active</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              Every {schedule?.cronIntervalHours ?? 8}h cycle
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Staked</span>
            </div>
            <div className="text-2xl font-bold text-[var(--accent)]">{totalStaked.toFixed(2)}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">SOL across {positions.filter(p => p.status === "active").length} positions</div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">👁</span>
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Commissions Tracked</span>
            </div>
            <div className="text-2xl font-bold">{commissionTracked}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">Validators monitored</div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💰</span>
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Vault Balance</span>
            </div>
            <div className="text-2xl font-bold">{vaultBalance.toFixed(2)}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">SOL available</div>
          </div>
        </div>

        {/* Epoch Progress + Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Epoch Progress */}
          <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Epoch {schedule?.epoch ?? "—"}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {epochPct}% complete — ~{schedule?.epochHoursRemaining ?? "?"}h remaining
              </span>
            </div>
            <div className="w-full h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${epochPct}%`,
                  background: epochPct >= 80
                    ? "linear-gradient(90deg, var(--accent), var(--accent-secondary))"
                    : "var(--accent)",
                  opacity: epochPct >= 80 ? 1 : 0.6,
                }}
              />
            </div>
            {epochPct >= 80 && (
              <div className="text-xs text-[var(--accent)]">⚡ Rebalancing window open — agent may execute trades</div>
            )}
            <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">Last Agent Run: </span>
                <span className="font-medium">
                  {schedule?.lastAgentRun ? formatTimeAgo(new Date(schedule.lastAgentRun)) : "—"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Next Agent Run: </span>
                <span className="font-medium text-[var(--accent)]">
                  {schedule?.nextAgentRun ? formatTimeAgo(new Date(schedule.nextAgentRun)) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Summary */}
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
            <span className="text-sm font-semibold mb-3 block">Action Summary</span>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Stake actions</span>
                <span className="font-medium text-[var(--accent)]">{stakeActions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Rebalances</span>
                <span className="font-medium text-blue-400">{rebalanceActions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Agent checks</span>
                <span className="font-medium">{checkActions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Total events</span>
                <span className="font-medium">{activities.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Activity Log</h2>
            <div className="flex gap-2 flex-wrap">
              {["all", "stake", "deactivate", "check", "error"].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filterType === t
                      ? "bg-[var(--accent)] text-black"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]"
                  }`}
                >
                  {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent)] border-t-transparent mx-auto" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              <div className="text-3xl mb-2">📋</div>
              <p>No activity recorded yet</p>
              <p className="text-xs mt-1">The agent will log actions here as it operates</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredActivities.map((a, i) => {
                const cfg = typeConfig[a.type] || typeConfig.check;
                return (
                  <div key={i} className="p-4 hover:bg-[var(--bg-elevated)]/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center text-sm font-bold shrink-0 mt-0.5`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{a.summary}</p>
                          {a.txSignature && (
                            <a
                              href={`https://explorer.solana.com/tx/${a.txSignature}?cluster=testnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--accent)] hover:underline shrink-0"
                            >
                              tx ↗
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                          <span>{formatTimestamp(a.timestamp)}</span>
                          <span>·</span>
                          <span>{formatTimeAgo(new Date(a.timestamp))}</span>
                          {a.type && (
                            <>
                              <span>·</span>
                              <span className={`${cfg.color} font-medium`}>{a.type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
