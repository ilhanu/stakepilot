"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface VaultStats {
  totalDeposits: number;
  totalStaked: number;
  stakePositions: number;
}

export default function Home() {
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agent/vault").then(res => res.json()),
      fetch("/api/agent/positions").then(res => res.json()),
    ])
      .then(([vaultData, positionsData]) => {
        const positions = positionsData.positions || [];
        setVaultStats({
          totalDeposits: (vaultData.vault?.totalDeposits || 0) + positionsData.totalStaked,
          totalStaked: positionsData.totalStaked || 0,
          stakePositions: positions.length,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Testnet Banner */}
      <div className="bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 py-2 px-4 text-center">
        <span className="text-[var(--accent)] text-sm font-medium">
          🧪 Running on Solana Testnet —
          <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline ml-1">
            Get testnet SOL
          </a>
        </span>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="py-20 md:py-32 lg:py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--coral)]/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[300px] md:h-[500px] bg-[var(--accent)]/8 rounded-full blur-3xl" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--coral)]/10 border border-[var(--coral)]/20 text-[var(--coral)] text-xs md:text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--coral)] animate-pulse" />
            19 validators control 33% of Solana
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
            <span className="text-white">Staking is Broken.</span>
            <br />
            <span className="text-gradient">An Agent Fixes It.</span>
          </h1>

          <p className="text-base md:text-xl text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
            Deposit SOL. An AI agent stakes to the best underserved validators.
            It can stake — but it can <span className="text-[var(--coral)] font-semibold">never</span> withdraw.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-16 px-4">
            <Link href="/vault" className="btn-primary text-base md:text-lg px-8 md:px-10 py-3.5 md:py-4 w-full sm:w-auto">
              Open Vault →
            </Link>
            <Link href="/discover" className="btn-secondary text-base md:text-lg px-6 md:px-8 py-3.5 md:py-4 w-full sm:w-auto">
              Explore Validators
            </Link>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto">
            <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-2xl md:text-4xl font-bold text-[var(--accent)] font-display tracking-tight">
                {loading ? "..." : (vaultStats?.totalStaked.toFixed(1) || "0")}
              </div>
              <div className="text-xs md:text-sm text-[var(--text-muted)] mt-1">SOL Staked</div>
            </div>
            <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-2xl md:text-4xl font-bold text-white font-display tracking-tight">
                {loading ? "..." : (vaultStats?.stakePositions || 0)}
              </div>
              <div className="text-xs md:text-sm text-[var(--text-muted)] mt-1">Validators</div>
            </div>
            <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-2xl md:text-4xl font-bold text-[var(--accent-secondary)] font-display tracking-tight">
                ~6.3%
              </div>
              <div className="text-xs md:text-sm text-[var(--text-muted)] mt-1">Expected APY</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW THE AGENT WORKS — Visual Flow ═══ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How the Agent <span className="text-gradient">Works</span>
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12 max-w-lg mx-auto">
            A continuous loop that optimizes your staking — fully autonomous.
          </p>

          {/* Visual Pipeline */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-0 mb-12">
            {[
              { icon: "💰", label: "Deposit", desc: "You deposit SOL", color: "var(--accent)" },
              { icon: "📊", label: "Score", desc: "Agent ranks 1,500+ validators", color: "var(--accent)" },
              { icon: "⚡", label: "Stake", desc: "Stakes to top underserved", color: "var(--accent)" },
              { icon: "🔄", label: "Rebalance", desc: "Drops bad performers", color: "var(--accent-secondary)" },
              { icon: "📈", label: "Earn", desc: "Staking + MEV rewards", color: "var(--accent-secondary)" },
            ].map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center text-center w-28 md:w-32">
                  <div 
                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-2xl mb-2 border"
                    style={{ 
                      background: `color-mix(in srgb, ${step.color} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${step.color} 25%, transparent)`,
                    }}
                  >
                    {step.icon}
                  </div>
                  <span className="font-semibold text-sm">{step.label}</span>
                  <span className="text-xs text-[var(--text-muted)] mt-0.5 leading-tight">{step.desc}</span>
                </div>
                {i < 4 && (
                  <div className="hidden md:block text-[var(--text-muted)] mx-1 text-xl">→</div>
                )}
                {i < 4 && (
                  <div className="block md:hidden text-[var(--text-muted)] my-1 text-xl">↓</div>
                )}
              </div>
            ))}
          </div>

          {/* Loop indicator */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              Agent runs every hour — scores, stakes, rebalances automatically
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECURITY MODEL — The Key Differentiator ═══ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-center">
            Security Model
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-10 max-w-lg mx-auto">
            Not a promise — <span className="text-white font-semibold">enforced by smart contract</span>. The agent has limited, auditable permissions.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {/* CAN DO */}
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent)]/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-lg">✅</div>
                <div>
                  <div className="font-semibold">Agent CAN</div>
                  <div className="text-xs text-[var(--text-muted)]">On-chain permissions</div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { action: "Stake SOL to validators", detail: "Deploys vault funds to chosen validators" },
                  { action: "Rebalance positions", detail: "Moves stake from poor to better performers" },
                  { action: "Deactivate underperformers", detail: "Begins cooldown on bad validators" },
                  { action: "Withdraw back to vault", detail: "Reclaims deactivated stake into vault" },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/10">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--accent)] text-sm">✓</span>
                      <span className="text-sm font-medium">{item.action}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1 ml-5">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CANNOT DO */}
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--coral)]/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[var(--coral)]/10 flex items-center justify-center text-lg">🔒</div>
                <div>
                  <div className="font-semibold">Agent CANNOT</div>
                  <div className="text-xs text-[var(--text-muted)]">Blocked by smart contract</div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { action: "Withdraw SOL to itself", detail: "Withdrawal authority stays with vault owner" },
                  { action: "Transfer to external wallets", detail: "No transfer instructions exist in the program" },
                  { action: "Change withdrawal authority", detail: "Authority is immutable once vault is created" },
                  { action: "Access your private keys", detail: "Agent has its own keypair with limited scope" },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[var(--coral)]/5 border border-[var(--coral)]/10">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--coral)] text-sm">✗</span>
                      <span className="text-sm font-medium">{item.action}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1 ml-5">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust badge */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
              <span className="text-lg">🛡️</span>
              <div className="text-left">
                <div className="text-sm font-medium">Your keys. Your SOL. Always.</div>
                <div className="text-xs text-[var(--text-muted)]">Smart contract enforced — open source and auditable</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SCORING — Compact ═══ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How the Agent <span className="text-gradient">Decides</span>
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-10 max-w-lg mx-auto">
            Multi-factor scoring. Real-time data. Automatic rebalancing every hour.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {[
              { label: "Decentralization", weight: "30%", desc: "Favor low-stake validators" },
              { label: "Commission", weight: "20%", desc: "Lower fees = more yield" },
              { label: "MEV Fairness", weight: "20%", desc: "Fair reward sharing" },
              { label: "Uptime", weight: "15%", desc: "Vote performance" },
              { label: "IBRL Score", weight: "15%", desc: "Block-building quality" },
            ].map((f, i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-center">
                <div className="text-xl md:text-2xl font-bold text-[var(--accent)] font-display">{f.weight}</div>
                <div className="font-semibold text-sm mt-1">{f.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 mt-8">
            {[
              { label: "Commission", value: "≤ 5%" },
              { label: "MEV Commission", value: "≤ 10%" },
              { label: "Uptime", value: "> 95%" },
              { label: "Active Stake", value: "< 1M SOL" },
            ].map((gate, i) => (
              <div key={i} className="text-center">
                <div className="text-sm font-bold text-[var(--accent)]">{gate.value}</div>
                <div className="text-xs text-[var(--text-muted)]">{gate.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BUILT BY VALIDATORS ═══ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="p-6 md:p-10 rounded-2xl bg-gradient-to-br from-[var(--accent)]/8 via-[var(--bg-card)] to-[var(--accent-secondary)]/5 border border-[var(--accent)]/20">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">Built by Validators</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Staker Space <span className="text-gradient">Validator</span>
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  We run a validator. We built this because we live the problem. 
                  Our validator is always in the staking set — skin in the game.
                </p>
                <a href="https://www.validators.app/validators/testnet/33LfdA2yKS6m7E8pSanrKTKYMhpYHEGaSWtNNB5s7xnm" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm px-5 py-2.5">
                  View on validators.app →
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Commission", value: "0%", sub: "mainnet" },
                  { label: "Location", value: "🇳🇱", sub: "Netherlands" },
                  { label: "Client", value: "Agave", sub: "diversity" },
                  { label: "DoubleZero", value: "Yes", sub: "low-latency" },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
                    <div className="text-xs text-[var(--text-muted)] mb-1">{stat.label}</div>
                    <div className="text-xl font-bold text-[var(--accent)] font-display">{stat.value}</div>
                    <div className="text-xs text-[var(--text-muted)]">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Stake Smarter.
          </h2>
          <p className="text-lg text-gradient font-semibold mb-8">
            Better yields. Stronger network. Zero effort.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/vault" className="btn-primary text-lg px-10 py-4 w-full sm:w-auto">
              Open Vault →
            </Link>
            <Link href="/docs" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-sm">S</div>
              <div>
                <div className="text-sm font-semibold">Built by Staker Space</div>
                <div className="text-xs text-[var(--text-muted)]">Solana validator operators · 0% commission</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/docs" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">Docs</Link>
              <Link href="/discover" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">Validators</Link>
              <a href="https://github.com/StakerSpace/stakepilot" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">GitHub</a>
              <a href="https://staker.space" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">staker.space</a>
              <a href="https://twitter.com/stakerspace" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">Twitter</a>
            </div>
          </div>
          <div className="text-center text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--border)]/50">
            © 2026 StakePilot · Colosseum Agent Hackathon · Running on Solana Testnet
          </div>
        </div>
      </footer>
    </div>
  );
}
