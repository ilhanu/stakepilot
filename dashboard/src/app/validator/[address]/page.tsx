import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getValidatorRewards, getBamValidators } from "@/lib/jito";
import { getCurrentEpoch, getEpochInfo } from "@/lib/solana";
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

  const { name, stake, epochData, stats, epochInfo } = data;

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
              🔷
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {name || "Unknown Validator"}
              </h1>
              <p className="text-gray-400 font-mono">{address}</p>
            </div>
          </div>
        </div>

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
                        <td className="py-3 px-2 text-right text-gray-400">
                          {epoch.mevCommission}%
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
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: ValidatorPageProps) {
  const { address } = await params;
  return {
    title: `Validator ${truncateAddress(address, 6)} - StakePilot`,
    description: `View MEV performance and history for Solana validator ${address}`,
  };
}
