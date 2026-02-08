/**
 * validators.app API Client
 * 
 * Fetches validator data from validators.app API
 * Supports both mainnet and testnet
 * API Docs: https://www.validators.app/api-docs
 */

export type Network = "mainnet" | "testnet";

export interface ValidatorsAppValidator {
  network: string;
  account: string;           // Identity account
  name: string | null;
  keybase_id: string | null;
  www_url: string | null;
  details: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  admin_warning: string | null;
  jito: boolean;
  jito_commission: number | null;  // Percentage (0-100)
  stake_pools_list: string[];
  is_active: boolean;
  is_dz: boolean;            // DoubleZero validator
  avatar_file_url: string | null;
  active_stake: number;      // In lamports
  authorized_withdrawer_score: number;
  commission: number;        // Percentage (0-100)
  data_center_concentration_score: number | null;
  delinquent: boolean;
  published_information_score: number;
  root_distance_score: number;
  security_report_score: number;
  skipped_slot_score: number;
  skipped_after_score: number;
  software_version: string;
  software_version_score: number;
  stake_concentration_score: number;
  consensus_mods_score: number;
  vote_latency_score: number | null;
  total_score: number;
  vote_distance_score: number;
  software_client: string;
  software_client_id: number;
  ip: string;
  data_center_key: string;
  autonomous_system_number: number;
  latitude: string;
  longitude: string;
  data_center_host: string | null;
  vote_account: string;
  epoch_credits: number;
  epoch: number;
  skipped_slots: number;
  skipped_slot_percent: string;
  ping_time: number | null;
  url: string;
}

// Normalized validator interface for our app
export interface NormalizedValidator {
  voteAccount: string;
  identity: string;
  name: string;
  commission: number;           // Percentage (0-100)
  mevCommission: number | null; // Percentage (0-100) - Jito commission
  activatedStake: number;       // In SOL
  delinquent: boolean;
  isJito: boolean;
  isDz: boolean;                // DoubleZero
  uptime: number;               // Calculated from skipped_slot_percent
  totalScore: number;           // validators.app score
  softwareVersion: string;
  location: {
    city: string | null;
    country: string | null;
    datacenter: string;
  };
  avatarUrl: string | null;
  website: string | null;
  source: "validators.app";
}

// API token from TOOLS.md
const VALIDATORS_APP_TOKEN = process.env.VALIDATORS_APP_TOKEN || "uawTM1ynsnonDJ9z8YUun59F";

// Cache
const cache: Record<Network, { data: ValidatorsAppValidator[]; timestamp: number }> = {
  mainnet: { data: [], timestamp: 0 },
  testnet: { data: [], timestamp: 0 },
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all validators from validators.app API
 */
export async function fetchValidatorsApp(network: Network): Promise<ValidatorsAppValidator[]> {
  // Return cache if still valid
  if (cache[network].data.length > 0 && Date.now() - cache[network].timestamp < CACHE_DURATION) {
    return cache[network].data;
  }

  const url = `https://www.validators.app/api/v1/validators/${network}.json`;
  
  const response = await fetch(url, {
    headers: {
      "Token": VALIDATORS_APP_TOKEN,
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`validators.app API error: ${response.status} ${response.statusText}`);
  }

  const data: ValidatorsAppValidator[] = await response.json();
  
  // Update cache
  cache[network] = { data, timestamp: Date.now() };
  
  return data;
}

/**
 * Normalize validators.app data to our standard interface
 */
export function normalizeValidator(v: ValidatorsAppValidator): NormalizedValidator {
  // Calculate uptime from skipped_slot_percent
  const skippedPct = parseFloat(v.skipped_slot_percent) || 0;
  const uptime = 100 - skippedPct;
  
  // Parse location from data_center_key (format: "ASN-COUNTRY-Region/City")
  const dcParts = v.data_center_key.split("-");
  const location = dcParts.length >= 3 
    ? { city: dcParts.slice(2).join("-"), country: dcParts[1], datacenter: v.data_center_key }
    : { city: null, country: null, datacenter: v.data_center_key };

  return {
    voteAccount: v.vote_account,
    identity: v.account,
    name: v.name || `Validator ${v.vote_account.slice(0, 8)}...`,
    commission: v.commission,
    mevCommission: v.jito_commission,
    activatedStake: v.active_stake / 1e9, // Convert lamports to SOL
    delinquent: v.delinquent,
    isJito: v.jito,
    isDz: v.is_dz,
    uptime,
    totalScore: v.total_score,
    softwareVersion: v.software_version,
    location,
    avatarUrl: v.avatar_file_url || v.avatar_url,
    website: v.www_url,
    source: "validators.app",
  };
}

/**
 * Get all validators normalized
 */
export async function getValidators(network: Network): Promise<NormalizedValidator[]> {
  const raw = await fetchValidatorsApp(network);
  return raw
    .filter(v => v.is_active) // Only active validators
    .map(normalizeValidator);
}

/**
 * Get validators matching StakePilot criteria
 * - Stake < 1M SOL (decentralization)
 * - Commission ≤ 5%
 * - MEV Commission ≤ 10%
 * - Uptime > 95%
 * - Not delinquent
 */
export interface FilterCriteria {
  maxStake?: number;      // SOL, default 1M
  maxCommission?: number; // %, default 5
  maxMevCommission?: number; // %, default 10
  minUptime?: number;     // %, default 95
  alwaysInclude?: string[]; // Vote accounts to always include
}

export async function getQualifiedValidators(
  network: Network,
  criteria: FilterCriteria = {}
): Promise<NormalizedValidator[]> {
  const {
    maxStake = 1_000_000,
    maxCommission = 5,
    maxMevCommission = 10,
    minUptime = 95,
    alwaysInclude = [],
  } = criteria;

  const validators = await getValidators(network);
  
  const alwaysIncludeSet = new Set(alwaysInclude.map(v => v.toLowerCase()));
  
  const qualified = validators.filter((v) => {
    // Always include specified validators
    if (alwaysIncludeSet.has(v.voteAccount.toLowerCase())) return true;
    
    // Apply criteria
    if (v.delinquent) return false;
    if (v.activatedStake >= maxStake) return false;
    if (v.commission > maxCommission) return false;
    if (v.isJito && v.mevCommission !== null && v.mevCommission > maxMevCommission) return false;
    if (v.uptime < minUptime) return false;
    
    return true;
  });
  
  // Sort by total score (higher is better)
  qualified.sort((a, b) => b.totalScore - a.totalScore);
  
  return qualified;
}

/**
 * Score a validator using StakePilot algorithm
 */
export function scoreValidator(v: NormalizedValidator, alwaysInclude: string[] = [], ibrlBonus = 0): number {
  let score = 0;
  
  const alwaysIncludeSet = new Set(alwaysInclude.map(a => a.toLowerCase()));
  
  // Always-include bonus
  if (alwaysIncludeSet.has(v.voteAccount.toLowerCase())) {
    score += 100;
  }
  
  // Decentralization bonus (stake < 1M = bonus points)
  if (v.activatedStake < 100_000) score += 40;
  else if (v.activatedStake < 500_000) score += 30;
  else if (v.activatedStake < 1_000_000) score += 15;
  
  // Commission score (0% = +25, 5% = +15, 10% = 0)
  score += Math.max(0, 25 - v.commission * 2.5);
  
  // MEV commission score (0% = +20, 10% = +10, 100% = 0)
  if (v.isJito && v.mevCommission !== null) {
    score += Math.max(0, 20 - v.mevCommission * 0.2);
  }
  
  // Uptime score (100% = +15, 95% = +7.5)
  score += Math.max(0, (v.uptime - 90) * 1.5);
  
  // validators.app score bonus
  if (v.totalScore >= 8) score += 10;
  else if (v.totalScore >= 6) score += 5;
  
  // DoubleZero bonus
  if (v.isDz) score += 5;
  
  // IBRL block-building performance bonus (0-25 points)
  // Measures how well the validator builds blocks: tx packing, build time
  score += ibrlBonus;
  
  return score;
}

/**
 * Get top validators ranked by our scoring algorithm
 */
export async function getTopValidators(
  network: Network,
  limit = 20,
  alwaysInclude: string[] = []
): Promise<NormalizedValidator[]> {
  const qualified = await getQualifiedValidators(network, { alwaysInclude });
  
  // Score and sort
  const scored = qualified.map((v) => ({
    validator: v,
    score: scoreValidator(v, alwaysInclude),
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, limit).map((s) => s.validator);
}

/**
 * Get validator by vote account
 */
export async function getValidator(
  network: Network,
  voteAccount: string
): Promise<NormalizedValidator | null> {
  const validators = await getValidators(network);
  return validators.find((v) => 
    v.voteAccount.toLowerCase() === voteAccount.toLowerCase()
  ) || null;
}

/**
 * Search validators by name
 */
export async function searchValidators(
  network: Network,
  query: string
): Promise<NormalizedValidator[]> {
  const validators = await getValidators(network);
  const lowerQuery = query.toLowerCase();
  
  return validators.filter(
    (v) =>
      v.name.toLowerCase().includes(lowerQuery) ||
      v.voteAccount.toLowerCase().includes(lowerQuery) ||
      v.identity.toLowerCase().includes(lowerQuery)
  );
}
