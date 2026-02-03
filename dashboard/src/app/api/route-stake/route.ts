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
  // NEW: Stake-weight context
  totalStakeSol: number;      // Validator's total stake
  stakeRank: string;          // "small", "medium", "large", "whale"
  mevDilution: string;        // Explanation of stake-weight impact
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
  // CRITICAL: Use NET APY as primary score (already stake-weight adjusted!)
  // Smaller validators naturally score higher because their APY is higher
  let score = validator.netTotalApy * 10;
  
  // Confidence factor
  const confidenceMultiplier = 0.5 + (validator.confidence / 100) * 0.5;
  score *= confidenceMultiplier;
  
  // Stake-size adjustment (penalize whales, reward small validators)
  const stakeSol = validator.stakeSol;
  if (stakeSol > 1000000) {
    // Whale validator - heavy penalty (MEV very diluted)
    score *= 0.4;
  } else if (stakeSol > 500000) {
    // Large validator
    score *= 0.6;
  } else if (stakeSol > 200000) {
    // Medium-large
    score *= 0.8;
  } else if (stakeSol < 50000) {
    // Small validator - bonus (MEV concentrated)
    score *= 1.3;
  }
  
  // Risk adjustment
  if (riskTolerance === "low") {
    // Prefer stable validators with lower volatility
    score *= (1 - validator.volatility / 200);
    // Bonus for higher confidence
    score *= (0.8 + (validator.confidence / 100) * 0.4);
    // Prefer larger, established validators
    if (stakeSol > 200000) {
      score *= 1.2;
    }
  } else if (riskTolerance === "high") {
    // Prefer rising validators even if volatile
    if (validator.trend === "rising") {
      score *= 1.5;
    }
    // BIG bonus for rising stars (potential alpha)
    if (validator.isRisingStar) {
      score *= 2.0; // Doubled - these are the alpha!
    }
    // Penalty for whale validators (no alpha there)
    if (stakeSol > 500000) {
      score *= 0.5;
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
    // Heavy penalty for whale validators
    if (stakeSol > 500000) {
      score *= 0.3;
    }
  } else if (decentralizationPreference === "moderate") {
    // Moderate bonus
    score *= (0.7 + (validator.decentralizationScore / 100) * 0.6);
  }
  
  // Penalty for very low MEV efficiency
  if (validator.mevEfficiency < 0.001) {
    score *= 0.5;
  }
  
  // Viability check - non-viable validators get heavily penalized
  if (!validator.isViable) {
    score *= 0.1;
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
      const stakeSol = s.validator.stakeSol;
      
      // Use the NET APY from our predictions (what stakers actually earn)
      // This is already STAKE-WEIGHT ADJUSTED - smaller validators have higher APY
      const expectedYield = s.validator.netTotalApy || 7.0;
      
      // Estimate expected MEV contribution based on allocation
      const epochsPerYear = 73;
      const expectedMev = stakeSol > 0 
        ? (allocationSol / stakeSol) * s.validator.predictedMevSol * epochsPerYear
        : s.validator.predictedMevSol > 0 
          ? (allocationSol / 1000) * (s.validator.netMevApy / 100)
          : 0;
      
      // Determine stake rank (for context)
      let stakeRank: string;
      let mevDilution: string;
      if (stakeSol < 50000) {
        stakeRank = "small";
        mevDilution = "Low dilution - MEV rewards concentrated among fewer stakers";
      } else if (stakeSol < 200000) {
        stakeRank = "medium";
        mevDilution = "Moderate dilution - balanced MEV distribution";
      } else if (stakeSol < 1000000) {
        stakeRank = "large";
        mevDilution = "Higher dilution - MEV spread across many stakers";
      } else {
        stakeRank = "whale";
        mevDilution = "Maximum dilution - MEV heavily diluted across massive stake";
      }
      
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
        totalStakeSol: stakeSol,
        stakeRank,
        mevDilution,
      };
    });

    // Calculate summary stats
    const totalMev = allocations.reduce((sum, a) => sum + a.predictedMevSol, 0);
    const avgDecentralization = allocations.reduce((sum, a) => sum + a.decentralizationScore * a.allocationPercent, 0) / 100;
    const risingStarsCount = allocations.filter(a => a.isRisingStar).length;
    
    // Weighted average yield
    const weightedYield = allocations.reduce((sum, a) => sum + a.expectedYieldPercent * a.allocationPercent, 0) / 100;
    
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
        expectedYieldPercent: weightedYield,
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
