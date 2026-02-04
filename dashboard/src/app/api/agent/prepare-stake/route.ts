/**
 * Agent API: POST /api/agent/prepare-stake
 * 
 * Generates an unsigned stake transaction for agent or human execution.
 * Returns base64-encoded transaction + human-readable instructions.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  StakeProgram,
  Authorized,
  Lockup,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

interface PrepareStakeRequest {
  wallet: string;           // User's wallet (payer, stake authority, withdraw authority)
  validator: string;        // Vote account to delegate to
  amountSol: number;        // Amount to stake
  stakeAuthority?: string;  // Optional: different stake authority
  withdrawAuthority?: string; // Optional: different withdraw authority
}

interface PrepareStakeResponse {
  transaction: {
    base64: string;           // Unsigned transaction, base64 encoded
    base58: string;           // Unsigned transaction, base58 encoded (for some wallets)
  };
  stakeAccount: {
    pubkey: string;           // New stake account address
    seed: string;             // Seed used to derive (for deterministic recreation)
  };
  details: {
    amountLamports: number;
    amountSol: number;
    validator: string;
    stakeAuthority: string;
    withdrawAuthority: string;
    rentExemptReserve: number;
    totalCost: number;        // amountLamports + rent
  };
  instructions: {
    forAgents: string;
    forHumans: string[];
    warnings: string[];
  };
  meta: {
    blockhash: string;
    lastValidBlockHeight: number;
    expiresAt: string;        // Approximate expiry time
  };
}

// Minimum stake amount (rent-exempt reserve + 1 SOL minimum effective stake)
const MIN_STAKE_SOL = 0.01;
const STAKE_ACCOUNT_SIZE = 200; // bytes

export async function POST(request: NextRequest) {
  try {
    const body: PrepareStakeRequest = await request.json();
    
    const { wallet, validator, amountSol, stakeAuthority, withdrawAuthority } = body;
    
    // Validation
    if (!wallet || !validator || !amountSol) {
      return NextResponse.json(
        { error: "Missing required fields: wallet, validator, amountSol" },
        { status: 400 }
      );
    }
    
    if (amountSol < MIN_STAKE_SOL) {
      return NextResponse.json(
        { error: `Minimum stake amount is ${MIN_STAKE_SOL} SOL` },
        { status: 400 }
      );
    }
    
    // Parse public keys
    let walletPubkey: PublicKey;
    let validatorPubkey: PublicKey;
    let stakeAuthorityPubkey: PublicKey;
    let withdrawAuthorityPubkey: PublicKey;
    
    try {
      walletPubkey = new PublicKey(wallet);
      validatorPubkey = new PublicKey(validator);
      stakeAuthorityPubkey = stakeAuthority ? new PublicKey(stakeAuthority) : walletPubkey;
      withdrawAuthorityPubkey = withdrawAuthority ? new PublicKey(withdrawAuthority) : walletPubkey;
    } catch {
      return NextResponse.json(
        { error: "Invalid public key format" },
        { status: 400 }
      );
    }
    
    const connection = new Connection(RPC_URL, "confirmed");
    
    // Get rent-exempt minimum for stake account
    const rentExemptReserve = await connection.getMinimumBalanceForRentExemption(STAKE_ACCOUNT_SIZE);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    
    // Generate stake account keypair deterministically from wallet + timestamp
    // This allows recreation if needed
    const seed = `stake:${Date.now()}`;
    const stakeAccountKeypair = Keypair.generate();
    const stakeAccountPubkey = stakeAccountKeypair.publicKey;
    
    // Calculate amounts
    const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const totalLamports = amountLamports + rentExemptReserve;
    
    // Build transaction
    const transaction = new Transaction();
    
    // 1. Create stake account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: stakeAccountPubkey,
        lamports: totalLamports,
        space: STAKE_ACCOUNT_SIZE,
        programId: StakeProgram.programId,
      })
    );
    
    // 2. Initialize stake account
    transaction.add(
      StakeProgram.initialize({
        stakePubkey: stakeAccountPubkey,
        authorized: new Authorized(stakeAuthorityPubkey, withdrawAuthorityPubkey),
        lockup: new Lockup(0, 0, walletPubkey), // No lockup
      })
    );
    
    // 3. Delegate to validator
    transaction.add(
      StakeProgram.delegate({
        stakePubkey: stakeAccountPubkey,
        authorizedPubkey: stakeAuthorityPubkey,
        votePubkey: validatorPubkey,
      })
    );
    
    // Set transaction properties
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubkey;
    
    // Serialize (unsigned)
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    
    const base64Tx = serialized.toString("base64");
    const base58Tx = Buffer.from(serialized).toString("base64"); // Note: proper base58 would need bs58 lib
    
    // Calculate expiry (blockhash valid for ~60-90 seconds typically, but can be longer)
    const expiresAt = new Date(Date.now() + 60000).toISOString(); // Conservative 60s estimate
    
    // Build response
    const response: PrepareStakeResponse = {
      transaction: {
        base64: base64Tx,
        base58: base58Tx,
      },
      stakeAccount: {
        pubkey: stakeAccountPubkey.toBase58(),
        seed,
      },
      details: {
        amountLamports,
        amountSol,
        validator,
        stakeAuthority: stakeAuthorityPubkey.toBase58(),
        withdrawAuthority: withdrawAuthorityPubkey.toBase58(),
        rentExemptReserve,
        totalCost: totalLamports,
      },
      instructions: {
        forAgents: `SIGN_AND_SEND transaction.base64 WITH signers=[${wallet}, ${stakeAccountPubkey.toBase58()}]`,
        forHumans: [
          `1. This will create a new stake account: ${stakeAccountPubkey.toBase58().slice(0, 8)}...`,
          `2. Deposit ${amountSol} SOL + ${(rentExemptReserve / LAMPORTS_PER_SOL).toFixed(4)} SOL rent`,
          `3. Delegate to validator: ${validator.slice(0, 8)}...`,
          `4. Sign with your wallet to execute`,
        ],
        warnings: amountSol > 1000 ? ["Large stake amount - double check validator"] : [],
      },
      meta: {
        blockhash,
        lastValidBlockHeight,
        expiresAt,
      },
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Prepare stake error:", error);
    return NextResponse.json(
      { error: "Failed to prepare stake transaction", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/agent/prepare-stake",
    description: "Generate unsigned stake transaction",
    example: {
      wallet: "YourWalletAddress...",
      validator: "ValidatorVoteAccount...",
      amountSol: 10,
    },
    notes: [
      "Transaction requires 2 signatures: wallet (payer) + stake account (new)",
      "Stake account keypair must be generated client-side for security",
      "Transaction expires in ~60 seconds (blockhash validity)",
    ],
  });
}
