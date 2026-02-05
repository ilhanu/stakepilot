"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface VaultStats {
  totalDeposits: number;
  totalStaked: number;
  totalUsers: number;
  topValidators: Array<{
    name: string;
    totalApy: number;
    wizScore: number;
  }>;
}

export default function Home() {
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);

  useEffect(() => {
    fetch("/api/agent/execute")
      .then((res) => res.json())
      .then((data) => {
        if (data.vault) {
          setVaultStats({
            totalDeposits: data.vault.totalDeposits,
            totalStaked: data.vault.totalStaked,
            totalUsers: data.vault.totalUsers,
            topValidators: data.topValidators?.slice(0, 3) || [],
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <section className="py-12 md:py-20 lg:py-28 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[300px] md:h-[400px] bg-[var(--accent)]/10 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-xs md:text-sm font-medium mb-6 md:mb-8">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            Colosseum Agent Hackathon
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight tracking-tight">
            <span className="text-white">Autonomous</span>
            <br />
            <span className="text-gradient">Staking Vault</span>
          </h1>

          <p className="text-base md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed px-4">
            Deposit SOL. Let the AI agent stake to quality decentralized validators.
            <span className="hidden sm:inline"><br /></span>
            <span className="sm:hidden"> </span>
            <span className="text-[var(--accent)]">Support the little guys.</span> Earn competitive yields.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-10 md:mb-16 px-4">
            <Link href="/vault" className="btn-primary text-base md:text-lg px-6 md:px-8 py-3 md:py-4 w-full sm:w-auto">
              Start Staking →
            </Link>
            <Link href="/docs" className="btn-secondary text-base md:text-lg px-6 md:px-8 py-3 md:py-4 w-full sm:w-auto">
              Learn More
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-2xl mx-auto">
            <div className="p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-xl sm:text-2xl md:text-4xl font-bold text-[var(--accent)]">
                {vaultStats?.totalDeposits.toFixed(1) || "0"}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm text-[var(--text-muted)] mt-1">SOL Deposited</div>
            </div>
            <div className="p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-xl sm:text-2xl md:text-4xl font-bold text-white">
                {vaultStats?.totalUsers || 0}
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm text-[var(--text-muted)] mt-1">Depositors</div>
            </div>
            <div className="p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-xl sm:text-2xl md:text-4xl font-bold text-[var(--accent-secondary)]">
                ~6.3%
              </div>
              <div className="text-[10px] sm:text-xs md:text-sm text-[var(--text-muted)] mt-1">Expected APY</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-20 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 md:mb-4">How It Works</h2>
          <p className="text-center text-[var(--text-secondary)] mb-8 md:mb-12 max-w-xl mx-auto text-sm md:text-base">
            Autonomous staking in three simple steps
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-6 text-2xl">
                💰
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Deposit SOL</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Connect your wallet and deposit SOL to the vault. 
                Your funds are tracked on-chain with full transparency.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-6 text-2xl">
                🤖
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Agent Stakes</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Our AI agent analyzes validators using StakeWiz data and stakes 
                to quality decentralized validators.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-6 text-2xl">
                📈
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Earn Rewards</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Earn staking + MEV rewards automatically. 
                Unstake anytime with a ~2 day cooldown period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Validator Criteria */}
      <section className="py-20 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Agent Selection Criteria</h2>
              <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                The agent only stakes to validators that meet strict quality and decentralization requirements.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: "🎯", title: "Stake < 1M SOL", desc: "Supporting network decentralization" },
                  { icon: "💎", title: "Commission ≤ 5%", desc: "Low fees for maximum returns" },
                  { icon: "⚡", title: "MEV Fee ≤ 10%", desc: "Fair MEV reward sharing" },
                  { icon: "✅", title: "Uptime > 95%", desc: "Reliable, consistent performance" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-sm text-[var(--text-muted)]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 to-transparent border border-[var(--accent)]/20">
              <div className="text-sm text-[var(--accent)] font-medium mb-4">⭐ Always Included</div>
              <h3 className="text-2xl font-bold mb-2">Staker Space</h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Our own validator is always part of the staking set, 
                ensuring alignment between the team and users.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]">
                  <div className="text-[var(--text-muted)]">Commission</div>
                  <div className="font-bold text-[var(--accent)]">0%</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]">
                  <div className="text-[var(--text-muted)]">MEV Fee</div>
                  <div className="font-bold text-[var(--accent)]">4%</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]">
                  <div className="text-[var(--text-muted)]">Quality Score</div>
                  <div className="font-bold">93</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]">
                  <div className="text-[var(--text-muted)]">APY</div>
                  <div className="font-bold text-[var(--accent-secondary)]">~6.3%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">You're Always in Control</h2>
          <p className="text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto">
            The agent can stake your funds to validators, but can <span className="text-[var(--coral)] font-semibold">never withdraw</span> to itself. 
            Only you control your SOL.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="font-semibold mb-2">Agent Can't Withdraw</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Smart contract enforced - agent can only stake, never transfer out
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-3xl mb-4">⏱️</div>
              <h3 className="font-semibold mb-2">Unstake Anytime</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Request unstake whenever you want, ~2 day cooldown period
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="font-semibold mb-2">Full Transparency</h3>
              <p className="text-sm text-[var(--text-muted)]">
                All operations on-chain, verify everything on Solana Explorer
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-[var(--accent)]/10 via-[var(--bg-card)] to-[var(--coral)]/5 border border-[var(--accent)]/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Stake Smarter?</h2>
            <p className="text-[var(--text-secondary)] mb-8 text-lg">
              Join the vault and let the agent optimize your staking yield.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/vault" className="btn-primary text-lg px-10 py-4">
                Open Vault →
              </Link>
              <Link href="/discover" className="btn-secondary text-lg px-8 py-4">
                Browse Validators
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
          <div>© 2026 Staker Space</div>
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
