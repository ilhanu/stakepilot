/**
 * StakeWiz API Client
 * 
 * Fetches comprehensive validator data including scores, APY, and performance metrics.
 * API: https://api.stakewiz.com/validators
 */

export interface StakeWizValidator {
  rank: number;
  vote_identity: string;
  identity: string;
  name: string;
  website?: string;
  description?: string;
  image?: string;
  
  // Stake info
  activated_stake: number;  // In SOL (not lamports)
  stake_weight: number;
  above_halt_line: boolean;
  
  // Commission
  commission: number;
  is_jito: boolean;
  jito_commission_bps: number;
  
  // Performance
  delinquent: boolean;
  uptime: number;
  skip_rate: number;
  wiz_skip_rate: number;
  vote_success: number;
  
  // Scores
  wiz_score: number;
  vote_success_score: number;
  skip_rate_score: number;
  info_score: number;
  commission_score: number;
  stake_weight_score: number;
  uptime_score: number;
  
  // APY
  apy_estimate: number;
  staking_apy: number;
  jito_apy?: number;
  total_apy: number;
  
  // Location
  ip_city?: string;
  ip_country?: string;
  asn?: string;
  asn_concentration: number;
  city_concentration: number;
  
  // Version
  version: string;
  version_valid: boolean;
  
  // Epoch info
  epoch: number;
  first_epoch_with_stake: number;
}

// Cache for validators
let validatorsCache: StakeWizValidator[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all validators from StakeWiz
 */
export async function fetchStakeWizValidators(): Promise<StakeWizValidator[]> {
  // Return cache if still valid
  if (validatorsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return validatorsCache;
  }

  const response = await fetch("https://api.stakewiz.com/validators", {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`StakeWiz API error: ${response.status}`);
  }

  const data = await response.json();
  validatorsCache = data;
  cacheTimestamp = Date.now();
  
  return data;
}

/**
 * Get validators matching Staker Space criteria
 * - Stake < 1M SOL (decentralization)
 * - Commission ≤ 5%
 * - MEV Commission ≤ 10% (1000 bps)
 * - Uptime > 95%
 * - Not delinquent
 * - Always include Staker Space
 */
export async function getQualifiedValidators(): Promise<StakeWizValidator[]> {
  const allValidators = await fetchStakeWizValidators();
  
  const STAKER_SPACE_VOTE = "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru";
  
  const qualified = allValidators.filter((v) => {
    // Always include Staker Space
    if (v.vote_identity === STAKER_SPACE_VOTE) return true;
    
    // Apply criteria
    if (v.delinquent) return false;
    if (v.activated_stake >= 1_000_000) return false;
    if (v.commission > 5) return false;
    if (v.is_jito && v.jito_commission_bps > 1000) return false;
    if (v.uptime < 95) return false;
    
    return true;
  });
  
  // Sort by wiz_score (higher is better)
  qualified.sort((a, b) => b.wiz_score - a.wiz_score);
  
  return qualified;
}

/**
 * Calculate NET APY for a validator (what staker actually receives)
 */
export function calculateNetApy(validator: StakeWizValidator): number {
  // Base staking APY after commission
  const netStakingApy = validator.staking_apy * (1 - validator.commission / 100);
  
  // MEV APY after Jito commission (if Jito)
  let netMevApy = 0;
  if (validator.is_jito && validator.jito_apy) {
    netMevApy = validator.jito_apy * (1 - validator.jito_commission_bps / 10000);
  }
  
  return netStakingApy + netMevApy;
}

/**
 * Score a validator for the Staker Space algorithm
 */
export function scoreValidator(v: StakeWizValidator): number {
  let score = 0;
  
  const STAKER_SPACE_VOTE = "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru";
  
  // Staker Space bonus (always include)
  if (v.vote_identity === STAKER_SPACE_VOTE) {
    score += 100;
  }
  
  // Decentralization bonus (stake < 1M = +30 points)
  if (v.activated_stake < 100_000) score += 40;
  else if (v.activated_stake < 500_000) score += 30;
  else if (v.activated_stake < 1_000_000) score += 15;
  
  // Commission score (0% = +25, 5% = +15, 10% = 0)
  score += Math.max(0, 25 - v.commission * 2.5);
  
  // MEV commission score (0% = +20, 10% = +10, 100% = 0)
  if (v.is_jito) {
    const mevCommPct = v.jito_commission_bps / 100;
    score += Math.max(0, 20 - mevCommPct * 0.2);
  }
  
  // Uptime score (100% = +15, 95% = +7.5)
  score += Math.max(0, (v.uptime - 90) * 1.5);
  
  // WizScore bonus (top tier validators)
  if (v.wiz_score >= 95) score += 10;
  else if (v.wiz_score >= 90) score += 5;
  
  // APY bonus
  const netApy = calculateNetApy(v);
  if (netApy >= 7) score += 10;
  else if (netApy >= 6) score += 5;
  
  return score;
}

/**
 * Get top validators ranked by our scoring algorithm
 */
export async function getTopValidators(limit = 20): Promise<StakeWizValidator[]> {
  const qualified = await getQualifiedValidators();
  
  // Score and sort
  const scored = qualified.map((v) => ({
    validator: v,
    score: scoreValidator(v),
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, limit).map((s) => s.validator);
}

/**
 * Get validator by vote account
 */
export async function getValidator(voteAccount: string): Promise<StakeWizValidator | null> {
  const validators = await fetchStakeWizValidators();
  return validators.find((v) => v.vote_identity === voteAccount) || null;
}

/**
 * Search validators by name
 */
export async function searchValidators(query: string): Promise<StakeWizValidator[]> {
  const validators = await fetchStakeWizValidators();
  const lowerQuery = query.toLowerCase();
  
  return validators.filter(
    (v) =>
      v.name?.toLowerCase().includes(lowerQuery) ||
      v.vote_identity.toLowerCase().includes(lowerQuery)
  );
}
