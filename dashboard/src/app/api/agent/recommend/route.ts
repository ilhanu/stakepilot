import { NextRequest, NextResponse } from "next/server";
import { getFilteredValidators } from "@/lib/validators-app";

/**
 * Agent Recommendation API
 * 
 * Generates staking recommendations based on user's strategy parameters
 * and current validator data from validators.app (real data!)
 */

interface ValidatorData {
  voteAccount: string;
  name: string;
  netApy: number;
  commission: number;
  activatedStake: number;
  delinquent: boolean;
  datacenterConcentration: number;
  jito: boolean;
  qualityTier: string;
}

interface Recommendation {
  validator: string;
  validatorName: string;
  allocatedAmount: number;
  reason: string;
  expectedApy: number;
  qualityTier: string;
}

interface StakingDecision {
  recommendations: Recommendation[];
  totalToStake: number;
  strategyUsed: {
    riskTolerance: string;
    targetApy: number;
    maxValidators: number;
    preferDecentralization: boolean;
  };
  reasoning: string;
}

// Fetch validator data from validators.app
async function fetchValidators(): Promise<ValidatorData[]> {
  try {
    const validators = await getFilteredValidators({
      excludeDelinquent: true,
    });
    
    return validators.map((v) => ({
      voteAccount: v.vote_account,
      name: v.name || "Unknown",
      netApy: v.netTotalApy / 100, // Convert from percent to decimal
      commission: v.commission || 10,
      activatedStake: v.stakeSol || 0, // Already in SOL
      delinquent: v.delinquent || false,
      datacenterConcentration: 0.05, // Default - validators.app doesn't have this
      jito: v.jito || false,
      qualityTier: v.qualityTier || "Unknown",
    }));
  } catch (error) {
    console.error("Failed to fetch validators:", error);
    return [];
  }
}

// Core algorithm: generate staking decision
function generateStakingDecision(
  strategy: {
    riskTolerance: string;
    targetApy: number;
    maxValidators: number;
    preferDecentralization: boolean;
  },
  availableBalance: number,
  validators: ValidatorData[]
): StakingDecision {
  const recommendations: Recommendation[] = [];
  let reasoningParts: string[] = [];
  
  // Step 1: Already filtered delinquent in fetch
  let eligible = validators.filter(v => !v.delinquent);
  reasoningParts.push(`Starting with ${eligible.length} active validators`);
  
  // Step 2: Apply risk tolerance filter (by stake size)
  const riskFilters: Record<string, number> = {
    Low: 1_000_000,    // >1M SOL stake
    Medium: 100_000,   // >100K SOL stake  
    High: 0,           // No filter
  };
  
  const minStake = riskFilters[strategy.riskTolerance] || 100_000;
  const beforeRisk = eligible.length;
  eligible = eligible.filter(v => v.activatedStake >= minStake);
  reasoningParts.push(`Risk filter (${strategy.riskTolerance}): ${eligible.length}/${beforeRisk} with ≥${(minStake/1000).toFixed(0)}K SOL`);
  
  // Step 3: Prefer Jito validators for MEV rewards
  const jitoValidators = eligible.filter(v => v.jito);
  if (jitoValidators.length >= strategy.maxValidators) {
    eligible = jitoValidators;
    reasoningParts.push(`Jito filter: ${eligible.length} MEV-enabled validators`);
  }
  
  // Step 4: Sort by net APY (highest first)
  eligible.sort((a, b) => b.netApy - a.netApy);
  
  // Step 5: Filter by target APY (allow 20% tolerance for flexibility)
  const targetApyDecimal = strategy.targetApy / 10000; // basis points to decimal
  const minAcceptableApy = targetApyDecimal * 0.8; // 20% tolerance
  const beforeApy = eligible.length;
  eligible = eligible.filter(v => v.netApy >= minAcceptableApy);
  reasoningParts.push(`APY filter: ${eligible.length}/${beforeApy} with ≥${(minAcceptableApy * 100).toFixed(1)}% (target: ${(targetApyDecimal * 100).toFixed(1)}%)`);
  
  // Step 6: Select top N validators
  const selected = eligible.slice(0, strategy.maxValidators);
  reasoningParts.push(`Selected top ${selected.length} validators`);
  
  if (selected.length === 0) {
    return {
      recommendations: [],
      totalToStake: 0,
      strategyUsed: strategy,
      reasoning: `No validators matched criteria. Tried: min stake ${(minStake/1000).toFixed(0)}K SOL, min APY ${(minAcceptableApy * 100).toFixed(1)}%. Consider lowering target APY or using High risk tolerance.`,
    };
  }
  
  // Step 7: Distribute stake evenly
  const amountPerValidator = availableBalance / selected.length;
  
  for (const validator of selected) {
    recommendations.push({
      validator: validator.voteAccount,
      validatorName: validator.name,
      allocatedAmount: amountPerValidator,
      reason: `APY: ${(validator.netApy * 100).toFixed(2)}%, Commission: ${validator.commission}%, Stake: ${(validator.activatedStake / 1e6).toFixed(2)}M SOL${validator.jito ? ", Jito ✓" : ""}`,
      expectedApy: validator.netApy * 100,
      qualityTier: validator.qualityTier,
    });
  }
  
  const totalToStake = amountPerValidator * selected.length;
  const avgApy = selected.reduce((sum, v) => sum + v.netApy, 0) / selected.length;
  
  reasoningParts.push(`Avg expected APY: ${(avgApy * 100).toFixed(2)}%`);
  
  return {
    recommendations,
    totalToStake,
    strategyUsed: strategy,
    reasoning: reasoningParts.join(" → "),
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Parse strategy parameters from query
  const riskTolerance = searchParams.get("riskTolerance") || "Medium";
  const targetApy = parseInt(searchParams.get("targetApy") || "700"); // basis points (7%)
  const maxValidators = parseInt(searchParams.get("maxValidators") || "5");
  const preferDecentralization = searchParams.get("preferDecentralization") !== "false";
  const balance = parseFloat(searchParams.get("balance") || "100"); // SOL
  
  const strategy = {
    riskTolerance,
    targetApy,
    maxValidators,
    preferDecentralization,
  };
  
  try {
    // Fetch validator data
    const validators = await fetchValidators();
    
    if (validators.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch validator data" },
        { status: 500 }
      );
    }
    
    // Generate staking decision
    const decision = generateStakingDecision(strategy, balance, validators);
    
    return NextResponse.json({
      success: true,
      decision,
      validatorsAnalyzed: validators.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      riskTolerance = "Medium",
      targetApy = 700, // 7% default
      maxValidators = 5,
      preferDecentralization = true,
      balance = 100,
    } = body;
    
    const strategy = {
      riskTolerance,
      targetApy,
      maxValidators,
      preferDecentralization,
    };
    
    // Fetch validator data
    const validators = await fetchValidators();
    
    if (validators.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch validator data" },
        { status: 500 }
      );
    }
    
    // Generate staking decision
    const decision = generateStakingDecision(strategy, balance, validators);
    
    return NextResponse.json({
      success: true,
      decision,
      validatorsAnalyzed: validators.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}
