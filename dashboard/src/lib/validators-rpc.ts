/**
 * Solana RPC Validator Client - TESTNET ONLY
 * 
 * Fetches real-time validator data directly from Solana RPC
 */

import { Connection, VoteAccountInfo, VoteAccountStatus } from "@solana/web3.js";
import { RPC_URL } from "./config";

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

// Cache
let cache: { data: RpcValidator[]; timestamp: number } = { data: [], timestamp: 0 };
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Get connection for testnet
 */
export function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
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
export async function fetchValidatorsRpc(): Promise<RpcValidator[]> {
  // Return cache if still valid
  if (cache.data.length > 0 && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }

  const connection = getConnection();
  const voteAccounts: VoteAccountStatus = await connection.getVoteAccounts();
  
  const validators: RpcValidator[] = [
    ...voteAccounts.current.map(v => normalizeVoteAccount(v, false)),
    ...voteAccounts.delinquent.map(v => normalizeVoteAccount(v, true)),
  ];
  
  // Update cache
  cache = { data: validators, timestamp: Date.now() };
  
  return validators;
}

/**
 * Get active validators (non-delinquent) sorted by stake
 */
export async function getActiveValidators(): Promise<RpcValidator[]> {
  const validators = await fetchValidatorsRpc();
  return validators
    .filter(v => !v.isDelinquent)
    .sort((a, b) => b.activatedStake - a.activatedStake);
}

/**
 * Get validator by vote account
 */
export async function getValidatorRpc(
  _network: string, // Ignored, always testnet
  voteAccount: string
): Promise<RpcValidator | null> {
  const validators = await fetchValidatorsRpc();
  return validators.find(v => 
    v.voteAccount.toLowerCase() === voteAccount.toLowerCase()
  ) || null;
}

/**
 * Get validators meeting basic criteria from RPC
 */
export async function getQualifiedValidatorsRpc(
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

  const validators = await fetchValidatorsRpc();
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
 * Get network statistics
 */
export async function getNetworkStats(): Promise<{
  totalValidators: number;
  activeValidators: number;
  delinquentValidators: number;
  totalStake: number;       // SOL
  averageCommission: number;
}> {
  const validators = await fetchValidatorsRpc();
  
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
