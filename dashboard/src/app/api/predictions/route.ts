import { NextResponse } from "next/server";
import { generatePredictions, getRisingStars, backtestPredictions } from "@/lib/mev-prediction";
import { getCurrentEpoch } from "@/lib/solana";

export const revalidate = 600; // Cache for 10 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // all | rising-stars | backtest
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 50;

    const currentEpoch = await getCurrentEpoch();

    if (type === "rising-stars") {
      const risingStars = await getRisingStars(currentEpoch, 15, limit);
      
      return NextResponse.json({
        currentEpoch,
        type: "rising-stars",
        count: risingStars.length,
        validators: risingStars,
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
    
    // Apply limit
    const limitedPredictions = predictions.slice(0, limit);

    return NextResponse.json({
      currentEpoch,
      type: "predictions",
      stats,
      predictions: limitedPredictions,
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
