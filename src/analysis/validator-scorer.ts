/**
 * Validator Scoring Algorithm
 * 
 * Combines multiple factors to score validators for optimal staking:
 * - MEV earnings (JIP-31 data)
 * - Commission rate
 * - Uptime / skip rate
 * - Stake concentration
 * - Historical performance
 */

import { ValidatorMevStats } from '../data/jito-mev';

// ============================================
// Types
// ============================================

export interface ValidatorInfo {
  voteAccount: string;
  identityAccount: string;
  name: string | null;
  commission: number; // 0-100
  activatedStake: number; // lamports
  lastVote: number;
  rootSlot: number;
  epochCredits: number;
  skipRate: number; // 0-1
  version: string;
}

export interface ValidatorScore {
  voteAccount: string;
  name: string | null;
  
  // Component scores (0-100)
  mevScore: number;
  commissionScore: number;
  uptimeScore: number;
  concentrationScore: number;
  performanceScore: number;
  
  // Final score (0-100)
  totalScore: number;
  
  // Yield estimates
  baseApy: number;      // Standard staking rewards
  mevApy: number;       // MEV earnings
  effectiveApy: number; // After commission
  totalApy: number;     // Combined
  
  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  
  // Recommendation
  recommendation: 'strong-stake' | 'stake' | 'hold' | 'unstake' | 'avoid';
  reasoning: string;
}

export interface ScoringWeights {
  mev: number;
  commission: number;
  uptime: number;
  concentration: number;
  performance: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_WEIGHTS: ScoringWeights = {
  mev: 0.30,         // MEV is a big differentiator
  commission: 0.25,  // Commission directly impacts yield
  uptime: 0.20,      // Reliability matters
  concentration: 0.15, // Decentralization factor
  performance: 0.10, // Historical performance
};

// Current base staking APY for Solana (approximate)
const BASE_STAKING_APY = 6.5;

// Total network stake for concentration calculation
const TOTAL_NETWORK_STAKE = 400_000_000 * 1_000_000_000; // ~400M SOL in lamports

// ============================================
// Scoring Functions
// ============================================

/**
 * Score MEV earnings (0-100)
 * Higher MEV = higher score
 */
function scoreMev(mevStats: ValidatorMevStats | null, allStats: ValidatorMevStats[]): number {
  if (!mevStats || allStats.length === 0) return 0;
  
  // Percentile-based scoring
  const sorted = [...allStats].sort((a, b) => b.mevApy - a.mevApy);
  const rank = sorted.findIndex(s => s.voteAccount === mevStats.voteAccount);
  
  if (rank === -1) return 0;
  
  // Top 10% = 90-100, Top 25% = 70-89, etc.
  const percentile = 1 - (rank / sorted.length);
  return Math.round(percentile * 100);
}

/**
 * Score commission (0-100)
 * Lower commission = higher score
 */
function scoreCommission(commission: number): number {
  // 0% commission = 100 score
  // 10% commission = 0 score
  // Linear interpolation
  if (commission <= 0) return 100;
  if (commission >= 10) return 0;
  return Math.round(100 - (commission * 10));
}

/**
 * Score uptime (0-100)
 * Lower skip rate = higher score
 */
function scoreUptime(skipRate: number): number {
  // 0% skip rate = 100 score
  // 5%+ skip rate = 0 score
  if (skipRate <= 0) return 100;
  if (skipRate >= 0.05) return 0;
  return Math.round(100 - (skipRate * 2000));
}

/**
 * Score stake concentration (0-100)
 * Less concentration = higher score (better for decentralization)
 */
function scoreConcentration(stake: number): number {
  const stakePercent = (stake / TOTAL_NETWORK_STAKE) * 100;
  
  // < 0.1% of stake = 100 (small, good for decentralization)
  // > 2% of stake = 0 (too concentrated)
  if (stakePercent <= 0.1) return 100;
  if (stakePercent >= 2) return 0;
  return Math.round(100 - (stakePercent * 50));
}

/**
 * Score historical performance (0-100)
 * Based on epoch credits relative to average
 */
function scorePerformance(epochCredits: number, avgCredits: number): number {
  if (avgCredits === 0) return 50;
  
  const ratio = epochCredits / avgCredits;
  
  // 120%+ of average = 100
  // 80% of average = 0
  if (ratio >= 1.2) return 100;
  if (ratio <= 0.8) return 0;
  return Math.round((ratio - 0.8) * 250);
}

/**
 * Calculate risk level and factors
 */
function assessRisk(
  validatorInfo: ValidatorInfo,
  mevStats: ValidatorMevStats | null
): { level: 'low' | 'medium' | 'high'; factors: string[] } {
  const factors: string[] = [];
  let riskPoints = 0;
  
  // High commission
  if (validatorInfo.commission > 5) {
    factors.push(`High commission: ${validatorInfo.commission}%`);
    riskPoints += 1;
  }
  
  // High skip rate
  if (validatorInfo.skipRate > 0.02) {
    factors.push(`High skip rate: ${(validatorInfo.skipRate * 100).toFixed(2)}%`);
    riskPoints += 1;
  }
  
  // Very low stake (new/unknown validator)
  const stakeInSol = validatorInfo.activatedStake / 1_000_000_000;
  if (stakeInSol < 10000) {
    factors.push(`Low stake: ${stakeInSol.toFixed(0)} SOL`);
    riskPoints += 1;
  }
  
  // Not BAM eligible (no MEV)
  if (mevStats && !mevStats.isBamEligible) {
    factors.push('Not BAM eligible - no MEV rewards');
    riskPoints += 1;
  }
  
  // No recent MEV
  if (mevStats && mevStats.lastEpochMev === 0) {
    factors.push('No MEV earned last epoch');
    riskPoints += 0.5;
  }
  
  // Very high concentration
  const stakePercent = (validatorInfo.activatedStake / TOTAL_NETWORK_STAKE) * 100;
  if (stakePercent > 1) {
    factors.push(`High concentration: ${stakePercent.toFixed(2)}% of network`);
    riskPoints += 0.5;
  }
  
  const level = riskPoints >= 3 ? 'high' : riskPoints >= 1.5 ? 'medium' : 'low';
  
  return { level, factors };
}

/**
 * Generate recommendation
 */
function generateRecommendation(
  totalScore: number,
  totalApy: number,
  riskLevel: 'low' | 'medium' | 'high'
): { recommendation: ValidatorScore['recommendation']; reasoning: string } {
  if (totalScore >= 80 && riskLevel === 'low') {
    return {
      recommendation: 'strong-stake',
      reasoning: `Excellent score (${totalScore}) with low risk. Top-tier validator with strong MEV earnings and reliable performance.`,
    };
  }
  
  if (totalScore >= 60 && riskLevel !== 'high') {
    return {
      recommendation: 'stake',
      reasoning: `Good score (${totalScore}) with acceptable risk. Solid choice for staking with estimated ${totalApy.toFixed(2)}% APY.`,
    };
  }
  
  if (totalScore >= 40) {
    return {
      recommendation: 'hold',
      reasoning: `Average score (${totalScore}). Consider if you're already staked, but better options may exist.`,
    };
  }
  
  if (totalScore >= 20) {
    return {
      recommendation: 'unstake',
      reasoning: `Below average score (${totalScore}). Consider moving stake to a better-performing validator.`,
    };
  }
  
  return {
    recommendation: 'avoid',
    reasoning: `Poor score (${totalScore}). High risk or poor performance. Avoid staking here.`,
  };
}

// ============================================
// Main Scoring Function
// ============================================

/**
 * Score a validator comprehensively
 */
export function scoreValidator(
  validatorInfo: ValidatorInfo,
  mevStats: ValidatorMevStats | null,
  allMevStats: ValidatorMevStats[],
  avgEpochCredits: number,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ValidatorScore {
  // Calculate component scores
  const mevScore = scoreMev(mevStats, allMevStats);
  const commissionScore = scoreCommission(validatorInfo.commission);
  const uptimeScore = scoreUptime(validatorInfo.skipRate);
  const concentrationScore = scoreConcentration(validatorInfo.activatedStake);
  const performanceScore = scorePerformance(validatorInfo.epochCredits, avgEpochCredits);
  
  // Calculate weighted total
  const totalScore = Math.round(
    mevScore * weights.mev +
    commissionScore * weights.commission +
    uptimeScore * weights.uptime +
    concentrationScore * weights.concentration +
    performanceScore * weights.performance
  );
  
  // Calculate APY estimates
  const baseApy = BASE_STAKING_APY;
  const mevApy = mevStats?.mevApy || 0;
  const effectiveApy = baseApy * (1 - validatorInfo.commission / 100);
  const totalApy = effectiveApy + mevApy;
  
  // Assess risk
  const { level: riskLevel, factors: riskFactors } = assessRisk(validatorInfo, mevStats);
  
  // Generate recommendation
  const { recommendation, reasoning } = generateRecommendation(totalScore, totalApy, riskLevel);
  
  return {
    voteAccount: validatorInfo.voteAccount,
    name: validatorInfo.name || mevStats?.name || null,
    
    mevScore,
    commissionScore,
    uptimeScore,
    concentrationScore,
    performanceScore,
    
    totalScore,
    
    baseApy,
    mevApy,
    effectiveApy,
    totalApy,
    
    riskLevel,
    riskFactors,
    
    recommendation,
    reasoning,
  };
}

/**
 * Score all validators and return ranked list
 */
export function scoreAllValidators(
  validators: ValidatorInfo[],
  mevStats: ValidatorMevStats[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ValidatorScore[] {
  // Create lookup for MEV stats
  const mevLookup = new Map(mevStats.map(s => [s.voteAccount, s]));
  
  // Calculate average epoch credits
  const avgEpochCredits = validators.reduce((sum, v) => sum + v.epochCredits, 0) / validators.length;
  
  // Score all validators
  const scores = validators.map(v => 
    scoreValidator(v, mevLookup.get(v.voteAccount) || null, mevStats, avgEpochCredits, weights)
  );
  
  // Sort by total score descending
  scores.sort((a, b) => b.totalScore - a.totalScore);
  
  return scores;
}

/**
 * Get top validators for staking
 */
export function getTopValidatorsForStaking(
  validators: ValidatorInfo[],
  mevStats: ValidatorMevStats[],
  limit: number = 20
): ValidatorScore[] {
  const allScores = scoreAllValidators(validators, mevStats);
  
  // Filter to only stake-worthy validators
  return allScores
    .filter(s => s.recommendation === 'strong-stake' || s.recommendation === 'stake')
    .slice(0, limit);
}
