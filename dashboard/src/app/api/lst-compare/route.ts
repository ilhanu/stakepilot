import { NextResponse } from "next/server";
import { getLstComparison, calculateSmartRoute, type StakeRouteInput } from "@/lib/lst-data";

export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const comparison = await getLstComparison();

    return NextResponse.json({
      protocols: comparison.protocols,
      historical: comparison.historical,
      bestForYield: comparison.bestForYield,
      bestForBaseYield: comparison.bestForBaseYield,
      bestForLiquidity: comparison.bestForLiquidity,
      bestForDecentralization: comparison.bestForDecentralization,
      recommendation: comparison.recommendation,
      yieldBreakdown: comparison.yieldBreakdown,
      lastUpdated: comparison.lastUpdated,
    });
  } catch (error) {
    console.error("Error fetching LST comparison:", error);
    return NextResponse.json(
      { error: "Failed to fetch LST comparison" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input: StakeRouteInput = {
      amount: body.amount || 100,
      riskTolerance: body.riskTolerance || 'medium',
      decentralizationPriority: body.decentralizationPriority || 'medium',
      liquidityNeed: body.liquidityNeed || 'medium',
    };

    const lstData = await getLstComparison();
    const route = await calculateSmartRoute(input, lstData);

    return NextResponse.json({
      route,
      lstData: lstData.protocols,
    });
  } catch (error) {
    console.error("Error calculating stake route:", error);
    return NextResponse.json(
      { error: "Failed to calculate stake route" },
      { status: 500 }
    );
  }
}
