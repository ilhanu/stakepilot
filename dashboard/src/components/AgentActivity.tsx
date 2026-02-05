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
    // Refresh every 30 seconds
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
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Agent Analyzing...</h2>
            <p className="text-sm text-[var(--text-secondary)]">Evaluating validators</p>
          </div>
        </div>
      </div>
    );
  }

  if (!decision) {
    return null;
  }

  const statusColors = {
    pending: "text-yellow-400 bg-yellow-500/20",
    executing: "text-blue-400 bg-blue-500/20",
    completed: "text-[var(--accent)] bg-emerald-500/20",
    simulated: "text-purple-400 bg-purple-500/20",
  };

  const actionLabels = {
    stake: "🎯 Execute Staking",
    hold: "⏸️ Hold - Insufficient Balance",
    rebalance: "🔄 Rebalance Positions",
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Agent Decision</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Last analysis: {new Date(decision.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[decision.status]}`}>
            {decision.status.charAt(0).toUpperCase() + decision.status.slice(1)}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-[var(--text-secondary)] text-xs">Vault Balance</div>
            <div className="text-xl font-bold">{decision.vaultBalance.toFixed(2)} SOL</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-[var(--text-secondary)] text-xs">Available to Stake</div>
            <div className="text-xl font-bold text-[var(--accent)]">{decision.availableToStake.toFixed(2)} SOL</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-[var(--text-secondary)] text-xs">Action</div>
            <div className="text-lg font-bold">{actionLabels[decision.action]}</div>
          </div>
        </div>

        {/* Agent Reasoning */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2">
            <span>💭</span> Agent Reasoning
          </h3>
          <div className="bg-black/20 rounded-lg p-4 space-y-2">
            {decision.reasoning.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-purple-400 mt-0.5">→</span>
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
              className="flex items-center justify-between w-full text-sm font-semibold text-[var(--text-secondary)] mb-2 hover:text-white transition"
            >
              <span className="flex items-center gap-2">
                <span>📊</span> Staking Plan ({decision.analysis.length} validators)
              </span>
              <span className="text-[var(--text-muted)]">{expanded ? "▼" : "▶"}</span>
            </button>
            
            {expanded && (
              <div className="space-y-2">
                {decision.analysis.map((validator) => (
                  <div
                    key={validator.voteAccount}
                    className="bg-black/30 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold">
                          {validator.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{validator.name}</div>
                          <div className="text-xs text-[var(--text-secondary)] font-mono">
                            {validator.voteAccount.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[var(--accent)] font-bold">
                          {validator.allocation.toFixed(2)} SOL
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {validator.totalApy.toFixed(2)}% APY
                        </div>
                      </div>
                    </div>
                    
                    {/* Validator Metrics */}
                    <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                      <div className="bg-black/20 rounded px-2 py-1">
                        <span className="text-[var(--text-muted)]">Score:</span> {validator.wizScore.toFixed(0)}
                      </div>
                      <div className="bg-black/20 rounded px-2 py-1">
                        <span className="text-[var(--text-muted)]">Comm:</span> {validator.commission}%
                      </div>
                      <div className="bg-black/20 rounded px-2 py-1">
                        <span className="text-[var(--text-muted)]">MEV:</span> {validator.mevCommission}%
                      </div>
                      <div className="bg-black/20 rounded px-2 py-1">
                        <span className="text-[var(--text-muted)]">Uptime:</span> {validator.uptime}%
                      </div>
                    </div>
                    
                    {/* Selection Reasons */}
                    <div className="text-xs text-[var(--text-secondary)]">
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
          <div className="bg-black/40 rounded-lg p-4 font-mono text-xs max-h-48 overflow-y-auto">
            {executionLog.map((log, i) => (
              <div key={i} className={`${log.includes("✅") ? "text-[var(--accent)]" : log.includes("⚠️") ? "text-yellow-400" : "text-[var(--text-secondary)]"}`}>
                {log}
              </div>
            ))}
            {executing && (
              <div className="text-purple-400 animate-pulse">▌</div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-black/30 px-6 py-3 flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">
          {executing ? "Executing..." : "Next analysis in ~30 seconds"}
        </span>
        <div className="flex items-center gap-3">
          {decision?.action === "stake" && (
            <button 
              onClick={simulateExecution}
              disabled={executing}
              className="px-3 py-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-gray-700 rounded-lg font-medium transition flex items-center gap-1"
            >
              {executing ? (
                <>
                  <span className="animate-spin">⚙️</span> Executing...
                </>
              ) : (
                <>
                  <span>▶️</span> Simulate Execute
                </>
              )}
            </button>
          )}
          <button 
            onClick={fetchAgentDecision}
            disabled={executing}
            className="text-purple-400 hover:text-purple-300 disabled:text-[var(--text-muted)] transition flex items-center gap-1"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
