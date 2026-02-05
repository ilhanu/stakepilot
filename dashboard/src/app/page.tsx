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
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch vault stats
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

    // Fetch recommendation
    fetch("/api/agent/recommend?balance=1000&maxValidators=5")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRecommendation(data.decision);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-bold">
              S
            </div>
            <span className="font-semibold text-lg">Staker Space</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/vault" className="text-gray-400 hover:text-white transition">
              Vault
            </Link>
            <Link href="/discover" className="text-gray-400 hover:text-white transition">
              Discover
            </Link>
            <Link href="/docs" className="text-gray-400 hover:text-white transition">
              Docs
            </Link>
            <Link
              href="/vault"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Colosseum Agent Hackathon
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white">Autonomous</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Staking Vault
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Deposit SOL. Let the AI agent stake to quality decentralized validators.
            <br />
            Support the little guys. Earn competitive yields.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/vault"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold text-lg transition shadow-lg shadow-emerald-500/20"
            >
              Start Staking
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-lg transition border border-gray-700"
            >
              Learn More
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400">
                {vaultStats?.totalDeposits.toFixed(1) || "0"} SOL
              </div>
              <div className="text-gray-400 mt-1">Total Deposits</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">
                {vaultStats?.totalUsers || 0}
              </div>
              <div className="text-gray-400 mt-1">Depositors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-400">
                ~7%
              </div>
              <div className="text-gray-400 mt-1">Expected APY</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Deposit SOL</h3>
              <p className="text-gray-400">
                Connect your wallet and deposit SOL to the managed vault. 
                Your funds are tracked on-chain with full transparency.
              </p>
            </div>

            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Agent Stakes</h3>
              <p className="text-gray-400">
                Our AI agent analyzes validators using StakeWiz data and stakes 
                to quality decentralized validators with low fees.
              </p>
            </div>

            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Earn Rewards</h3>
              <p className="text-gray-400">
                Earn staking rewards + MEV rewards. Unstake anytime with 
                a ~2 day cooldown period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Validator Selection */}
      <section className="py-24 border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Smart Validator Selection</h2>
              <p className="text-gray-400 mb-8">
                The agent uses StakeWiz scores to select the best validators 
                that match our strict criteria for decentralization and performance.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    ✓
                  </div>
                  <span>Stake &lt; 1M SOL (support decentralization)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    ✓
                  </div>
                  <span>Commission ≤ 5%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    ✓
                  </div>
                  <span>MEV Commission ≤ 10%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    ✓
                  </div>
                  <span>Uptime &gt; 95%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400">
                    ★
                  </div>
                  <span>Always includes <strong>Staker Space</strong> validator</span>
                </div>
              </div>
            </div>

            {/* Top Validators */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Current Top Validators</h3>
              <div className="space-y-3">
                {recommendation?.recommendations?.slice(0, 5).map((rec: any, i: number) => (
                  <div
                    key={rec.validator}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium">{rec.validatorName}</div>
                        <div className="text-xs text-gray-400">
                          Score: {rec.wizScore?.toFixed(0) || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-medium">
                        {rec.expectedApy?.toFixed(2) || "0"}% APY
                      </div>
                    </div>
                  </div>
                ))}
                {!recommendation && (
                  <div className="text-center text-gray-500 py-8">
                    Loading validators...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-24 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Security First</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Agent Can't Withdraw</h3>
              <p className="text-gray-400">
                The agent can only stake funds to validators. 
                It can never withdraw to itself or any other address.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Only You Withdraw</h3>
              <p className="text-gray-400">
                Only your wallet can request and complete withdrawals. 
                Your funds, your control.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📖</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Fully Transparent</h3>
              <p className="text-gray-400">
                All operations are on-chain and auditable. 
                View every stake, unstake, and reward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Stake?</h2>
          <p className="text-xl text-gray-400 mb-10">
            Join the vault and earn rewards while supporting Solana decentralization.
          </p>
          <Link
            href="/vault"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold text-lg transition shadow-lg shadow-emerald-500/20"
          >
            Launch Vault
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-bold">
                S
              </div>
              <span className="font-semibold">Staker Space</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/docs" className="hover:text-white transition">Docs</Link>
              <a
                href="https://github.com/ilhanu/stakepilot"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                GitHub
              </a>
              <a
                href="https://explorer.solana.com/address/HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u?cluster=devnet"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                Vault on Explorer
              </a>
            </div>
            <div className="text-sm text-gray-500">
              Colosseum Agent Hackathon 2026
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
