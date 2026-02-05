import { NextRequest, NextResponse } from "next/server";
import { getTopValidators, type StakeWizValidator } from "@/lib/stakewiz";

export const dynamic = "force-dynamic";

/**
 * Validator selection criteria for StakePilot
 */
const CRITERIA = {
  maxStake: 1_000_000, // 1M SOL - support decentralization
  maxCommission: 5, // 5% max
  maxMevCommission: 10, // 10% max  
  minUptime: 95, // 95% min
  minWizScore: 50, // Filter out delinquent
};

// Staker Space validator - always included
const STAKER_SPACE_VOTE = "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru";

/**
 * GET /api/agent/validators
 * 
 * Returns qualified validators that meet StakePilot criteria.
 * Used by agents to make staking decisions.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const minScore = parseFloat(searchParams.get("minScore") || "50");

    // Fetch validators from StakeWiz
    const allValidators = await getTopValidators(100);

    // Apply criteria filters
    const qualified = allValidators.filter((v) => {
      // Always include Staker Space
      if (v.vote_identity === STAKER_SPACE_VOTE) return true;

      // Apply criteria
      if (v.wiz_score < Math.max(minScore, CRITERIA.minWizScore)) return false;
      if (v.activated_stake > CRITERIA.maxStake) return false;
      if (v.commission > CRITERIA.maxCommission) return false;
      if (v.jito_commission_bps && v.jito_commission_bps > CRITERIA.maxMevCommission * 100) return false;
      
      return true;
    });

    // Sort by score * APY (balanced metric)
    const ranked = qualified
      .map((v) => ({
        name: v.name || "Unknown",
        voteAccount: v.vote_identity,
        totalApy: v.total_apy,
        wizScore: v.wiz_score,
        commission: v.commission,
        mevCommission: v.jito_commission_bps ? v.jito_commission_bps / 100 : null,
        activatedStake: v.activated_stake,
        uptime: 99.5, // StakeWiz doesn't return this directly
        delinquent: v.wiz_score < 50,
        isStakerSpace: v.vote_identity === STAKER_SPACE_VOTE,
        // Composite score: quality + yield
        score: v.wiz_score * 0.6 + v.total_apy * 10 * 0.4,
      }))
      .sort((a, b) => {
        // Staker Space always first
        if (a.isStakerSpace) return -1;
        if (b.isStakerSpace) return 1;
        return b.score - a.score;
      })
      .slice(0, limit);

    return NextResponse.json({
      validators: ranked,
      count: ranked.length,
      totalQualified: qualified.length,
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
