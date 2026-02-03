import Link from "next/link";
import { getLstComparison } from "@/lib/lst";
import { formatNumber } from "@/lib/utils";

export const revalidate = 60;

async function getHomeData() {
  try {
    const lstComparison = await getLstComparison();
    const bestApy = Math.max(...lstComparison.protocols.map((p) => p.apy));
    const totalTvl = lstComparison.protocols.reduce((sum, p) => sum + p.tvl, 0);
    
    return {
      bestApy,
      totalTvl,
      protocolCount: lstComparison.protocols.length,
    };
  } catch (error) {
    console.error("Failed to fetch home data:", error);
    return {
      bestApy: 7.5,
      totalTvl: 15000000,
      protocolCount: 3,
    };
  }
}

export default async function Home() {
  const { bestApy } = await getHomeData();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      {/* Radial glow at top */}
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial pointer-events-none" />

      <main className="relative">
        {/* Hero Section */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-20 px-6">
          <div className="container-lg text-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-sm mb-6">
                <span className="text-[var(--accent)]">🧠</span>
                <span>AI-Powered Staking Intelligence</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                Earn More on Your
                <span className="text-[var(--accent)]"> SOL</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-[var(--text-secondary)] mb-4 max-w-2xl mx-auto">
                Connect your wallet. See what you're missing.
                <br className="hidden md:block" />
                Get AI recommendations to maximize yield.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <Link href="/my-stakes" className="btn-primary text-lg px-8 py-4">
                  💼 Analyze My Stakes
                </Link>
                <Link href="/autopilot" className="btn-secondary text-lg px-8 py-4">
                  🤖 Try Autopilot
                </Link>
              </div>
              
              <p className="text-sm text-[var(--text-muted)] mt-6">
                No sign-up required. Connect wallet to start.
              </p>
            </div>
          </div>
        </section>

        {/* Value Props */}
        <section className="py-12 md:py-20 px-6 border-t border-[var(--border)]">
          <div className="container-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="animate-fade-in-delay-1">
                <div className="text-4xl mb-4">📈</div>
                <div className="stat-value text-[var(--accent)] !text-3xl mb-2">
                  +1.5%
                </div>
                <div className="text-[var(--text-secondary)]">
                  Average APY gain when optimized
                </div>
              </div>
              <div className="animate-fade-in-delay-2">
                <div className="text-4xl mb-4">⚡</div>
                <div className="stat-value !text-3xl mb-2">
                  30 sec
                </div>
                <div className="text-[var(--text-secondary)]">
                  To see your optimization opportunities
                </div>
              </div>
              <div className="animate-fade-in-delay-3">
                <div className="text-4xl mb-4">🌟</div>
                <div className="stat-value !text-3xl mb-2">
                  {bestApy.toFixed(1)}%+
                </div>
                <div className="text-[var(--text-secondary)]">
                  APY with Rising Star validators
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 md:py-20 px-6 bg-[var(--bg-secondary)]/50">
          <div className="container-lg">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              How It Works
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-2xl font-bold text-[var(--accent)]">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-3">Connect Wallet</h3>
                <p className="text-[var(--text-secondary)]">
                  We scan your stake accounts and analyze your current validators.
                </p>
              </div>
              
              <div className="card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-2xl font-bold text-[var(--accent)]">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-3">See Opportunities</h3>
                <p className="text-[var(--text-secondary)]">
                  AI finds validators with higher yields, lower commissions, better MEV.
                </p>
              </div>
              
              <div className="card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-2xl font-bold text-[var(--accent)]">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3">Stake & Earn</h3>
                <p className="text-[var(--text-secondary)]">
                  One-click to stake with Phantom or Solflare. Start earning more.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="py-12 md:py-20 px-6">
          <div className="container-lg">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Staking Intelligence
            </h2>
            <p className="text-center text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto">
              Not just data. Actionable insights that tell you exactly what to do.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* My Stakes - Primary */}
              <Link href="/my-stakes" className="card card-interactive p-8 group md:col-span-2 bg-gradient-to-r from-[var(--accent)]/5 to-purple-500/5 border-[var(--accent)]/30">
                <div className="flex items-start gap-6">
                  <div className="text-5xl">💼</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors">
                      My Stakes
                    </h3>
                    <p className="text-[var(--text-secondary)] mb-4">
                      Connect wallet to see your positions. AI analyzes each stake and shows exactly how much more you could earn. Health score, alerts, and prioritized recommendations.
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="badge bg-[var(--accent)]/20 text-[var(--accent)]">Portfolio Health Score</span>
                      <span className="badge">Smart Triggers</span>
                      <span className="badge">Action Items</span>
                    </div>
                  </div>
                  <div className="text-[var(--accent)] hidden md:block">
                    <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Autopilot */}
              <Link href="/autopilot" className="card card-interactive p-8 group">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors">
                  Autopilot
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  Set your risk tolerance. AI optimizes your allocation 24/7. Strategies from conservative (6.7%) to aggressive (10%+).
                </p>
                <div className="flex items-center text-[var(--accent)] text-sm font-medium">
                  Configure →
                </div>
              </Link>

              {/* Rising Stars */}
              <Link href="/discover" className="card card-interactive p-8 group">
                <div className="text-4xl mb-4">🌟</div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors">
                  Rising Stars
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  Small validators with explosive growth. Higher yields due to less MEV dilution. Support decentralization while earning more.
                </p>
                <div className="flex items-center text-[var(--accent)] text-sm font-medium">
                  Discover →
                </div>
              </Link>

              {/* Route My Stake */}
              <Link href="/route" className="card card-interactive p-8 group">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors">
                  Route My Stake
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  Tell us your preferences. Get optimized allocation. Advanced filters for uptime, location, age. Native staking links.
                </p>
                <div className="flex items-center text-[var(--accent)] text-sm font-medium">
                  Get Recommendations →
                </div>
              </Link>

              {/* Smart Alerts */}
              <Link href="/alerts" className="card card-interactive p-8 group">
                <div className="text-4xl mb-4">🔔</div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors">
                  Smart Alerts
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  Commission increases, performance drops, new opportunities. Get notified via Telegram, Discord, or push.
                </p>
                <div className="flex items-center text-[var(--accent)] text-sm font-medium">
                  Configure Alerts →
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Why Native Staking */}
        <section className="py-12 md:py-20 px-6 bg-[var(--bg-secondary)]/50">
          <div className="container-lg">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Native Staking?
              </h2>
              <p className="text-[var(--text-secondary)] mb-8">
                LSTs like jitoSOL and mSOL are great for liquidity. But if you want maximum yield and to support the network, native staking wins.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="card p-6">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-green-400">✓</span> No Smart Contract Risk
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Your SOL is delegated directly to validators. No protocol hacks, no depeg risk.
                  </p>
                </div>
                <div className="card p-6">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-green-400">✓</span> Full MEV Rewards
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Get 100% of what the validator shares. No protocol taking a cut.
                  </p>
                </div>
                <div className="card p-6">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-green-400">✓</span> Choose Your Validator
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    LSTs pool your stake. Native staking lets you pick exactly who to support.
                  </p>
                </div>
                <div className="card p-6">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-green-400">✓</span> Support Decentralization
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Stake with Rising Stars. Help small validators grow. Strengthen Solana.
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-[var(--text-muted)] mt-8">
                Want liquidity? We also show LST comparisons at <Link href="/compare" className="text-[var(--accent)] hover:underline">/compare</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 px-6">
          <div className="container-lg text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Earn More?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
              Connect your wallet and see exactly how much extra SOL you could be earning.
            </p>
            <Link href="/my-stakes" className="btn-primary text-lg px-8 py-4">
              💼 Analyze My Stakes →
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-[var(--border)]">
          <div className="container-lg">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <span className="font-semibold">StakePilot</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                <Link href="/learn" className="hover:text-[var(--text-primary)] transition-colors">
                  Learn
                </Link>
                <Link href="/compare" className="hover:text-[var(--text-primary)] transition-colors">
                  Compare LSTs
                </Link>
                <a
                  href="https://github.com/ilhanu/stakepilot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  GitHub
                </a>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Built for Colosseum Agent Hackathon 🏆
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
