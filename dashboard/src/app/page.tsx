"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [demoStrategy, setDemoStrategy] = useState({
    riskTolerance: "Medium",
    targetApy: 8,
    maxValidators: 5,
    preferDecentralization: true,
  });
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/agent/recommend?riskTolerance=${demoStrategy.riskTolerance}&targetApy=${demoStrategy.targetApy * 100}&maxValidators=${demoStrategy.maxValidators}&preferDecentralization=${demoStrategy.preferDecentralization}&balance=100`
      );
      const data = await res.json();
      setRecommendation(data.decision);
    } catch (error) {
      console.error("Demo failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-radial">
        <div className="container-lg py-24 lg:py-32 text-center relative z-10">
          {/* Badge */}
          <div className="badge mb-6 inline-flex">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] mr-2" />
            Colosseum Agent Hackathon
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in">
            <span className="text-[var(--text-primary)]">Autonomous</span>
            <br />
            <span className="text-gradient">Staking Vault</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 animate-fade-in-delay-1">
            Deposit SOL. Set your strategy. Let the AI agent optimize your staking.
            <br />
            <span className="text-[var(--accent)] font-medium">You're always in control.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-delay-2">
            <Link href="/vault" className="btn-primary text-lg">
              Create Your Vault →
            </Link>
            <a href="#how-it-works" className="btn-secondary text-lg">
              How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto animate-fade-in-delay-3">
            <div>
              <p className="stat-value text-[var(--accent)]">~7.8%</p>
              <p className="stat-label">Target APY</p>
            </div>
            <div>
              <p className="stat-value">1,500+</p>
              <p className="stat-label">Validators</p>
            </div>
            <div>
              <p className="stat-value text-[var(--accent)]">0</p>
              <p className="stat-label">Custody Risk</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 border-t border-[var(--border)]">
        <div className="container-lg">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-[var(--text-secondary)] text-center mb-16 max-w-xl mx-auto">
            Four simple steps to autonomous staking
          </p>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Create Vault",
                desc: "Connect wallet and create your personal staking vault on-chain",
                icon: "🏦",
              },
              {
                step: "2",
                title: "Set Strategy",
                desc: "Choose risk level, target APY, max validators, and preferences",
                icon: "⚙️",
              },
              {
                step: "3",
                title: "Deposit SOL",
                desc: "Add funds to your vault. You can withdraw anytime.",
                icon: "💰",
              },
              {
                step: "4",
                title: "Agent Works",
                desc: "AI analyzes 1,500+ validators and executes optimal staking",
                icon: "🤖",
              },
            ].map((item) => (
              <div key={item.step} className="card card-interactive p-6 text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-[var(--accent)] text-xs font-bold mb-2 uppercase tracking-wider">
                  Step {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategy Demo */}
      <section className="py-24 bg-[var(--bg-secondary)] border-y border-[var(--border)]">
        <div className="container-lg max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Try the Algorithm</h2>
          <p className="text-[var(--text-secondary)] text-center mb-12">
            See how the agent would allocate 100 SOL with your strategy
          </p>
          
          <div className="card p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">Risk Tolerance</label>
                <select
                  value={demoStrategy.riskTolerance}
                  onChange={(e) => setDemoStrategy({ ...demoStrategy, riskTolerance: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none"
                >
                  <option value="Low">Low (Conservative)</option>
                  <option value="Medium">Medium (Balanced)</option>
                  <option value="High">High (Aggressive)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Target APY: <span className="text-[var(--accent)]">{demoStrategy.targetApy}%</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="12"
                  value={demoStrategy.targetApy}
                  onChange={(e) => setDemoStrategy({ ...demoStrategy, targetApy: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-2">
                  Max Validators: <span className="text-[var(--accent)]">{demoStrategy.maxValidators}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={demoStrategy.maxValidators}
                  onChange={(e) => setDemoStrategy({ ...demoStrategy, maxValidators: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demoStrategy.preferDecentralization}
                    onChange={(e) => setDemoStrategy({ ...demoStrategy, preferDecentralization: e.target.checked })}
                    className="w-5 h-5 accent-[var(--accent)] rounded"
                  />
                  <span className="text-sm">Prefer decentralization</span>
                </label>
              </div>
            </div>
            
            <button
              onClick={handleDemo}
              disabled={loading}
              className="btn-primary w-full !py-4 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Analyzing 1,500+ validators...
                </span>
              ) : (
                "Generate Recommendation"
              )}
            </button>
            
            {recommendation && (
              <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Agent Recommendation</h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    For 100 SOL
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-6 p-4 bg-[var(--bg-secondary)] rounded-lg">
                  {recommendation.reasoning}
                </p>
                
                <div className="space-y-3">
                  {recommendation.recommendations?.map((rec: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-[var(--bg-secondary)] rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold">
                          {(rec.validatorName || "?").charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{rec.validatorName || "Unknown"}</p>
                          <p className="text-xs text-[var(--text-muted)]">{rec.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[var(--accent)]">{rec.allocatedAmount?.toFixed(2)} SOL</p>
                        <p className="text-xs text-[var(--text-muted)]">~{rec.expectedApy?.toFixed(1)}% APY</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-24">
        <div className="container-lg">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Security First</h2>
          <p className="text-[var(--text-secondary)] text-center mb-16 max-w-xl mx-auto">
            The agent can stake your funds, but can <strong className="text-[var(--accent)]">never withdraw</strong>. Only you can.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "You Control Withdrawals",
                desc: "Only your wallet can withdraw funds from the vault. The agent can stake but never take.",
                icon: "🔐",
              },
              {
                title: "Change Agent Anytime",
                desc: "Don't trust the current agent? Replace it instantly with a single transaction.",
                icon: "🔄",
              },
              {
                title: "Transparent Operations",
                desc: "All operations emit on-chain events. Verify everything on Solscan.",
                icon: "👁️",
              },
            ].map((item, i) => (
              <div key={i} className="card p-8">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Architecture Diagram */}
          <div className="mt-16 card p-8">
            <h3 className="font-bold mb-6 text-center">Architecture</h3>
            <div className="flex items-center justify-center gap-4 text-center flex-wrap">
              <div className="px-6 py-4 bg-[var(--bg-secondary)] rounded-xl">
                <p className="text-2xl mb-1">👤</p>
                <p className="text-sm font-medium">You</p>
                <p className="text-xs text-[var(--text-muted)]">deposit/withdraw</p>
              </div>
              <div className="text-[var(--accent)] text-2xl">→</div>
              <div className="px-6 py-4 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl">
                <p className="text-2xl mb-1">🏦</p>
                <p className="text-sm font-medium text-[var(--accent)]">Vault</p>
                <p className="text-xs text-[var(--text-muted)]">on-chain</p>
              </div>
              <div className="text-[var(--accent)] text-2xl">←</div>
              <div className="px-6 py-4 bg-[var(--bg-secondary)] rounded-xl">
                <p className="text-2xl mb-1">🤖</p>
                <p className="text-sm font-medium">Agent</p>
                <p className="text-xs text-[var(--text-muted)]">stake only</p>
              </div>
              <div className="text-[var(--accent)] text-2xl">→</div>
              <div className="px-6 py-4 bg-[var(--bg-secondary)] rounded-xl">
                <p className="text-2xl mb-1">✓</p>
                <p className="text-sm font-medium">Validators</p>
                <p className="text-xs text-[var(--text-muted)]">1,500+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-radial border-t border-[var(--border)]">
        <div className="container-lg max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Automate Your Staking?</h2>
          <p className="text-[var(--text-secondary)] mb-10">
            Create your vault in under a minute. Set your strategy and let the agent work for you.
          </p>
          <Link href="/vault" className="btn-primary text-lg !px-12 !py-5">
            Get Started
          </Link>
          <p className="text-xs text-[var(--text-muted)] mt-6">
            Currently on Devnet. Mainnet coming soon.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="container-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)] font-bold">StakePilot</span>
            <span className="text-[var(--text-muted)]">— Agent Vault</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <a href="https://github.com/ilhanu/stakepilot" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)]">
              GitHub
            </a>
            <a href="https://twitter.com/StakerSpace" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)]">
              Twitter
            </a>
            <Link href="/docs" className="hover:text-[var(--text-primary)]">
              Docs
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--text-primary)]">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
