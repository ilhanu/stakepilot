/**
 * Native Staking Library
 * 
 * Handles creating stake accounts and delegating to validators
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  StakeProgram,
  Authorized,
  Lockup,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// Testnet RPC
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.testnet.solana.com";

export interface StakeResult {
  success: boolean;
  stakeAccount?: string;
  signature?: string;
  amount?: number;
  validator?: string;
  error?: string;
}

/**
 * Load agent keypair from environment or file
 */
export function loadAgentKeypair(): Keypair | null {
  // Try environment variable first (base58 or JSON array)
  const envKey = process.env.AGENT_PRIVATE_KEY;
  if (envKey) {
    try {
      // Try parsing as JSON array
      const keyArray = JSON.parse(envKey);
      return Keypair.fromSecretKey(new Uint8Array(keyArray));
    } catch {
      // Try as base58 (not implemented for simplicity)
      console.error("Failed to parse AGENT_PRIVATE_KEY");
      return null;
    }
  }
  
  // For local development, try loading from file
  if (process.env.NODE_ENV === "development") {
    try {
      const fs = require("fs");
      const keyData = JSON.parse(fs.readFileSync("/home/ilhan/projects/stakepilot/dashboard/agent.json", "utf-8"));
      return Keypair.fromSecretKey(new Uint8Array(keyData));
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Create a stake account and delegate to a validator
 */
export async function stakeToValidator(
  agent: Keypair,
  validatorVoteAccount: PublicKey,
  amountLamports: number,
): Promise<StakeResult> {
  const connection = new Connection(RPC_URL, "confirmed");
  
  try {
    // Get rent exemption for stake account
    const rentExempt = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
    const totalLamports = amountLamports + rentExempt;
    
    // Check agent balance
    const balance = await connection.getBalance(agent.publicKey);
    if (balance < totalLamports) {
      return {
        success: false,
        error: `Insufficient balance: need ${totalLamports / LAMPORTS_PER_SOL} SOL, have ${balance / LAMPORTS_PER_SOL} SOL`,
      };
    }
    
    // Create new stake account keypair
    const stakeAccount = Keypair.generate();
    
    // Create stake account instruction
    const createStakeAccountIx = StakeProgram.createAccount({
      fromPubkey: agent.publicKey,
      stakePubkey: stakeAccount.publicKey,
      authorized: new Authorized(
        agent.publicKey, // staker
        agent.publicKey, // withdrawer
      ),
      lockup: new Lockup(0, 0, agent.publicKey),
      lamports: totalLamports,
    });
    
    // Delegate stake instruction
    const delegateIx = StakeProgram.delegate({
      stakePubkey: stakeAccount.publicKey,
      authorizedPubkey: agent.publicKey,
      votePubkey: validatorVoteAccount,
    });
    
    // Build and send transaction
    const transaction = new Transaction().add(
      ...createStakeAccountIx.instructions,
      ...delegateIx.instructions,
    );
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [agent, stakeAccount],
      { commitment: "confirmed" }
    );
    
    return {
      success: true,
      stakeAccount: stakeAccount.publicKey.toBase58(),
      signature,
      amount: amountLamports / LAMPORTS_PER_SOL,
      validator: validatorVoteAccount.toBase58(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown error during staking",
    };
  }
}

/**
 * Get all stake accounts owned by an address
 */
export async function getStakeAccounts(owner: PublicKey): Promise<Array<{
  pubkey: string;
  lamports: number;
  validator?: string;
  state: string;
}>> {
  const connection = new Connection(RPC_URL, "confirmed");
  
  const accounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          memcmp: {
            offset: 12, // staker authorized offset
            bytes: owner.toBase58(),
          },
        },
      ],
    }
  );
  
  return accounts.map((account) => {
    const parsed = (account.account.data as any).parsed;
    const info = parsed?.info;
    const stake = info?.stake;
    
    return {
      pubkey: account.pubkey.toBase58(),
      lamports: account.account.lamports,
      validator: stake?.delegation?.voter,
      state: parsed?.type || "unknown",
    };
  });
}
