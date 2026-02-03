// Validator name lookup using StakeWiz API
// Caches names to reduce API calls

interface ValidatorInfo {
  name: string | null;
  isJito: boolean;
  commission: number;
  jitoCommissionBps: number;
  wizScore: number;
  city: string | null;
  country: string | null;
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
      isJito: data.is_jito || false,
      commission: data.commission || 0,
      jitoCommissionBps: data.jito_commission_bps || 0,
      wizScore: data.wiz_score || 0,
      city: data.ip_city || null,
      country: data.ip_country || null,
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
      isJito: false,
      commission: 0,
      jitoCommissionBps: 0,
      wizScore: 0,
      city: null,
      country: null,
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
