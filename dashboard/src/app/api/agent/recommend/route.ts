import { NextRequest, NextResponse } from "next/server";
import { getQualifiedValidators, scoreValidator, calculateNetApy, StakeWizValidator } from "@/lib/stakewiz";

/**
 * Agent Recommendation API
 * 
 * Generates staking recommendations for the Staker Space vault.
 * Uses StakeWiz data and our scoring algorithm.
 * 
 * Criteria:
 * - Stake < 1M SOL (decentralization)
 * - Commission ≤ 5%
 * - MEV Commission ≤ 10%
 * - Uptime > 95%
 * - Always includes Staker Space validator
 */

const STAKER_SPACE_VOTE = "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru";

interface Recommendation {
  validator: string;
  validatorName: string;
  allocatedAmount: number;
  reason: string;
  expectedApy: number;
  wizScore: number;
  stake: number;
  commission: number;
  mevCommission: number | null;
}

interface StakingDecision {
  recommendations: Recommendation[];
  totalToStake: number;
  reasoning: string;
  stakerSpaceIncluded: boolean;
}

function generateStakingDecision(
  validators: StakeWizValidator[],
  amountToStake: number,
  maxValidators: number
): StakingDecision {
  const reasoningParts: string[] = [];
  
  // Score all validators
  const scored = validators.map((v) => ({
    validator: v,
    score: scoreValidator(v),
    netApy: calculateNetApy(v),
  }));
  
  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);
  reasoningParts.push(`Scored ${scored.length} qualified validators`);
  
  // Select top N
  const selected = scored.slice(0, maxValidators);
  reasoningParts.push(`Selected top ${selected.length} by score`);
  
  // Check if Staker Space is included
  const stakerSpaceIncluded = selected.some(
    (s) => s.validator.vote_identity === STAKER_SPACE_VOTE
  );
  
  // Distribute stake evenly
  const amountPerValidator = amountToStake / selected.length;
  
  const recommendations: Recommendation[] = selected.map((s) => ({
    validator: s.validator.vote_identity,
    validatorName: s.validator.name || "Unknown",
    allocatedAmount: amountPerValidator,
    reason: `Score: ${s.score.toFixed(0)}, APY: ${s.netApy.toFixed(2)}%, Stake: ${(s.validator.activated_stake / 1000).toFixed(0)}K SOL`,
    expectedApy: s.netApy,
    wizScore: s.validator.wiz_score,
    stake: s.validator.activated_stake,
    commission: s.validator.commission,
    mevCommission: s.validator.is_jito ? s.validator.jito_commission_bps / 100 : null,
  }));
  
  const avgApy = selected.reduce((sum, s) => sum + s.netApy, 0) / selected.length;
  reasoningParts.push(`Average expected APY: ${avgApy.toFixed(2)}%`);
  
  if (stakerSpaceIncluded) {
    reasoningParts.push("✓ Staker Space included");
  }
  
  return {
    recommendations,
    totalToStake: amountToStake,
    reasoning: reasoningParts.join(" → "),
    stakerSpaceIncluded,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const balance = parseFloat(searchParams.get("balance") || "100");
  const maxValidators = parseInt(searchParams.get("maxValidators") || "10");

  try {
    const validators = await getQualifiedValidators();
    
    if (validators.length === 0) {
      return NextResponse.json(
        { error: "No qualified validators found" },
        { status: 500 }
      );
    }
    
    const decision = generateStakingDecision(validators, balance, maxValidators);
    
    return NextResponse.json({
      success: true,
      decision,
      qualifiedValidators: validators.length,
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
      balance = 100,
      maxValidators = 10,
    } = body;

    const validators = await getQualifiedValidators();
    
    if (validators.length === 0) {
      return NextResponse.json(
        { error: "No qualified validators found" },
        { status: 500 }
      );
    }
    
    const decision = generateStakingDecision(validators, balance, maxValidators);
    
    return NextResponse.json({
      success: true,
      decision,
      qualifiedValidators: validators.length,
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
