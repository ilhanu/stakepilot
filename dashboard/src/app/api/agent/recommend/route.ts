export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  generateStakingDecision,
  getQualifiedValidators,
  STAKER_SPACE_VALIDATOR,
} from "@/lib/validators";

/**
 * Agent Recommendation API - TESTNET ONLY
 * 
 * Generates staking recommendations for StakePilot vault.
 * 
 * Criteria:
 * - Stake < 1M SOL (decentralization)
 * - Commission ≤ 5%
 * - MEV Commission ≤ 10%
 * - Uptime > 95%
 * - Always includes Staker Space validator
 * 
 * Query params:
 * - balance: amount to stake in SOL (default: 100)
 * - maxValidators: max validators to recommend (default: 10)
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const balance = parseFloat(searchParams.get("balance") || "100");
  const maxValidators = parseInt(searchParams.get("maxValidators") || "10");

  try {
    const decision = await generateStakingDecision(balance, maxValidators);
    
    return NextResponse.json({
      success: true,
      network: "testnet",
      decision: {
        recommendations: decision.recommendations.map(r => ({
          validator: r.validator.voteAccount,
          validatorName: r.validator.name,
          identity: r.validator.identity,
          allocatedAmount: r.allocatedAmount,
          reason: r.reason,
          expectedApy: r.estimatedApy,
          score: r.score,
          stake: r.validator.activatedStake,
          commission: r.validator.commission,
          mevCommission: r.validator.mevCommission,
          isJito: r.validator.isJito,
          isDz: r.validator.isDz,
          location: r.validator.location.country,
          avatarUrl: r.validator.avatarUrl,
        })),
        totalToStake: decision.totalToStake,
        reasoning: decision.reasoning,
        stakerSpaceIncluded: decision.stakerSpaceIncluded,
        stakerSpaceValidator: STAKER_SPACE_VALIDATOR,
      },
      qualifiedValidators: (await getQualifiedValidators()).length,
      timestamp: decision.timestamp,
    });
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { balance = 100, maxValidators = 10 } = body;

    const decision = await generateStakingDecision(balance, maxValidators);
    
    return NextResponse.json({
      success: true,
      network: "testnet",
      decision: {
        recommendations: decision.recommendations.map(r => ({
          validator: r.validator.voteAccount,
          validatorName: r.validator.name,
          identity: r.validator.identity,
          allocatedAmount: r.allocatedAmount,
          reason: r.reason,
          expectedApy: r.estimatedApy,
          score: r.score,
          stake: r.validator.activatedStake,
          commission: r.validator.commission,
          mevCommission: r.validator.mevCommission,
          isJito: r.validator.isJito,
          isDz: r.validator.isDz,
          location: r.validator.location.country,
          avatarUrl: r.validator.avatarUrl,
        })),
        totalToStake: decision.totalToStake,
        reasoning: decision.reasoning,
        stakerSpaceIncluded: decision.stakerSpaceIncluded,
        stakerSpaceValidator: STAKER_SPACE_VALIDATOR,
      },
      qualifiedValidators: (await getQualifiedValidators()).length,
      timestamp: decision.timestamp,
    });
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation", details: String(error) },
      { status: 500 }
    );
  }
}
