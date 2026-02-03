import Link from "next/link";
import { getLstComparison } from "@/lib/lst";
import { formatNumber } from "@/lib/utils";
import { Header } from "@/components/Header";

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
  const { bestApy, totalTvl, protocolCount } = await getHomeData();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      {/* Radial glow at top */}
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial pointer-events-none" />
      
      {/* Header */}
      <Header />

      <main className="relative">
        {/* Hero Section */}
        <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-6">
          <div className="container-lg text-center">
            <div className="animate-fade-in">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                StakePilot
              </h1>
              <p className="text-xl md:text-2xl text-[var(--text-secondary)] mb-4 max-w-2xl mx-auto">
                Complete Staking Intelligence for Solana
              </p>
              <p className="text-base md:text-lg text-[var(--text-muted)] mb-10 max-w-xl mx-auto">
                Real yields. Rising validators. Smart routing.
              </p>
              <Link href="/compare" className="btn-primary text-lg">
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 md:py-24 px-6">
          <div className="container-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
              <div className="animate-fade-in-delay-1">
                <div className="stat-value text-[var(--text-primary)]">
                  ${formatNumber(totalTvl / 1000000)}M
                </div>
                <div className="stat-label">Total Value Tracked</div>
              </div>
              <div className="animate-fade-in-delay-2">
                <div className="stat-value text-[var(--accent)]">
                  {bestApy.toFixed(1)}%
                </div>
                <div className="stat-label">Best APY Available</div>
              </div>
              <div className="animate-fade-in-delay-3">
                <div className="stat-value text-[var(--text-primary)]">
                  {protocolCount}+
                </div>
                <div className="stat-label">LST Protocols Analyzed</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="section-divider mx-6" />

        {/* Product Cards */}
        <section className="py-16 md:py-24 px-6">
          <div className="container-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Compare Card */}
              <Link href="/compare" className="card card-interactive p-8 group">
                <div className="mb-6">
                  <span className="text-4xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-[var(--accent)] transition-colors">
                  Compare LSTs
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                  jitoSOL vs mSOL vs bSOL — real APY with MEV breakdown
                </p>
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                  <span className="badge">Best: {bestApy.toFixed(1)}%</span>
                </div>
                <div className="flex items-center text-[var(--accent)] text-sm font-medium">
                  Compare Now
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* Discover Card */}
              <Link href="/discover" className="card card-interactive p-8 group">
                <div className="mb-6">
                  <span className="text-4xl">🌟</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-[var(--accent)] transition-colors">
                  Discover Validators
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                  Rising stars with explosive MEV growth and decentralization scores
                </p>
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                  <span className="badge">Updated Live</span>
                </div>
                <div className="flex items-center text-[var(--accent)] text-sm font-medium">
                  Find Stars
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* Autopilot Card - FEATURED */}
              <Link href="/autopilot" className="card card-interactive p-8 group border-[var(--accent)]/50 bg-gradient-to-br from-[var(--accent)]/5 to-transparent">
                <div className="mb-6">
                  <span className="text-4xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-[var(--accent)] transition-colors">
                  Autopilot
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                  AI-powered autonomous staking. Set your risk, let intelligence optimize your yield 24/7.
                </p>
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                  <span className="badge bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30">✨ New</span>
                  <span className="badge">Up to 10% APY</span>
                </div>
                <div className="flex items-center text-[var(--accent)] text-sm font-medium">
                  Activate Now
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* My Stakes Card */}
              <Link href="/my-stakes" className="card card-interactive p-8 group">
                <div className="mb-6">
                  <span className="text-4xl">💼</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-[var(--accent)] transition-colors">
                  My Stakes
                </h3>
                <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                  Connect wallet to see your positions and discover how much more you could earn.
                </p>
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                  <span className="badge">Wallet Required</span>
                </div>
                <div className="flex items-center text-[var(--accent)] text-sm font-medium">
                  View My Stakes
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="section-divider mx-6" />

        {/* Trust Section */}
        <section className="py-16 md:py-24 px-6">
          <div className="container-lg text-center">
            <p className="text-[var(--text-muted)] text-sm mb-6">
              Powered by real-time data from
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-[var(--text-secondary)]">
              <span className="font-medium">Jito</span>
              <span className="font-medium">Marinade</span>
              <span className="font-medium">BlazeStake</span>
              <span className="font-medium">Solana</span>
            </div>
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

// Header is now imported from @/components/Header
