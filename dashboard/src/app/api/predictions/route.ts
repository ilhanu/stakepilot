import { NextResponse } from "next/server";
import { generatePredictions, getRisingStars, backtestPredictions } from "@/lib/mev-prediction";
import { getCurrentEpoch } from "@/lib/solana";

export const revalidate = 600; // Cache for 10 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // all | rising-stars | backtest | viable
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 50;
    const hideHighCommission = searchParams.get("hideHighCommission") === "true";
    const minNetApy = parseFloat(searchParams.get("minNetApy") || "0");

    const currentEpoch = await getCurrentEpoch();

    if (type === "rising-stars") {
      const risingStars = await getRisingStars(currentEpoch, 15, limit);
      
      return NextResponse.json({
        currentEpoch,
        type: "rising-stars",
        count: risingStars.length,
        validators: risingStars,
        // Summary stats for rising stars
        avgNetApy: risingStars.length > 0 
          ? risingStars.reduce((sum, v) => sum + v.netTotalApy, 0) / risingStars.length 
          : 0,
        note: "All rising stars are filtered for staker viability (commission < 50%, net APY >= 5%)",
        updatedAt: new Date().toISOString(),
      });
    }

    if (type === "backtest") {
      const backtest = await backtestPredictions(currentEpoch, 5);
      
      return NextResponse.json({
        currentEpoch,
        type: "backtest",
        accuracy: backtest.accuracy,
        details: backtest.details,
        updatedAt: new Date().toISOString(),
      });
    }

    // Default: all predictions
    const { predictions, stats } = await generatePredictions(currentEpoch, 15);
    
    // Apply filters
    let filteredPredictions = predictions;
    
    if (hideHighCommission) {
      filteredPredictions = filteredPredictions.filter(p => p.isViable);
    }
    
    if (minNetApy > 0) {
      filteredPredictions = filteredPredictions.filter(p => p.netTotalApy >= minNetApy);
    }
    
    // Apply limit
    const limitedPredictions = filteredPredictions.slice(0, limit);
    
    // Calculate commission stats
    const viableCount = predictions.filter(p => p.isViable).length;
    const highCommissionCount = predictions.filter(p => p.mevCommission >= 10000).length;
    const avgNetApy = viableCount > 0
      ? predictions.filter(p => p.isViable).reduce((sum, p) => sum + p.netTotalApy, 0) / viableCount
      : 0;

    return NextResponse.json({
      currentEpoch,
      type: "predictions",
      stats: {
        ...stats,
        // Commission-aware stats
        viableValidators: viableCount,
        highCommissionValidators: highCommissionCount,
        avgNetApyViable: avgNetApy,
      },
      predictions: limitedPredictions,
      filters: {
        hideHighCommission,
        minNetApy,
        applied: hideHighCommission || minNetApy > 0,
        originalCount: predictions.length,
        filteredCount: limitedPredictions.length,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating predictions:", error);
    return NextResponse.json(
      { error: "Failed to generate predictions", details: String(error) },
      { status: 500 }
    );
  }
}
