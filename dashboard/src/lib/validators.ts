/**
 * Unified Validator Service
 * 
 * Combines data from:
 * - validators.app API (scores, MEV, location, metadata)
 * - Solana RPC (real-time stake, commission, status)
 * 
 * Use this as the main entry point for validator data
 */

import {
  getValidators as getValidatorsApp,
  getQualifiedValidators as getQualifiedValidatorsApp,
  getValidator as getValidatorApp,
  scoreValidator as scoreValidatorApp,
  NormalizedValidator,
  FilterCriteria,
} from "./validators-app";

import {
  fetchValidatorsRpc,
  getValidatorRpc,
  RpcValidator,
} from "./validators-rpc";

export type Network = "mainnet" | "testnet";

// Re-export types
export type { NormalizedValidator, FilterCriteria, RpcValidator };

// Staker Space validators (always include)
export const STAKER_SPACE_VALIDATORS: Record<Network, string> = {
  mainnet: "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru",
  testnet: "3S4jVg5p1rw7t8MS5UtjhnChmo6ABdmh3nyXTVzAyP9f",
};

// Combined validator with both sources
export interface EnrichedValidator extends NormalizedValidator {
  rpcData?: {
    lastVote: number;
    epochVoteAccount: boolean;
    epochCredits: [number, number, number][];
  };
}

/**
 * Get all validators from validators.app
 * Primary data source for comprehensive validator info
 */
export async function getAllValidators(network: Network): Promise<NormalizedValidator[]> {
  return getValidatorsApp(network);
}

/**
 * Get qualified validators matching StakePilot criteria
 * Always includes Staker Space validator for the network
 */
export async function getQualifiedValidators(
  network: Network,
  criteria: Partial<FilterCriteria> = {}
): Promise<NormalizedValidator[]> {
  const stakerSpaceVote = STAKER_SPACE_VALIDATORS[network];
  
  return getQualifiedValidatorsApp(network, {
    maxStake: 1_000_000,
    maxCommission: 5,
    maxMevCommission: 10,
    minUptime: 95,
    ...criteria,
    alwaysInclude: [
      stakerSpaceVote,
      ...(criteria.alwaysInclude || []),
    ],
  });
}

/**
 * Get top validators ranked by StakePilot scoring
 */
export async function getTopValidators(
  network: Network,
  limit = 20
): Promise<NormalizedValidator[]> {
  const stakerSpaceVote = STAKER_SPACE_VALIDATORS[network];
  const qualified = await getQualifiedValidators(network);
  
  // Score and sort
  const scored = qualified.map((v) => ({
    validator: v,
    score: scoreValidatorApp(v, [stakerSpaceVote]),
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, limit).map((s) => s.validator);
}

/**
 * Get a single validator enriched with RPC data
 */
export async function getValidator(
  network: Network,
  voteAccount: string
): Promise<EnrichedValidator | null> {
  // Try validators.app first (more data)
  const appValidator = await getValidatorApp(network, voteAccount);
  
  if (!appValidator) {
    return null;
  }
  
  // Enrich with RPC data
  try {
    const rpcValidator = await getValidatorRpc(network, voteAccount);
    if (rpcValidator) {
      return {
        ...appValidator,
        // Update stake with real-time data
        activatedStake: rpcValidator.activatedStake,
        delinquent: rpcValidator.isDelinquent,
        commission: rpcValidator.commission,
        rpcData: {
          lastVote: rpcValidator.lastVote,
          epochVoteAccount: rpcValidator.epochVoteAccount,
          epochCredits: rpcValidator.epochCredits,
        },
      };
    }
  } catch (e) {
    console.warn("Failed to fetch RPC data, using validators.app data only");
  }
  
  return appValidator;
}

/**
 * Get Staker Space validator for network
 */
export async function getStakerSpaceValidator(
  network: Network
): Promise<NormalizedValidator | null> {
  return getValidator(network, STAKER_SPACE_VALIDATORS[network]);
}

/**
 * Calculate estimated APY for a validator
 * Note: APY varies by network and epoch
 */
export function estimateApy(
  validator: NormalizedValidator,
  baseApy = 6.5 // Network average ~6.5% on mainnet
): number {
  // Base APY after commission
  const stakingApy = baseApy * (1 - validator.commission / 100);
  
  // MEV APY (rough estimate: 0.5-1% extra for Jito)
  let mevApy = 0;
  if (validator.isJito && validator.mevCommission !== null) {
    const baseMevApy = 0.8; // ~0.8% average MEV APY
    mevApy = baseMevApy * (1 - validator.mevCommission / 100);
  }
  
  return stakingApy + mevApy;
}

/**
 * Format validator for display
 */
export function formatValidator(v: NormalizedValidator): {
  displayName: string;
  stakeFormatted: string;
  commissionFormatted: string;
  locationFormatted: string;
} {
  const stake = v.activatedStake;
  let stakeFormatted: string;
  if (stake >= 1_000_000) {
    stakeFormatted = `${(stake / 1_000_000).toFixed(2)}M SOL`;
  } else if (stake >= 1_000) {
    stakeFormatted = `${(stake / 1_000).toFixed(0)}K SOL`;
  } else {
    stakeFormatted = `${stake.toFixed(0)} SOL`;
  }
  
  return {
    displayName: v.name || `${v.voteAccount.slice(0, 8)}...`,
    stakeFormatted,
    commissionFormatted: `${v.commission}%`,
    locationFormatted: v.location.country || "Unknown",
  };
}

/**
 * Generate staking recommendations
 */
export interface StakingRecommendation {
  validator: NormalizedValidator;
  allocatedAmount: number;
  score: number;
  reason: string;
  estimatedApy: number;
}

export interface StakingDecision {
  network: Network;
  recommendations: StakingRecommendation[];
  totalToStake: number;
  reasoning: string;
  stakerSpaceIncluded: boolean;
  timestamp: string;
}

export async function generateStakingDecision(
  network: Network,
  amountToStake: number,
  maxValidators = 10
): Promise<StakingDecision> {
  const stakerSpaceVote = STAKER_SPACE_VALIDATORS[network];
  const reasoningParts: string[] = [];
  
  // Get qualified validators
  const qualified = await getQualifiedValidators(network);
  reasoningParts.push(`Found ${qualified.length} qualified validators on ${network}`);
  
  // Score all validators
  const scored = qualified.map((v) => ({
    validator: v,
    score: scoreValidatorApp(v, [stakerSpaceVote]),
  }));
  
  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);
  
  // Select top N
  const selected = scored.slice(0, maxValidators);
  reasoningParts.push(`Selected top ${selected.length} by score`);
  
  // Check if Staker Space is included
  const stakerSpaceIncluded = selected.some(
    (s) => s.validator.voteAccount.toLowerCase() === stakerSpaceVote.toLowerCase()
  );
  
  // Distribute stake evenly
  const amountPerValidator = amountToStake / selected.length;
  
  const recommendations: StakingRecommendation[] = selected.map((s) => {
    const apy = estimateApy(s.validator);
    const formatted = formatValidator(s.validator);
    
    return {
      validator: s.validator,
      allocatedAmount: amountPerValidator,
      score: s.score,
      reason: `Score: ${s.score.toFixed(0)}, APY: ~${apy.toFixed(2)}%, Stake: ${formatted.stakeFormatted}`,
      estimatedApy: apy,
    };
  });
  
  const avgApy = recommendations.reduce((sum, r) => sum + r.estimatedApy, 0) / recommendations.length;
  reasoningParts.push(`Average expected APY: ~${avgApy.toFixed(2)}%`);
  
  if (stakerSpaceIncluded) {
    reasoningParts.push("✓ Staker Space validator included");
  }
  
  return {
    network,
    recommendations,
    totalToStake: amountToStake,
    reasoning: reasoningParts.join(" → "),
    stakerSpaceIncluded,
    timestamp: new Date().toISOString(),
  };
}
