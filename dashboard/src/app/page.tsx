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
          <a 
            href="https://faucet.solana.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:no-underline ml-1"
          >
            Get testnet SOL
          </a>
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          HERO — The Opening Statement
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-28 lg:py-36 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--coral)]/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[300px] md:h-[500px] bg-[var(--accent)]/8 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--coral)]/10 border border-[var(--coral)]/20 text-[var(--coral)] text-xs md:text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--coral)] animate-pulse" />
            Nakamoto Coefficient at Risk
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
            <span className="text-white">Solana Staking is</span>
            <br />
            <span className="text-gradient-coral">Broken.</span>
            <br />
            <span className="text-gradient">We're Fixing It.</span>
          </h1>

          <p className="text-base md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            An autonomous AI agent that routes your stake to high-quality, low-stake validators. 
            Better yields for you. More decentralization for Solana.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-16 px-4">
            <Link href="/vault" className="btn-primary text-base md:text-lg px-8 md:px-10 py-3.5 md:py-4 w-full sm:w-auto">
              Start Staking →
            </Link>
            <Link href="/docs" className="btn-secondary text-base md:text-lg px-6 md:px-8 py-3.5 md:py-4 w-full sm:w-auto">
              Read the Docs
            </Link>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto">
            <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-2xl md:text-4xl font-bold text-[var(--accent)] font-display tracking-tight">
                {loading ? "..." : (vaultStats?.totalStaked.toFixed(2) || "0")}
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

      {/* ═══════════════════════════════════════════════════════════════
          THE PROBLEM — Stake Centralization
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              The Centralization <span className="text-gradient-coral">Crisis</span>
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Solana's security depends on stake distribution. Right now, it's dangerously concentrated.
            </p>
          </div>

          {/* Big scary numbers */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-14">
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--coral)]/20 text-center">
              <div className="stat-value text-[var(--coral)]">19</div>
              <div className="text-sm md:text-base text-[var(--text-secondary)] mt-2">validators control <span className="text-white font-semibold">33% of all stake</span></div>
            </div>
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--coral)]/20 text-center">
              <div className="stat-value text-[var(--coral)]">~31</div>
              <div className="text-sm md:text-base text-[var(--text-secondary)] mt-2"><span className="text-white font-semibold">Nakamoto Coefficient</span> — and shrinking</div>
            </div>
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--coral)]/20 text-center">
              <div className="stat-value text-[var(--coral)]">70%+</div>
              <div className="text-sm md:text-base text-[var(--text-secondary)] mt-2">of new stake goes to <span className="text-white font-semibold">top 100 validators</span></div>
            </div>
          </div>

          {/* Explanation */}
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            <div className="p-5 md:p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <span className="text-[var(--coral)]">⚠️</span> Phantom & Coinbase route to their own validators
              </h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                The biggest wallets and exchanges stake to validators they own or profit from. 
                Users think they're "staking on Solana" but they're concentrating power in a handful of entities.
              </p>
            </div>
            <div className="p-5 md:p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <span className="text-[var(--coral)]">⚠️</span> Small validators can't compete
              </h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                Validators with great performance, low fees, and unique infrastructure get overlooked. 
                Without stake, they can't earn. Without earnings, they shut down. The network loses diversity.
              </p>
            </div>
            <div className="p-5 md:p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <span className="text-[var(--coral)]">⚠️</span> You're getting mediocre yields
              </h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                High-stake validators charge higher fees because they don't need to compete. 
                Low-stake validators offer better rates to attract delegation — but nobody knows about them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW STAKEPILOT WORKS — Three Steps
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Stake Smarter. <span className="text-gradient">Decentralize Solana.</span>
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              StakePilot is an autonomous agent that analyzes every validator on the network 
              and routes your stake where it matters most.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors relative">
              <div className="absolute top-6 md:top-8 right-6 md:right-8 text-5xl md:text-6xl font-bold text-[var(--accent)]/10">1</div>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-5 md:mb-6 text-2xl">
                💰
              </div>
              <h3 className="text-xl font-semibold mb-3">Deposit SOL</h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                Connect your wallet and deposit to the vault. Your funds are on-chain, transparent, and always yours.
              </p>
            </div>

            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors relative">
              <div className="absolute top-6 md:top-8 right-6 md:right-8 text-5xl md:text-6xl font-bold text-[var(--accent)]/10">2</div>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-5 md:mb-6 text-2xl">
                🤖
              </div>
              <h3 className="text-xl font-semibold mb-3">Agent Analyzes & Stakes</h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                The AI agent scores every validator on decentralization impact, performance, and fairness — then stakes to the best underserved ones.
              </p>
            </div>

            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors relative">
              <div className="absolute top-6 md:top-8 right-6 md:right-8 text-5xl md:text-6xl font-bold text-[var(--accent)]/10">3</div>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-5 md:mb-6 text-2xl">
                📈
              </div>
              <h3 className="text-xl font-semibold mb-3">Earn & Decentralize</h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                Earn staking + MEV rewards while actively improving Solana's security. Unstake anytime with ~2 day cooldown.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          AGENT INTELLIGENCE — The Scoring Brain
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <div className="badge mb-4">🧠 Agent Intelligence</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Not Random. <span className="text-gradient">Calculated.</span>
              </h2>
              <p className="text-sm md:text-base text-[var(--text-secondary)] mb-6 leading-relaxed">
                The StakePilot agent evaluates every validator using a multi-factor scoring algorithm. 
                It's not just about uptime — it's about finding validators that make Solana stronger.
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Powered by real-time data from validators.app
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: "Decentralization Score", desc: "Lower stake = higher score. Rewards validators the network needs most.", color: "var(--accent)", weight: "30%" },
                { label: "Commission Rate", desc: "Lower fees mean more rewards for stakers.", color: "var(--accent-secondary)", weight: "20%" },
                { label: "MEV Fairness", desc: "How fairly the validator shares MEV rewards with stakers.", color: "var(--accent)", weight: "20%" },
                { label: "Uptime & Reliability", desc: "Consistent vote performance over recent epochs.", color: "var(--accent-secondary)", weight: "15%" },
                { label: "IBRL Block Performance", desc: "Block-building efficiency and infrastructure quality.", color: "var(--accent)", weight: "15%" },
              ].map((factor, i) => (
                <div key={i} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm md:text-base">{factor.label}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">{factor.weight}</span>
                  </div>
                  <p className="text-xs md:text-sm text-[var(--text-muted)]">{factor.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          VALIDATOR CRITERIA — Quality Gates
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Quality <span className="text-gradient">Gates</span>
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Every validator must pass these filters before the agent will delegate a single lamport.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
            {[
              { value: "< 1M", unit: "SOL", label: "Active Stake", icon: "🎯", desc: "Favoring underserved validators" },
              { value: "≤ 5%", unit: "", label: "Commission", icon: "💎", desc: "Low fees, better returns" },
              { value: "≤ 10%", unit: "", label: "MEV Commission", icon: "⚡", desc: "Fair reward sharing" },
              { value: "> 95%", unit: "", label: "Uptime", icon: "✅", desc: "Proven reliability" },
            ].map((gate, i) => (
              <div key={i} className="p-5 md:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent)]/15 text-center hover:border-[var(--accent)]/30 transition-colors">
                <div className="text-2xl mb-3">{gate.icon}</div>
                <div className="text-2xl md:text-3xl font-bold text-[var(--accent)] font-display tracking-tight">{gate.value}</div>
                <div className="text-xs text-[var(--accent)] font-medium">{gate.unit}</div>
                <div className="font-semibold text-sm mt-2">{gate.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{gate.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECURITY — You're Always in Control
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            You're <span className="text-white">Always</span> in Control
          </h2>
          <p className="text-base md:text-lg text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto">
            The agent can stake. It can <span className="text-[var(--coral)] font-bold">never</span> withdraw. 
            This isn't a promise — it's enforced by the smart contract.
          </p>
          
          <div className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="font-semibold text-lg mb-2">Stake-Only Agent</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                The agent's keypair can only call stake instructions. 
                Withdrawal authority stays with your wallet — always.
              </p>
            </div>
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-3xl mb-4">🔑</div>
              <h3 className="font-semibold text-lg mb-2">Your Keys, Your SOL</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Unstake anytime you want. ~2 day cooldown, then your SOL is back. 
                No lock-ups, no permission needed.
              </p>
            </div>
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="font-semibold text-lg mb-2">Fully On-Chain</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Every stake operation is a Solana transaction. 
                Verify everything on Explorer. No black boxes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURED VALIDATOR — Staker Space
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="p-6 md:p-10 lg:p-12 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[var(--accent)]/8 via-[var(--bg-card)] to-[var(--accent-secondary)]/5 border border-[var(--accent)]/20">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <div className="badge mb-4">🏗️ Built by Validators, for Validators</div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                  Staker Space <span className="text-gradient">Validator</span>
                </h2>
                <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed mb-4">
                  We're not just building StakePilot — we run a validator ourselves. 
                  We built this because we live the problem every day. Small validators 
                  with great infrastructure get ignored while the big guys collect all the stake.
                </p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  Our validator is always in the staking set. Skin in the game. 
                  If StakePilot doesn't work, we're the first to feel it.
                </p>
                <a 
                  href="https://www.validators.app/validators/testnet/33LfdA2yKS6m7E8pSanrKTKYMhpYHEGaSWtNNB5s7xnm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm px-5 py-2.5"
                >
                  View on validators.app →
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="p-4 md:p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Commission</div>
                  <div className="text-xl md:text-2xl font-bold text-[var(--accent)] font-display">0%</div>
                  <div className="text-xs text-[var(--text-muted)]">on mainnet</div>
                </div>
                <div className="p-4 md:p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Location</div>
                  <div className="text-xl md:text-2xl font-bold font-display">🇳🇱</div>
                  <div className="text-xs text-[var(--text-muted)]">Netherlands</div>
                </div>
                <div className="p-4 md:p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Client</div>
                  <div className="text-xl md:text-2xl font-bold text-white font-display">Agave</div>
                  <div className="text-xs text-[var(--text-muted)]">client diversity</div>
                </div>
                <div className="p-4 md:p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">DoubleZero</div>
                  <div className="text-xl md:text-2xl font-bold text-[var(--accent-secondary)] font-display">Yes</div>
                  <div className="text-xs text-[var(--text-muted)]">low-latency infra</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA — Join the Movement
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="p-8 md:p-14 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[var(--accent)]/10 via-[var(--bg-card)] to-[var(--coral)]/5 border border-[var(--accent)]/20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Join the Movement.
            </h2>
            <p className="text-lg md:text-xl text-gradient font-semibold mb-2">
              Stake Smarter. Decentralize Solana.
            </p>
            <p className="text-sm md:text-base text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
              Every SOL you stake through StakePilot strengthens the network. 
              Better yields. Stronger security. A fairer validator ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <Link href="/vault" className="btn-primary text-base md:text-lg px-10 md:px-12 py-4 w-full sm:w-auto">
                Open Vault →
              </Link>
              <Link href="/discover" className="btn-secondary text-base md:text-lg px-6 md:px-8 py-4 w-full sm:w-auto">
                Explore Validators
              </Link>
            </div>
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
