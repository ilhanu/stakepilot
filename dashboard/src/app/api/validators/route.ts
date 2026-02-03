import { NextResponse } from "next/server";
import { getMevStats } from "@/lib/jito";
import { getCurrentEpoch } from "@/lib/solana";

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const currentEpoch = await getCurrentEpoch();
    const mevStats = await getMevStats(currentEpoch);

    // If no data for current epoch, try previous
    let stats = mevStats;
    if (stats.validatorCount === 0) {
      stats = await getMevStats(currentEpoch - 1);
    }

    // Calculate scores for each validator
    const scoredValidators = stats.topValidators.map((v, index) => {
      const mevScore = Math.max(0, 100 - index * 5); // Top gets 100
      const mevPerStake =
        v.stake > 0 ? (v.mevRevenue / v.stake) * 1_000_000 : 0;

      // Estimate APY (simplified)
      const baseApy = 6.5;
      const mevApy = mevPerStake * 0.1; // Rough estimate
      const totalApy = baseApy + mevApy;

      return {
        voteAccount: v.voteAccount,
        name: v.name,
        mevScore,
        totalScore: mevScore,
        mevApy: Math.min(mevApy, 3), // Cap at 3%
        baseApy,
        totalApy: Math.min(totalApy, 10), // Cap at 10%
        mevRevenue: v.mevRevenue,
        mevRevenueSol: v.mevRevenueSol,
        stake: v.stake,
        riskLevel: mevScore > 80 ? "low" : mevScore > 50 ? "medium" : "high",
        recommendation:
          mevScore > 80
            ? "strong-stake"
            : mevScore > 60
            ? "stake"
            : mevScore > 40
            ? "hold"
            : "avoid",
      };
    });

    return NextResponse.json({
      validators: scoredValidators,
      epoch: stats.epoch,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching validators:", error);
    return NextResponse.json(
      { error: "Failed to fetch validators" },
      { status: 500 }
    );
  }
}
