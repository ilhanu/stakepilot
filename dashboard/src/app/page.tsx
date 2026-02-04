"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [demoStrategy, setDemoStrategy] = useState({
    riskTolerance: "Medium",
    targetApy: 8,
    maxValidators: 5,
  });
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/recommend?riskTolerance=${demoStrategy.riskTolerance}&targetApy=${demoStrategy.targetApy * 100}&maxValidators=${demoStrategy.maxValidators}&balance=100`);
      const data = await res.json();
      setRecommendation(data.decision);
    } catch (error) {
      console.error("Demo failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-black" />
        
        <header className="relative z-10 border-b border-white/5 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-emerald-400">StakePilot</h1>
            <nav className="flex items-center gap-6">
              <Link href="/vault" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold transition">
                Launch App
              </Link>
            </nav>
          </div>
        </header>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="text-white">Autonomous</span><br />
            <span className="text-emerald-400">Staking Vault</span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
            Deposit SOL. Set your strategy. Let the AI agent optimize your staking.
            <br />
            <span className="text-emerald-400 font-semibold">You're always in control.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/vault"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-lg transition"
            >
              Create Your Vault →
            </Link>
            <a 
              href="#how-it-works"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl font-bold text-lg transition"
            >
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-16">How It Works</h3>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Create Vault",
                desc: "Connect wallet and create your personal staking vault",
                icon: "🏦",
              },
              {
                step: "2",
                title: "Set Strategy",
                desc: "Choose risk level, target APY, and preferences",
                icon: "⚙️",
              },
              {
                step: "3",
                title: "Deposit SOL",
                desc: "Add funds to your vault. Withdraw anytime.",
                icon: "💰",
              },
              {
                step: "4",
                title: "Agent Works",
                desc: "AI analyzes validators and executes optimal staking",
                icon: "🤖",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-emerald-400 text-sm font-bold mb-2">STEP {item.step}</div>
                <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                <p className="text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategy Demo */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-4">Try the Algorithm</h3>
          <p className="text-white/60 text-center mb-12">
            See how the agent would allocate 100 SOL with your strategy
          </p>
          
          <div className="bg-black/50 border border-white/10 rounded-2xl p-8">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-white/60 text-sm mb-2">Risk Tolerance</label>
                <select
                  value={demoStrategy.riskTolerance}
                  onChange={(e) => setDemoStrategy({ ...demoStrategy, riskTolerance: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl"
                >
                  <option value="Low">Low (Conservative)</option>
                  <option value="Medium">Medium (Balanced)</option>
                  <option value="High">High (Aggressive)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-white/60 text-sm mb-2">Target APY: {demoStrategy.targetApy}%</label>
                <input
                  type="range"
                  min="5"
                  max="12"
                  value={demoStrategy.targetApy}
                  onChange={(e) => setDemoStrategy({ ...demoStrategy, targetApy: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-white/60 text-sm mb-2">Max Validators: {demoStrategy.maxValidators}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={demoStrategy.maxValidators}
                  onChange={(e) => setDemoStrategy({ ...demoStrategy, maxValidators: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
            
            <button
              onClick={handleDemo}
              disabled={loading}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-lg transition disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Generate Recommendation"}
            </button>
            
            {recommendation && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <h4 className="font-bold mb-4">Agent Recommendation</h4>
                <p className="text-sm text-white/60 mb-6">{recommendation.reasoning}</p>
                
                <div className="space-y-3">
                  {recommendation.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                      <div>
                        <p className="font-bold">{rec.validatorName}</p>
                        <p className="text-sm text-white/60">{rec.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-400">{rec.allocatedAmount.toFixed(2)} SOL</p>
                        <p className="text-sm text-white/60">~{rec.expectedApy.toFixed(1)}% APY</p>
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
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-16">Security First</h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "You Control Withdrawals",
                desc: "Only you can withdraw funds. The agent can stake but never take.",
                icon: "🔐",
              },
              {
                title: "Change Agent Anytime",
                desc: "Don't trust the current agent? Replace it instantly.",
                icon: "🔄",
              },
              {
                title: "Transparent Operations",
                desc: "All operations are on-chain. Verify everything.",
                icon: "👁️",
              },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                <p className="text-white/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-t from-emerald-900/20 to-transparent">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-4xl font-bold mb-6">Ready to Automate Your Staking?</h3>
          <p className="text-white/70 mb-8">
            Create your vault in under a minute. Set your strategy and let the agent work for you.
          </p>
          <Link 
            href="/vault"
            className="inline-block px-12 py-5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-xl transition"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40">StakePilot — Agent Vault</p>
          <div className="flex gap-6 text-white/40">
            <a href="https://github.com" className="hover:text-white">GitHub</a>
            <a href="https://twitter.com" className="hover:text-white">Twitter</a>
            <a href="/docs" className="hover:text-white">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
