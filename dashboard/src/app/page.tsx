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

      {/* ═══ HOW IT WORKS — 3 Steps ═══ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Three Steps. <span className="text-gradient">Zero Maintenance.</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {[
              { num: "1", icon: "💰", title: "Deposit", desc: "Connect wallet. Deposit SOL to the vault." },
              { num: "2", icon: "🤖", title: "Agent Stakes", desc: "AI scores 1,500+ validators. Stakes to the best underserved ones. Rebalances automatically." },
              { num: "3", icon: "📈", title: "Earn", desc: "Staking + MEV rewards. Withdraw anytime. ~2 day cooldown." },
            ].map((step, i) => (
              <div key={i} className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors relative">
                <div className="absolute top-6 md:top-8 right-6 md:right-8 text-5xl font-bold text-[var(--accent)]/10">{step.num}</div>
                <div className="text-2xl mb-4">{step.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST MODEL — The Key Differentiator ═══ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="p-8 md:p-12 rounded-2xl md:rounded-3xl bg-[var(--bg-card)] border border-[var(--border)]">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-center">
              The Agent Can Stake.
              <br />
              <span className="text-[var(--coral)]">It Can Never Withdraw.</span>
            </h2>
            <p className="text-center text-[var(--text-secondary)] mb-10 max-w-lg mx-auto">
              Not a promise. Enforced by smart contract. Your keys, your SOL — always.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">✅ Agent Can</div>
                {["Stake to validators", "Rebalance positions", "Deactivate underperformers"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/10">
                    <span className="text-[var(--accent)]">✓</span>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="text-sm font-semibold text-[var(--coral)] uppercase tracking-wider mb-2">🚫 Agent Cannot</div>
                {["Withdraw your SOL", "Transfer to itself", "Change withdrawal authority"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--coral)]/5 border border-[var(--coral)]/10">
                    <span className="text-[var(--coral)]">✗</span>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
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
      <footer className="py-8 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <div>© 2026 StakePilot · Built by <a href="https://staker.space" target="_blank" className="hover:text-[var(--accent)] transition">Staker Space</a></div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-[var(--text-primary)] transition">Docs</Link>
            <a href="https://github.com/ilhanu/stakepilot" target="_blank" className="hover:text-[var(--text-primary)] transition">GitHub</a>
            <a href="https://twitter.com/stakerspace" target="_blank" className="hover:text-[var(--text-primary)] transition">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
