"use client";

import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Documentation</h1>
        <p className="text-[var(--text-secondary)] mb-12">Everything you need to know about StakePilot Agent Vault</p>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { href: "#how-it-works", title: "How It Works", desc: "Understand the vault system" },
            { href: "#security", title: "Security", desc: "How we keep your funds safe" },
            { href: "#strategy", title: "Strategy Guide", desc: "Configure your preferences" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="card p-5 hover:border-[var(--accent)]/50 transition"
            >
              <h3 className="font-bold mb-1">{link.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{link.desc}</p>
            </a>
          ))}
        </div>

        {/* How It Works */}
        <section id="how-it-works" className="mb-16">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Create Your Vault",
                content: "Connect your wallet and create a personal staking vault. This is a smart contract that holds your SOL and manages staking operations. Only you can withdraw funds from your vault."
              },
              {
                step: "2",
                title: "Set Your Strategy",
                content: null,
                list: [
                  { label: "Risk Tolerance", desc: "Conservative (established validators only), balanced, or aggressive (maximize APY)" },
                  { label: "Target APY", desc: "Your desired yield goal (agent finds validators that match)" },
                  { label: "Max Validators", desc: "How many validators to spread your stake across" },
                  { label: "Decentralization", desc: "Prefer validators that help network decentralization" },
                ]
              },
              {
                step: "3",
                title: "Deposit SOL",
                content: "Add SOL to your vault. Your funds are held in a secure PDA (Program Derived Address) that only you can withdraw from. The agent can move funds to validators but never to itself."
              },
              {
                step: "4",
                title: "Agent Optimizes",
                content: "The AI agent continuously monitors validator performance and executes staking operations based on your strategy. It analyzes APY, commission rates, uptime, and decentralization metrics to find the best allocation for your goals."
              },
              {
                step: "5",
                title: "Withdraw Anytime",
                content: "You maintain full control. Withdraw your funds whenever you want. No lock-ups, no permission needed. Unstaking has a standard Solana cooldown period (~2-3 days)."
              },
            ].map((item) => (
              <div key={item.step} className="card p-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-3">
                  <span className="w-8 h-8 bg-[var(--accent)]/10 rounded-full flex items-center justify-center text-[var(--accent)] text-sm font-bold">
                    {item.step}
                  </span>
                  {item.title}
                </h3>
                {item.content && (
                  <p className="text-[var(--text-secondary)] leading-relaxed ml-11">{item.content}</p>
                )}
                {item.list && (
                  <ul className="space-y-2 text-[var(--text-secondary)] ml-11 mt-3">
                    {item.list.map((li) => (
                      <li key={li.label} className="flex items-start gap-2">
                        <span className="text-[var(--accent)]">•</span>
                        <span><strong className="text-[var(--text-primary)]">{li.label}:</strong> {li.desc}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Security</h2>
          
          <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-[var(--accent)] mb-4">Key Security Guarantees</h3>
            <ul className="space-y-3 text-[var(--text-secondary)]">
              {[
                { title: "Only you can withdraw", desc: "The agent can stake your funds to validators but has no ability to withdraw to any address" },
                { title: "Replace agent anytime", desc: "Don't trust the current agent? Change it instantly with one transaction" },
                { title: "Fully transparent", desc: "All operations are on-chain and verifiable. See every action the agent takes" },
                { title: "No custody", desc: "Your vault is controlled by your wallet. We never have access to your funds" },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="text-[var(--accent)] text-xl">✓</span>
                  <span><strong className="text-[var(--text-primary)]">{item.title}</strong> — {item.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-3">What the Agent CAN Do</h3>
                <ul className="space-y-2 text-[var(--text-secondary)] text-sm">
                  <li>• Stake vault funds to validators</li>
                  <li>• Unstake from validators (returns to vault)</li>
                  <li>• Rebalance between validators</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-3 text-red-400">What the Agent CANNOT Do</h3>
                <ul className="space-y-2 text-[var(--text-secondary)] text-sm">
                  <li>• Withdraw funds to itself or any address</li>
                  <li>• Change your strategy settings</li>
                  <li>• Lock or freeze your funds</li>
                  <li>• Prevent you from withdrawing</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Strategy Guide */}
        <section id="strategy" className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Strategy Guide</h2>
          
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="font-bold mb-4">Risk Tolerance</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { level: "Low", color: "text-blue-400", desc: "Only established validators with >1M SOL stake. Lower variance, proven track record." },
                  { level: "Medium", color: "text-[var(--accent)]", desc: "Mix of established and growing validators. Balance of safety and yield." },
                  { level: "High", color: "text-orange-400", desc: "Maximize APY, accept more variance. May include smaller validators." },
                ].map((r) => (
                  <div key={r.level} className="bg-[var(--bg-secondary)] rounded-lg p-4">
                    <h4 className={`font-bold ${r.color} mb-2`}>{r.level}</h4>
                    <p className="text-sm text-[var(--text-muted)]">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold mb-4">Target APY</h3>
              <p className="text-[var(--text-secondary)] mb-4">
                Set your desired yield. The agent filters validators that can meet at least 90% of your target.
                Higher targets may reduce the pool of eligible validators.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[var(--text-muted)]">Conservative</span>
                <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 via-[var(--accent)] to-orange-500 rounded-full" />
                </div>
                <span className="text-[var(--text-muted)]">Aggressive</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
                <span>6%</span>
                <span>8%</span>
                <span>10%</span>
                <span>12%</span>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold mb-3">Decentralization</h3>
              <p className="text-[var(--text-secondary)]">
                When enabled, the agent prefers validators in less concentrated datacenters. This helps 
                Solana network health and may provide slightly lower but more stable yields.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mb-16">
          <h2 className="text-2xl font-bold mb-6">FAQ</h2>
          
          <div className="space-y-3">
            {[
              {
                q: "What happens if the agent makes a bad decision?",
                a: "You can always withdraw your funds. Staking is inherently low-risk on Solana — your principal is safe, only yields vary."
              },
              {
                q: "How often does the agent rebalance?",
                a: "The agent evaluates your portfolio hourly but only executes when the potential improvement exceeds transaction costs."
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
              {
                q: "What network is this on?",
                a: "Currently on Devnet for testing. Mainnet launch is planned after hackathon judging."
              },
            ].map((item, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-medium mb-2">{item.q}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Technical */}
        <section id="technical" className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Technical Details</h2>
          
          <div className="card p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-3">Smart Contract</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li><strong>Framework:</strong> Anchor (Rust)</li>
                  <li><strong>Network:</strong> Devnet</li>
                  <li><strong>Program ID:</strong></li>
                  <li className="font-mono text-xs break-all text-[var(--text-muted)]">
                    66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-3">Data Sources</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li><strong>Validators:</strong> validators.app API</li>
                  <li><strong>MEV Data:</strong> Jito Kobe API</li>
                  <li><strong>On-chain:</strong> Solana RPC</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link href="/vault" className="btn-primary text-lg">
            Get Started →
          </Link>
        </div>
      </div>
    </div>
  );
}
