export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  generateStakingDecision,
  getQualifiedValidators,
  STAKER_SPACE_VALIDATORS,
  Network,
} from "@/lib/validators";

/**
 * Agent Recommendation API
 * 
 * Generates staking recommendations for StakePilot vault.
 * Uses validators.app API for comprehensive validator data.
 * 
 * Supports both mainnet and testnet networks.
 * 
 * Criteria:
 * - Stake < 1M SOL (decentralization)
 * - Commission ≤ 5%
 * - MEV Commission ≤ 10%
 * - Uptime > 95%
 * - Always includes Staker Space validator
 * 
 * Query params:
 * - network: "mainnet" | "testnet" (default: testnet for demo)
 * - balance: amount to stake in SOL (default: 100)
 * - maxValidators: max validators to recommend (default: 10)
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const network = (searchParams.get("network") || "testnet") as Network;
  const balance = parseFloat(searchParams.get("balance") || "100");
  const maxValidators = parseInt(searchParams.get("maxValidators") || "10");

  // Validate network
  if (network !== "mainnet" && network !== "testnet") {
    return NextResponse.json(
      { error: "Invalid network. Use 'mainnet' or 'testnet'" },
      { status: 400 }
    );
  }

  try {
    const decision = await generateStakingDecision(network, balance, maxValidators);
    
    return NextResponse.json({
      success: true,
      decision: {
        network: decision.network,
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
        stakerSpaceValidator: STAKER_SPACE_VALIDATORS[network],
      },
      qualifiedValidators: (await getQualifiedValidators(network)).length,
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
    
    const {
      network = "testnet",
      balance = 100,
      maxValidators = 10,
    } = body;

    // Validate network
    if (network !== "mainnet" && network !== "testnet") {
      return NextResponse.json(
        { error: "Invalid network. Use 'mainnet' or 'testnet'" },
        { status: 400 }
      );
    }

    const decision = await generateStakingDecision(network as Network, balance, maxValidators);
    
    return NextResponse.json({
      success: true,
      decision: {
        network: decision.network,
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
        stakerSpaceValidator: STAKER_SPACE_VALIDATORS[network as Network],
      },
      qualifiedValidators: (await getQualifiedValidators(network as Network)).length,
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
