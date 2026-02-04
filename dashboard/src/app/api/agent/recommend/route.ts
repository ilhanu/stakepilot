import { NextRequest, NextResponse } from "next/server";

/**
 * Agent Recommendation API
 * 
 * Generates staking recommendations based on user's strategy parameters
 * and current validator data.
 */

interface ValidatorData {
  voteAccount: string;
  name: string;
  netApy: number;
  commission: number;
  activatedStake: number;
  delinquent: boolean;
  datacenterConcentration: number;
}

interface Recommendation {
  validator: string;
  validatorName: string;
  allocatedAmount: number;
  reason: string;
  expectedApy: number;
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

// Fetch validator data from Jito API
async function fetchValidators(): Promise<ValidatorData[]> {
  try {
    const res = await fetch("https://kobe.mainnet.jito.network/api/v1/validators", {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (!res.ok) throw new Error("Failed to fetch validators");
    
    const data = await res.json();
    
    return data.validators.map((v: any) => ({
      voteAccount: v.vote_account,
      name: v.info?.name || "Unknown",
      netApy: (v.apy_estimate || 7) / 100, // Convert to decimal
      commission: v.commission || 10,
      activatedStake: v.activated_stake / 1e9 || 0,
      delinquent: v.delinquent || false,
      datacenterConcentration: v.datacenter_concentration || 0,
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
  
  // Step 1: Filter out delinquent validators
  let eligible = validators.filter(v => !v.delinquent);
  reasoningParts.push(`Filtered out delinquent validators: ${validators.length - eligible.length} removed`);
  
  // Step 2: Apply risk tolerance filter
  const riskFilters: Record<string, number> = {
    Low: 1_000_000,    // >1M SOL stake
    Medium: 100_000,   // >100K SOL stake
    High: 0,           // No filter
  };
  
  const minStake = riskFilters[strategy.riskTolerance] || 100_000;
  eligible = eligible.filter(v => v.activatedStake >= minStake);
  reasoningParts.push(`Risk filter (${strategy.riskTolerance}): min ${minStake.toLocaleString()} SOL stake`);
  
  // Step 3: Apply decentralization preference
  if (strategy.preferDecentralization) {
    eligible = eligible.filter(v => v.datacenterConcentration < 0.1);
    reasoningParts.push(`Decentralization filter: <10% datacenter concentration`);
  }
  
  // Step 4: Sort by net APY
  eligible.sort((a, b) => b.netApy - a.netApy);
  
  // Step 5: Filter by target APY (allow 10% tolerance)
  const targetApyDecimal = strategy.targetApy / 10000;
  const minAcceptableApy = targetApyDecimal * 0.9;
  eligible = eligible.filter(v => v.netApy >= minAcceptableApy);
  reasoningParts.push(`APY filter: >${(minAcceptableApy * 100).toFixed(1)}% (target: ${(targetApyDecimal * 100).toFixed(1)}%)`);
  
  // Step 6: Select top N validators
  const selected = eligible.slice(0, strategy.maxValidators);
  reasoningParts.push(`Selected top ${selected.length} validators`);
  
  if (selected.length === 0) {
    return {
      recommendations: [],
      totalToStake: 0,
      strategyUsed: strategy,
      reasoning: "No validators matched the strategy criteria. Consider adjusting risk tolerance or target APY.",
    };
  }
  
  // Step 7: Distribute stake evenly
  const amountPerValidator = availableBalance / selected.length;
  
  for (const validator of selected) {
    recommendations.push({
      validator: validator.voteAccount,
      validatorName: validator.name,
      allocatedAmount: amountPerValidator,
      reason: `APY: ${(validator.netApy * 100).toFixed(2)}%, Commission: ${validator.commission}%, Stake: ${(validator.activatedStake / 1e6).toFixed(1)}M SOL`,
      expectedApy: validator.netApy * 100,
    });
  }
  
  const totalToStake = amountPerValidator * selected.length;
  const avgApy = selected.reduce((sum, v) => sum + v.netApy, 0) / selected.length;
  
  reasoningParts.push(`Average expected APY: ${(avgApy * 100).toFixed(2)}%`);
  
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
  const targetApy = parseInt(searchParams.get("targetApy") || "800"); // basis points
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
      targetApy = 800,
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
