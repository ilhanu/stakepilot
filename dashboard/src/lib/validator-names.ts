// Validator name lookup using StakeWiz API
// Caches names to reduce API calls

export interface ValidatorInfo {
  name: string | null;
  description: string | null;
  website: string | null;
  image: string | null;
  isJito: boolean;
  commission: number;
  jitoCommissionBps: number;
  wizScore: number;
  city: string | null;
  country: string | null;
  activatedStake: number;
  skipRate: number;
}

// In-memory cache for validator names
const validatorCache = new Map<string, ValidatorInfo>();
const cacheExpiry = new Map<string, number>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Top validators with known names (fallback)
const KNOWN_VALIDATORS: Record<string, string> = {
  // Major staking providers
  "7K8DVxtNJGnMtUY1CQJT5jcs8sFGSZTDiG7kowvFpECh": "Marinade 1",
  "CW9C7HBwAMgqNdXkNgtFvQ5JRxSv9YPpBPeqGj7J8YMr": "Marinade 2",
  "DumiCKHVqoCQKD8roLApzR5Fitd1i1yELBZCMEjK3LNi": "Chorus One",
  "J2nUHEAgZFRyuJbFjdqPrAa9gyWDuc7hErtDQHPhsYRp": "P2P Validator",
  "stWirqFCf2Uts1JBL1Jsd3r6VBWhgnpdPxCTe1MFjrq": "Jito 1",
  "stemB5dT8wfLYoHrR8xLw6ELU3KvRbZjKb6eprPFy6e": "Jito 2",
  "Fd7btgySsrjuo25CJCj7oE7VPMyezDhnx7pZkj2v69Nk": "Lido/Chorus One",
  "GE6atKoWiQ2pt3zL7N13pjNHjdLVys8LinG8qeJLcAiL": "Everstake",
  "DpVpHVhf1xUTUCPDYQCDMwAMFAs8oo8oCGZrHJ21Wqxt": "Staking Facilities",
  "FQwewNXahV7MiZcLpY6bQbVTNPBRXkjMPmvsxHdqZkf2": "Figment",
  "GkqYQysEGmuL6V2AJoNnWZUz2ZBGWhzQXsJiXm2CLCMF": "Solana Compass",
  "vote2Pkb5uZ5Pd5rNHJvcYtb42qNzSpMvRNqLUzjcEJV": "Coinbase Cloud",
  "HxkQdUnrPdHwXP5jHE3NBuZUZfwFz1VqnwRV3jnxaL1k": "Binance Staking",
  "BN2GVxQHcq9xmQW3zGGBPDESgHqyJMw4RvL7YJWLcxVd": "OKX Pool",
  // Add more as needed
};

/**
 * Fetch validator info from StakeWiz API
 */
async function fetchFromStakeWiz(voteAccount: string): Promise<ValidatorInfo | null> {
  try {
    const res = await fetch(`https://api.stakewiz.com/validator/${voteAccount}`, {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    
    return {
      name: data.name || null,
      description: data.description || null,
      website: data.website || null,
      image: data.image || null,
      isJito: data.is_jito || false,
      commission: data.commission || 0,
      jitoCommissionBps: data.jito_commission_bps || 0,
      wizScore: data.wiz_score || 0,
      city: data.ip_city || null,
      country: data.ip_country || null,
      activatedStake: data.activated_stake || 0,
      skipRate: data.skip_rate || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Get validator name - checks cache, known validators, then StakeWiz
 */
export async function getValidatorName(voteAccount: string): Promise<string | null> {
  // Check known validators first
  if (KNOWN_VALIDATORS[voteAccount]) {
    return KNOWN_VALIDATORS[voteAccount];
  }
  
  // Check cache
  const cached = validatorCache.get(voteAccount);
  const expiry = cacheExpiry.get(voteAccount);
  if (cached && expiry && Date.now() < expiry) {
    return cached.name;
  }
  
  // Fetch from StakeWiz
  const info = await fetchFromStakeWiz(voteAccount);
  if (info) {
    validatorCache.set(voteAccount, info);
    cacheExpiry.set(voteAccount, Date.now() + CACHE_TTL);
    return info.name;
  }
  
  return null;
}

/**
 * Get full validator info
 */
export async function getValidatorInfo(voteAccount: string): Promise<ValidatorInfo | null> {
  // Check cache
  const cached = validatorCache.get(voteAccount);
  const expiry = cacheExpiry.get(voteAccount);
  if (cached && expiry && Date.now() < expiry) {
    return cached;
  }
  
  // Fetch from StakeWiz
  const info = await fetchFromStakeWiz(voteAccount);
  if (info) {
    validatorCache.set(voteAccount, info);
    cacheExpiry.set(voteAccount, Date.now() + CACHE_TTL);
    return info;
  }
  
  // Fallback for known validators
  if (KNOWN_VALIDATORS[voteAccount]) {
    return {
      name: KNOWN_VALIDATORS[voteAccount],
      description: null,
      website: null,
      image: null,
      isJito: false,
      commission: 0,
      jitoCommissionBps: 0,
      wizScore: 0,
      city: null,
      country: null,
      activatedStake: 0,
      skipRate: 0,
    };
  }
  
  return null;
}

/**
 * Batch fetch validator names for multiple accounts
 */
export async function getValidatorNames(voteAccounts: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < voteAccounts.length; i += batchSize) {
    const batch = voteAccounts.slice(i, i + batchSize);
    const promises = batch.map(async (va) => {
      const name = await getValidatorName(va);
      results.set(va, name);
    });
    await Promise.all(promises);
    
    // Small delay between batches
    if (i + batchSize < voteAccounts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Format validator display name
 */
export function formatValidatorName(voteAccount: string, name: string | null): string {
  if (name && name.length > 0) {
    return name;
  }
  // Fallback to shortened vote account
  return `${voteAccount.slice(0, 4)}...${voteAccount.slice(-4)}`;
}

// Full validator cache for bulk operations
let fullValidatorCache: Map<string, ValidatorInfo> | null = null;
let fullCacheTimestamp = 0;
const FULL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch ALL validators from StakeWiz (for bulk operations)
 * More efficient than individual lookups
 */
export async function fetchAllValidatorsFromStakeWiz(): Promise<Map<string, ValidatorInfo>> {
  const now = Date.now();
  
  // Return cached data if fresh
  if (fullValidatorCache && (now - fullCacheTimestamp) < FULL_CACHE_TTL) {
    return fullValidatorCache;
  }
  
  try {
    const response = await fetch('https://api.stakewiz.com/validators', {
      next: { revalidate: 1800 }
    });
    
    if (!response.ok) {
      throw new Error(`StakeWiz API error: ${response.status}`);
    }
    
    const validators = await response.json();
    
    const map = new Map<string, ValidatorInfo>();
    
    for (const v of validators) {
      const info: ValidatorInfo = {
        name: v.name || null,
        description: v.description || null,
        website: v.website || null,
        image: v.image || null,
        isJito: v.is_jito || false,
        commission: v.commission || 0,
        jitoCommissionBps: v.jito_commission_bps || 0,
        wizScore: v.wiz_score || 0,
        city: v.ip_city || null,
        country: v.ip_country || null,
        activatedStake: v.activated_stake || 0,
        skipRate: v.skip_rate || 0,
      };
      
      map.set(v.vote_identity, info);
      
      // Also populate the individual cache
      validatorCache.set(v.vote_identity, info);
      cacheExpiry.set(v.vote_identity, now + CACHE_TTL);
    }
    
    fullValidatorCache = map;
    fullCacheTimestamp = now;
    
    console.log(`Loaded ${map.size} validators from StakeWiz`);
    return map;
    
  } catch (error) {
    console.error('Error fetching all validators:', error);
    return fullValidatorCache || new Map();
  }
}

/**
 * Enrich an array of items with validator info
 */
export async function enrichWithValidatorInfo<T extends { voteAccount: string }>(
  items: T[]
): Promise<(T & { validatorInfo: ValidatorInfo | null })[]> {
  const allValidators = await fetchAllValidatorsFromStakeWiz();
  
  return items.map(item => ({
    ...item,
    validatorInfo: allValidators.get(item.voteAccount) || null,
  }));
}
