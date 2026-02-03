import { NextResponse } from "next/server";
import { generatePredictions, MevPrediction } from "@/lib/mev-prediction";
import { getCurrentEpoch } from "@/lib/solana";

export const revalidate = 600;

interface RouteInput {
  amountSol: number;
  riskTolerance: "low" | "medium" | "high"; // low = conservative, high = aggressive
  decentralizationPreference: "none" | "moderate" | "strong"; // how much to prioritize small validators
  maxValidators?: number;
}

interface ValidatorAllocation {
  voteAccount: string;
  name: string | null;
  allocationSol: number;
  allocationPercent: number;
  predictedMevSol: number;
  expectedYieldPercent: number;
  decentralizationScore: number;
  isRisingStar: boolean;
  reason: string;
}

interface RouteResult {
  input: RouteInput;
  allocations: ValidatorAllocation[];
  summary: {
    totalAllocated: number;
    expectedTotalMev: number;
    expectedYieldPercent: number;
    avgDecentralizationScore: number;
    risingStarsCount: number;
    diversificationScore: number;
  };
  warnings: string[];
}

// Score a validator based on user preferences
function scoreValidator(
  validator: MevPrediction,
  riskTolerance: string,
  decentralizationPreference: string
): number {
  let score = 0;
  
  // Base score: predicted MEV (normalized)
  score += validator.predictedMevSol * 10;
  
  // Confidence factor
  const confidenceMultiplier = 0.5 + (validator.confidence / 100) * 0.5;
  score *= confidenceMultiplier;
  
  // Risk adjustment
  if (riskTolerance === "low") {
    // Prefer stable validators with lower volatility
    score *= (1 - validator.volatility / 200);
    // Bonus for higher confidence
    score *= (0.8 + (validator.confidence / 100) * 0.4);
  } else if (riskTolerance === "high") {
    // Prefer rising validators even if volatile
    if (validator.trend === "rising") {
      score *= 1.5;
    }
    // Bonus for rising stars (potential alpha)
    if (validator.isRisingStar) {
      score *= 1.3;
    }
  }
  
  // Decentralization adjustment
  if (decentralizationPreference === "strong") {
    // Heavy bonus for small validators
    score *= (0.5 + (validator.decentralizationScore / 100) * 1.0);
    // Extra bonus for rising stars
    if (validator.isRisingStar) {
      score *= 1.5;
    }
  } else if (decentralizationPreference === "moderate") {
    // Moderate bonus
    score *= (0.7 + (validator.decentralizationScore / 100) * 0.6);
  }
  
  // Penalty for very low MEV efficiency
  if (validator.mevEfficiency < 0.001) {
    score *= 0.5;
  }
  
  return score;
}

// Determine allocation reason
function getAllocationReason(
  validator: MevPrediction,
  rank: number,
  decentralizationPreference: string
): string {
  const reasons: string[] = [];
  
  if (rank <= 3) {
    reasons.push("Top predicted MEV");
  }
  
  if (validator.isRisingStar) {
    reasons.push("Rising Star 🌟");
  }
  
  if (validator.trend === "rising" && validator.trendStrength > 30) {
    reasons.push("Strong upward trend");
  }
  
  if (validator.decentralizationScore > 80 && decentralizationPreference !== "none") {
    reasons.push("Helps decentralization");
  }
  
  if (validator.confidence > 80) {
    reasons.push("High confidence prediction");
  }
  
  if (validator.mevEfficiency > 0.01) {
    reasons.push("High MEV efficiency");
  }
  
  return reasons.length > 0 ? reasons.join(", ") : "Balanced choice";
}

export async function POST(request: Request) {
  try {
    const body: RouteInput = await request.json();
    
    const {
      amountSol,
      riskTolerance = "medium",
      decentralizationPreference = "moderate",
      maxValidators = 5,
    } = body;

    if (!amountSol || amountSol <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const currentEpoch = await getCurrentEpoch();
    const { predictions } = await generatePredictions(currentEpoch, 15);
    
    // Filter out validators with too little data or zero MEV
    const eligibleValidators = predictions.filter(
      p => p.epochsAnalyzed >= 5 && p.predictedMevSol > 0
    );

    if (eligibleValidators.length === 0) {
      return NextResponse.json(
        { error: "No eligible validators found" },
        { status: 404 }
      );
    }

    // Score and sort validators
    const scored = eligibleValidators.map(v => ({
      validator: v,
      score: scoreValidator(v, riskTolerance, decentralizationPreference),
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    // Select top validators
    const selectedValidators = scored.slice(0, maxValidators);
    
    // Calculate allocation weights
    const totalScore = selectedValidators.reduce((sum, s) => sum + s.score, 0);
    
    const allocations: ValidatorAllocation[] = selectedValidators.map((s, i) => {
      const weight = s.score / totalScore;
      const allocationSol = amountSol * weight;
      
      // Estimate expected yield (simplified: assume MEV is proportional to stake)
      const expectedMev = s.validator.predictedMevSol * (allocationSol / s.validator.stakeSol);
      const expectedYield = allocationSol > 0 ? (expectedMev / allocationSol) * 100 : 0;
      
      return {
        voteAccount: s.validator.voteAccount,
        name: s.validator.name,
        allocationSol,
        allocationPercent: weight * 100,
        predictedMevSol: expectedMev,
        expectedYieldPercent: expectedYield,
        decentralizationScore: s.validator.decentralizationScore,
        isRisingStar: s.validator.isRisingStar,
        reason: getAllocationReason(s.validator, i + 1, decentralizationPreference),
      };
    });

    // Calculate summary stats
    const totalMev = allocations.reduce((sum, a) => sum + a.predictedMevSol, 0);
    const avgDecentralization = allocations.reduce((sum, a) => sum + a.decentralizationScore * a.allocationPercent, 0) / 100;
    const risingStarsCount = allocations.filter(a => a.isRisingStar).length;
    
    // Diversification: how evenly spread across validators (HHI inverse)
    const hhi = allocations.reduce((sum, a) => sum + Math.pow(a.allocationPercent / 100, 2), 0);
    const diversificationScore = Math.min(100, (1 - hhi) * 100 * 1.5);

    const warnings: string[] = [];
    
    if (allocations.length < 3) {
      warnings.push("Limited validator options available. Consider increasing risk tolerance.");
    }
    
    if (avgDecentralization < 50 && decentralizationPreference !== "none") {
      warnings.push("Allocation is concentrated in large validators. Consider 'strong' decentralization preference.");
    }
    
    if (risingStarsCount === 0 && decentralizationPreference === "strong") {
      warnings.push("No Rising Stars in current allocation. This epoch may lack small validators with strong momentum.");
    }

    const result: RouteResult = {
      input: { amountSol, riskTolerance, decentralizationPreference, maxValidators },
      allocations,
      summary: {
        totalAllocated: amountSol,
        expectedTotalMev: totalMev,
        expectedYieldPercent: amountSol > 0 ? (totalMev / amountSol) * 100 : 0,
        avgDecentralizationScore: avgDecentralization,
        risingStarsCount,
        diversificationScore,
      },
      warnings,
    };

    return NextResponse.json({
      currentEpoch,
      route: result,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error routing stake:", error);
    return NextResponse.json(
      { error: "Failed to calculate stake route", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to route stake",
    example: {
      amountSol: 100,
      riskTolerance: "medium",
      decentralizationPreference: "moderate",
      maxValidators: 5,
    },
  });
}
