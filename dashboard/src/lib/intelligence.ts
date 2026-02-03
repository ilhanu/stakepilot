/**
 * StakePilot Intelligence Engine
 * 
 * Proactive analysis and smart triggers for staking optimization.
 * Compares user positions to optimal choices and generates actionable recommendations.
 */

import { UserStakeAccount } from "./user-stakes";

export interface ValidatorSnapshot {
  voteAccount: string;
  name: string | null;
  netTotalApy: number;
  netMevApy: number;
  stakeCommission: number;
  mevCommission: number;
  stakeSol: number;
  trend: "rising" | "stable" | "falling";
  isRisingStar: boolean;
  isViable: boolean;
  decentralizationScore: number;
}

export interface Trigger {
  id: string;
  type: 
    | "better_opportunity"      // Found validator with significantly better APY
    | "commission_increase"     // User's validator raised commission
    | "performance_drop"        // User's validator performance declined
    | "new_rising_star"         // New Rising Star emerged
    | "mev_spike"               // MEV rewards unusually high
    | "deactivation_warning"    // Validator at risk
    | "rebalance_needed"        // Portfolio drift from target
    | "whale_concentration";    // Too concentrated in large validators
  
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  impact: string;  // e.g., "+1.5% APY" or "Risk: High"
  action: {
    label: string;
    href: string;
  };
  affectedStake?: {
    voteAccount: string;
    name: string | null;
    amount: number;
  };
  suggestedValidator?: {
    voteAccount: string;
    name: string | null;
    apy: number;
  };
  createdAt: Date;
}

export interface IntelligenceReport {
  triggers: Trigger[];
  summary: {
    totalTriggers: number;
    criticalCount: number;
    warningCount: number;
    potentialGainApy: number;
    potentialGainSol: number;
    healthScore: number; // 0-100, higher = better optimized
  };
  recommendations: Recommendation[];
}

export interface Recommendation {
  id: string;
  priority: number; // 1 = highest
  type: "switch" | "diversify" | "rebalance" | "new_stake";
  title: string;
  description: string;
  expectedGain: {
    apyIncrease: number;
    annualSolGain: number;
  };
  steps: string[];
  validators: {
    from?: { voteAccount: string; name: string | null };
    to: { voteAccount: string; name: string | null; apy: number };
  };
}

// Thresholds for triggers
const THRESHOLDS = {
  BETTER_APY_MIN_DIFF: 0.5,        // Trigger if can gain 0.5%+ APY
  COMMISSION_INCREASE_ALERT: 2,    // Alert if commission increased 2%+
  PERFORMANCE_DROP_PERCENT: 10,    // Alert if performance dropped 10%+
  RISING_STAR_MIN_ADVANTAGE: 0.8,  // Rising star must offer 0.8%+ more
  WHALE_CONCENTRATION_PERCENT: 70, // Alert if >70% in whales
  REBALANCE_DRIFT_PERCENT: 15,     // Suggest rebalance if drifted 15%+
};

/**
 * Analyze user's stakes and generate intelligence report
 */
export function analyzePortfolio(
  userStakes: UserStakeAccount[],
  allValidators: ValidatorSnapshot[],
  previousSnapshot?: ValidatorSnapshot[] // For detecting changes
): IntelligenceReport {
  const triggers: Trigger[] = [];
  const recommendations: Recommendation[] = [];
  
  if (userStakes.length === 0) {
    return {
      triggers: [],
      summary: {
        totalTriggers: 0,
        criticalCount: 0,
        warningCount: 0,
        potentialGainApy: 0,
        potentialGainSol: 0,
        healthScore: 100,
      },
      recommendations: [{
        id: "start-staking",
        priority: 1,
        type: "new_stake",
        title: "Start Earning Yield",
        description: "You have no active stakes. Start staking to earn ~7-10% APY on your SOL.",
        expectedGain: { apyIncrease: 8, annualSolGain: 0 },
        steps: [
          "Go to Route My Stake",
          "Enter your amount and preferences",
          "Stake with recommended validators"
        ],
        validators: {
          to: {
            voteAccount: "",
            name: "See recommendations",
            apy: 8,
          }
        }
      }],
    };
  }

  // Get best validators for comparison
  const viableValidators = allValidators
    .filter(v => v.isViable && v.netTotalApy > 0)
    .sort((a, b) => b.netTotalApy - a.netTotalApy);
  
  const bestValidator = viableValidators[0];
  const bestRisingStar = viableValidators.find(v => v.isRisingStar);
  const topValidators = viableValidators.slice(0, 10);
  
  // Create lookup for user's validators
  const userValidatorMap = new Map<string, ValidatorSnapshot>();
  for (const stake of userStakes) {
    const validator = allValidators.find(v => v.voteAccount === stake.validator.voteAccount);
    if (validator) {
      userValidatorMap.set(stake.validator.voteAccount, validator);
    }
  }

  // Calculate totals
  const totalStakedSol = userStakes.reduce((sum, s) => sum + s.solAmount, 0);
  let totalPotentialGainApy = 0;
  
  // ============ TRIGGER DETECTION ============

  // 1. Better Opportunity Detection
  for (const stake of userStakes) {
    if (stake.state !== "active") continue;
    
    const currentValidator = userValidatorMap.get(stake.validator.voteAccount);
    const currentApy = currentValidator?.netTotalApy || stake.estimatedApy || 6.5;
    
    if (bestValidator && bestValidator.netTotalApy - currentApy >= THRESHOLDS.BETTER_APY_MIN_DIFF) {
      const apyGain = bestValidator.netTotalApy - currentApy;
      const solGain = (stake.solAmount * apyGain) / 100;
      totalPotentialGainApy = Math.max(totalPotentialGainApy, apyGain);
      
      triggers.push({
        id: `better-opp-${stake.pubkey.slice(0, 8)}`,
        type: "better_opportunity",
        severity: apyGain >= 1.5 ? "critical" : apyGain >= 1 ? "warning" : "info",
        title: `Better Yield Available`,
        description: `Your stake with ${currentValidator?.name || "this validator"} earns ${currentApy.toFixed(2)}% APY. ${bestValidator.name || "Top validator"} offers ${bestValidator.netTotalApy.toFixed(2)}% APY.`,
        impact: `+${apyGain.toFixed(2)}% APY (+${solGain.toFixed(2)} SOL/year)`,
        action: {
          label: "Switch Validator",
          href: `/route?amount=${Math.ceil(stake.solAmount)}&from=${stake.validator.voteAccount}`,
        },
        affectedStake: {
          voteAccount: stake.validator.voteAccount,
          name: currentValidator?.name || null,
          amount: stake.solAmount,
        },
        suggestedValidator: {
          voteAccount: bestValidator.voteAccount,
          name: bestValidator.name,
          apy: bestValidator.netTotalApy,
        },
        createdAt: new Date(),
      });
    }
  }

  // 2. Rising Star Opportunity
  if (bestRisingStar) {
    const userHasRisingStar = userStakes.some(s => {
      const v = userValidatorMap.get(s.validator.voteAccount);
      return v?.isRisingStar;
    });

    if (!userHasRisingStar) {
      const avgUserApy = userStakes.reduce((sum, s) => {
        const v = userValidatorMap.get(s.validator.voteAccount);
        return sum + (v?.netTotalApy || 6.5);
      }, 0) / userStakes.length;

      if (bestRisingStar.netTotalApy - avgUserApy >= THRESHOLDS.RISING_STAR_MIN_ADVANTAGE) {
        triggers.push({
          id: "rising-star-opportunity",
          type: "new_rising_star",
          severity: "info",
          title: "🌟 Rising Star Discovered",
          description: `${bestRisingStar.name || "A new rising validator"} is outperforming with ${bestRisingStar.netTotalApy.toFixed(2)}% APY and strong momentum.`,
          impact: `+${(bestRisingStar.netTotalApy - avgUserApy).toFixed(2)}% potential APY gain`,
          action: {
            label: "View Rising Stars",
            href: "/discover",
          },
          suggestedValidator: {
            voteAccount: bestRisingStar.voteAccount,
            name: bestRisingStar.name,
            apy: bestRisingStar.netTotalApy,
          },
          createdAt: new Date(),
        });
      }
    }
  }

  // 3. Whale Concentration Warning
  const whaleStake = userStakes.reduce((sum, s) => {
    const v = userValidatorMap.get(s.validator.voteAccount);
    if (v && v.stakeSol > 500000) { // >500k SOL = whale
      return sum + s.solAmount;
    }
    return sum;
  }, 0);
  
  const whalePercent = totalStakedSol > 0 ? (whaleStake / totalStakedSol) * 100 : 0;
  
  if (whalePercent >= THRESHOLDS.WHALE_CONCENTRATION_PERCENT) {
    triggers.push({
      id: "whale-concentration",
      type: "whale_concentration",
      severity: "warning",
      title: "⚠️ Concentrated in Large Validators",
      description: `${whalePercent.toFixed(0)}% of your stake is with whale validators (>500k SOL). MEV rewards are heavily diluted.`,
      impact: "Lower effective yield due to MEV dilution",
      action: {
        label: "Find Smaller Validators",
        href: "/route?decentralization=strong",
      },
      createdAt: new Date(),
    });
  }

  // 4. Commission Change Detection (if previous snapshot available)
  if (previousSnapshot) {
    const prevMap = new Map(previousSnapshot.map(v => [v.voteAccount, v]));
    
    for (const stake of userStakes) {
      const current = userValidatorMap.get(stake.validator.voteAccount);
      const previous = prevMap.get(stake.validator.voteAccount);
      
      if (current && previous) {
        const commissionIncrease = current.stakeCommission - previous.stakeCommission;
        const mevCommissionIncrease = (current.mevCommission - previous.mevCommission) / 100; // Convert bps to %
        
        if (commissionIncrease >= THRESHOLDS.COMMISSION_INCREASE_ALERT || mevCommissionIncrease >= THRESHOLDS.COMMISSION_INCREASE_ALERT) {
          triggers.push({
            id: `commission-change-${stake.pubkey.slice(0, 8)}`,
            type: "commission_increase",
            severity: commissionIncrease >= 5 || mevCommissionIncrease >= 10 ? "critical" : "warning",
            title: "🚨 Commission Increased",
            description: `${current.name || "Your validator"} increased commission from ${previous.stakeCommission}% to ${current.stakeCommission}%${mevCommissionIncrease > 0 ? ` (MEV: +${mevCommissionIncrease.toFixed(1)}%)` : ""}.`,
            impact: `-${(commissionIncrease * 0.07).toFixed(2)}% effective APY`,
            action: {
              label: "Find Alternative",
              href: `/route?amount=${Math.ceil(stake.solAmount)}`,
            },
            affectedStake: {
              voteAccount: stake.validator.voteAccount,
              name: current.name,
              amount: stake.solAmount,
            },
            createdAt: new Date(),
          });
        }
      }
    }
  }

  // 5. Non-viable Validator Warning
  for (const stake of userStakes) {
    const validator = userValidatorMap.get(stake.validator.voteAccount);
    if (validator && !validator.isViable) {
      triggers.push({
        id: `nonviable-${stake.pubkey.slice(0, 8)}`,
        type: "deactivation_warning",
        severity: "critical",
        title: "🚫 Validator Not Viable",
        description: `${validator.name || "Your validator"} has very high commission or is delinquent. You may be earning little to no rewards.`,
        impact: "Potentially 0% effective yield",
        action: {
          label: "Switch Now",
          href: `/route?amount=${Math.ceil(stake.solAmount)}`,
        },
        affectedStake: {
          voteAccount: stake.validator.voteAccount,
          name: validator.name,
          amount: stake.solAmount,
        },
        createdAt: new Date(),
      });
    }
  }

  // ============ GENERATE RECOMMENDATIONS ============

  // Sort triggers by severity for recommendations
  const criticalTriggers = triggers.filter(t => t.severity === "critical");
  const warningTriggers = triggers.filter(t => t.severity === "warning");

  // Top recommendation: Switch from worst to best
  if (criticalTriggers.length > 0 && bestValidator) {
    const worst = criticalTriggers[0];
    if (worst.affectedStake) {
      recommendations.push({
        id: "switch-critical",
        priority: 1,
        type: "switch",
        title: `Urgent: Switch from ${worst.affectedStake.name || "underperforming validator"}`,
        description: worst.description,
        expectedGain: {
          apyIncrease: bestValidator.netTotalApy - (userValidatorMap.get(worst.affectedStake.voteAccount)?.netTotalApy || 6.5),
          annualSolGain: (worst.affectedStake.amount * (bestValidator.netTotalApy - 6.5)) / 100,
        },
        steps: [
          "Deactivate current stake (takes ~2 days)",
          "Wait for cooldown period",
          `Stake with ${bestValidator.name || "recommended validator"}`,
        ],
        validators: {
          from: { voteAccount: worst.affectedStake.voteAccount, name: worst.affectedStake.name },
          to: { voteAccount: bestValidator.voteAccount, name: bestValidator.name, apy: bestValidator.netTotalApy },
        },
      });
    }
  }

  // Diversification recommendation
  if (userStakes.length < 3 && totalStakedSol > 100) {
    const diversifyTargets = topValidators.slice(0, 3).filter(v => 
      !userStakes.some(s => s.validator.voteAccount === v.voteAccount)
    );
    
    if (diversifyTargets.length > 0) {
      recommendations.push({
        id: "diversify",
        priority: userStakes.length === 1 ? 2 : 3,
        type: "diversify",
        title: "Diversify Your Stakes",
        description: `You only have ${userStakes.length} stake account(s). Spreading across 3-5 validators reduces risk.`,
        expectedGain: {
          apyIncrease: 0.3,
          annualSolGain: (totalStakedSol * 0.3) / 100,
        },
        steps: [
          "Split your stake across multiple validators",
          "Mix large stable validators with Rising Stars",
          "Consider different geographic locations",
        ],
        validators: {
          to: { 
            voteAccount: diversifyTargets[0].voteAccount, 
            name: diversifyTargets[0].name, 
            apy: diversifyTargets[0].netTotalApy 
          },
        },
      });
    }
  }

  // Rising Star recommendation
  if (bestRisingStar && whalePercent > 50) {
    recommendations.push({
      id: "add-rising-star",
      priority: 3,
      type: "new_stake",
      title: "Add a Rising Star",
      description: "Small validators often have higher effective yields due to less MEV dilution.",
      expectedGain: {
        apyIncrease: bestRisingStar.netTotalApy - 7,
        annualSolGain: (totalStakedSol * 0.2 * (bestRisingStar.netTotalApy - 7)) / 100,
      },
      steps: [
        "Allocate 20-30% of stake to Rising Stars",
        "Monitor their performance monthly",
        "Rebalance if they grow too large",
      ],
      validators: {
        to: { voteAccount: bestRisingStar.voteAccount, name: bestRisingStar.name, apy: bestRisingStar.netTotalApy },
      },
    });
  }

  // ============ CALCULATE SUMMARY ============

  const potentialGainSol = (totalStakedSol * totalPotentialGainApy) / 100;
  
  // Health score: 100 = optimal, lower = needs attention
  let healthScore = 100;
  healthScore -= criticalTriggers.length * 20;
  healthScore -= warningTriggers.length * 10;
  healthScore -= Math.max(0, whalePercent - 50) * 0.5;
  if (userStakes.length === 1) healthScore -= 10;
  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    triggers: triggers.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    summary: {
      totalTriggers: triggers.length,
      criticalCount: criticalTriggers.length,
      warningCount: warningTriggers.length,
      potentialGainApy: totalPotentialGainApy,
      potentialGainSol,
      healthScore,
    },
    recommendations: recommendations.sort((a, b) => a.priority - b.priority),
  };
}

/**
 * Get a human-readable health status
 */
export function getHealthStatus(score: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (score >= 90) return { label: "Excellent", color: "text-green-400", emoji: "🟢" };
  if (score >= 70) return { label: "Good", color: "text-blue-400", emoji: "🔵" };
  if (score >= 50) return { label: "Needs Attention", color: "text-yellow-400", emoji: "🟡" };
  if (score >= 30) return { label: "Suboptimal", color: "text-orange-400", emoji: "🟠" };
  return { label: "Critical", color: "text-red-400", emoji: "🔴" };
}
