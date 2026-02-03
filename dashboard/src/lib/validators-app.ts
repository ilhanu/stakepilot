/**
 * validators.app API Integration
 * 
 * Rich validator data: uptime, location, age, quality scores
 * Docs: https://www.validators.app/api-documentation
 */

const VALIDATORS_APP_BASE = "https://www.validators.app/api/v1";

// Get API token from env (optional - some endpoints work without)
const API_TOKEN = process.env.VALIDATORS_APP_TOKEN || "";

async function fetchValidatorsApp(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${VALIDATORS_APP_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (API_TOKEN) {
    headers["Token"] = API_TOKEN;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`validators.app API error: ${response.status}`);
  }
  return response.json();
}

export interface ValidatorAppData {
  account: string;           // Identity pubkey
  vote_account: string;      // Vote account
  name: string | null;
  
  // Performance
  total_score: number;       // 0-10 quality score
  epoch_credits: number;
  skipped_slots: number;
  skipped_slot_percent: string;  // e.g., "0.5155"
  delinquent: boolean;
  is_active: boolean;
  
  // Location
  data_center_key: string;   // e.g., "24940-FI-Helsinki"
  latitude: string;
  longitude: string;
  ip: string;
  autonomous_system_number: number;
  
  // Age & History
  created_at: string;        // ISO date
  software_version: string;
  software_client: string;   // "Agave", "Jito", etc.
  
  // Commission
  commission: number;        // Stake commission (0-100)
  jito: boolean;             // Running Jito?
  jito_commission: number;   // MEV commission in bps (0-10000)
  
  // Stake
  active_stake: number;      // In lamports
  stake_pools_list: string[]; // ["Jito", "Marinade", etc.]
  
  // Scores breakdown
  skipped_slot_score: number;
  vote_distance_score: number;
  root_distance_score: number;
  stake_concentration_score: number;
  data_center_concentration_score: number;
  security_report_score: number;
  
  // Other
  www_url: string | null;
  details: string | null;
  avatar_url: string | null;
  ping_time: string | null;  // Network latency in ms
}

/**
 * Get all mainnet validators from validators.app
 */
export async function getAllValidators(options?: {
  limit?: number;
  order?: "score" | "name" | "stake";
  activeOnly?: boolean;
}): Promise<ValidatorAppData[]> {
  const params: Record<string, string> = {
    order: options?.order || "score",
    limit: String(options?.limit || 1000),
    active_only: String(options?.activeOnly ?? true),
  };

  const data = await fetchValidatorsApp("/validators/mainnet.json", params);
  return data as ValidatorAppData[];
}

/**
 * Get detailed info for a single validator
 */
export async function getValidatorDetails(
  voteAccountOrIdentity: string,
  withHistory = false
): Promise<ValidatorAppData & { history?: any }> {
  const params: Record<string, string> = {};
  if (withHistory) {
    params.with_history = "true";
  }

  return fetchValidatorsApp(
    `/validators/mainnet/${voteAccountOrIdentity}.json`,
    params
  );
}

/**
 * Get block production history for a validator
 */
export async function getValidatorBlockHistory(
  account: string,
  limit = 50
): Promise<{
  epoch: number;
  leader_slots: number;
  blocks_produced: number;
  skipped_slots: number;
  skipped_slot_percent: string;
}[]> {
  return fetchValidatorsApp(
    `/validator-block-history/mainnet/${account}.json`,
    { limit: String(limit) }
  );
}

/**
 * Get commission changes (useful for detecting rug-pull validators)
 */
export async function getCommissionChanges(options?: {
  dateFrom?: string;  // ISO date
  dateTo?: string;
  limit?: number;
}): Promise<{
  account: string;
  name: string;
  commission_before: number;
  commission_after: number;
  epoch: number;
  created_at: string;
}[]> {
  const params: Record<string, string> = {
    per: String(options?.limit || 100),
  };
  if (options?.dateFrom) params.date_from = options.dateFrom;
  if (options?.dateTo) params.date_to = options.dateTo;

  return fetchValidatorsApp("/commission-changes/mainnet.json", params);
}

// =========== DERIVED METRICS ===========

export interface ValidatorMetrics extends ValidatorAppData {
  // Derived
  uptimePercent: number;           // 100 - skipped_slot_percent
  ageInDays: number;               // Days since created
  location: {                       // Parsed location
    country: string;
    city: string;
    provider: string;
  };
  qualityTier: "excellent" | "good" | "fair" | "poor";
  stakeSol: number;                // Active stake in SOL
}

/**
 * Parse data center key into location components
 */
function parseDataCenterKey(key: string): { country: string; city: string; provider: string } {
  // Format: "ASN-COUNTRY-City" e.g., "24940-FI-Helsinki"
  const parts = key?.split("-") || [];
  if (parts.length >= 3) {
    return {
      provider: parts[0],
      country: parts[1],
      city: parts.slice(2).join("-"),
    };
  }
  return { provider: "Unknown", country: "??", city: "Unknown" };
}

/**
 * Calculate quality tier from score
 */
function getQualityTier(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 8) return "excellent";
  if (score >= 6) return "good";
  if (score >= 4) return "fair";
  return "poor";
}

/**
 * Enrich validators with derived metrics
 */
export function enrichValidators(validators: ValidatorAppData[]): ValidatorMetrics[] {
  return validators.map((v) => {
    const skippedPct = parseFloat(v.skipped_slot_percent) || 0;
    const createdDate = new Date(v.created_at);
    const now = new Date();
    const ageMs = now.getTime() - createdDate.getTime();
    
    return {
      ...v,
      uptimePercent: Math.max(0, 100 - skippedPct),
      ageInDays: Math.floor(ageMs / (1000 * 60 * 60 * 24)),
      location: parseDataCenterKey(v.data_center_key),
      qualityTier: getQualityTier(v.total_score),
      stakeSol: v.active_stake / 1_000_000_000,
    };
  });
}

// =========== FILTER HELPERS ===========

export interface ValidatorFilters {
  minUptimePercent?: number;      // e.g., 99
  maxSkippedSlotPercent?: number; // e.g., 1
  countries?: string[];           // e.g., ["US", "DE", "FI"]
  excludeCountries?: string[];    // e.g., ["CN", "RU"]
  minAgeDays?: number;            // e.g., 90
  maxCommission?: number;         // e.g., 10
  requireJito?: boolean;          // Must run Jito client
  maxJitoCommission?: number;     // e.g., 1000 (10%)
  minScore?: number;              // e.g., 6
  maxStakeSol?: number;           // Prefer smaller validators
  minStakeSol?: number;           // Avoid too small
}

/**
 * Filter validators by criteria
 */
export function filterValidators(
  validators: ValidatorMetrics[],
  filters: ValidatorFilters
): ValidatorMetrics[] {
  return validators.filter((v) => {
    // Uptime
    if (filters.minUptimePercent && v.uptimePercent < filters.minUptimePercent) {
      return false;
    }
    if (filters.maxSkippedSlotPercent) {
      const skipped = parseFloat(v.skipped_slot_percent) || 0;
      if (skipped > filters.maxSkippedSlotPercent) return false;
    }

    // Location
    if (filters.countries && filters.countries.length > 0) {
      if (!filters.countries.includes(v.location.country)) return false;
    }
    if (filters.excludeCountries && filters.excludeCountries.length > 0) {
      if (filters.excludeCountries.includes(v.location.country)) return false;
    }

    // Age
    if (filters.minAgeDays && v.ageInDays < filters.minAgeDays) {
      return false;
    }

    // Commission
    if (filters.maxCommission && v.commission > filters.maxCommission) {
      return false;
    }

    // Jito
    if (filters.requireJito && !v.jito) {
      return false;
    }
    if (filters.maxJitoCommission && v.jito_commission > filters.maxJitoCommission) {
      return false;
    }

    // Score
    if (filters.minScore && v.total_score < filters.minScore) {
      return false;
    }

    // Stake size
    if (filters.maxStakeSol && v.stakeSol > filters.maxStakeSol) {
      return false;
    }
    if (filters.minStakeSol && v.stakeSol < filters.minStakeSol) {
      return false;
    }

    return true;
  });
}

// =========== LOCATION AGGREGATES ===========

export interface LocationStats {
  country: string;
  city: string;
  validatorCount: number;
  totalStakeSol: number;
  avgScore: number;
}

/**
 * Get validator distribution by location
 */
export function getLocationStats(validators: ValidatorMetrics[]): LocationStats[] {
  const byLocation = new Map<string, ValidatorMetrics[]>();

  for (const v of validators) {
    const key = `${v.location.country}-${v.location.city}`;
    if (!byLocation.has(key)) {
      byLocation.set(key, []);
    }
    byLocation.get(key)!.push(v);
  }

  return Array.from(byLocation.entries())
    .map(([key, vals]) => {
      const [country, city] = key.split("-");
      return {
        country,
        city,
        validatorCount: vals.length,
        totalStakeSol: vals.reduce((sum, v) => sum + v.stakeSol, 0),
        avgScore: vals.reduce((sum, v) => sum + v.total_score, 0) / vals.length,
      };
    })
    .sort((a, b) => b.validatorCount - a.validatorCount);
}
