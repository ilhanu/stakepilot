"use client";

import { useState } from "react";
import Link from "next/link";

type RiskLevel = "conservative" | "balanced" | "aggressive";
type StakingMode = "set-forget" | "active" | "custom";

interface Strategy {
  name: string;
  allocation: { target: string; percentage: number; apy: number }[];
  expectedApy: number;
  risk: string;
  rebalanceFrequency: string;
}

const strategies: Record<RiskLevel, Strategy> = {
  conservative: {
    name: "🛡️ Safe Harbor",
    allocation: [
      { target: "mSOL (Marinade)", percentage: 60, apy: 6.08 },
      { target: "jitoSOL (Jito)", percentage: 30, apy: 7.65 },
      { target: "Native Stake (Top 3)", percentage: 10, apy: 7.2 },
    ],
    expectedApy: 6.71,
    risk: "Low - Established protocols only",
    rebalanceFrequency: "Monthly",
  },
  balanced: {
    name: "⚖️ Yield Seeker",
    allocation: [
      { target: "jitoSOL (Jito)", percentage: 45, apy: 7.65 },
      { target: "bSOL (BlazeStake)", percentage: 25, apy: 6.1 },
      { target: "Rising Stars (Native)", percentage: 20, apy: 8.5 },
      { target: "DeFi LP (mSOL-SOL)", percentage: 10, apy: 12.0 },
    ],
    expectedApy: 8.13,
    risk: "Medium - Mix of stable and growth",
    rebalanceFrequency: "Weekly",
  },
  aggressive: {
    name: "🚀 Alpha Hunter",
    allocation: [
      { target: "jitoSOL (Jito)", percentage: 30, apy: 7.65 },
      { target: "Rising Stars (Native)", percentage: 35, apy: 8.5 },
      { target: "MEV Maximizers", percentage: 20, apy: 9.2 },
      { target: "DeFi LP (High APR)", percentage: 15, apy: 18.0 },
    ],
    expectedApy: 10.24,
    risk: "High - New validators, concentrated positions",
    rebalanceFrequency: "Daily",
  },
};

export default function AutopilotPage() {
  const [risk, setRisk] = useState<RiskLevel>("balanced");
  const [mode, setMode] = useState<StakingMode>("set-forget");
  const [amount, setAmount] = useState<string>("100");
  const [isActivated, setIsActivated] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

  const strategy = strategies[risk];
  const amountNum = parseFloat(amount) || 0;
  
  // Calculate projected earnings
  const dailyEarnings = (amountNum * (strategy.expectedApy / 100)) / 365;
  const monthlyEarnings = dailyEarnings * 30;
  const yearlyEarnings = amountNum * (strategy.expectedApy / 100);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial pointer-events-none" />
      
      

      <main className="relative pt-8 pb-16 px-6">
        <div className="container-lg">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              🤖 Autopilot
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
              AI-powered autonomous staking. Set your risk, let intelligence optimize your yield.
            </p>
          </div>

          {!isActivated ? (
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Configuration Panel */}
              <div className="space-y-6">
                {/* Amount Input */}
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4">💰 Stake Amount</h2>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-2xl font-mono focus:border-[var(--accent)] focus:outline-none transition-colors"
                      placeholder="0.00"
                      min="0"
                      step="0.1"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-medium">
                      SOL
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {["10", "50", "100", "500", "1000"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setAmount(preset)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-sm transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Selection */}
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4">⚡ Risk Tolerance</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {(["conservative", "balanced", "aggressive"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setRisk(level)}
                        className={`p-4 rounded-lg border transition-all ${
                          risk === level
                            ? "border-[var(--accent)] bg-[var(--accent)]/10"
                            : "border-[var(--border)] hover:border-[var(--text-muted)]"
                        }`}
                      >
                        <div className="text-2xl mb-2">
                          {level === "conservative" ? "🛡️" : level === "balanced" ? "⚖️" : "🚀"}
                        </div>
                        <div className="font-medium capitalize text-sm">{level}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          {strategies[level].expectedApy.toFixed(1)}% APY
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4">🎯 Staking Mode</h2>
                  <div className="space-y-3">
                    {[
                      { id: "set-forget", label: "Set & Forget", desc: "Full automation, AI handles everything", icon: "🤖" },
                      { id: "active", label: "Active Management", desc: "Get suggestions, approve manually", icon: "👤" },
                      { id: "custom", label: "Custom Rules", desc: "Define your own rebalancing rules", icon: "⚙️" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id as StakingMode)}
                        className={`w-full p-4 rounded-lg border text-left transition-all flex items-start gap-4 ${
                          mode === m.id
                            ? "border-[var(--accent)] bg-[var(--accent)]/10"
                            : "border-[var(--border)] hover:border-[var(--text-muted)]"
                        }`}
                      >
                        <span className="text-2xl">{m.icon}</span>
                        <div>
                          <div className="font-medium">{m.label}</div>
                          <div className="text-sm text-[var(--text-muted)]">{m.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategy Preview */}
              <div className="space-y-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">{strategy.name}</h2>
                    <span className="badge">{strategy.rebalanceFrequency} rebalancing</span>
                  </div>

                  {/* Allocation */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">Allocation</h3>
                    <div className="space-y-3">
                      {strategy.allocation.map((alloc, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>{alloc.target}</span>
                            <span className="font-mono">{alloc.percentage}%</span>
                          </div>
                          <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent)] rounded-full transition-all"
                              style={{ width: `${alloc.percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-1">
                            {amountNum > 0 ? `${(amountNum * alloc.percentage / 100).toFixed(2)} SOL` : "-"} @ {alloc.apy}% APY
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Label */}
                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] mb-6">
                    <div className="text-sm text-[var(--text-muted)]">Risk Assessment</div>
                    <div className="text-sm">{strategy.risk}</div>
                  </div>

                  {/* Projected Earnings */}
                  <div className="border-t border-[var(--border)] pt-6">
                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">Projected Earnings</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-mono text-[var(--accent)]">
                          {dailyEarnings.toFixed(4)}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">SOL/day</div>
                      </div>
                      <div>
                        <div className="text-2xl font-mono text-[var(--accent)]">
                          {monthlyEarnings.toFixed(2)}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">SOL/month</div>
                      </div>
                      <div>
                        <div className="text-2xl font-mono text-[var(--accent)]">
                          {yearlyEarnings.toFixed(2)}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">SOL/year</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowSimulation(true)}
                    className="w-full btn-secondary text-lg py-4"
                  >
                    🔮 Simulate 1 Year
                  </button>
                  <button
                    onClick={() => setIsActivated(true)}
                    className="w-full btn-primary text-lg py-4"
                    disabled={amountNum <= 0}
                  >
                    🚀 Activate Autopilot
                  </button>
                  <p className="text-xs text-center text-[var(--text-muted)]">
                    Requires wallet connection. Gas fees apply.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Activated State */
            <div className="max-w-2xl mx-auto">
              <div className="card p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center animate-pulse">
                  <span className="text-4xl">🤖</span>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--accent)]">
                  Autopilot Activated! 
                </h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  StakePilot AI is now managing your {amount} SOL with the {strategy.name} strategy.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                    <div className="text-sm text-[var(--text-muted)]">Expected APY</div>
                    <div className="text-2xl font-mono text-[var(--accent)]">
                      {strategy.expectedApy.toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                    <div className="text-sm text-[var(--text-muted)]">Next Rebalance</div>
                    <div className="text-2xl font-mono">
                      {strategy.rebalanceFrequency === "Daily" ? "23h" : 
                       strategy.rebalanceFrequency === "Weekly" ? "6d" : "29d"}
                    </div>
                  </div>
                </div>

                {/* Live Status */}
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400 font-medium">AI is monitoring markets 24/7</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link href="/dashboard" className="block w-full btn-secondary py-3">
                    📊 View Dashboard
                  </Link>
                  <button
                    onClick={() => setIsActivated(false)}
                    className="w-full py-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Modify Strategy
                  </button>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="card p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">📜 AI Activity Log</h3>
                <div className="space-y-3">
                  {[
                    { time: "Just now", action: "Autopilot activated", type: "success" },
                    { time: "Analyzing...", action: "Scanning 1,400+ validators for optimal allocation", type: "pending" },
                    { time: "Queued", action: "Initial allocation will execute in ~2 minutes", type: "pending" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className={`w-2 h-2 mt-1.5 rounded-full ${
                        log.type === "success" ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                      }`} />
                      <div>
                        <span className="text-[var(--text-muted)]">{log.time}</span>
                        <span className="mx-2">·</span>
                        <span>{log.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Simulation Modal */}
          {showSimulation && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="card p-8 max-w-lg w-full">
                <h2 className="text-xl font-bold mb-4">🔮 1-Year Simulation</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Starting Balance</span>
                    <span className="font-mono">{amountNum.toFixed(2)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Expected APY</span>
                    <span className="font-mono text-[var(--accent)]">{strategy.expectedApy.toFixed(2)}%</span>
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">After 1 Year (No Compound)</span>
                    <span className="font-mono">{(amountNum + yearlyEarnings).toFixed(2)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">After 1 Year (Auto-Compound)</span>
                    <span className="font-mono text-[var(--accent)]">
                      {(amountNum * Math.pow(1 + strategy.expectedApy / 100, 1)).toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Yield</span>
                    <span className="text-[var(--accent)]">+{yearlyEarnings.toFixed(2)} SOL</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowSimulation(false)}
                  className="w-full btn-primary"
                >
                  Got it!
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Header imported from @/components/Header
