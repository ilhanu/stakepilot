/**
 * MEV Prediction Engine
 * 
 * Predicts future MEV performance for validators based on historical trends.
 * Identifies "Rising Stars" - small validators with strong upward momentum.
 * 
 * CRITICAL: All yields are calculated as NET TO STAKER (after commissions).
 * This is what stakers actually earn, not what validators earn.
 */

import { getValidatorRewards, getBamValidators, ValidatorReward, BamValidator } from './jito';
import { getStakeCommissions } from './solana';
import { fetchAllValidatorsFromStakeWiz } from './validator-names';

// Solana base staking APY (approximate, from inflation)
const BASE_STAKING_APY = 7.0; // ~7% base inflation rewards

export interface ValidatorHistory {
  voteAccount: string;
  name: string | null;
  activeStake: number;
  mevCommission: number; // 0-10000 (basis points) from Jito
  history: {
    epoch: number;
    mevRevenue: number;
    mevRevenueSol: number;
  }[];
}

export interface MevPrediction {
  voteAccount: string;
  name: string | null;
  activeStake: number;
  stakeSol: number;
  currentMevSol: number;
  predictedMevSol: number;
  confidence: number;
  trend: 'rising' | 'stable' | 'falling';
  trendStrength: number; // 0-100
  momentum: number; // rate of change
  volatility: number; // how consistent
  isRisingStar: boolean;
  decentralizationScore: number; // 0-100, higher = more decentralizing choice
  mevEfficiency: number; // MEV per stake ratio
  epochsAnalyzed: number;
  history: { epoch: number; mevSol: number }[];
  
  // COMMISSION DATA (NEW)
  stakeCommission: number;      // 0-100 (%) on base staking rewards
  mevCommission: number;        // 0-10000 (bps) on MEV rewards
  
  // STAKER NET YIELDS (NEW - what stakers actually earn)
  grossBaseApy: number;         // ~7% base inflation
  grossMevApy: number;          // Calculated from MEV revenue
  netBaseApy: number;           // grossBase * (1 - stakeCommission/100)
  netMevApy: number;            // grossMev * (1 - mevCommission/10000)
  netTotalApy: number;          // netBase + netMev
  
  // VIABILITY FLAGS (NEW)
  isViable: boolean;            // false if commission too high for stakers
  commissionWarning: string | null; // "High commission (50%)" etc.
}

export interface PredictionStats {
  currentEpoch: number;
  predictionsCount: number;
  risingStarsCount: number;
  medianStake: number;
  medianMev: number;
  topPredictedMev: number;
  totalNetworkMev: number;
  backtestAccuracy?: number;
}

// Fetch historical MEV data for multiple epochs
export async function getHistoricalMevData(
  currentEpoch: number,
  numEpochs: number = 15
): Promise<Map<string, ValidatorHistory>> {
  const validatorMap = new Map<string, ValidatorHistory>();
  const epochs = [];
  
  // Fetch data for last N epochs (skip current as it may be incomplete)
  for (let i = 1; i <= numEpochs; i++) {
    epochs.push(currentEpoch - i);
  }

  // Fetch all epochs in parallel (batched to avoid rate limits)
  const batchSize = 5;
  for (let i = 0; i < epochs.length; i += batchSize) {
    const batch = epochs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (epoch) => {
        try {
          const [rewards, bamValidators] = await Promise.all([
            getValidatorRewards(epoch),
            getBamValidators(epoch),
          ]);
          return { epoch, rewards, bamValidators };
        } catch (e) {
          console.warn(`Failed to fetch epoch ${epoch}:`, e);
          return { epoch, rewards: [], bamValidators: [] };
        }
      })
    );

    for (const { epoch, rewards, bamValidators } of results) {
      const bamLookup = new Map(bamValidators.map(v => [v.vote_account, v]));
      
      for (const reward of rewards) {
        if (!validatorMap.has(reward.vote_account)) {
          const bam = bamLookup.get(reward.vote_account);
          validatorMap.set(reward.vote_account, {
            voteAccount: reward.vote_account,
            name: bam?.name || null,
            activeStake: bam?.active_stake || 0,
            mevCommission: reward.mev_commission, // MEV commission in bps (0-10000)
            history: [],
          });
        }
        
        const validator = validatorMap.get(reward.vote_account)!;
        // Update to most recent data
        const bam = bamLookup.get(reward.vote_account);
        if (bam && bam.active_stake > 0) {
          validator.activeStake = bam.active_stake;
          validator.name = bam.name || validator.name;
        }
        // Update MEV commission to most recent
        validator.mevCommission = reward.mev_commission;
        
        validator.history.push({
          epoch,
          mevRevenue: reward.mev_revenue,
          mevRevenueSol: reward.mev_revenue / 1_000_000_000,
        });
      }
    }
  }

  // Sort histories by epoch
  for (const validator of validatorMap.values()) {
    validator.history.sort((a, b) => a.epoch - b.epoch);
  }

  return validatorMap;
}

// Calculate trend using linear regression
function calculateTrend(values: number[]): { slope: number; r2: number } {
  if (values.length < 2) return { slope: 0, r2: 0 };
  
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = values[i] - yMean;
    numerator += xDiff * yDiff;
    denomX += xDiff * xDiff;
    denomY += yDiff * yDiff;
  }
  
  const slope = denomX !== 0 ? numerator / denomX : 0;
  const r2 = (denomX !== 0 && denomY !== 0) 
    ? (numerator * numerator) / (denomX * denomY) 
    : 0;
  
  return { slope, r2 };
}

// Calculate volatility (coefficient of variation)
function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev / mean; // CV
}

// Exponentially weighted moving average
function ewma(values: number[], alpha: number = 0.3): number {
  if (values.length === 0) return 0;
  
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

// Predict next epoch MEV using weighted historical average + trend
function predictMev(history: number[], trend: { slope: number; r2: number }): number {
  if (history.length === 0) return 0;
  
  // Base prediction: exponentially weighted recent values
  const basePredict = ewma(history, 0.4);
  
  // Trend adjustment: use slope weighted by R² (confidence)
  const trendAdjust = trend.slope * trend.r2;
  
  // Final prediction: base + trend, but never negative
  return Math.max(0, basePredict + trendAdjust);
}

/**
 * Calculate commission warning message
 */
function getCommissionWarning(stakeCommission: number, mevCommission: number): string | null {
  // mevCommission is in basis points (0-10000)
  const mevCommissionPercent = mevCommission / 100;
  
  if (mevCommission >= 10000) {
    return "🚫 100% MEV commission - stakers get ZERO MEV rewards";
  }
  if (stakeCommission >= 100) {
    return "🚫 100% stake commission - stakers get ZERO base rewards";
  }
  if (mevCommission >= 5000 || stakeCommission >= 50) {
    return `⚠️ High commission (${stakeCommission}% stake, ${mevCommissionPercent.toFixed(0)}% MEV)`;
  }
  if (mevCommission >= 2000 || stakeCommission >= 20) {
    return `⚡ Elevated commission (${stakeCommission}% stake, ${mevCommissionPercent.toFixed(0)}% MEV)`;
  }
  return null;
}

/**
 * Calculate gross MEV APY from MEV revenue
 * Assumes ~73 epochs per year, converts MEV SOL to APY based on stake
 */
function calculateMevApy(mevSolPerEpoch: number, stakeSol: number): number {
  if (stakeSol <= 0) return 0;
  const epochsPerYear = 73; // ~5 days per epoch
  const yearlyMev = mevSolPerEpoch * epochsPerYear;
  return (yearlyMev / stakeSol) * 100;
}

// Generate predictions for all validators
export async function generatePredictions(
  currentEpoch: number,
  numEpochs: number = 15
): Promise<{ predictions: MevPrediction[]; stats: PredictionStats }> {
  // Fetch historical data AND stake commissions in parallel
  const [historicalData, stakeCommissions] = await Promise.all([
    getHistoricalMevData(currentEpoch, numEpochs),
    getStakeCommissions(),
  ]);
  
  const predictions: MevPrediction[] = [];
  let totalNetworkMev = 0;
  const allStakes: number[] = [];
  const allMevs: number[] = [];

  for (const [voteAccount, validator] of historicalData) {
    if (validator.history.length < 3) continue; // Need at least 3 epochs
    
    const mevValues = validator.history.map(h => h.mevRevenueSol);
    const currentMev = mevValues[mevValues.length - 1] || 0;
    
    // Calculate trend
    const trend = calculateTrend(mevValues);
    const volatility = calculateVolatility(mevValues);
    
    // Predict next epoch
    const predictedMev = predictMev(mevValues, trend);
    
    // Confidence based on data quality and consistency
    const dataQuality = Math.min(validator.history.length / 10, 1); // More data = better
    const consistency = Math.max(0, 1 - volatility); // Lower volatility = more confident
    const trendConfidence = trend.r2;
    const confidence = (dataQuality * 0.3 + consistency * 0.4 + trendConfidence * 0.3) * 100;
    
    // Determine trend category
    const trendThreshold = 0.05; // 5% change per epoch
    const avgMev = mevValues.reduce((a, b) => a + b, 0) / mevValues.length;
    const normalizedSlope = avgMev > 0 ? trend.slope / avgMev : 0;
    
    let trendCategory: 'rising' | 'stable' | 'falling';
    if (normalizedSlope > trendThreshold) {
      trendCategory = 'rising';
    } else if (normalizedSlope < -trendThreshold) {
      trendCategory = 'falling';
    } else {
      trendCategory = 'stable';
    }
    
    // Trend strength: how steep is the trend
    const trendStrength = Math.min(100, Math.abs(normalizedSlope) * 500);
    
    // MEV efficiency (MEV per SOL staked)
    const stakeSol = validator.activeStake / 1_000_000_000;
    const mevEfficiency = stakeSol > 0 ? (currentMev / stakeSol) * 1000 : 0;
    
    totalNetworkMev += currentMev;
    if (validator.activeStake > 0) allStakes.push(stakeSol);
    if (currentMev > 0) allMevs.push(currentMev);
    
    // ========== COMMISSION & NET YIELD CALCULATIONS ==========
    
    // Get commission rates
    const stakeCommission = stakeCommissions.get(voteAccount) ?? 10; // Default 10% if unknown
    const mevCommission = validator.mevCommission ?? 0; // From Jito, in basis points (0-10000)
    
    // Calculate GROSS yields (what validator earns)
    const grossBaseApy = BASE_STAKING_APY; // ~7%
    const grossMevApy = calculateMevApy(currentMev, stakeSol);
    
    // Calculate NET yields (what STAKER actually earns after commissions)
    const netBaseApy = grossBaseApy * (1 - stakeCommission / 100);
    const netMevApy = grossMevApy * (1 - mevCommission / 10000);
    const netTotalApy = netBaseApy + netMevApy;
    
    // Determine viability for stakers
    // A validator is NOT viable if stakers earn essentially nothing
    const isViable = !(
      mevCommission >= 10000 || // 100% MEV commission
      stakeCommission >= 100 || // 100% stake commission
      (mevCommission >= 5000 && stakeCommission >= 50) // Both very high
    );
    
    const commissionWarning = getCommissionWarning(stakeCommission, mevCommission);
    
    predictions.push({
      voteAccount,
      name: validator.name,
      activeStake: validator.activeStake,
      stakeSol,
      currentMevSol: currentMev,
      predictedMevSol: predictedMev,
      confidence,
      trend: trendCategory,
      trendStrength,
      momentum: normalizedSlope * 100,
      volatility: volatility * 100,
      isRisingStar: false, // Will be set later
      decentralizationScore: 0, // Will be set later
      mevEfficiency,
      epochsAnalyzed: validator.history.length,
      history: validator.history.map(h => ({ epoch: h.epoch, mevSol: h.mevRevenueSol })),
      
      // Commission data
      stakeCommission,
      mevCommission,
      
      // Net yields (what stakers actually earn)
      grossBaseApy,
      grossMevApy,
      netBaseApy,
      netMevApy,
      netTotalApy,
      
      // Viability
      isViable,
      commissionWarning,
    });
  }

  // Calculate medians for rising star identification
  const sortedStakes = [...allStakes].sort((a, b) => a - b);
  const sortedMevs = [...allMevs].sort((a, b) => a - b);
  const medianStake = sortedStakes[Math.floor(sortedStakes.length / 2)] || 0;
  const medianMev = sortedMevs[Math.floor(sortedMevs.length / 2)] || 0;
  const totalStake = allStakes.reduce((a, b) => a + b, 0);

  // Identify rising stars and calculate decentralization scores
  for (const pred of predictions) {
    // Rising Star criteria - MUST be viable for stakers!
    const isBelowMedianStake = pred.stakeSol < medianStake;
    const isRising = pred.trend === 'rising' && pred.trendStrength > 20;
    const hasDecentMev = pred.currentMevSol > medianMev * 0.5;
    const hasReasonableCommission = pred.mevCommission < 5000 && pred.stakeCommission < 30;
    const hasDecentNetYield = pred.netTotalApy >= 5; // At least 5% net APY
    
    // CRITICAL: Only mark as Rising Star if stakers actually benefit!
    pred.isRisingStar = isBelowMedianStake && isRising && hasDecentMev && 
                        hasReasonableCommission && hasDecentNetYield && pred.isViable;
    
    // Decentralization score: inverse of stake concentration
    // Higher score = staking here helps decentralization more
    const stakePercentage = totalStake > 0 ? (pred.stakeSol / totalStake) * 100 : 0;
    if (stakePercentage > 1) {
      // Penalize over-concentrated validators
      pred.decentralizationScore = Math.max(0, 50 - (stakePercentage - 1) * 20);
    } else if (stakePercentage > 0.5) {
      // Medium validators
      pred.decentralizationScore = 50 + (1 - stakePercentage) * 30;
    } else {
      // Small validators get a bonus
      pred.decentralizationScore = 80 + (0.5 - stakePercentage) * 40;
    }
    pred.decentralizationScore = Math.min(100, Math.max(0, pred.decentralizationScore));
  }

  // Sort by NET TOTAL APY (what stakers actually earn) - descending
  predictions.sort((a, b) => b.netTotalApy - a.netTotalApy);

  // Enrich with validator names/info from StakeWiz
  try {
    const validatorInfo = await fetchAllValidatorsFromStakeWiz();
    for (const pred of predictions) {
      const info = validatorInfo.get(pred.voteAccount);
      if (info) {
        // Use StakeWiz name if available (overrides BAM name which is often null)
        if (info.name) {
          pred.name = info.name;
        }
      }
    }
  } catch (e) {
    console.warn('Could not enrich with StakeWiz data:', e);
    // Continue without enrichment - names will be null or from BAM
  }

  const stats: PredictionStats = {
    currentEpoch,
    predictionsCount: predictions.length,
    risingStarsCount: predictions.filter(p => p.isRisingStar).length,
    medianStake,
    medianMev,
    topPredictedMev: predictions[0]?.predictedMevSol || 0,
    totalNetworkMev,
  };

  return { predictions, stats };
}

// Get just rising stars - filtered for staker viability
export async function getRisingStars(
  currentEpoch: number,
  numEpochs: number = 15,
  limit: number = 20
): Promise<MevPrediction[]> {
  const { predictions } = await generatePredictions(currentEpoch, numEpochs);
  
  return predictions
    .filter(p => {
      // MUST be marked as rising star (already includes viability check)
      if (!p.isRisingStar) return false;
      
      // Double-check viability for stakers
      if (!p.isViable) return false;
      
      // Exclude 100% MEV commission (staker gets ZERO MEV)
      if (p.mevCommission >= 10000) return false;
      
      // Exclude very high stake commission (>50%)
      if (p.stakeCommission > 50) return false;
      
      // Must have reasonable net yield (at least 5% APY to staker)
      if (p.netTotalApy < 5) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Sort by NET TOTAL APY (what staker earns) as primary factor
      // Secondary: trend strength and decentralization
      const scoreA = a.netTotalApy * 0.5 + a.trendStrength * 0.25 + a.decentralizationScore * 0.25;
      const scoreB = b.netTotalApy * 0.5 + b.trendStrength * 0.25 + b.decentralizationScore * 0.25;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

// Backtest predictions against actual data
export async function backtestPredictions(
  currentEpoch: number,
  testEpochs: number = 5
): Promise<{ accuracy: number; details: { epoch: number; predicted: number; actual: number; error: number }[] }> {
  const details: { epoch: number; predicted: number; actual: number; error: number }[] = [];
  
  for (let i = testEpochs; i >= 1; i--) {
    const testEpoch = currentEpoch - i;
    
    // Generate predictions as if we were at testEpoch - 1
    const { predictions } = await generatePredictions(testEpoch - 1, 10);
    
    // Get actual data for testEpoch
    try {
      const actualRewards = await getValidatorRewards(testEpoch);
      const actualTotal = actualRewards.reduce((sum, r) => sum + r.mev_revenue, 0) / 1e9;
      const predictedTotal = predictions.reduce((sum, p) => sum + p.predictedMevSol, 0);
      
      const error = predictedTotal > 0 
        ? Math.abs(actualTotal - predictedTotal) / actualTotal 
        : 1;
      
      details.push({
        epoch: testEpoch,
        predicted: predictedTotal,
        actual: actualTotal,
        error,
      });
    } catch (e) {
      console.warn(`Backtest failed for epoch ${testEpoch}:`, e);
    }
  }
  
  // Average accuracy (1 - error)
  const avgError = details.length > 0
    ? details.reduce((sum, d) => sum + d.error, 0) / details.length
    : 1;
  
  return {
    accuracy: Math.max(0, (1 - avgError) * 100),
    details,
  };
}
