import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getValidatorRewards, getBamValidators } from "@/lib/jito";
import { getCurrentEpoch, getEpochInfo } from "@/lib/solana";
import { generatePredictions, MevPrediction } from "@/lib/mev-prediction";
import { truncateAddress, formatSol } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;

interface ValidatorPageProps {
  params: Promise<{ address: string }>;
}

interface EpochData {
  epoch: number;
  mevRevenue: number;
  mevRevenueSol: number;
  priorityFeeRevenue: number;
  mevCommission: number;
}

async function getValidatorDetails(address: string) {
  const currentEpoch = await getCurrentEpoch();
  const epochInfo = await getEpochInfo();

  // Fetch prediction data for this validator
  let prediction: MevPrediction | null = null;
  try {
    const { predictions } = await generatePredictions(currentEpoch, 15);
    prediction = predictions.find(p => p.voteAccount === address) || null;
  } catch (e) {
    console.warn("Failed to get prediction for validator:", e);
  }

  // Fetch data for last 10 epochs
  const epochsToFetch = Array.from(
    { length: 10 },
    (_, i) => currentEpoch - i
  );

  const epochData: EpochData[] = [];
  let validatorName: string | null = null;
  let currentStake = 0;

  for (const epoch of epochsToFetch) {
    try {
      const [rewards, bamValidators] = await Promise.all([
        getValidatorRewards(epoch),
        getBamValidators(epoch),
      ]);

      const validatorReward = rewards.find(
        (r) => r.vote_account === address
      );
      const bamValidator = bamValidators.find(
        (v) => v.vote_account === address
      );

      if (bamValidator && !validatorName) {
        validatorName = bamValidator.name;
        currentStake = bamValidator.active_stake;
      }

      if (validatorReward) {
        epochData.push({
          epoch,
          mevRevenue: validatorReward.mev_revenue,
          mevRevenueSol: validatorReward.mev_revenue / 1e9,
          priorityFeeRevenue: validatorReward.priority_fee_revenue,
          mevCommission: validatorReward.mev_commission,
        });
      }
    } catch (e) {
      // Skip epochs with errors
    }
  }

  if (epochData.length === 0) {
    return null;
  }

  // Calculate stats
  const totalMev = epochData.reduce((sum, e) => sum + e.mevRevenue, 0);
  const avgMevPerEpoch = totalMev / epochData.length;
  const maxMev = Math.max(...epochData.map((e) => e.mevRevenue));
  const minMev = Math.min(...epochData.map((e) => e.mevRevenue));

  // Calculate trend
  const recentAvg =
    epochData.slice(0, 3).reduce((sum, e) => sum + e.mevRevenue, 0) / 3;
  const olderAvg =
    epochData.slice(3, 6).reduce((sum, e) => sum + e.mevRevenue, 0) /
    Math.min(3, epochData.slice(3, 6).length || 1);
  const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  return {
    address,
    name: validatorName,
    stake: currentStake,
    currentEpoch,
    epochInfo,
    epochData: epochData.sort((a, b) => b.epoch - a.epoch),
    prediction,
    stats: {
      totalMev,
      totalMevSol: totalMev / 1e9,
      avgMevPerEpoch,
      avgMevPerEpochSol: avgMevPerEpoch / 1e9,
      maxMev,
      maxMevSol: maxMev / 1e9,
      minMev,
      minMevSol: minMev / 1e9,
      epochCount: epochData.length,
      trend,
    },
  };
}

export default async function ValidatorPage({ params }: ValidatorPageProps) {
  const { address } = await params;
  const data = await getValidatorDetails(address);

  if (!data) {
    notFound();
  }

  const { name, stake, epochData, stats, epochInfo, prediction } = data;

  // Calculate score
  let score = 50; // Base score
  if (stats.trend > 10) score += 20;
  else if (stats.trend > 0) score += 10;
  else if (stats.trend < -10) score -= 20;
  else if (stats.trend < 0) score -= 10;

  if (stats.avgMevPerEpochSol > 10) score += 30;
  else if (stats.avgMevPerEpochSol > 5) score += 20;
  else if (stats.avgMevPerEpochSol > 1) score += 10;

  score = Math.min(100, Math.max(0, score));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          ← Back to Dashboard
        </Link>

        {/* Validator Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl">
              {prediction?.isRisingStar ? "🌟" : "🔷"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">
                  {name || "Unknown Validator"}
                </h1>
                {prediction?.isRisingStar && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                    🌟 Rising Star
                  </Badge>
                )}
                {prediction && prediction.decentralizationScore > 80 && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                    🌐 Decentralization Hero
                  </Badge>
                )}
              </div>
              <p className="text-gray-400 font-mono">{address}</p>
            </div>
          </div>
        </div>

        {/* NET YIELD BANNER - What stakers actually earn */}
        {prediction && (
          <div className={`mb-8 p-6 rounded-xl border ${
            !prediction.isViable
              ? "bg-gradient-to-r from-red-900/30 to-orange-900/30 border-red-700/50"
              : prediction.isRisingStar 
                ? "bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-700/50" 
                : "bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50"
          }`}>
            {/* Commission Warning */}
            {prediction.commissionWarning && (
              <div className={`mb-4 p-3 rounded-lg ${
                prediction.mevCommission >= 10000 
                  ? "bg-red-900/50 border border-red-700 text-red-300"
                  : "bg-yellow-900/50 border border-yellow-700 text-yellow-300"
              }`}>
                {prediction.commissionWarning}
              </div>
            )}
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <span>💰</span> Your Expected Returns
                </h3>
                <p className="text-sm text-gray-400">
                  Net APY after {prediction.stakeCommission}% stake / {(prediction.mevCommission/100).toFixed(0)}% MEV commissions
                </p>
              </div>
              <div className="flex items-center gap-6">
                {/* NET TOTAL APY - Most prominent */}
                <div className="text-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg">
                  <div className="text-3xl font-bold text-white">
                    {prediction.netTotalApy.toFixed(1)}%
                  </div>
                  <div className="text-xs text-green-100">Net APY (You Earn)</div>
                </div>
                
                {/* Breakdown */}
                <div className="text-center border-l border-gray-700 pl-4">
                  <div className="text-sm text-blue-400">
                    {prediction.netBaseApy.toFixed(1)}% base
                  </div>
                  <div className="text-sm text-green-400">
                    +{prediction.netMevApy.toFixed(1)}% MEV
                  </div>
                  <div className="text-xs text-gray-500">Net yields</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    prediction.trend === "rising" ? "text-green-400" : 
                    prediction.trend === "falling" ? "text-red-400" : "text-gray-400"
                  }`}>
                    {prediction.trend === "rising" ? "↑" : prediction.trend === "falling" ? "↓" : "→"}
                    {prediction.momentum.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Trend</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {prediction.decentralizationScore.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">Decentralization</div>
                </div>
              </div>
            </div>
            
            {/* Prediction row */}
            <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                <span>🔮 Predicted MEV next epoch: </span>
                <span className="text-green-400 font-medium">{prediction.predictedMevSol.toFixed(2)} SOL</span>
                <span className="text-gray-500"> (based on {prediction.epochsAnalyzed} epochs)</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Confidence: </span>
                <span className="text-blue-400">{prediction.confidence.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400">MEV Score</p>
              <p
                className={`text-3xl font-bold ${
                  score >= 70
                    ? "text-green-400"
                    : score >= 40
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {score}/100
              </p>
              <Badge
                variant={
                  score >= 70 ? "success" : score >= 40 ? "warning" : "secondary"
                }
                className="mt-2"
              >
                {score >= 70
                  ? "Strong Performer"
                  : score >= 40
                  ? "Average"
                  : "Low MEV"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400">Total MEV Earned</p>
              <p className="text-3xl font-bold text-green-400">
                {stats.totalMevSol.toFixed(2)} SOL
              </p>
              <p className="text-xs text-gray-500">
                Last {stats.epochCount} epochs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400">Avg MEV/Epoch</p>
              <p className="text-3xl font-bold">
                {stats.avgMevPerEpochSol.toFixed(2)} SOL
              </p>
              <p className="text-xs text-gray-500">
                ≈ ${(stats.avgMevPerEpochSol * 150).toFixed(0)}/epoch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400">Trend</p>
              <p
                className={`text-3xl font-bold ${
                  stats.trend >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {stats.trend >= 0 ? "↑" : "↓"} {Math.abs(stats.trend).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">vs previous epochs</p>
            </CardContent>
          </Card>
        </div>

        {/* Support This Validator CTA */}
        {prediction?.isRisingStar && prediction.isViable && (
          <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-800/50 text-center">
            <h3 className="text-xl font-bold mb-2">Champion This Rising Star!</h3>
            <p className="text-gray-400 mb-2">
              This small validator is showing strong MEV growth. Supporting them helps decentralize Solana.
            </p>
            <p className="text-green-400 font-medium mb-4">
              💰 Expected net yield: {prediction.netTotalApy.toFixed(1)}% APY to you
            </p>
            <div className="flex justify-center gap-4">
              <a
                href={`https://www.validators.app/validators/testnet/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg transition font-medium"
              >
                🚀 Stake with This Validator ({prediction.netTotalApy.toFixed(1)}% APY)
              </a>
              <a
                href={`https://validators.app/validators/${address}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                📊 View on validators.app
              </a>
            </div>
          </div>
        )}
        
        {/* Warning for non-viable validators */}
        {prediction && !prediction.isViable && (
          <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-800/50 text-center">
            <h3 className="text-xl font-bold mb-2 text-red-400">⚠️ High Commission Warning</h3>
            <p className="text-gray-400 mb-2">
              {prediction.commissionWarning || "This validator has very high commissions."}
            </p>
            <p className="text-red-300 text-sm">
              Consider validators with lower commissions for better staker returns.
            </p>
            <div className="mt-4">
              <Link
                href="/rising-stars"
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg transition font-medium"
              >
                🌟 Find Better Rising Stars
              </Link>
            </div>
          </div>
        )}

        {/* MEV History Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📈</span> MEV Revenue History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {epochData.map((epoch, index) => {
                const height =
                  (epoch.mevRevenueSol / stats.maxMevSol) * 100 || 5;
                return (
                  <div
                    key={epoch.epoch}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-md hover:from-blue-500 hover:to-purple-400 transition-colors cursor-pointer group relative"
                      style={{ height: `${height}%`, minHeight: "20px" }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {epoch.mevRevenueSol.toFixed(2)} SOL
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{epoch.epoch}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📊</span> Epoch Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">
                      Epoch
                    </th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                      MEV Revenue
                    </th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                      Priority Fees
                    </th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                      Commission
                    </th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {epochData.map((epoch) => {
                    const total =
                      epoch.mevRevenueSol +
                      epoch.priorityFeeRevenue / 1e9;
                    return (
                      <tr
                        key={epoch.epoch}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <Badge variant="outline">Epoch {epoch.epoch}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-green-400">
                          {epoch.mevRevenueSol.toFixed(4)} SOL
                        </td>
                        <td className="py-3 px-2 text-right text-gray-300">
                          {(epoch.priorityFeeRevenue / 1e9).toFixed(4)} SOL
                        </td>
                        <td className={`py-3 px-2 text-right ${
                          epoch.mevCommission >= 10000 
                            ? "text-red-400 font-medium" 
                            : epoch.mevCommission >= 5000 
                              ? "text-yellow-400" 
                              : "text-gray-400"
                        }`}>
                          {(epoch.mevCommission / 100).toFixed(0)}%
                          {epoch.mevCommission >= 10000 && " ⚠️"}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold">
                          {total.toFixed(4)} SOL
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Validator Info */}
        {stake > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">ℹ️</span> Validator Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Active Stake</p>
                  <p className="text-xl font-semibold">
                    {formatSol(stake)} SOL
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Vote Account</p>
                  <p className="text-sm font-mono text-gray-300">{address}</p>
                </div>
                {prediction && (
                  <>
                    <div>
                      <p className="text-sm text-gray-400">MEV Efficiency</p>
                      <p className="text-xl font-semibold">
                        {prediction.mevEfficiency.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500">MEV per 1000 SOL staked</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Volatility</p>
                      <p className="text-xl font-semibold">
                        {prediction.volatility.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {prediction.volatility < 30 ? "Low - Consistent" : 
                         prediction.volatility < 60 ? "Medium" : "High - Variable"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to Rising Stars */}
        <div className="mt-8 text-center">
          <Link
            href="/rising-stars"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            🌟 Discover More Rising Stars
          </Link>
        </div>
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: ValidatorPageProps) {
  const { address } = await params;
  return {
    title: `Validator ${truncateAddress(address, 6)} - StakePilot`,
    description: `View MEV performance and predictions for Solana validator ${address}`,
  };
}
