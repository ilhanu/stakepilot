"use client";

import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Documentation</h1>
        <p className="text-white/60 mb-12">Everything you need to know about StakePilot Agent Vault</p>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Link 
            href="#how-it-works"
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-emerald-500/50 transition"
          >
            <h3 className="font-bold mb-1">How It Works</h3>
            <p className="text-sm text-white/60">Understand the vault system</p>
          </Link>
          <Link 
            href="#security"
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-emerald-500/50 transition"
          >
            <h3 className="font-bold mb-1">Security</h3>
            <p className="text-sm text-white/60">How we keep your funds safe</p>
          </Link>
          <Link 
            href="#strategy"
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-emerald-500/50 transition"
          >
            <h3 className="font-bold mb-1">Strategy Guide</h3>
            <p className="text-sm text-white/60">Configure your preferences</p>
          </Link>
        </div>

        {/* How It Works */}
        <section id="how-it-works" className="mb-16">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-sm">1</span>
                Create Your Vault
              </h3>
              <p className="text-white/70 leading-relaxed">
                Connect your wallet and create a personal staking vault. This is a smart contract that holds your SOL 
                and manages staking operations. Only you can withdraw funds from your vault.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-sm">2</span>
                Set Your Strategy
              </h3>
              <p className="text-white/70 leading-relaxed mb-4">
                Configure how you want the AI agent to stake your funds:
              </p>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span><strong>Risk Tolerance:</strong> Conservative (established validators only), balanced, or aggressive (maximize APY)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span><strong>Target APY:</strong> Your desired yield goal (agent finds validators that match)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span><strong>Max Validators:</strong> How many validators to spread your stake across</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  <span><strong>Decentralization:</strong> Prefer validators that help network decentralization</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-sm">3</span>
                Deposit SOL
              </h3>
              <p className="text-white/70 leading-relaxed">
                Add SOL to your vault. Your funds are held in a secure PDA (Program Derived Address) that only 
                you can withdraw from. The agent can move funds to validators but never to itself.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-sm">4</span>
                Agent Optimizes
              </h3>
              <p className="text-white/70 leading-relaxed">
                The AI agent continuously monitors validator performance and executes staking operations based 
                on your strategy. It analyzes APY, commission rates, uptime, and decentralization metrics to 
                find the best allocation for your goals.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-sm">5</span>
                Withdraw Anytime
              </h3>
              <p className="text-white/70 leading-relaxed">
                You maintain full control. Withdraw your funds whenever you want. No lock-ups, no permission needed.
                Unstaking has a standard Solana cooldown period (~2-3 days).
              </p>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Security</h2>
          
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-emerald-400 mb-3">Key Security Guarantees</h3>
            <ul className="space-y-3 text-white/80">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 text-xl">✓</span>
                <span><strong>Only you can withdraw</strong> - The agent can stake your funds to validators but has no ability to withdraw to any address</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 text-xl">✓</span>
                <span><strong>Replace agent anytime</strong> - Don't trust the current agent? Change it instantly with one transaction</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 text-xl">✓</span>
                <span><strong>Fully transparent</strong> - All operations are on-chain and verifiable. See every action the agent takes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 text-xl">✓</span>
                <span><strong>No custody</strong> - Your vault is controlled by your wallet. We never have access to your funds</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-3">What the Agent CAN Do</h3>
            <ul className="space-y-2 text-white/70 mb-4">
              <li>• Stake vault funds to validators (creates stake accounts)</li>
              <li>• Unstake from validators (returns funds to vault)</li>
              <li>• Rebalance between validators</li>
            </ul>
            
            <h3 className="text-lg font-bold mb-3 text-red-400">What the Agent CANNOT Do</h3>
            <ul className="space-y-2 text-white/70">
              <li>• Withdraw funds to itself or any other address</li>
              <li>• Change your strategy settings</li>
              <li>• Lock your funds</li>
              <li>• Prevent you from withdrawing</li>
            </ul>
          </div>
        </section>

        {/* Strategy Guide */}
        <section id="strategy" className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Strategy Guide</h2>
          
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Risk Tolerance</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-bold text-blue-400 mb-2">Low (Conservative)</h4>
                  <p className="text-sm text-white/60">Only established validators with &gt;1M SOL stake. Lower variance, proven track record.</p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-bold text-emerald-400 mb-2">Medium (Balanced)</h4>
                  <p className="text-sm text-white/60">Mix of established and growing validators. Balance of safety and yield.</p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-bold text-orange-400 mb-2">High (Aggressive)</h4>
                  <p className="text-sm text-white/60">Maximize APY, accept more variance. May include smaller validators.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Target APY</h3>
              <p className="text-white/70 mb-4">
                Set your desired yield. The agent will filter validators that can meet at least 90% of your target.
                Higher targets may reduce the pool of eligible validators.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/40">Conservative</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 via-emerald-500 to-orange-500 rounded-full" />
                </div>
                <span className="text-white/40">Aggressive</span>
              </div>
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>6%</span>
                <span>8%</span>
                <span>10%</span>
                <span>12%</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Decentralization</h3>
              <p className="text-white/70">
                When enabled, the agent prefers validators in less concentrated datacenters. This helps 
                Solana network health and may provide slightly lower but more stable yields.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq">
          <h2 className="text-2xl font-bold mb-6">FAQ</h2>
          
          <div className="space-y-4">
            {[
              {
                q: "What happens if the agent makes a bad decision?",
                a: "You can always withdraw your funds. Staking is inherently low-risk on Solana - your principal is safe, only yields vary."
              },
              {
                q: "How often does the agent rebalance?",
                a: "The agent evaluates your portfolio daily but only executes when the potential improvement exceeds transaction costs."
              },
              {
                q: "Are there fees?",
                a: "The smart contract has no protocol fees. You only pay standard Solana transaction fees (~0.000005 SOL per tx)."
              },
              {
                q: "Can I use this with existing stake accounts?",
                a: "Currently, the vault manages its own stake accounts. Migration from existing accounts is planned for a future update."
              },
              {
                q: "What if StakePilot shuts down?",
                a: "Your vault is a smart contract on Solana. It will continue to exist and you can always withdraw, even if our website goes offline."
              },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-bold mb-2">{item.q}</h3>
                <p className="text-white/70">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link 
            href="/vault"
            className="inline-block px-8 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-lg transition"
          >
            Get Started →
          </Link>
        </div>
      </div>
    </div>
  );
}
