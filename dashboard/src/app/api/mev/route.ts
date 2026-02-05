export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getMevStats } from "@/lib/jito";
import { getCurrentEpoch } from "@/lib/solana";

export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const epochParam = searchParams.get("epoch");

    const currentEpoch = await getCurrentEpoch();
    const epoch = epochParam ? parseInt(epochParam) : currentEpoch;

    const mevStats = await getMevStats(epoch);

    // Get historical data for last 5 epochs
    const historicalData = [];
    for (let e = epoch - 4; e <= epoch; e++) {
      try {
        const stats = await getMevStats(e);
        historicalData.push({
          epoch: e,
          totalMev: stats.totalMevSol,
          validatorCount: stats.validatorCount,
        });
      } catch {
        // Skip epochs with no data
      }
    }

    return NextResponse.json({
      currentEpoch: epoch,
      totalMev: mevStats.totalMev,
      totalMevSol: mevStats.totalMevSol,
      validatorCount: mevStats.validatorCount,
      avgMevPerValidator: mevStats.avgMevPerValidator,
      topValidator: mevStats.topValidators[0] || null,
      history: historicalData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching MEV stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch MEV stats" },
      { status: 500 }
    );
  }
}
