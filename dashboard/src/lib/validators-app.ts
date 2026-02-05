/**
 * validators.app API Client
 * 
 * Fetches validator data including names, commission, location, uptime
 * API Token: uawTM1ynsnonDJ9z8YUun59F
 */

const VALIDATORS_APP_API = "https://www.validators.app/api/v1";
const API_TOKEN = process.env.VALIDATORS_APP_TOKEN || "uawTM1ynsnonDJ9z8YUun59F";

// ============================================
// TYPES
// ============================================

export interface ValidatorFilters {
  minUptimePercent?: number;
  maxSkippedSlotPercent?: number;
  countries?: string[];
  excludeCountries?: string[];
  minAgeDays?: number;
  maxCommission?: number;
  requireJito?: boolean;
  maxJitoCommission?: number;
  minScore?: number;
  maxStakeSol?: number;
  minStakeSol?: number;
  excludeDelinquent?: boolean;
  maxDatacenterConcentration?: number;
}

export interface ValidatorMetrics {
  netBaseApy: number;
  netMevApy: number;
  netTotalApy: number;
  qualityTier: "S" | "A" | "B" | "C" | "D";
  uptimePercent: number;
  ageInDays: number;
  stakeSol: number;
  location: string;
}

export interface RawValidator {
  vote_account: string;
  account: string;
  name?: string;
  keybase_username?: string;
  www_url?: string;
  avatar_url?: string;
  details?: string;
  commission: number;
  active_stake: number;
  delinquent: boolean;
  data_center_key?: string;
  data_center_concentration?: number;
  city?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  root_distance_score?: number;
  vote_distance_score?: number;
  skipped_slot_percent?: string;
  skipped_slots?: number;
  skipped_slot_percent_moving_average?: string;
  epoch_credits?: number;
  total_score?: number;
  ping_time?: string;
  software_version?: string;
  software_client?: string;
  stake_pools_list?: string[];
  jito?: boolean;
  jito_commission?: number;
  created_at?: string;
  apy?: number;
}

export interface EnrichedValidator extends RawValidator {
  qualityTier: "S" | "A" | "B" | "C" | "D";
  uptimePercent: number;
  ageInDays: number;
  stakeSol: number;
  location: string;
  netBaseApy: number;
  netMevApy: number;
  netTotalApy: number;
}

interface GetAllValidatorsOptions {
  limit?: number;
  order?: "score" | "stake" | "name";
  activeOnly?: boolean;
}

// ============================================
// CACHE
// ============================================

let validatorsCache: RawValidator[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch all validators from validators.app
 */
export async function getAllValidators(options: GetAllValidatorsOptions = {}): Promise<RawValidator[]> {
  const { limit = 1500, activeOnly = true } = options;

  // Return cache if valid
  if (validatorsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    let result = validatorsCache;
    if (activeOnly) {
      result = result.filter(v => !v.delinquent);
    }
    return result.slice(0, limit);
  }

  try {
    const res = await fetch(`${VALIDATORS_APP_API}/validators/mainnet.json`, {
      headers: {
        "Token": API_TOKEN,
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`validators.app API error: ${res.status}`);
    }

    const data: RawValidator[] = await res.json();

    // Update cache
    validatorsCache = data;
    cacheTimestamp = Date.now();

    let result = data;
    if (activeOnly) {
      result = result.filter(v => !v.delinquent);
    }
    return result.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch from validators.app:", error);
    return validatorsCache || [];
  }
}

/**
 * Fetch validators for the agent recommendation API (simpler interface)
 */
export async function fetchAllValidators(): Promise<EnrichedValidator[]> {
  const raw = await getAllValidators({ activeOnly: true });
  return enrichValidators(raw);
}

/**
 * Enrich validators with derived metrics
 */
export function enrichValidators(validators: RawValidator[]): EnrichedValidator[] {
  const BASE_APY = 6.5;
  
  return validators.map((v) => {
    // Calculate quality tier based on score
    let qualityTier: "S" | "A" | "B" | "C" | "D" = "C";
    const score = v.total_score || 0;
    if (score >= 9) qualityTier = "S";
    else if (score >= 7) qualityTier = "A";
    else if (score >= 5) qualityTier = "B";
    else if (score >= 3) qualityTier = "C";
    else qualityTier = "D";

    // Calculate uptime from skip rate
    const skipRate = parseFloat(v.skipped_slot_percent || "0");
    const uptimePercent = Math.max(0, 100 - skipRate);

    // Calculate age in days
    const createdAt = v.created_at ? new Date(v.created_at) : new Date();
    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Convert stake to SOL
    const stakeSol = (v.active_stake || 0) / 1e9;

    // Build location string
    const location = [v.city, v.country].filter(Boolean).join(", ") || "Unknown";

    // Calculate NET APY
    const commission = v.commission || 0;
    const netBaseApy = BASE_APY * (1 - commission / 100);
    
    // MEV APY (if Jito enabled)
    // jito_commission is in basis points (400 = 4%)
    const jitoCommissionBps = v.jito_commission ?? 10000; // Default 100% if not set
    const mevGross = v.jito ? 1.5 : 0; // Estimate ~1.5% MEV APY for Jito validators
    const netMevApy = mevGross * (1 - jitoCommissionBps / 10000);
    
    const netTotalApy = netBaseApy + netMevApy;

    return {
      ...v,
      qualityTier,
      uptimePercent,
      ageInDays,
      stakeSol,
      location,
      netBaseApy,
      netMevApy,
      netTotalApy,
    };
  });
}

/**
 * Filter validators based on criteria
 */
export function filterValidators(
  validators: EnrichedValidator[],
  filters: ValidatorFilters
): EnrichedValidator[] {
  return validators.filter((v) => {
    if (filters.excludeDelinquent && v.delinquent) return false;
    
    if (filters.minUptimePercent && v.uptimePercent < filters.minUptimePercent) return false;
    
    if (filters.maxSkippedSlotPercent) {
      const skipRate = parseFloat(v.skipped_slot_percent || "0");
      if (skipRate > filters.maxSkippedSlotPercent) return false;
    }
    
    if (filters.countries && filters.countries.length > 0) {
      if (!v.country || !filters.countries.includes(v.country)) return false;
    }
    
    if (filters.excludeCountries && filters.excludeCountries.length > 0) {
      if (v.country && filters.excludeCountries.includes(v.country)) return false;
    }
    
    if (filters.minAgeDays && v.ageInDays < filters.minAgeDays) return false;
    
    if (filters.maxCommission && v.commission > filters.maxCommission) return false;
    
    if (filters.requireJito && !v.jito) return false;
    
    if (filters.maxJitoCommission && v.jito_commission && v.jito_commission > filters.maxJitoCommission) return false;
    
    if (filters.minScore && (v.total_score || 0) < filters.minScore) return false;
    
    if (filters.maxStakeSol && v.stakeSol > filters.maxStakeSol) return false;
    
    if (filters.minStakeSol && v.stakeSol < filters.minStakeSol) return false;
    
    if (filters.maxDatacenterConcentration && v.data_center_concentration && 
        v.data_center_concentration > filters.maxDatacenterConcentration) return false;

    return true;
  });
}

/**
 * Get location statistics
 */
export function getLocationStats(validators: EnrichedValidator[]): Array<{
  location: string;
  country: string;
  count: number;
  totalStake: number;
  avgScore: number;
}> {
  const stats = new Map<string, {
    location: string;
    country: string;
    count: number;
    totalStake: number;
    scores: number[];
  }>();

  for (const v of validators) {
    const key = v.location || "Unknown";
    const existing = stats.get(key) || {
      location: key,
      country: v.country || "Unknown",
      count: 0,
      totalStake: 0,
      scores: [],
    };
    
    existing.count++;
    existing.totalStake += v.stakeSol;
    if (v.total_score) existing.scores.push(v.total_score);
    
    stats.set(key, existing);
  }

  return Array.from(stats.values())
    .map((s) => ({
      location: s.location,
      country: s.country,
      count: s.count,
      totalStake: s.totalStake,
      avgScore: s.scores.length > 0 
        ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length 
        : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get validator info by vote account
 */
export async function getValidatorInfo(voteAccount: string): Promise<EnrichedValidator | null> {
  const validators = await fetchAllValidators();
  return validators.find((v) => v.vote_account === voteAccount) || null;
}

/**
 * Get multiple validators by vote accounts
 */
export async function getValidatorsInfo(voteAccounts: string[]): Promise<Map<string, EnrichedValidator>> {
  const validators = await fetchAllValidators();
  const map = new Map<string, EnrichedValidator>();
  
  for (const v of validators) {
    if (voteAccounts.includes(v.vote_account)) {
      map.set(v.vote_account, v);
    }
  }
  
  return map;
}

/**
 * Search validators by name
 */
export async function searchValidators(query: string, limit = 20): Promise<EnrichedValidator[]> {
  const validators = await fetchAllValidators();
  const lowerQuery = query.toLowerCase();
  
  return validators
    .filter((v) => 
      (v.name || "").toLowerCase().includes(lowerQuery) ||
      v.vote_account.toLowerCase().includes(lowerQuery)
    )
    .slice(0, limit);
}

/**
 * Get top validators by stake
 */
export async function getTopValidators(limit = 100): Promise<EnrichedValidator[]> {
  const validators = await fetchAllValidators();
  
  return validators
    .filter((v) => !v.delinquent)
    .sort((a, b) => b.stakeSol - a.stakeSol)
    .slice(0, limit);
}

/**
 * Get validators filtered by criteria (for agent algorithm)
 */
export async function getFilteredValidators(options: {
  minStake?: number;
  maxCommission?: number;
  maxDatacenterConcentration?: number;
  excludeDelinquent?: boolean;
}): Promise<EnrichedValidator[]> {
  const validators = await fetchAllValidators();
  
  return filterValidators(validators, {
    minStakeSol: options.minStake,
    maxCommission: options.maxCommission,
    maxDatacenterConcentration: options.maxDatacenterConcentration,
    excludeDelinquent: options.excludeDelinquent,
  });
}
