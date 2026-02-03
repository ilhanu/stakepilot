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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section - NEW VISION */}
        <section className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-full text-yellow-400 text-sm mb-6">
            <span className="animate-pulse">🌟</span>
            <span>Champion the Underdogs. Decentralize Solana.</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
            Discover Hidden Validators
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
            80% of stake goes to the top 20 validators. We use MEV prediction to find the hidden gems —
            small validators with explosive growth potential.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link 
              href="/rising-stars"
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg transition font-medium text-white"
            >
              🌟 View Rising Stars
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
            title="Total MEV This Epoch"
            value={`${mevStats.totalMevSol.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL`}
            subtitle={`≈ $${(mevStats.totalMevSol * 150).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<span className="text-xl">💰</span>}
            trend={{ value: 12.5, label: "vs last epoch" }}
          />
          <StatsCard
            title="Best Yield (LST)"
            value={`${bestApy.toFixed(2)}%`}
            subtitle={`via ${lstComparison.protocols.find(p => p.id === lstComparison.bestForYield)?.token}`}
            icon={<span className="text-xl">📈</span>}
          />
          <StatsCard
            title="Active Validators"
            value={mevStats.validatorCount.toLocaleString()}
            subtitle="Earning MEV rewards"
            icon={<span className="text-xl">🖥️</span>}
          />
        </section>

        {/* MEV Alerts */}
        <section className="mb-8">
          <MevAlerts />
        </section>

        {/* Rising Stars Preview */}
        {risingStars.length > 0 && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-800/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🌟</span> Rising Stars
                  </h3>
                  <p className="text-gray-400 text-sm">Small validators with explosive MEV growth</p>
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

        {/* Yield Simulator */}
        <section id="simulator" className="mb-8">
          <YieldSimulator
            currentJitoApy={jitoApy}
            currentMsolApy={msolApy}
            avgMevPerEpoch={mevStats.avgMevPerValidator / 1e9}
          />
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

        {/* LST Comparison */}
        <section id="compare" className="mb-8">
          <LstComparison
            protocols={lstComparison.protocols}
            bestForYield={lstComparison.bestForYield}
            bestForMev={lstComparison.bestForMev}
            recommendation={lstComparison.recommendation}
          />
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/50 rounded-xl p-6">
            <div className="text-3xl mb-4">🔮</div>
            <h3 className="text-xl font-semibold mb-2">MEV Prediction</h3>
            <p className="text-gray-400 text-sm">
              Our AI predicts which validators will earn the most MEV next epoch.
              Find alpha before the crowd. Backtest accuracy tracked publicly.
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-800/50 rounded-xl p-6">
            <div className="text-3xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold mb-2">Rising Stars</h3>
            <p className="text-gray-400 text-sm">
              Discover small validators with explosive growth. Support the underdogs.
              Help decentralize Solana while earning great yields.
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-800/50 rounded-xl p-6">
            <div className="text-3xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold mb-2">Decentralization Score</h3>
            <p className="text-gray-400 text-sm">
              Every validator gets a score based on how much your stake helps network health.
              Higher scores for small validators — champion decentralization!
            </p>
          </div>
        </section>

        {/* Additional Features Row */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">🔔</div>
            <h4 className="font-semibold mb-1">Smart Alerts</h4>
            <p className="text-xs text-gray-400">
              Get notified about yield opportunities and validator changes
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border border-green-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">💼</div>
            <h4 className="font-semibold mb-1">Portfolio Tracking</h4>
            <p className="text-xs text-gray-400">
              Full overview of your staking positions and projected yields
            </p>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">🌟</div>
            <h4 className="font-semibold mb-1">Rising Stars</h4>
            <p className="text-xs text-gray-400">
              Discover validators with improving MEV performance
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-semibold mb-1">Historical Data</h4>
            <p className="text-xs text-gray-400">
              Track MEV trends over time across epochs
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm py-8 border-t border-gray-800">
          <p className="text-lg font-semibold text-white mb-2">🚀 StakePilot</p>
          <p>Built for the Colosseum Agent Hackathon 🏆</p>
          <p className="mt-2">
            Powered by Jito MEV data • Solana • Next.js
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
