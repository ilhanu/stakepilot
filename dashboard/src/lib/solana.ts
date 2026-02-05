/**
 * Solana RPC utilities
 */

// Using devnet for vault operations
const RPC_URL = "https://api.devnet.solana.com";

export interface EpochInfo {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight: number;
  transactionCount: number | null;
}

export interface VoteAccountInfo {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: number;
  commission: number; // 0-100 (%)
  epochCredits: [number, number, number][];
  epochVoteAccount: boolean;
  lastVote: number;
  rootSlot: number;
}

export interface VoteAccountsResponse {
  current: VoteAccountInfo[];
  delinquent: VoteAccountInfo[];
}

// Cache for vote accounts (refresh every 5 minutes)
let voteAccountsCache: { data: Map<string, number>; timestamp: number } | null = null;
const VOTE_ACCOUNTS_CACHE_TTL = 300_000; // 5 minutes

export async function getEpochInfo(): Promise<EpochInfo> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getEpochInfo",
    }),
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`RPC error: ${res.status}`);
  }

  const data = await res.json();
  return data.result;
}

/**
 * Get stake commission rates for all validators
 * Returns a Map of voteAccount -> commission (0-100)
 */
export async function getStakeCommissions(): Promise<Map<string, number>> {
  // Check cache
  if (voteAccountsCache && Date.now() - voteAccountsCache.timestamp < VOTE_ACCOUNTS_CACHE_TTL) {
    return voteAccountsCache.data;
  }

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getVoteAccounts",
    }),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`RPC error: ${res.status}`);
  }

  const data = await res.json();
  const result: VoteAccountsResponse = data.result;

  // Combine current and delinquent validators
  const allValidators = [...result.current, ...result.delinquent];
  
  // Create lookup map: voteAccount -> commission
  const commissionMap = new Map<string, number>(
    allValidators.map(v => [v.votePubkey, v.commission])
  );

  // Update cache
  voteAccountsCache = { data: commissionMap, timestamp: Date.now() };

  return commissionMap;
}

/**
 * Get stake commission for a single validator
 */
export async function getValidatorStakeCommission(voteAccount: string): Promise<number | null> {
  const commissions = await getStakeCommissions();
  return commissions.get(voteAccount) ?? null;
}

export async function getCurrentEpoch(): Promise<number> {
  const epochInfo = await getEpochInfo();
  return epochInfo.epoch;
}

export function getEpochProgress(epochInfo: EpochInfo): number {
  return (epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100;
}

export function getTimeUntilNextEpoch(epochInfo: EpochInfo): string {
  const remainingSlots = epochInfo.slotsInEpoch - epochInfo.slotIndex;
  const secondsPerSlot = 0.4; // ~400ms per slot
  const remainingSeconds = remainingSlots * secondsPerSlot;
  
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  return `${hours}h ${minutes}m`;
}
