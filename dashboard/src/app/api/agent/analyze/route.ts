/**
 * Agent API: GET /api/agent/analyze
 * 
 * Analyzes a wallet's current stake positions and provides optimization suggestions.
 * Returns actionable intelligence about the wallet's staking situation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllValidators, enrichValidators } from "@/lib/validators-app";
import { getValidatorRewards } from "@/lib/jito";
import { getCurrentEpoch } from "@/lib/solana";

export const revalidate = 60; // 1 min cache since wallet-specific

const BASE_APY = 6.5;
const EPOCHS_PER_YEAR = 73;
const HELIUS_RPC = process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || ""}`;

interface StakeAccount {
  pubkey: string;
  lamports: number;
  solAmount: number;
  validator: string | null;
  state: "active" | "activating" | "deactivating" | "inactive";
  activationEpoch: number | null;
  deactivationEpoch: number | null;
}

interface ValidatorAnalysis {
  voteAccount: string;
  name: string | null;
  stakedSol: number;
  currentNetApy: number;
  qualityScore: number;
  issues: string[];
  status: "good" | "warning" | "critical";
}

interface Opportunity {
  type: "switch" | "rebalance" | "new_stake";
  priority: "high" | "medium" | "low";
  description: string;
  currentValidator?: string;
  suggestedValidator: string;
  suggestedValidatorName: string | null;
  expectedApyGain: number;
  affectedSol: number;
}

interface WalletAnalysis {
  wallet: string;
  summary: {
    totalStakedSol: number;
    activeStakeAccounts: number;
    currentWeightedApy: number;
    potentialApy: number;
    missedYieldPerYear: number;
    healthScore: number; // 0-100
  };
  positions: ValidatorAnalysis[];
  opportunities: Opportunity[];
  warnings: string[];
}

async function getWalletStakeAccounts(wallet: string): Promise<StakeAccount[]> {
  const response = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getProgramAccounts",
      params: [
        "Stake11111111111111111111111111111111111111",
        {
          encoding: "jsonParsed",
          filters: [
            { memcmp: { offset: 12, bytes: wallet } }, // staker authority
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  const accounts: StakeAccount[] = [];
  for (const acc of data.result || []) {
    const parsed = acc.account?.data?.parsed?.info;
    if (!parsed) continue;

    const stake = parsed.stake;
    const meta = parsed.meta;
    
    let state: StakeAccount["state"] = "inactive";
    let validator: string | null = null;
    let activationEpoch: number | null = null;
    let deactivationEpoch: number | null = null;

    if (stake?.delegation) {
      validator = stake.delegation.voter;
      activationEpoch = stake.delegation.activationEpoch;
      deactivationEpoch = stake.delegation.deactivationEpoch;
      
      // Determine state
      if (deactivationEpoch && deactivationEpoch < 999999999) {
        state = "deactivating";
      } else if (activationEpoch) {
        state = "active"; // Simplified - could check epoch for "activating"
      }
    }

    accounts.push({
      pubkey: acc.pubkey,
      lamports: acc.account.lamports,
      solAmount: acc.account.lamports / 1_000_000_000,
      validator,
      state,
      activationEpoch,
      deactivationEpoch,
    });
  }

  return accounts;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    
    if (!wallet || wallet.length < 32) {
      return NextResponse.json({ error: "Valid wallet address required" }, { status: 400 });
    }

    // Fetch all data in parallel
    const [stakeAccounts, rawValidators, currentEpoch] = await Promise.all([
      getWalletStakeAccounts(wallet),
      getAllValidators({ limit: 1500, activeOnly: true }),
      getCurrentEpoch(),
    ]);

    let mevRewards = await getValidatorRewards(currentEpoch);
    if (mevRewards.length === 0) {
      mevRewards = await getValidatorRewards(currentEpoch - 1);
    }

    const mevLookup = new Map(mevRewards.map(r => [r.vote_account, r]));
    const enriched = enrichValidators(rawValidators);
    const validatorLookup = new Map(enriched.map(v => [v.vote_account, v]));

    // Filter to active stakes only
    const activeStakes = stakeAccounts.filter(s => s.state === "active" && s.validator);
    
    if (activeStakes.length === 0) {
      return NextResponse.json({
        wallet,
        summary: {
          totalStakedSol: 0,
          activeStakeAccounts: 0,
          currentWeightedApy: 0,
          potentialApy: 0,
          missedYieldPerYear: 0,
          healthScore: 100, // No stakes = no problems
        },
        positions: [],
        opportunities: [{
          type: "new_stake" as const,
          priority: "medium" as const,
          description: "No active stakes found. Consider staking SOL to earn rewards.",
          suggestedValidator: "", // Will be filled by recommend endpoint
          suggestedValidatorName: null,
          expectedApyGain: 7.0,
          affectedSol: 0,
        }],
        warnings: ["No active stake accounts found for this wallet"],
        meta: { epoch: currentEpoch, timestamp: new Date().toISOString() },
      });
    }

    // Analyze each position
    const positions: ValidatorAnalysis[] = [];
    let totalStakedSol = 0;
    let weightedApySum = 0;

    for (const stake of activeStakes) {
      if (!stake.validator) continue;
      
      const validator = validatorLookup.get(stake.validator);
      const mev = mevLookup.get(stake.validator);
      
      const issues: string[] = [];
      let status: ValidatorAnalysis["status"] = "good";
      
      // Calculate APY
      let netApy = BASE_APY;
      if (validator) {
        netApy = BASE_APY * (1 - validator.commission / 100);
        
        if (mev && validator.stakeSol > 0) {
          const mevPerEpoch = mev.mev_revenue * (1 - mev.mev_commission / 100);
          const mevPerYear = mevPerEpoch * EPOCHS_PER_YEAR;
          netApy += (mevPerYear / validator.active_stake) * 100;
        }
        
        // Check for issues
        if (validator.delinquent) {
          issues.push("Validator is currently delinquent");
          status = "critical";
        }
        if (validator.commission > 10) {
          issues.push(`High commission: ${validator.commission}%`);
          if (status !== "critical") status = "warning";
        }
        if (validator.total_score < 5) {
          issues.push(`Low quality score: ${validator.total_score}/10`);
          if (status !== "critical") status = "warning";
        }
        if (parseFloat(validator.skipped_slot_percent) > 2) {
          issues.push(`High skip rate: ${validator.skipped_slot_percent}%`);
          if (status !== "critical") status = "warning";
        }
      } else {
        issues.push("Validator not found in database (may be inactive)");
        status = "warning";
      }

      totalStakedSol += stake.solAmount;
      weightedApySum += stake.solAmount * netApy;

      positions.push({
        voteAccount: stake.validator,
        name: validator?.name || null,
        stakedSol: Math.round(stake.solAmount * 100) / 100,
        currentNetApy: Math.round(netApy * 100) / 100,
        qualityScore: validator?.total_score || 0,
        issues,
        status,
      });
    }

    const currentWeightedApy = totalStakedSol > 0 ? weightedApySum / totalStakedSol : 0;

    // Find best available validators for comparison
    const bestValidators = enriched
      .filter(v => !v.delinquent && v.total_score >= 6)
      .map(v => {
        const mev = mevLookup.get(v.vote_account);
        let netApy = BASE_APY * (1 - v.commission / 100);
        if (mev && v.stakeSol > 0) {
          const mevPerEpoch = mev.mev_revenue * (1 - mev.mev_commission / 100);
          netApy += (mevPerEpoch * EPOCHS_PER_YEAR / v.active_stake) * 100;
        }
        return { ...v, netApy };
      })
      .sort((a, b) => b.netApy - a.netApy)
      .slice(0, 10);

    const bestPossibleApy = bestValidators[0]?.netApy || currentWeightedApy;

    // Generate opportunities
    const opportunities: Opportunity[] = [];

    for (const pos of positions) {
      if (pos.status === "critical") {
        const best = bestValidators[0];
        opportunities.push({
          type: "switch",
          priority: "high",
          description: `URGENT: Switch from ${pos.name || pos.voteAccount.slice(0, 8)} (${pos.issues.join(", ")})`,
          currentValidator: pos.voteAccount,
          suggestedValidator: best.vote_account,
          suggestedValidatorName: best.name,
          expectedApyGain: Math.round((best.netApy - pos.currentNetApy) * 100) / 100,
          affectedSol: pos.stakedSol,
        });
      } else if (pos.status === "warning" || pos.currentNetApy < bestPossibleApy - 0.5) {
        const best = bestValidators.find(v => v.vote_account !== pos.voteAccount) || bestValidators[0];
        const apyGain = best.netApy - pos.currentNetApy;
        if (apyGain > 0.3) {
          opportunities.push({
            type: "switch",
            priority: apyGain > 1 ? "high" : "medium",
            description: `Switch from ${pos.name || pos.voteAccount.slice(0, 8)} to gain +${apyGain.toFixed(2)}% APY`,
            currentValidator: pos.voteAccount,
            suggestedValidator: best.vote_account,
            suggestedValidatorName: best.name,
            expectedApyGain: Math.round(apyGain * 100) / 100,
            affectedSol: pos.stakedSol,
          });
        }
      }
    }

    // Sort opportunities by priority
    opportunities.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Calculate health score
    const criticalCount = positions.filter(p => p.status === "critical").length;
    const warningCount = positions.filter(p => p.status === "warning").length;
    const apyGap = bestPossibleApy - currentWeightedApy;
    
    let healthScore = 100;
    healthScore -= criticalCount * 30;
    healthScore -= warningCount * 10;
    healthScore -= Math.min(apyGap * 10, 20); // Lose up to 20 points for suboptimal APY
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Warnings
    const warnings: string[] = [];
    if (criticalCount > 0) {
      warnings.push(`${criticalCount} stake(s) require immediate attention`);
    }
    if (apyGap > 1) {
      warnings.push(`You could be earning ${apyGap.toFixed(2)}% more APY`);
    }
    if (positions.length === 1) {
      warnings.push("Consider diversifying across multiple validators");
    }

    const missedYield = totalStakedSol * (apyGap / 100);

    const analysis: WalletAnalysis = {
      wallet,
      summary: {
        totalStakedSol: Math.round(totalStakedSol * 100) / 100,
        activeStakeAccounts: activeStakes.length,
        currentWeightedApy: Math.round(currentWeightedApy * 100) / 100,
        potentialApy: Math.round(bestPossibleApy * 100) / 100,
        missedYieldPerYear: Math.round(missedYield * 100) / 100,
        healthScore: Math.round(healthScore),
      },
      positions,
      opportunities: opportunities.slice(0, 5), // Top 5 opportunities
      warnings,
    };

    return NextResponse.json({
      ...analysis,
      meta: {
        epoch: currentEpoch,
        timestamp: new Date().toISOString(),
        validatorsAnalyzed: enriched.length,
      },
    });
  } catch (error) {
    console.error("Agent analyze API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze wallet", details: String(error) },
      { status: 500 }
    );
  }
}
