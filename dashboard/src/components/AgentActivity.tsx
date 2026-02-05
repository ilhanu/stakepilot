"use client";

import { useState, useEffect } from "react";

interface ValidatorAnalysis {
  name: string;
  voteAccount: string;
  totalApy: number;
  wizScore: number;
  stake: number;
  commission: number;
  mevCommission: number;
  uptime: number;
  reasons: string[];
  allocation: number;
}

interface AgentDecision {
  timestamp: string;
  vaultBalance: number;
  availableToStake: number;
  analysis: ValidatorAnalysis[];
  reasoning: string[];
  action: "stake" | "hold" | "rebalance";
  status: "pending" | "executing" | "completed" | "simulated";
}

export function AgentActivity() {
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  useEffect(() => {
    fetchAgentDecision();
    const interval = setInterval(fetchAgentDecision, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgentDecision = async () => {
    try {
      const res = await fetch("/api/agent/analyze");
      if (res.ok) {
        const data = await res.json();
        setDecision(data);
      }
    } catch (err) {
      console.error("Failed to fetch agent decision:", err);
    } finally {
      setLoading(false);
    }
  };

  const simulateExecution = async () => {
    if (!decision || decision.action !== "stake") return;
    
    setExecuting(true);
    setExecutionLog([]);
    
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setExecutionLog([...logs]);
    };

    addLog("🤖 Agent execution started...");
    await sleep(800);
    
    addLog(`📊 Analyzing ${decision.analysis.length} validators...`);
    await sleep(600);

    for (const validator of decision.analysis) {
      addLog(`🔍 Preparing stake for ${validator.name}...`);
      await sleep(500);
      addLog(`   → Amount: ${validator.allocation.toFixed(4)} SOL`);
      await sleep(300);
      addLog(`   → Vote account: ${validator.voteAccount.slice(0, 8)}...`);
      await sleep(400);
    }

    addLog("📝 Building transaction...");
    await sleep(700);
    
    addLog("⚠️ DEVNET: Simulated execution (mainnet would submit tx)");
    await sleep(500);
    
    addLog("✅ Execution plan complete!");
    addLog(`   Total: ${decision.availableToStake.toFixed(4)} SOL across ${decision.analysis.length} validators`);
    
    setExecuting(false);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  if (loading) {
    return (
      <div className="rounded-2xl p-6 border border-[var(--border)] bg-gradient-to-br from-[var(--accent)]/5 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Agent Analyzing...</h2>
            <p className="text-sm text-[var(--text-muted)]">Evaluating validators</p>
          </div>
        </div>
      </div>
    );
  }

  if (!decision) {
    return null;
  }

  const statusColors = {
    pending: "text-[var(--accent)] bg-[var(--accent)]/10",
    executing: "text-blue-400 bg-blue-500/10",
    completed: "text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10",
    simulated: "text-[var(--coral)] bg-[var(--coral)]/10",
  };

  const actionLabels = {
    stake: "🎯 Execute Staking",
    hold: "⏸️ Hold - Insufficient Balance",
    rebalance: "🔄 Rebalance Positions",
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/5 via-[var(--bg-card)] to-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg">
              <span className="text-lg sm:text-xl">🤖</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Agent Decision</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                {new Date(decision.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium ${statusColors[decision.status]}`}>
            {decision.status.charAt(0).toUpperCase() + decision.status.slice(1)}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-[var(--bg-primary)]">
            <div className="text-[var(--text-muted)] text-[10px] sm:text-xs mb-0.5 sm:mb-1">Balance</div>
            <div className="text-sm sm:text-xl font-bold">{decision.vaultBalance.toFixed(2)}</div>
          </div>
          <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-[var(--bg-primary)]">
            <div className="text-[var(--text-muted)] text-[10px] sm:text-xs mb-0.5 sm:mb-1">Available</div>
            <div className="text-sm sm:text-xl font-bold text-[var(--accent)]">{decision.availableToStake.toFixed(2)}</div>
          </div>
          <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-[var(--bg-primary)]">
            <div className="text-[var(--text-muted)] text-[10px] sm:text-xs mb-0.5 sm:mb-1">Action</div>
            <div className="text-xs sm:text-base font-semibold">{decision.action === "stake" ? "🎯 Stake" : decision.action === "hold" ? "⏸️ Hold" : "🔄 Rebalance"}</div>
          </div>
        </div>

        {/* Agent Reasoning */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] mb-2 sm:mb-3 flex items-center gap-2">
            <span>💭</span> Reasoning
          </h3>
          <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-[var(--bg-primary)] space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-48 overflow-y-auto">
            {decision.reasoning.slice(0, 6).map((reason, i) => (
              <div key={i} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <span className="text-[var(--accent)] mt-0.5 shrink-0">→</span>
                <span className="text-[var(--text-secondary)]">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Allocation Plan */}
        {decision.analysis.length > 0 && (
          <div>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full text-xs sm:text-sm font-semibold text-[var(--text-secondary)] mb-2 sm:mb-3 hover:text-[var(--text-primary)] transition"
            >
              <span className="flex items-center gap-2">
                <span>📊</span> Plan ({decision.analysis.length} validators)
              </span>
              <span className="text-[var(--text-muted)]">{expanded ? "▼" : "▶"}</span>
            </button>
            
            {expanded && (
              <div className="space-y-3">
                {decision.analysis.map((validator) => (
                  <div
                    key={validator.voteAccount}
                    className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent-secondary)]/30 flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                          {validator.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{validator.name}</div>
                          <div className="text-xs text-[var(--text-muted)] font-mono">
                            {validator.voteAccount.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[var(--accent)] font-bold">
                          {validator.allocation.toFixed(2)} SOL
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {validator.totalApy.toFixed(2)}% APY
                        </div>
                      </div>
                    </div>
                    
                    {/* Validator Metrics */}
                    <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                      <div className="px-2 py-1.5 rounded-lg bg-[var(--bg-card)]">
                        <span className="text-[var(--text-muted)]">Score:</span> <span className="font-medium">{validator.wizScore.toFixed(0)}</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-[var(--bg-card)]">
                        <span className="text-[var(--text-muted)]">Comm:</span> <span className="font-medium">{validator.commission}%</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-[var(--bg-card)]">
                        <span className="text-[var(--text-muted)]">MEV:</span> <span className="font-medium">{validator.mevCommission}%</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-[var(--bg-card)]">
                        <span className="text-[var(--text-muted)]">Uptime:</span> <span className="font-medium">{validator.uptime}%</span>
                      </div>
                    </div>
                    
                    {/* Selection Reasons */}
                    <div className="text-xs text-[var(--text-muted)]">
                      {validator.reasons.map((reason, i) => (
                        <span key={i}>
                          {i > 0 && " • "}
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <div className="px-6 pb-4">
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] font-mono text-xs max-h-48 overflow-y-auto border border-[var(--border)]">
            {executionLog.map((log, i) => (
              <div key={i} className={`${log.includes("✅") ? "text-[var(--accent-secondary)]" : log.includes("⚠️") ? "text-[var(--coral)]" : "text-[var(--text-secondary)]"}`}>
                {log}
              </div>
            ))}
            {executing && (
              <div className="text-[var(--accent)] animate-pulse">▌</div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-[var(--bg-primary)] px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-sm border-t border-[var(--border)]">
        <span className="text-[var(--text-muted)] text-xs sm:text-sm text-center sm:text-left">
          {executing ? "Executing..." : "Auto-refresh in ~30s"}
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          {decision?.action === "stake" && (
            <button 
              onClick={simulateExecution}
              disabled={executing}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] text-black rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2"
            >
              {executing ? "⚙️ Running..." : "▶️ Simulate"}
            </button>
          )}
          <button 
            onClick={fetchAgentDecision}
            disabled={executing}
            className="px-3 py-2 text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:text-[var(--text-muted)] rounded-lg transition flex items-center gap-1.5 text-xs sm:text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
