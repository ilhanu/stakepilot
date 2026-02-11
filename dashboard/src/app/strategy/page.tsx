"use client";

import Link from "next/link";

export default function AgentStrategyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            Autonomous Agent
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            How the Agent Works
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
            StakePilot&apos;s autonomous agent monitors the Solana network, evaluates validators, 
            and manages stake positions — without human intervention.
          </p>
        </div>

        <div className="space-y-10">
          {/* Execution Cycle */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🔄</span> Execution Cycle
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              The agent runs on a 4-hour monitoring cycle, with intelligent execution gating 
              based on epoch timing. This prevents unnecessary transactions while ensuring 
              timely rebalancing.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <CycleCard
                phase="Monitor"
                frequency="Every 4 hours"
                color="blue"
                actions={[
                  "Check current epoch progress",
                  "Read vault & agent balances",
                  "Scan all active stake positions",
                  "Evaluate validator health",
                ]}
              />
              <CycleCard
                phase="Decide"
                frequency="Based on conditions"
                color="yellow"
                actions={[
                  "Epoch >90%? → Prepare rebalance",
                  "New epoch (<5%)? → Execute plan",
                  "Deactivating stakes ready? → Withdraw",
                  "All healthy? → Skip execution",
                ]}
              />
              <CycleCard
                phase="Execute"
                frequency="~Once per epoch"
                color="green"
                actions={[
                  "Withdraw cooled-down stakes",
                  "Deactivate unhealthy positions",
                  "Stake to new high-quality validators",
                  "Log all decisions on-chain",
                ]}
              />
            </div>
          </section>

          {/* Epoch-Aware Timing */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">⏱️</span> Epoch-Aware Timing
            </h2>
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <p className="text-[var(--text-secondary)] mb-4">
                Solana epochs are the heartbeat of staking. Stake changes only take effect at epoch 
                boundaries, and deactivating stake means ~2 epochs of zero rewards. The agent uses 
                this knowledge to time its actions:
              </p>
              <div className="space-y-3">
                <TimingRule
                  condition="Epoch 0–90%"
                  action="Monitor only — report status, no transactions"
                  reason="Changes won't take effect until next epoch anyway"
                />
                <TimingRule
                  condition="Epoch 90–100%"
                  action="Evaluate and prepare rebalancing"
                  reason="Position changes near boundary for fastest activation"
                />
                <TimingRule
                  condition="New epoch (0–5%)"
                  action="Execute pending plan if not yet run this epoch"
                  reason="Fresh epoch — new rewards, updated validator stats"
                />
                <TimingRule
                  condition="Validator delinquent"
                  action="Immediate deactivation regardless of epoch"
                  reason="Earning zero rewards — no cost to deactivate"
                />
              </div>
            </div>
          </section>

          {/* Rebalancing Logic */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">⚖️</span> Rebalancing Logic
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              The agent is conservative about rebalancing. Deactivating stake costs ~2 epochs 
              of rewards, so it only triggers when the cost of staying exceeds the cost of moving.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20">
                <h3 className="font-semibold text-red-400 mb-3">🚨 Triggers Deactivation</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>Commission raised above 15%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>Commission jumped 3%+ since staking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>Validator went delinquent (not voting)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>Validator disappeared from network</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/20">
                <h3 className="font-semibold text-green-400 mb-3">✅ Keeps Position</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Score dropped but commission stable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Minor performance dip (transient)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Better validator available (cost of moving too high)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>Mid-epoch — wait for boundary</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Validator Selection */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span> Validator Selection
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              When staking to new validators, the agent prioritizes decentralization 
              and net yield to the staker.
            </p>

            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <CriteriaCard label="Max Commission" value="≤ 15%" />
                <CriteriaCard label="Max Active Stake" value="< 1M SOL" />
                <CriteriaCard label="Target Validators" value="5–10" />
                <CriteriaCard label="Min Stake" value="1 SOL" />
              </div>

              <h4 className="font-semibold mb-2 text-sm text-[var(--text-secondary)]">Scoring Factors</h4>
              <div className="space-y-2">
                <ScoreFactor label="Commission (net yield)" weight="High" />
                <ScoreFactor label="Uptime / vote credits" weight="High" />
                <ScoreFactor label="Stake concentration (prefer smaller)" weight="Medium" />
                <ScoreFactor label="Client diversity (minority bonus)" weight="Medium" />
                <ScoreFactor label="Geographic distribution" weight="Low" />
              </div>
            </div>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🔐</span> Security Model
            </h2>
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <p className="text-[var(--text-secondary)] mb-4">
                The on-chain program enforces strict constraints. The agent wallet is authorized 
                to manage staking operations but can never extract funds.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-[var(--bg-primary)]">
                  <div className="font-semibold mb-1">Agent Key</div>
                  <div className="text-[var(--text-muted)] text-xs font-mono break-all">
                    By596j...qthS
                  </div>
                  <div className="text-[var(--text-secondary)] mt-2">
                    Stored locally on the execution host. Never exposed to the web.
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-primary)]">
                  <div className="font-semibold mb-1">Vault PDA</div>
                  <div className="text-[var(--text-muted)] text-xs font-mono break-all">
                    HpsHuy...2p5u
                  </div>
                  <div className="text-[var(--text-secondary)] mt-2">
                    Program-derived address. Only the program can move funds.
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-primary)]">
                  <div className="font-semibold mb-1">Execution Host</div>
                  <div className="text-[var(--text-secondary)] mt-2">
                    Agent runs locally via cron. Vault key never leaves the server. 
                    Dashboard reads on-chain state — no private keys in Vercel.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Live Activity */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span> Live Activity
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              The agent logs every decision and transaction. View real-time activity on the dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-black font-semibold hover:opacity-90 transition"
              >
                View Dashboard →
              </Link>
              <Link
                href="/agent-docs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-elevated)] transition"
              >
                Agent API Docs
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CycleCard({
  phase,
  frequency,
  color,
  actions,
}: {
  phase: string;
  frequency: string;
  color: "blue" | "yellow" | "green";
  actions: string[];
}) {
  const colors = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
  };
  const dotColors = {
    blue: "bg-blue-400",
    yellow: "bg-yellow-400",
    green: "bg-green-400",
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
        <h3 className="font-semibold text-lg text-[var(--text-primary)]">{phase}</h3>
      </div>
      <div className="text-xs mb-3 opacity-70">{frequency}</div>
      <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
        {actions.map((a, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="opacity-50 mt-0.5">›</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimingRule({
  condition,
  action,
  reason,
}: {
  condition: string;
  action: string;
  reason: string;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 p-3 rounded-lg bg-[var(--bg-primary)]">
      <div className="shrink-0 px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-mono font-semibold">
        {condition}
      </div>
      <div>
        <div className="text-sm font-medium">{action}</div>
        <div className="text-xs text-[var(--text-muted)]">{reason}</div>
      </div>
    </div>
  );
}

function CriteriaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--bg-primary)] text-center">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="font-bold text-[var(--accent)] mt-1">{value}</div>
    </div>
  );
}

function ScoreFactor({ label, weight }: { label: string; weight: string }) {
  const weightColors = {
    High: "text-green-400 bg-green-500/10",
    Medium: "text-yellow-400 bg-yellow-500/10",
    Low: "text-blue-400 bg-blue-500/10",
  };
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-primary)]">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded ${weightColors[weight as keyof typeof weightColors]}`}
      >
        {weight}
      </span>
    </div>
  );
}
