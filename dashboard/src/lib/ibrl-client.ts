/**
 * IBRL Analytics Client
 * 
 * Fetches validator block-building performance scores from explorer.bam.dev
 * 
 * IBRL Score measures:
 * - build_time_score: How fast the validator builds blocks
 * - vote_packing_score: How efficiently votes are packed
 * - non_vote_packing_score: How efficiently non-vote txs are packed
 * - ibrl_score: Overall composite score (0-100)
 * - epoch_trend: Score change from previous epoch
 * 
 * Higher score = better block builder = better for the network
 */

const IBRL_API_BASE = "https://explorer.bam.dev/api/v1";

export interface IBRLValidatorScore {
  identity: string;
  build_time_score: number;
  vote_packing_score: number;
  non_vote_packing_score: number;
  ibrl_score: number;
  client: number;
  scheduler_profile: number;
  epoch_trend: number;
  blocks_produced: number;
}

export interface IBRLValidatorsResponse {
  data: IBRLValidatorScore[];
  timestamp: number;
  epoch: number;
}

// In-memory cache (5 minute TTL)
let ibrlCache: { data: Map<string, IBRLValidatorScore>; epoch: number; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Fetch all validator IBRL scores for the current epoch
 */
export async function getIBRLScores(epoch?: number): Promise<Map<string, IBRLValidatorScore>> {
  // Check cache
  if (ibrlCache && Date.now() - ibrlCache.fetchedAt < CACHE_TTL) {
    return ibrlCache.data;
  }

  try {
    const url = epoch 
      ? `${IBRL_API_BASE}/ibrl_validators?epoch=${epoch}`
      : `${IBRL_API_BASE}/ibrl_validators`;
    
    const res = await fetch(url, { 
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      console.warn(`[IBRL] API returned ${res.status}`);
      return ibrlCache?.data || new Map();
    }

    const json: IBRLValidatorsResponse = await res.json();
    
    // Index by identity
    const map = new Map<string, IBRLValidatorScore>();
    for (const v of json.data) {
      map.set(v.identity, v);
    }

    ibrlCache = { data: map, epoch: json.epoch, fetchedAt: Date.now() };
    console.log(`[IBRL] Loaded ${map.size} validator scores for epoch ${json.epoch}`);
    
    return map;
  } catch (e) {
    console.warn("[IBRL] Failed to fetch scores:", e);
    return ibrlCache?.data || new Map();
  }
}

/**
 * Get IBRL score for a single validator by identity
 */
export async function getIBRLScore(identity: string): Promise<IBRLValidatorScore | null> {
  const scores = await getIBRLScores();
  return scores.get(identity) || null;
}

/**
 * Calculate a normalized IBRL bonus for scoring (0-25 points)
 * 
 * Score ranges:
 * - 90-100: Excellent block builder → +25
 * - 80-90:  Good block builder → +20
 * - 70-80:  Above average → +15
 * - 60-70:  Average → +10
 * - Below 60: Below average → +5
 * - No data: +0
 * 
 * Also factors in epoch_trend (improving validators get a small bonus)
 */
export function calculateIBRLBonus(score: IBRLValidatorScore | null): number {
  if (!score) return 0;
  
  let bonus = 0;
  
  // Base score from IBRL composite
  if (score.ibrl_score >= 90) bonus = 25;
  else if (score.ibrl_score >= 80) bonus = 20;
  else if (score.ibrl_score >= 70) bonus = 15;
  else if (score.ibrl_score >= 60) bonus = 10;
  else bonus = 5;
  
  // Trend bonus: improving validators get up to +3
  if (score.epoch_trend > 2) bonus += 3;
  else if (score.epoch_trend > 0) bonus += 1;
  
  // Penalty for very few blocks (less reliable data)
  if (score.blocks_produced < 10) {
    bonus = Math.floor(bonus * 0.5);
  }
  
  return bonus;
}
