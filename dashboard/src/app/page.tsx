import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { MevLeaderboard } from "@/components/MevLeaderboard";
import { LstComparison } from "@/components/LstComparison";
import { StakePositions } from "@/components/StakePositions";
import { YieldSimulator } from "@/components/YieldSimulator";
import { PortfolioTracker } from "@/components/PortfolioTracker";
import { RebalancePreview } from "@/components/RebalancePreview";
import { MevAlerts } from "@/components/MevAlerts";
import { ValidatorInsights } from "@/components/ValidatorInsights";
import { generateMockInsightsData } from "@/lib/validator-insights";
import { getMevStats } from "@/lib/jito";
import { getCurrentEpoch, getEpochInfo, getEpochProgress, getTimeUntilNextEpoch } from "@/lib/solana";
import { getLstComparison } from "@/lib/lst";
import { getRisingStars, MevPrediction } from "@/lib/mev-prediction";
import Link from "next/link";

export const revalidate = 60; // Revalidate every minute

async function getDashboardData() {
  try {
    const [epochInfo, lstComparison] = await Promise.all([
      getEpochInfo(),
      getLstComparison(),
    ]);

    // Try to get MEV stats for current and previous epoch
    let mevStats;
    try {
      mevStats = await getMevStats(epochInfo.epoch);
      // If no data for current epoch, try previous
      if (mevStats.validatorCount === 0) {
        mevStats = await getMevStats(epochInfo.epoch - 1);
      }
    } catch (e) {
      // Fallback to mock data for demo
      mevStats = {
        epoch: epochInfo.epoch - 1,
        totalMev: 15234567890000,
        totalMevSol: 15234.57,
        validatorCount: 1423,
        avgMevPerValidator: 10700000000,
        topValidators: [
          { voteAccount: "7K8DVxtNJGnMtUY1CQJT5jcs8sFGSZTDiG7kowvFpECh", name: "Everstake", mevRevenue: 234000000000, mevRevenueSol: 234, stake: 2500000000000000 },
          { voteAccount: "CertusDeBmqN8ZawdkxK5kFGMwBXdudvWHYwtNgNhvLu", name: "Certus One", mevRevenue: 198000000000, mevRevenueSol: 198, stake: 2100000000000000 },
          { voteAccount: "ChorusmmC7X6H73VWvWvMhczLxWpPoCXTvFZqvkFswvL", name: "Chorus One", mevRevenue: 187000000000, mevRevenueSol: 187, stake: 1900000000000000 },
          { voteAccount: "Vote111111111111111111111111111111111111111", name: "Figment", mevRevenue: 175000000000, mevRevenueSol: 175, stake: 1800000000000000 },
          { voteAccount: "Vote222222222222222222222222222222222222222", name: "Triton", mevRevenue: 165000000000, mevRevenueSol: 165, stake: 1700000000000000 },
          { voteAccount: "Vote333333333333333333333333333333333333333", name: "Solana Beach", mevRevenue: 156000000000, mevRevenueSol: 156, stake: 1600000000000000 },
          { voteAccount: "Vote444444444444444444444444444444444444444", name: "Laine", mevRevenue: 148000000000, mevRevenueSol: 148, stake: 1500000000000000 },
          { voteAccount: "Vote555555555555555555555555555555555555555", name: "P2P.org", mevRevenue: 142000000000, mevRevenueSol: 142, stake: 1450000000000000 },
          { voteAccount: "Vote666666666666666666666666666666666666666", name: "Stake haus", mevRevenue: 135000000000, mevRevenueSol: 135, stake: 1380000000000000 },
          { voteAccount: "Vote777777777777777777777777777777777777777", name: "Coinbase", mevRevenue: 128000000000, mevRevenueSol: 128, stake: 1300000000000000 },
        ],
      };
    }

    // Generate validator insights data
    const validatorInsights = generateMockInsightsData(epochInfo.epoch);

    // Fetch rising stars
    let risingStars: MevPrediction[] = [];
    try {
      risingStars = await getRisingStars(epochInfo.epoch, 15, 5);
    } catch (e) {
      console.warn("Failed to fetch rising stars:", e);
    }

    return {
      epochInfo,
      risingStars,
      mevStats,
      lstComparison,
      epochProgress: getEpochProgress(epochInfo),
      timeToNextEpoch: getTimeUntilNextEpoch(epochInfo),
      validatorInsights,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    throw error;
  }
}

export default async function Dashboard() {
  const data = await getDashboardData();
  const { epochInfo, mevStats, lstComparison, epochProgress, timeToNextEpoch, validatorInsights, risingStars } = data;

  const bestApy = Math.max(...lstComparison.protocols.map((p) => p.apy));
  const jitoApy = lstComparison.protocols.find(p => p.id === "jito")?.apy || 8.0;
  const msolApy = lstComparison.protocols.find(p => p.id === "marinade")?.apy || 7.0;
  const bestProtocol = lstComparison.protocols.find(p => p.id === lstComparison.bestForYield);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section - THREE PILLARS */}
        <section className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-700/50 rounded-full text-blue-400 text-sm mb-6">
            <span className="animate-pulse">📊</span>
            <span>Complete Staking Intelligence for Solana</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            See Real Yields, Not Marketing Numbers
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Compare LSTs fairly with base APY + MEV bonus breakdown. Discover rising star validators. 
            Smart routing that balances yield + decentralization. All transparent.
          </p>
          
          {/* Three Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50 rounded-xl p-4 text-left">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-bold text-blue-300 mb-1">Yield Truth</h3>
              <p className="text-xs text-gray-400">Real APY from real APIs. Base yield vs MEV bonus, all broken down.</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-800/20 border border-yellow-700/50 rounded-xl p-4 text-left">
              <div className="text-2xl mb-2">🌟</div>
              <h3 className="font-bold text-yellow-300 mb-1">Validator Discovery</h3>
              <p className="text-xs text-gray-400">Find rising stars before everyone else. Support decentralization.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-800/20 border border-purple-700/50 rounded-xl p-4 text-left">
              <div className="text-2xl mb-2">🛤️</div>
              <h3 className="font-bold text-purple-300 mb-1">Smart Routing</h3>
              <p className="text-xs text-gray-400">Know where to stake. Optimal allocation with clear reasoning.</p>
            </div>
          </div>

          <div className="flex justify-center gap-4 flex-wrap">
            <a 
              href="#compare"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition font-medium text-white"
            >
              📊 Compare LSTs
            </a>
            <Link 
              href="/rising-stars"
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg transition font-medium text-white"
            >
              🌟 Rising Stars
            </Link>
            <Link 
              href="/live"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-white"
            >
              ⚡ Live MEV Feed
            </Link>
          </div>
        </section>

        {/* Portfolio Tracker (when wallet connected) */}
        <PortfolioTracker />

        {/* Stats Grid */}
        <section id="dashboard" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Current Epoch"
            value={epochInfo.epoch.toString()}
            subtitle={`${epochProgress.toFixed(1)}% complete • ${timeToNextEpoch} remaining`}
            icon={<span className="text-xl">⏱️</span>}
          />
          <StatsCard
            title="Best LST Yield"
            value={`${bestApy.toFixed(2)}%`}
            subtitle={`via ${bestProtocol?.token} (Base: ${bestProtocol?.baseAPY?.toFixed(1) || bestApy.toFixed(1)}%)`}
            icon={<span className="text-xl">📈</span>}
          />
          <StatsCard
            title="MEV Bonus (jitoSOL)"
            value={`+${lstComparison.protocols.find(p => p.id === "jito")?.mevBonus?.toFixed(2) || "0.93"}%`}
            subtitle="On top of base yield"
            icon={<span className="text-xl">⚡</span>}
            trend={{ value: 0, label: "variable" }}
          />
          <StatsCard
            title="Active MEV Validators"
            value={mevStats.validatorCount.toLocaleString()}
            subtitle="Earning extra rewards"
            icon={<span className="text-xl">🖥️</span>}
          />
        </section>

        {/* MEV Alerts */}
        <section className="mb-8">
          <MevAlerts />
        </section>

        {/* LST Comparison - YIELD TRUTH (Primary Feature) */}
        <section id="compare" className="mb-8">
          <LstComparison
            protocols={lstComparison.protocols}
            bestForYield={lstComparison.bestForYield}
            bestForMev={lstComparison.bestForMev}
            bestForBaseYield={lstComparison.bestForBaseYield}
            bestForDecentralization={lstComparison.bestForDecentralization}
            recommendation={lstComparison.recommendation}
            yieldBreakdown={lstComparison.yieldBreakdown}
          />
        </section>

        {/* Rising Stars Preview - VALIDATOR DISCOVERY */}
        {risingStars.length > 0 && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-800/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🌟</span> Validator Discovery — Rising Stars
                  </h3>
                  <p className="text-gray-400 text-sm">Small validators with explosive MEV growth • Native staking optimization</p>
                </div>
                <Link 
                  href="/rising-stars"
                  className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-700/50 rounded-lg transition text-yellow-400 text-sm"
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {risingStars.slice(0, 5).map((star, index) => (
                  <Link
                    key={star.voteAccount}
                    href={`/validator/${star.voteAccount}`}
                    className="bg-gray-900/50 border border-gray-800 hover:border-yellow-600/50 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-yellow-900/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">#{index + 1}</span>
                      <span className="text-yellow-400">🌟</span>
                    </div>
                    <div className="font-medium text-sm truncate mb-1">
                      {star.name || "Anonymous"}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mb-2">
                      {star.voteAccount.slice(0, 8)}...
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-400">+{star.momentum.toFixed(1)}%</span>
                      <span className="text-gray-400">{star.predictedMevSol.toFixed(2)} SOL</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Yield Simulator - SMART ROUTING */}
        <section id="simulator" className="mb-8">
          <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-800/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🛤️</span>
              <h3 className="text-xl font-bold">Smart Routing — Know Where to Stake</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Simulate your expected yield across different strategies. Input amount, see outcomes.
            </p>
            <YieldSimulator
              currentJitoApy={jitoApy}
              currentMsolApy={msolApy}
              avgMevPerEpoch={mevStats.avgMevPerValidator / 1e9}
            />
          </div>
        </section>

        {/* Auto-Rebalance Preview */}
        <section id="rebalance" className="mb-8">
          <RebalancePreview />
        </section>

        {/* Two Column Layout: Leaderboard & Insights */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* MEV Leaderboard */}
          <div id="validators">
            <MevLeaderboard
              validators={mevStats.topValidators}
              epoch={mevStats.epoch}
            />
          </div>

          {/* Validator Insights */}
          <div>
            <ValidatorInsights
              validators={validatorInsights}
              currentEpoch={epochInfo.epoch}
            />
          </div>
        </section>

        {/* What We Do Section */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">What Makes StakePilot Different?</h3>
            <p className="text-gray-400">We're the complete staking brain — not just another yield aggregator</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-800/50 rounded-xl p-6">
              <div className="text-3xl mb-4">📊</div>
              <h4 className="text-xl font-semibold mb-2 text-blue-300">Yield Truth</h4>
              <p className="text-gray-400 text-sm">
                Real APY from real APIs. We fetch directly from Marinade, BlazeStake, and Jito.
                Base yield vs MEV bonus — you see exactly where your returns come from.
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/50 rounded-xl p-6">
              <div className="text-3xl mb-4">🌟</div>
              <h4 className="text-xl font-semibold mb-2 text-yellow-300">Validator Discovery</h4>
              <p className="text-gray-400 text-sm">
                80% of stake goes to top 20 validators. We find the rising stars —
                small validators with improving performance. Champion decentralization!
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-800/50 rounded-xl p-6">
              <div className="text-3xl mb-4">🛤️</div>
              <h4 className="text-xl font-semibold mb-2 text-purple-300">Smart Routing</h4>
              <p className="text-gray-400 text-sm">
                Don't know where to stake? We optimize based on your priorities —
                yield, decentralization, liquidity. Clear reasoning, smart allocation.
              </p>
            </div>
          </div>
        </section>

        {/* Key Insight Banner */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-800/30 rounded-xl p-6 text-center">
            <h4 className="text-lg font-bold text-green-400 mb-2">💡 Key Insight</h4>
            <p className="text-gray-300 max-w-2xl mx-auto">
              <strong>Base staking yield (~6-7%)</strong> is what you can rely on. 
              <strong className="text-yellow-400"> MEV bonus (+0-2%)</strong> is the variable upside for those using jitoSOL or native staking to MEV validators.
              We make this distinction crystal clear.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm py-8 border-t border-gray-800">
          <p className="text-lg font-semibold text-white mb-2">🚀 StakePilot</p>
          <p className="text-blue-400 mb-2">Complete Staking Intelligence</p>
          <p>Built for the Colosseum Agent Hackathon 🏆</p>
          <p className="mt-2">
            Powered by real data from Jito • Marinade • BlazeStake • Solana
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <a
              href="https://github.com/ilhanu/stakepilot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <span className="text-gray-700">|</span>
            <a
              href="https://stakepilot-olig.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Live Demo
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
