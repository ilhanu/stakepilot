/**
 * Solana RPC Validator Client
 * 
 * Fetches real-time validator data directly from Solana RPC
 * Can be used standalone or to augment validators.app data
 */

import { Connection, VoteAccountInfo, VoteAccountStatus } from "@solana/web3.js";

export type Network = "mainnet" | "testnet" | "devnet";

export interface RpcValidator {
  voteAccount: string;
  nodePubkey: string;        // Identity
  activatedStake: number;    // In SOL
  commission: number;        // Percentage (0-100)
  lastVote: number;          // Slot number
  epochVoteAccount: boolean;
  epochCredits: [number, number, number][]; // [epoch, credits, prevCredits]
  isDelinquent: boolean;
}

// RPC endpoints
const RPC_ENDPOINTS: Record<Network, string> = {
  mainnet: process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com",
  testnet: process.env.TESTNET_RPC_URL || "https://api.testnet.solana.com",
  devnet: process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com",
};

// Cache
const cache: Record<Network, { data: RpcValidator[]; timestamp: number }> = {
  mainnet: { data: [], timestamp: 0 },
  testnet: { data: [], timestamp: 0 },
  devnet: { data: [], timestamp: 0 },
};
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (shorter than validators.app)

/**
 * Get connection for network
 */
export function getConnection(network: Network): Connection {
  return new Connection(RPC_ENDPOINTS[network], "confirmed");
}

/**
 * Convert VoteAccountInfo to our RpcValidator interface
 */
function normalizeVoteAccount(v: VoteAccountInfo, isDelinquent: boolean): RpcValidator {
  return {
    voteAccount: v.votePubkey.toString(),
    nodePubkey: v.nodePubkey.toString(),
    activatedStake: v.activatedStake / 1e9, // Convert lamports to SOL
    commission: v.commission,
    lastVote: v.lastVote,
    epochVoteAccount: v.epochVoteAccount,
    epochCredits: v.epochCredits,
    isDelinquent,
  };
}

/**
 * Fetch all validators from RPC
 */
export async function fetchValidatorsRpc(network: Network): Promise<RpcValidator[]> {
  // Return cache if still valid
  if (cache[network].data.length > 0 && Date.now() - cache[network].timestamp < CACHE_DURATION) {
    return cache[network].data;
  }

  const connection = getConnection(network);
  
  const voteAccounts: VoteAccountStatus = await connection.getVoteAccounts();
  
  const validators: RpcValidator[] = [
    ...voteAccounts.current.map(v => normalizeVoteAccount(v, false)),
    ...voteAccounts.delinquent.map(v => normalizeVoteAccount(v, true)),
  ];
  
  // Update cache
  cache[network] = { data: validators, timestamp: Date.now() };
  
  return validators;
}

/**
 * Get active validators (non-delinquent) sorted by stake
 */
export async function getActiveValidators(network: Network): Promise<RpcValidator[]> {
  const validators = await fetchValidatorsRpc(network);
  return validators
    .filter(v => !v.isDelinquent)
    .sort((a, b) => b.activatedStake - a.activatedStake);
}

/**
 * Get validator by vote account
 */
export async function getValidatorRpc(
  network: Network,
  voteAccount: string
): Promise<RpcValidator | null> {
  const validators = await fetchValidatorsRpc(network);
  return validators.find(v => 
    v.voteAccount.toLowerCase() === voteAccount.toLowerCase()
  ) || null;
}

/**
 * Get validators meeting basic criteria from RPC
 * Note: RPC doesn't have MEV commission, uptime scores, etc.
 * Use this for real-time stake/commission data
 */
export async function getQualifiedValidatorsRpc(
  network: Network,
  criteria: {
    maxStake?: number;      // SOL
    maxCommission?: number; // %
    alwaysInclude?: string[];
  } = {}
): Promise<RpcValidator[]> {
  const {
    maxStake = 1_000_000,
    maxCommission = 5,
    alwaysInclude = [],
  } = criteria;

  const validators = await fetchValidatorsRpc(network);
  const alwaysIncludeSet = new Set(alwaysInclude.map(v => v.toLowerCase()));
  
  return validators.filter((v) => {
    // Always include specified validators
    if (alwaysIncludeSet.has(v.voteAccount.toLowerCase())) return true;
    
    // Apply criteria
    if (v.isDelinquent) return false;
    if (v.activatedStake >= maxStake) return false;
    if (v.commission > maxCommission) return false;
    
    return true;
  });
}

/**
 * Calculate validator uptime from epoch credits
 * Returns percentage (0-100)
 */
export function calculateUptime(validator: RpcValidator, maxEpochs = 10): number {
  const credits = validator.epochCredits;
  if (credits.length < 2) return 100; // Not enough data
  
  // Get last N epochs
  const recentCredits = credits.slice(-maxEpochs);
  
  // Calculate credits per epoch
  let totalCredits = 0;
  let expectedCredits = 0;
  
  for (let i = 1; i < recentCredits.length; i++) {
    const current = recentCredits[i];
    const prev = recentCredits[i - 1];
    totalCredits += current[1] - current[2]; // Credits earned this epoch
    // Rough estimate: ~432,000 slots per epoch at 400ms
    expectedCredits += 432000;
  }
  
  if (expectedCredits === 0) return 100;
  
  // Return percentage (capped at 100)
  return Math.min(100, (totalCredits / expectedCredits) * 100);
}

/**
 * Get network statistics
 */
export async function getNetworkStats(network: Network): Promise<{
  totalValidators: number;
  activeValidators: number;
  delinquentValidators: number;
  totalStake: number;       // SOL
  averageCommission: number;
}> {
  const validators = await fetchValidatorsRpc(network);
  
  const active = validators.filter(v => !v.isDelinquent);
  const delinquent = validators.filter(v => v.isDelinquent);
  
  const totalStake = validators.reduce((sum, v) => sum + v.activatedStake, 0);
  const avgCommission = active.length > 0
    ? active.reduce((sum, v) => sum + v.commission, 0) / active.length
    : 0;
  
  return {
    totalValidators: validators.length,
    activeValidators: active.length,
    delinquentValidators: delinquent.length,
    totalStake,
    averageCommission: avgCommission,
  };
}
