"use client";

import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Documentation</h1>
        <p className="text-sm md:text-base text-[var(--text-secondary)] mb-8 md:mb-12">Everything you need to know about StakePilot Agent Vault</p>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-12">
          {[
            { href: "#how-it-works", title: "How It Works", desc: "Understand the vault system" },
            { href: "#security", title: "Security", desc: "How we keep your funds safe" },
            { href: "#selection", title: "Selection Criteria", desc: "How validators are scored" },
            { href: "#strategy", title: "Strategy Guide", desc: "Configure your preferences" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="card p-4 md:p-5 hover:border-[var(--accent)]/50 transition"
            >
              <h3 className="font-bold mb-1 text-sm md:text-base">{link.title}</h3>
              <p className="text-xs md:text-sm text-[var(--text-secondary)]">{link.desc}</p>
            </a>
          ))}
        </div>

        {/* How It Works */}
        <section id="how-it-works" className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">How It Works</h2>
          
          <div className="space-y-3 md:space-y-4">
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
              <div key={item.step} className="card p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3 flex items-center gap-2 md:gap-3">
                  <span className="w-7 h-7 md:w-8 md:h-8 bg-[var(--accent)]/10 rounded-full flex items-center justify-center text-[var(--accent)] text-xs md:text-sm font-bold shrink-0">
                    {item.step}
                  </span>
                  {item.title}
                </h3>
                {item.content && (
                  <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed ml-9 md:ml-11">{item.content}</p>
                )}
                {item.list && (
                  <ul className="space-y-2 text-sm md:text-base text-[var(--text-secondary)] ml-9 md:ml-11 mt-2 md:mt-3">
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
        <section id="security" className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Security</h2>
          
          <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-bold text-[var(--accent)] mb-3 md:mb-4">Key Security Guarantees</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-[var(--text-secondary)]">
              {[
                { title: "Only you can withdraw", desc: "The agent can stake your funds to validators but has no ability to withdraw to any address" },
                { title: "Replace agent anytime", desc: "Don't trust the current agent? Change it instantly with one transaction" },
                { title: "Fully transparent", desc: "All operations are on-chain and verifiable. See every action the agent takes" },
                { title: "No custody", desc: "Your vault is controlled by your wallet. We never have access to your funds" },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-2 md:gap-3">
                  <span className="text-[var(--accent)] text-lg md:text-xl shrink-0">✓</span>
                  <span><strong className="text-[var(--text-primary)]">{item.title}</strong> — {item.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4 md:p-6">
            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              <div>
                <h3 className="font-bold mb-2 md:mb-3 text-sm md:text-base">What the Agent CAN Do</h3>
                <ul className="space-y-1.5 md:space-y-2 text-[var(--text-secondary)] text-xs md:text-sm">
                  <li>• Stake vault funds to validators</li>
                  <li>• Unstake from validators (returns to vault)</li>
                  <li>• Rebalance between validators</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-2 md:mb-3 text-red-400 text-sm md:text-base">What the Agent CANNOT Do</h3>
                <ul className="space-y-1.5 md:space-y-2 text-[var(--text-secondary)] text-xs md:text-sm">
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
        <section id="strategy" className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Strategy Guide</h2>
          
          <div className="space-y-3 md:space-y-4">
            <div className="card p-4 md:p-6">
              <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">Risk Tolerance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                {[
                  { level: "Low", color: "text-blue-400", desc: "Only established validators with >1M SOL stake. Lower variance, proven track record." },
                  { level: "Medium", color: "text-[var(--accent)]", desc: "Mix of established and growing validators. Balance of safety and yield." },
                  { level: "High", color: "text-orange-400", desc: "Maximize APY, accept more variance. May include smaller validators." },
                ].map((r) => (
                  <div key={r.level} className="bg-[var(--bg-secondary)] rounded-lg p-3 md:p-4">
                    <h4 className={`font-bold ${r.color} mb-1 md:mb-2 text-sm md:text-base`}>{r.level}</h4>
                    <p className="text-xs md:text-sm text-[var(--text-muted)]">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 md:p-6">
              <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">Target APY</h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)] mb-3 md:mb-4">
                Set your desired yield. The agent filters validators that can meet at least 90% of your target.
                Higher targets may reduce the pool of eligible validators.
              </p>
              <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm">
                <span className="text-[var(--text-muted)] hidden sm:inline">Conservative</span>
                <span className="text-[var(--text-muted)] sm:hidden">Low</span>
                <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 via-[var(--accent)] to-orange-500 rounded-full" />
                </div>
                <span className="text-[var(--text-muted)] hidden sm:inline">Aggressive</span>
                <span className="text-[var(--text-muted)] sm:hidden">High</span>
              </div>
              <div className="flex justify-between text-[10px] md:text-xs text-[var(--text-muted)] mt-2">
                <span>6%</span>
                <span>8%</span>
                <span>10%</span>
                <span>12%</span>
              </div>
            </div>

            <div className="card p-4 md:p-6">
              <h3 className="font-bold mb-2 md:mb-3 text-sm md:text-base">Decentralization</h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)]">
                When enabled, the agent prefers validators in less concentrated datacenters. This helps 
                Solana network health and may provide slightly lower but more stable yields.
              </p>
            </div>
          </div>
        </section>

        {/* Validator Selection */}
        <section id="selection" className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Validator Selection Criteria</h2>
          <p className="text-sm md:text-base text-[var(--text-secondary)] mb-4 md:mb-6">
            The agent uses a multi-factor scoring system to select and monitor validators. Here&apos;s exactly how it works:
          </p>

          <div className="card p-4 md:p-6 mb-3 md:mb-4">
            <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">📊 Scoring Formula (max 140 pts)</h3>
            <div className="space-y-2 md:space-y-3">
              {[
                { factor: "Decentralization", weight: "40 pts", desc: "Prefers validators outside superminority and in unique data centers" },
                { factor: "Commission", weight: "25 pts", desc: "Lower commission = higher score. 0% gets full marks, scales linearly" },
                { factor: "MEV Fairness", weight: "20 pts", desc: "Validators running Jito MEV with fair tip distribution score higher" },
                { factor: "Uptime", weight: "15 pts", desc: "Based on vote credits — validators that miss fewer votes rank better" },
                { factor: "Reputation", weight: "10 pts", desc: "Established validators with verified identity get bonus points" },
                { factor: "Infrastructure", weight: "up to 30 pts", desc: "Bonus for bare-metal servers, IBRL, and geographic diversity" },
              ].map((item) => (
                <div key={item.factor} className="flex items-start gap-3 text-sm md:text-base">
                  <span className="text-[var(--accent)] font-mono text-xs md:text-sm min-w-[60px] md:min-w-[70px] text-right shrink-0">{item.weight}</span>
                  <div>
                    <strong className="text-[var(--text-primary)]">{item.factor}</strong>
                    <span className="text-[var(--text-secondary)]"> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 md:p-6 mb-3 md:mb-4">
            <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">✅ Selection Filters</h3>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-3">Before scoring, validators must pass these minimum requirements:</p>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2"><span className="text-[var(--accent)]">•</span> <span><strong className="text-[var(--text-primary)]">Commission ≤ 10%</strong> — validators charging more than 10% are excluded</span></li>
              <li className="flex items-start gap-2"><span className="text-[var(--accent)]">•</span> <span><strong className="text-[var(--text-primary)]">Not delinquent</strong> — must be actively voting</span></li>
              <li className="flex items-start gap-2"><span className="text-[var(--accent)]">•</span> <span><strong className="text-[var(--text-primary)]">Active stake &lt; 5M SOL</strong> — avoids over-concentrated validators to help decentralization</span></li>
            </ul>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mt-3">Validators that pass filters are ranked by score. The agent stakes to the top 5.</p>
          </div>

          <div className="card p-4 md:p-6">
            <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">🔄 Rebalancing Rules</h3>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-3">
              The agent runs every 8 hours and checks existing positions. It will only deactivate a stake for serious issues — never just because a score dropped slightly:
            </p>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2"><span className="text-red-400">⚠</span> <span><strong className="text-[var(--text-primary)]">Commission hike &gt; 15%</strong> — deactivate if commission rises above tolerance</span></li>
              <li className="flex items-start gap-2"><span className="text-red-400">⚠</span> <span><strong className="text-[var(--text-primary)]">Commission jump +3%</strong> — deactivate if commission increases by 3+ points since staking</span></li>
              <li className="flex items-start gap-2"><span className="text-red-400">⚠</span> <span><strong className="text-[var(--text-primary)]">Delinquency</strong> — deactivate if validator stops voting</span></li>
              <li className="flex items-start gap-2"><span className="text-red-400">⚠</span> <span><strong className="text-[var(--text-primary)]">Validator disappears</strong> — deactivate if no longer in the validator set</span></li>
            </ul>
            <div className="mt-3 md:mt-4 bg-[var(--bg-secondary)] rounded-lg p-3 md:p-4">
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                <strong>Why conservative?</strong> Deactivating a stake means ~2 epochs (~4 days on mainnet) of zero rewards while the stake cools down. 
                The agent only deactivates when the risk of staying outweighs the cost of lost yield.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">FAQ</h2>
          
          <div className="space-y-2 md:space-y-3">
            {[
              {
                q: "What happens if the agent makes a bad decision?",
                a: "You can always withdraw your funds. Staking is inherently low-risk on Solana — your principal is safe, only yields vary."
              },
              {
                q: "How often does the agent rebalance?",
                a: "The agent runs every 8 hours (3 times per day). It checks all positions and only rebalances when there's a serious issue like a commission hike or delinquency — not for minor score changes."
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
                a: "Currently on Testnet for testing. Mainnet launch is planned after hackathon judging."
              },
            ].map((item, i) => (
              <div key={i} className="card p-4 md:p-5">
                <h3 className="font-medium mb-1.5 md:mb-2 text-sm md:text-base">{item.q}</h3>
                <p className="text-xs md:text-sm text-[var(--text-secondary)]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Technical */}
        <section id="technical" className="mb-12 md:mb-16">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Technical Details</h2>
          
          <div className="card p-4 md:p-6">
            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              <div>
                <h3 className="font-bold mb-2 md:mb-3 text-sm md:text-base">Smart Contract</h3>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
                  <li><strong>Framework:</strong> Anchor (Rust)</li>
                  <li><strong>Network:</strong> Testnet</li>
                  <li><strong>Program ID:</strong></li>
                  <li className="font-mono text-[10px] md:text-xs break-all text-[var(--text-muted)]">
                    66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-2 md:mb-3 text-sm md:text-base">Data Sources</h3>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
                  <li><strong>Validators:</strong> validators.app API (testnet)</li>
                  <li><strong>MEV Data:</strong> Jito Kobe API</li>
                  <li><strong>On-chain:</strong> Solana RPC</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link href="/vault" className="btn-primary text-base md:text-lg px-6 md:px-8 py-3 md:py-4">
            Get Started →
          </Link>
        </div>
      </div>
    </div>
  );
}
