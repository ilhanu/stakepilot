/**
 * Fetch and analyze user's stake accounts
 */

import { Connection, PublicKey, StakeProgram } from "@solana/web3.js";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

export interface UserStakeAccount {
  pubkey: string;
  lamports: number;
  solAmount: number;
  state: "activating" | "active" | "deactivating" | "inactive";
  validator: {
    voteAccount: string;
    name: string | null;
  };
  activationEpoch: number | null;
  deactivationEpoch: number | null;
  rentExemptReserve: number;
  // Yield info (to be enriched)
  estimatedApy?: number;
  mevShare?: number;
  couldEarn?: number; // What they could earn with better validator
}

export interface StakeSummary {
  totalStakedSol: number;
  activeStakeSol: number;
  pendingStakeSol: number;
  accountCount: number;
  uniqueValidators: number;
  avgEstimatedApy: number;
  potentialGainApy: number; // How much more they could make
  potentialGainSol: number; // Annual SOL gain if optimized
}

/**
 * Fetch all stake accounts for a wallet
 */
export async function getUserStakeAccounts(
  walletAddress: string
): Promise<UserStakeAccount[]> {
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new PublicKey(walletAddress);

  // Fetch stake accounts owned by this wallet
  const stakeAccounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          memcmp: {
            offset: 12, // Authorized staker offset
            bytes: wallet.toBase58(),
          },
        },
      ],
    }
  );

  // Also check withdrawer authority
  const withdrawerAccounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          memcmp: {
            offset: 44, // Authorized withdrawer offset
            bytes: wallet.toBase58(),
          },
        },
      ],
    }
  );

  // Combine and dedupe
  const allAccounts = new Map<string, any>();
  [...stakeAccounts, ...withdrawerAccounts].forEach((acc) => {
    allAccounts.set(acc.pubkey.toBase58(), acc);
  });

  const currentEpoch = (await connection.getEpochInfo()).epoch;

  const results: UserStakeAccount[] = [];

  for (const [pubkey, account] of allAccounts) {
    const parsed = account.account.data.parsed;
    if (!parsed?.info?.stake) continue;

    const stakeInfo = parsed.info.stake;
    const delegation = stakeInfo.delegation;

    if (!delegation) continue;

    // Determine state
    let state: UserStakeAccount["state"];
    const activationEpoch = delegation.activationEpoch
      ? parseInt(delegation.activationEpoch)
      : null;
    const deactivationEpoch = delegation.deactivationEpoch
      ? parseInt(delegation.deactivationEpoch)
      : null;

    if (deactivationEpoch && deactivationEpoch <= currentEpoch) {
      state = "inactive";
    } else if (deactivationEpoch && deactivationEpoch > currentEpoch) {
      state = "deactivating";
    } else if (activationEpoch && activationEpoch >= currentEpoch) {
      state = "activating";
    } else {
      state = "active";
    }

    const lamports = account.account.lamports;
    const rentExemptReserve = parsed.info.meta?.rentExemptReserve
      ? parseInt(parsed.info.meta.rentExemptReserve)
      : 0;

    results.push({
      pubkey,
      lamports,
      solAmount: lamports / 1e9,
      state,
      validator: {
        voteAccount: delegation.voter,
        name: null, // Will be enriched later
      },
      activationEpoch,
      deactivationEpoch,
      rentExemptReserve,
    });
  }

  return results;
}

/**
 * Calculate stake summary with potential gains
 */
export function calculateStakeSummary(
  stakes: UserStakeAccount[],
  optimizedApy: number = 8.0 // Best available APY
): StakeSummary {
  const activeStakes = stakes.filter((s) => s.state === "active");
  const pendingStakes = stakes.filter(
    (s) => s.state === "activating" || s.state === "deactivating"
  );

  const totalStakedSol = stakes.reduce((sum, s) => sum + s.solAmount, 0);
  const activeStakeSol = activeStakes.reduce((sum, s) => sum + s.solAmount, 0);
  const pendingStakeSol = pendingStakes.reduce((sum, s) => sum + s.solAmount, 0);

  const uniqueValidators = new Set(stakes.map((s) => s.validator.voteAccount))
    .size;

  // Calculate average APY (weighted by stake)
  const weightedApy = stakes.reduce((sum, s) => {
    const apy = s.estimatedApy || 6.5; // Default assumption
    return sum + apy * s.solAmount;
  }, 0);
  const avgEstimatedApy = totalStakedSol > 0 ? weightedApy / totalStakedSol : 0;

  // Potential gain
  const potentialGainApy = Math.max(0, optimizedApy - avgEstimatedApy);
  const potentialGainSol = (totalStakedSol * potentialGainApy) / 100;

  return {
    totalStakedSol,
    activeStakeSol,
    pendingStakeSol,
    accountCount: stakes.length,
    uniqueValidators,
    avgEstimatedApy,
    potentialGainApy,
    potentialGainSol,
  };
}

/**
 * Enrich stake accounts with validator info and yields
 */
export async function enrichStakeAccounts(
  stakes: UserStakeAccount[],
  validatorYields: Map<string, { name: string; apy: number; mevShare: number }>
): Promise<UserStakeAccount[]> {
  return stakes.map((stake) => {
    const validatorInfo = validatorYields.get(stake.validator.voteAccount);
    if (validatorInfo) {
      return {
        ...stake,
        validator: {
          ...stake.validator,
          name: validatorInfo.name,
        },
        estimatedApy: validatorInfo.apy,
        mevShare: validatorInfo.mevShare,
      };
    }
    return stake;
  });
}
