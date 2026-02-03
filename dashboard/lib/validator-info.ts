/**
 * Validator Info Service
 * 
 * Fetches validator metadata (names, descriptions, websites) from StakeWiz API
 * and merges with our MEV data.
 */

export interface ValidatorInfo {
  voteAccount: string;
  identity: string;
  name: string | null;
  description: string | null;
  website: string | null;
  image: string | null;
  commission: number;        // Stake commission (0-100)
  isJito: boolean;
  jitoCommissionBps: number; // MEV commission in basis points
  ipCity: string | null;
  ipCountry: string | null;
  activatedStake: number;    // In SOL
  skipRate: number;
  delinquent: boolean;
}

interface StakeWizValidator {
  vote_identity: string;
  identity: string;
  name: string | null;
  description: string | null;
  website: string | null;
  image: string | null;
  commission: number;
  is_jito: boolean;
  jito_commission_bps: number;
  ip_city: string | null;
  ip_country: string | null;
  activated_stake: number;
  skip_rate: number;
  delinquent: boolean;
}

// Cache for validator info
let validatorCache: Map<string, ValidatorInfo> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch all validators from StakeWiz API
 */
export async function fetchAllValidators(): Promise<Map<string, ValidatorInfo>> {
  const now = Date.now();
  
  // Return cached data if fresh
  if (validatorCache && (now - cacheTimestamp) < CACHE_TTL) {
    return validatorCache;
  }
  
  try {
    const response = await fetch('https://api.stakewiz.com/validators', {
      next: { revalidate: 1800 } // Cache for 30 min in Next.js
    });
    
    if (!response.ok) {
      throw new Error(`StakeWiz API error: ${response.status}`);
    }
    
    const validators: StakeWizValidator[] = await response.json();
    
    // Build lookup map by vote account
    const map = new Map<string, ValidatorInfo>();
    
    for (const v of validators) {
      map.set(v.vote_identity, {
        voteAccount: v.vote_identity,
        identity: v.identity,
        name: v.name,
        description: v.description,
        website: v.website,
        image: v.image,
        commission: v.commission,
        isJito: v.is_jito,
        jitoCommissionBps: v.jito_commission_bps || 0,
        ipCity: v.ip_city,
        ipCountry: v.ip_country,
        activatedStake: v.activated_stake,
        skipRate: v.skip_rate || 0,
        delinquent: v.delinquent,
      });
    }
    
    // Update cache
    validatorCache = map;
    cacheTimestamp = now;
    
    console.log(`Loaded ${map.size} validators from StakeWiz`);
    return map;
    
  } catch (error) {
    console.error('Error fetching validators from StakeWiz:', error);
    
    // Return cached data even if stale
    if (validatorCache) {
      return validatorCache;
    }
    
    return new Map();
  }
}

/**
 * Get info for a single validator
 */
export async function getValidatorInfo(voteAccount: string): Promise<ValidatorInfo | null> {
  const validators = await fetchAllValidators();
  return validators.get(voteAccount) || null;
}

/**
 * Get info for multiple validators
 */
export async function getValidatorsInfo(voteAccounts: string[]): Promise<Map<string, ValidatorInfo>> {
  const allValidators = await fetchAllValidators();
  const result = new Map<string, ValidatorInfo>();
  
  for (const voteAccount of voteAccounts) {
    const info = allValidators.get(voteAccount);
    if (info) {
      result.set(voteAccount, info);
    }
  }
  
  return result;
}

/**
 * Enrich MEV data with validator info
 */
export async function enrichWithValidatorInfo<T extends { voteAccount: string }>(
  items: T[]
): Promise<(T & { validatorInfo: ValidatorInfo | null })[]> {
  const voteAccounts = items.map(item => item.voteAccount);
  const infoMap = await getValidatorsInfo(voteAccounts);
  
  return items.map(item => ({
    ...item,
    validatorInfo: infoMap.get(item.voteAccount) || null,
  }));
}

/**
 * Format validator name for display
 */
export function formatValidatorName(info: ValidatorInfo | null, voteAccount: string): string {
  if (info?.name) {
    // Truncate long names
    if (info.name.length > 30) {
      return info.name.substring(0, 27) + '...';
    }
    return info.name;
  }
  
  // Fallback to shortened vote account
  return `${voteAccount.substring(0, 4)}...${voteAccount.substring(voteAccount.length - 4)}`;
}

/**
 * Get validator location string
 */
export function getValidatorLocation(info: ValidatorInfo | null): string | null {
  if (!info) return null;
  
  if (info.ipCity && info.ipCountry) {
    return `${info.ipCity}, ${info.ipCountry}`;
  }
  
  return info.ipCountry || null;
}
