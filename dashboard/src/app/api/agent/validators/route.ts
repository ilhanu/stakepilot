export const dynamic = "force-dynamic";
/**
 * Agent API: GET /api/agent/validators
 * 
 * Returns ranked validators with all metrics for agent consumption.
 * Designed to be called by other AI agents or automated systems.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllValidators, enrichValidators, filterValidators, type ValidatorFilters } from "@/lib/validators-app";
import { getValidatorRewards } from "@/lib/jito";
import { getCurrentEpoch } from "@/lib/solana";

export const revalidate = 300; // 5 min cache

// Base staking APY (Solana inflation rewards)
const BASE_APY = 6.5;
const EPOCHS_PER_YEAR = 73;

interface AgentValidator {
  // Identity
  voteAccount: string;
  identity: string;
  name: string | null;
  
  // Yields (NET to staker after all commissions)
  netBaseApy: number;      // Base rewards after stake commission
  netMevApy: number;       // MEV rewards after MEV commission
  netTotalApy: number;     // Total NET APY
  
  // Commissions (what validator takes)
  stakeCommission: number; // 0-100%
  mevCommission: number;   // 0-100% (from bps)
  
  // Performance
  qualityScore: number;    // 0-10 from validators.app
  uptimePercent: number;   // 100 - skip rate
  skipRate: number;        // Raw skip rate
  
  // Stake info
  stakeSol: number;
  stakeRank: "small" | "medium" | "large" | "whale";
  
  // Location
  country: string;
  city: string;
  dataCenter: string;
  
  // Status
  isJito: boolean;
  isActive: boolean;
  isDelinquent: boolean;
  ageInDays: number;
  
  // Agent-specific
  recommendation: "strong" | "good" | "neutral" | "avoid";
  reasons: string[];
}

function getStakeRank(stakeSol: number): "small" | "medium" | "large" | "whale" {
  if (stakeSol < 50000) return "small";
  if (stakeSol < 200000) return "medium";
  if (stakeSol < 1000000) return "large";
  return "whale";
}

function getRecommendation(v: AgentValidator): { rec: "strong" | "good" | "neutral" | "avoid"; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50; // Start neutral
  
  // APY impact
  if (v.netTotalApy >= 8) { score += 20; reasons.push(`High yield: ${v.netTotalApy.toFixed(2)}%`); }
  else if (v.netTotalApy >= 7) { score += 10; }
  else if (v.netTotalApy < 6) { score -= 20; reasons.push(`Low yield: ${v.netTotalApy.toFixed(2)}%`); }
  
  // Quality
  if (v.qualityScore >= 8) { score += 15; reasons.push("Excellent quality score"); }
  else if (v.qualityScore < 5) { score -= 25; reasons.push("Poor quality score"); }
  
  // Uptime
  if (v.uptimePercent >= 99.5) { score += 10; }
  else if (v.uptimePercent < 98) { score -= 20; reasons.push(`High skip rate: ${v.skipRate.toFixed(2)}%`); }
  
  // Commission fairness
  if (v.stakeCommission > 10) { score -= 15; reasons.push(`High commission: ${v.stakeCommission}%`); }
  if (v.mevCommission > 10) { score -= 10; reasons.push(`High MEV commission: ${v.mevCommission}%`); }
  
  // Delinquent = bad
  if (v.isDelinquent) { score -= 50; reasons.push("Currently delinquent"); }
  
  // Age (new = risky)
  if (v.ageInDays < 30) { score -= 10; reasons.push("New validator (<30 days)"); }
  
  // Jito = MEV rewards
  if (v.isJito && v.netMevApy > 0.5) { score += 10; reasons.push("MEV rewards active"); }
  
  // Stake size (smaller = better APY due to less dilution)
  if (v.stakeRank === "small") { score += 5; reasons.push("Small validator (less MEV dilution)"); }
  if (v.stakeRank === "whale") { score -= 5; }
  
  let rec: "strong" | "good" | "neutral" | "avoid";
  if (score >= 70) rec = "strong";
  else if (score >= 55) rec = "good";
  else if (score >= 40) rec = "neutral";
  else rec = "avoid";
  
  return { rec, reasons: reasons.slice(0, 3) }; // Top 3 reasons
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query params
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const sort = searchParams.get("sort") || "netTotalApy"; // netTotalApy, qualityScore, stakeSol
    const minScore = parseFloat(searchParams.get("minScore") || "0");
    const maxCommission = parseFloat(searchParams.get("maxCommission") || "100");
    const jitoOnly = searchParams.get("jitoOnly") === "true";
    const country = searchParams.get("country"); // e.g., "US"
    const excludeWhales = searchParams.get("excludeWhales") === "true";
    
    // Fetch data from both sources
    const [rawValidators, currentEpoch] = await Promise.all([
      getAllValidators({ limit: 1500, activeOnly: true }),
      getCurrentEpoch(),
    ]);
    
    // Get MEV rewards for current epoch
    let mevRewards = await getValidatorRewards(currentEpoch);
    if (mevRewards.length === 0) {
      // Try previous epoch if current has no data
      mevRewards = await getValidatorRewards(currentEpoch - 1);
    }
    
    const mevLookup = new Map(mevRewards.map(r => [r.vote_account, r]));
    
    // Enrich with derived metrics
    const enriched = enrichValidators(rawValidators);
    
    // Build filters
    const filters: ValidatorFilters = {
      minScore: minScore > 0 ? minScore : undefined,
      maxCommission: maxCommission < 100 ? maxCommission : undefined,
      requireJito: jitoOnly,
      countries: country ? [country] : undefined,
      maxStakeSol: excludeWhales ? 1000000 : undefined,
    };
    
    const filtered = filterValidators(enriched, filters);
    
    // Transform to agent format
    const validators: AgentValidator[] = filtered.map(v => {
      const mev = mevLookup.get(v.vote_account);
      
      // Calculate NET APY (what staker actually receives)
      const netBaseApy = BASE_APY * (1 - v.commission / 100);
      
      // MEV APY calculation
      let netMevApy = 0;
      if (mev && v.stakeSol > 0) {
        const mevPerEpochLamports = mev.mev_revenue * (1 - (mev.mev_commission / 100));
        const mevPerYearLamports = mevPerEpochLamports * EPOCHS_PER_YEAR;
        const stakeLamports = v.active_stake;
        netMevApy = stakeLamports > 0 ? (mevPerYearLamports / stakeLamports) * 100 : 0;
      }
      
      const netTotalApy = netBaseApy + netMevApy;
      
      const agent: AgentValidator = {
        voteAccount: v.vote_account,
        identity: v.account,
        name: v.name || null,
        netBaseApy: Math.round(netBaseApy * 100) / 100,
        netMevApy: Math.round(netMevApy * 100) / 100,
        netTotalApy: Math.round(netTotalApy * 100) / 100,
        stakeCommission: v.commission,
        mevCommission: mev ? mev.mev_commission : 0,
        qualityScore: v.total_score || 0,
        uptimePercent: v.uptimePercent,
        skipRate: parseFloat(v.skipped_slot_percent || "0") || 0,
        stakeSol: Math.round(v.stakeSol),
        stakeRank: getStakeRank(v.stakeSol),
        country: v.country || "Unknown",
        city: v.city || "Unknown",
        dataCenter: v.data_center_key || "Unknown",
        isJito: v.jito || false,
        isActive: !v.delinquent,
        isDelinquent: v.delinquent,
        ageInDays: v.ageInDays,
        recommendation: "neutral",
        reasons: [],
      };
      
      const { rec, reasons } = getRecommendation(agent);
      agent.recommendation = rec;
      agent.reasons = reasons;
      
      return agent;
    });
    
    // Sort
    validators.sort((a, b) => {
      switch (sort) {
        case "qualityScore": return b.qualityScore - a.qualityScore;
        case "stakeSol": return a.stakeSol - b.stakeSol; // Smaller first
        case "netTotalApy":
        default:
          return b.netTotalApy - a.netTotalApy;
      }
    });
    
    // Apply limit
    const result = validators.slice(0, limit);
    
    return NextResponse.json({
      validators: result,
      meta: {
        count: result.length,
        totalAvailable: validators.length,
        epoch: currentEpoch,
        timestamp: new Date().toISOString(),
        filters: {
          sort,
          limit,
          minScore,
          maxCommission,
          jitoOnly,
          country,
          excludeWhales,
        },
      },
    });
  } catch (error) {
    console.error("Agent validators API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch validators", details: String(error) },
      { status: 500 }
    );
  }
}
