/**
 * JIP-31 MEV Rewards Data Fetcher
 * 
 * Fetches block subsidy and MEV reward data from the Jito Kobe API.
 * JIP-31 started at epoch 912 - this is when validators began receiving
 * MEV rewards through the BAM (Block Auction Market) system.
 * 
 * API Base: https://kobe.mainnet.jito.network
 */

const JITO_KOBE_BASE = 'https://kobe.mainnet.jito.network';
const JIP31_START_EPOCH = 912;

// ============================================
// Types
// ============================================

export interface ValidatorReward {
  vote_account: string;
  mev_revenue: number; // in lamports
  mev_commission: number; // in bps (e.g., 700 = 7%)
  priority_fee_revenue: number;
  priority_fee_commission: number | null;
  num_stakers: number;
  epoch: number;
}

export interface BamValidator {
  vote_account: string;
  identity_account: string;
  name: string | null;
  active_stake: number;
  is_eligible: boolean;
  ineligibility_reason: string | null;
  score: number;
  epoch: number;
}

export interface BamBoostValidator {
  name: string | null;
  epoch: number;
  identity_account: string;
  amount: number; // subsidy in lamports
  claimed: boolean;
  claim_status_address: string;
}

export interface ValidatorMevStats {
  voteAccount: string;
  identityAccount: string;
  name: string | null;
  totalMevLamports: number;
  totalMevSol: number;
  avgMevPerEpoch: number;
  epochsWithRewards: number;
  lastEpochMev: number;
  mevApy: number; // Estimated APY from MEV alone
  isBamEligible: boolean;
}

export interface JitoSolRatio {
  data: number;
  date: string;
}

// ============================================
// API Functions
// ============================================

/**
 * Get current epoch from Solana
 */
export async function getCurrentEpoch(rpcUrl: string): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getEpochInfo',
    }),
  });
  
  const data = await response.json();
  return data.result.epoch;
}

/**
 * Fetch validator rewards for a specific epoch
 */
export async function getValidatorRewards(epoch: number): Promise<ValidatorReward[]> {
  const res = await fetch(`${JITO_KOBE_BASE}/api/v1/validator_rewards?epoch=${epoch}`);
  
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch validator rewards for epoch ${epoch}: ${res.status}`);
  }
  
  const data = await res.json() as { rewards: ValidatorReward[] };
  return data.rewards || [];
}

/**
 * Fetch BAM validators for an epoch
 */
export async function getBamValidators(epoch: number): Promise<BamValidator[]> {
  const res = await fetch(`${JITO_KOBE_BASE}/api/v1/bam_validators?epoch=${epoch}`);
  
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch BAM validators for epoch ${epoch}: ${res.status}`);
  }
  
  const data = await res.json() as { bam_validators: BamValidator[] };
  return data.bam_validators || [];
}

/**
 * Fetch BAM boost validators (includes claimed status)
 */
export async function getBamBoostValidators(epoch: number): Promise<BamBoostValidator[]> {
  const res = await fetch(`${JITO_KOBE_BASE}/api/v1/bam_boost_validators?epoch=${epoch}`);
  
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch BAM boost validators for epoch ${epoch}: ${res.status}`);
  }
  
  const data = await res.json() as { bam_boost_validators: BamBoostValidator[] };
  return data.bam_boost_validators || [];
}

/**
 * Fetch JitoSOL/SOL ratio for conversion
 */
export async function getJitoSolRatio(): Promise<number> {
  const res = await fetch(`${JITO_KOBE_BASE}/api/v1/jitosol_sol_ratio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch JitoSOL ratio: ${res.status}`);
  }
  
  const data = await res.json() as { ratios: JitoSolRatio[] };
  if (data.ratios?.length > 0) {
    const sorted = [...data.ratios].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].data;
  }
  
  return 1.25; // Fallback
}

// ============================================
// Analysis Functions
// ============================================

/**
 * Get comprehensive MEV stats for all validators
 * Aggregates data from JIP-31 start to current epoch
 */
export async function getAllValidatorMevStats(
  rpcUrl: string,
  lookbackEpochs: number = 10
): Promise<ValidatorMevStats[]> {
  const currentEpoch = await getCurrentEpoch(rpcUrl);
  const startEpoch = Math.max(JIP31_START_EPOCH, currentEpoch - lookbackEpochs);
  
  // Fetch data for each epoch in parallel (batched)
  const epochs = [];
  for (let e = startEpoch; e <= currentEpoch; e++) {
    epochs.push(e);
  }
  
  const validatorMap = new Map<string, {
    voteAccount: string;
    identityAccount: string;
    name: string | null;
    mevByEpoch: Map<number, number>;
    isBamEligible: boolean;
    stake: number;
  }>();
  
  // Batch fetch
  const batchSize = 3;
  for (let i = 0; i < epochs.length; i += batchSize) {
    const batch = epochs.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (epoch) => {
      try {
        const [rewards, bamValidators] = await Promise.all([
          getValidatorRewards(epoch),
          getBamValidators(epoch),
        ]);
        
        // Create lookup for BAM info
        const bamLookup = new Map(bamValidators.map(v => [v.vote_account, v]));
        
        // Process rewards
        for (const reward of rewards) {
          if (!validatorMap.has(reward.vote_account)) {
            const bamInfo = bamLookup.get(reward.vote_account);
            validatorMap.set(reward.vote_account, {
              voteAccount: reward.vote_account,
              identityAccount: bamInfo?.identity_account || '',
              name: bamInfo?.name || null,
              mevByEpoch: new Map(),
              isBamEligible: bamInfo?.is_eligible || false,
              stake: bamInfo?.active_stake || 0,
            });
          }
          
          const validator = validatorMap.get(reward.vote_account)!;
          validator.mevByEpoch.set(epoch, reward.mev_revenue);
          
          // Update BAM eligibility from latest data
          const bamInfo = bamLookup.get(reward.vote_account);
          if (bamInfo) {
            validator.isBamEligible = bamInfo.is_eligible;
            validator.stake = bamInfo.active_stake;
          }
        }
      } catch (error) {
        console.error(`Error fetching epoch ${epoch}:`, error);
      }
    }));
  }
  
  // Calculate stats
  const stats: ValidatorMevStats[] = [];
  
  for (const [voteAccount, data] of validatorMap) {
    const mevValues = Array.from(data.mevByEpoch.values());
    const totalMev = mevValues.reduce((sum, v) => sum + v, 0);
    const epochsWithRewards = mevValues.filter(v => v > 0).length;
    const lastEpochMev = data.mevByEpoch.get(currentEpoch) || 0;
    
    // Estimate MEV APY
    // Epochs are ~2.5 days, so ~146 epochs/year
    // MEV APY = (avg MEV per epoch / stake) * epochs per year * 100
    const avgMevPerEpoch = epochsWithRewards > 0 ? totalMev / epochsWithRewards : 0;
    const epochsPerYear = 146;
    const mevApy = data.stake > 0 
      ? (avgMevPerEpoch / data.stake) * epochsPerYear * 100 
      : 0;
    
    stats.push({
      voteAccount,
      identityAccount: data.identityAccount,
      name: data.name,
      totalMevLamports: totalMev,
      totalMevSol: totalMev / 1_000_000_000,
      avgMevPerEpoch,
      epochsWithRewards,
      lastEpochMev,
      mevApy,
      isBamEligible: data.isBamEligible,
    });
  }
  
  // Sort by total MEV descending
  stats.sort((a, b) => b.totalMevLamports - a.totalMevLamports);
  
  return stats;
}

/**
 * Get top validators by MEV earnings
 */
export async function getTopMevValidators(
  rpcUrl: string,
  limit: number = 20
): Promise<ValidatorMevStats[]> {
  const allStats = await getAllValidatorMevStats(rpcUrl);
  return allStats.slice(0, limit);
}

/**
 * Get MEV stats for a specific validator
 */
export async function getValidatorMevStats(
  rpcUrl: string,
  voteAccount: string
): Promise<ValidatorMevStats | null> {
  const allStats = await getAllValidatorMevStats(rpcUrl);
  return allStats.find(s => s.voteAccount === voteAccount) || null;
}

// ============================================
// Exports
// ============================================

export {
  JIP31_START_EPOCH,
  JITO_KOBE_BASE,
};
