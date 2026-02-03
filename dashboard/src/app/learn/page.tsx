import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MevGlossary } from "@/components/MevTooltip";

export const metadata = {
  title: "Learn About MEV - StakePilot",
  description: "Educational guide to MEV, staking, and yield optimization on Solana",
};

const LEARNING_PATHS = [
  {
    title: "🎯 Getting Started",
    items: [
      {
        term: "What is Staking?",
        explanation: "Staking is locking up your SOL to help secure the Solana network. In return, you earn rewards (approximately 6-8% APY). There are two main ways to stake: Native staking (delegate directly to a validator) or Liquid staking (hold tokens like jitoSOL that represent staked SOL).",
      },
      {
        term: "Why Stake with Liquid Staking Tokens (LSTs)?",
        explanation: "LSTs like jitoSOL let you earn staking rewards while keeping your assets liquid. You can trade, use in DeFi, or unstake anytime without waiting for the cooldown period that native staking requires.",
      },
    ],
  },
  {
    title: "💰 Understanding MEV",
    items: [
      {
        term: "What is MEV?",
        explanation: "MEV (Maximal Extractable Value) is extra profit that can be made by reordering, inserting, or censoring transactions in a block. On Solana, MEV mainly comes from arbitrage trading and liquidations. Jito's infrastructure captures this value and shares it with stakers.",
      },
      {
        term: "How does MEV affect my yield?",
        explanation: "If you stake with a MEV-aware protocol like jitoSOL, you get a share of MEV tips on top of base staking rewards. This can add 1-2% extra APY compared to non-MEV staking.",
      },
      {
        term: "What is JIP-31 / BAM?",
        explanation: "JIP-31 introduced BAM (Block Auction Market) in December 2024. Before BAM, validators kept 100% of MEV tips. Now, MEV flows to stakers proportionally. This is why jitoSOL has higher yields than traditional staking.",
      },
    ],
  },
  {
    title: "🏆 Choosing Validators",
    items: [
      {
        term: "What makes a good validator?",
        explanation: "Look for: Low commission (5-10%), high uptime, MEV earnings (shows they run Jito), and consistent performance across epochs. Our MEV Leaderboard helps identify top performers.",
      },
      {
        term: "What is 'Rising Stars'?",
        explanation: "Rising Stars are validators whose MEV earnings are increasing compared to previous epochs. They might be improving their infrastructure or attracting more stake, potentially offering good returns.",
      },
    ],
  },
  {
    title: "⚖️ Optimization Strategies",
    items: [
      {
        term: "Should I use jitoSOL or mSOL?",
        explanation: "jitoSOL typically offers higher APY due to MEV sharing, but both are solid choices. jitoSOL: Higher yield, MEV exposure. mSOL: Deep liquidity, well-established. Our Yield Simulator helps you compare.",
      },
      {
        term: "What is rebalancing?",
        explanation: "Rebalancing means adjusting your staking allocation to optimize yields. For example, moving from a low-MEV validator to a higher-performing one, or shifting between LST protocols based on current APYs.",
      },
      {
        term: "How often should I compound?",
        explanation: "It depends on the amount staked and gas costs. For small amounts, monthly compounding is fine. For large stakes, epoch-based compounding (every ~2.5 days) can maximize returns. Our simulator calculates the difference.",
      },
    ],
  },
];

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <section className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Learn About MEV & Staking
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to know to optimize your Solana staking yield.
            From basics to advanced strategies.
          </p>
        </section>

        {/* Learning Paths */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {LEARNING_PATHS.map((path) => (
            <Card key={path.title} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-900/30 to-purple-900/30">
                <CardTitle>{path.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {path.items.map((item, i) => (
                    <div key={i} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                      <h4 className="font-semibold text-white mb-2">{item.term}</h4>
                      <p className="text-sm text-gray-400">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Quick Stats */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Key Numbers to Know</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-6 text-center">
              <p className="text-3xl font-bold text-blue-400">~6.5%</p>
              <p className="text-sm text-gray-400 mt-2">Base Staking APY</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center">
              <p className="text-3xl font-bold text-green-400">+1-2%</p>
              <p className="text-sm text-gray-400 mt-2">MEV Bonus (jitoSOL)</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center">
              <p className="text-3xl font-bold text-purple-400">~2.5 days</p>
              <p className="text-sm text-gray-400 mt-2">Epoch Duration</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6 text-center">
              <p className="text-3xl font-bold text-orange-400">146</p>
              <p className="text-sm text-gray-400 mt-2">Epochs Per Year</p>
            </div>
          </div>
        </section>

        {/* Glossary */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">📚 MEV Glossary</h2>
          <Card>
            <CardContent className="pt-6">
              <MevGlossary />
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Ready to Optimize Your Yield?</h3>
            <p className="text-gray-400 mb-6">
              Use our tools to compare strategies, track validators, and maximize your staking returns.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              Go to Dashboard →
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
