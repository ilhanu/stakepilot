import { NextRequest, NextResponse } from "next/server";
import { getTopValidators, getQualifiedValidators, STAKER_SPACE_VALIDATOR } from "@/lib/validators";

export const dynamic = "force-dynamic";

/**
 * Validator selection criteria for StakePilot
 */
const CRITERIA = {
  maxStake: 1_000_000, // 1M SOL - support decentralization
  maxCommission: 5, // 5% max
  maxMevCommission: 10, // 10% max  
  minUptime: 95, // 95% min
};

/**
 * GET /api/agent/validators - TESTNET
 * 
 * Returns qualified validators that meet StakePilot criteria.
 * Used by agents to make staking decisions.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Fetch testnet validators
    const validators = await getTopValidators(limit);

    // Format response
    const ranked = validators.map((v) => ({
      name: v.name,
      voteAccount: v.voteAccount,
      identity: v.identity,
      estimatedApy: 6.5 * (1 - v.commission / 100), // Rough APY estimate
      score: v.totalScore,
      commission: v.commission,
      mevCommission: v.mevCommission,
      activatedStake: v.activatedStake,
      uptime: v.uptime,
      delinquent: v.delinquent,
      isJito: v.isJito,
      isDz: v.isDz,
      location: v.location.country,
      isStakerSpace: v.voteAccount === STAKER_SPACE_VALIDATOR,
    }));

    return NextResponse.json({
      network: "testnet",
      validators: ranked,
      count: ranked.length,
      stakerSpaceValidator: STAKER_SPACE_VALIDATOR,
      criteria: CRITERIA,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Validators error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch validators" },
      { status: 500 }
    );
  }
}
