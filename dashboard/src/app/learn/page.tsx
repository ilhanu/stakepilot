import Link from "next/link";

export const metadata = {
  title: "Learn About MEV - StakePilot",
  description: "Educational guide to MEV, staking, and yield optimization on Solana",
};

const TOPICS = [
  {
    title: "Getting Started",
    icon: "🎯",
    items: [
      {
        q: "What is Staking?",
        a: "Staking is locking up your SOL to help secure the Solana network. In return, you earn rewards (~6-8% APY). You can stake natively to a validator or use liquid staking tokens (LSTs) like jitoSOL.",
      },
      {
        q: "Why use Liquid Staking Tokens?",
        a: "LSTs let you earn staking rewards while keeping assets liquid. Trade, use in DeFi, or unstake anytime — no waiting for cooldown periods.",
      },
    ],
  },
  {
    title: "Understanding MEV",
    icon: "💰",
    items: [
      {
        q: "What is MEV?",
        a: "MEV (Maximal Extractable Value) is extra profit from reordering transactions in a block. On Solana, this comes from arbitrage and liquidations. Jito captures this value and shares it with stakers.",
      },
      {
        q: "How does MEV affect my yield?",
        a: "With jitoSOL, you get MEV tips on top of base staking rewards. This can add 1-2% extra APY compared to non-MEV staking.",
      },
      {
        q: "What is JIP-31 / BAM?",
        a: "JIP-31 introduced Block Auction Market (BAM) in December 2024. Before BAM, validators kept 100% of MEV. Now, MEV flows to stakers proportionally.",
      },
    ],
  },
  {
    title: "Choosing Validators",
    icon: "🏆",
    items: [
      {
        q: "What makes a good validator?",
        a: "Look for: Low commission (5-10%), high uptime, MEV earnings (shows they run Jito), and consistent performance across epochs.",
      },
      {
        q: "What are Rising Stars?",
        a: "Rising Stars are small validators with increasing MEV earnings. They might be improving infrastructure or attracting stake, offering potential alpha.",
      },
    ],
  },
  {
    title: "Optimization",
    icon: "⚖️",
    items: [
      {
        q: "jitoSOL or mSOL?",
        a: "jitoSOL typically offers higher APY due to MEV sharing. mSOL has deeper liquidity and is well-established. Both are solid choices.",
      },
      {
        q: "How often to compound?",
        a: "For small stakes, monthly is fine. For large stakes, epoch-based compounding (~2.5 days) maximizes returns.",
      },
    ],
  },
];

const KEY_NUMBERS = [
  { value: "~6.5%", label: "Base Staking APY" },
  { value: "+1-2%", label: "MEV Bonus (jitoSOL)" },
  { value: "~2.5 days", label: "Epoch Duration" },
  { value: "146", label: "Epochs Per Year" },
];

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      <div className="absolute inset-x-0 top-0 h-[400px] bg-radial pointer-events-none" />
      
      <Header />

      <main className="relative">
        {/* Hero */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-16 px-6">
          <div className="container-lg text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm mb-8 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Learn About MEV & Staking
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
              Everything you need to optimize your Solana staking yield.
            </p>
          </div>
        </section>

        {/* Key Numbers */}
        <section className="pb-16 px-6">
          <div className="container-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {KEY_NUMBERS.map((stat) => (
                <div key={stat.label} className="card p-6 text-center">
                  <div className="stat-value !text-3xl text-[var(--accent)] mb-2">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="section-divider mx-6" />

        {/* Topics */}
        <section className="py-16 px-6">
          <div className="container-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {TOPICS.map((topic) => (
                <div key={topic.title} className="card p-8">
                  <h2 className="flex items-center gap-3 text-xl font-bold mb-6">
                    <span className="text-2xl">{topic.icon}</span>
                    {topic.title}
                  </h2>
                  <div className="space-y-6">
                    {topic.items.map((item) => (
                      <div key={item.q}>
                        <h3 className="font-semibold text-[var(--text-primary)] mb-2">{item.q}</h3>
                        <p className="text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="section-divider mx-6" />

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="container-lg">
            <div className="card p-12 bg-blue-500/5 border-blue-500/20 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-3">Ready to Optimize?</h2>
              <p className="text-[var(--text-secondary)] mb-8">
                Use our tools to compare strategies and maximize your staking returns.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/compare" className="btn-primary">
                  📊 Compare LSTs
                </Link>
                <Link href="/route" className="btn-secondary">
                  🛤️ Route My Stake
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Header Component
function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border)]">
      <div className="container-lg">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-lg font-semibold hidden sm:inline">StakePilot</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/compare" className="btn-ghost">
              Compare
            </Link>
            <Link href="/discover" className="btn-ghost">
              Discover
            </Link>
            <Link href="/route" className="btn-ghost">
              Route
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
