/**
 * Agent API: POST /api/agent/prepare-unstake
 * 
 * Generates unsigned transactions for unstaking (deactivate and/or withdraw).
 * Returns base64-encoded transactions + human-readable instructions.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  StakeProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

interface PrepareUnstakeRequest {
  stakeAccount: string;     // Stake account to unstake
  wallet: string;           // Wallet with stake authority
  action: "deactivate" | "withdraw" | "both"; // What to do
  withdrawTo?: string;      // Optional: withdraw to different address
}

interface StakeAccountInfo {
  pubkey: string;
  state: "activating" | "active" | "deactivating" | "inactive";
  lamports: number;
  solAmount: number;
  validator: string | null;
  stakeAuthority: string;
  withdrawAuthority: string;
  activationEpoch: number | null;
  deactivationEpoch: number | null;
  rentExemptReserve: number;
}

interface PrepareUnstakeResponse {
  stakeAccountInfo: StakeAccountInfo;
  transactions: {
    deactivate?: {
      base64: string;
      description: string;
    };
    withdraw?: {
      base64: string;
      description: string;
      amount: number; // Withdrawable amount in lamports
    };
  };
  timeline: {
    currentEpoch: number;
    cooldownEpochs: number;
    estimatedUnlockEpoch: number;
    estimatedUnlockDate: string;
  } | null;
  instructions: {
    forAgents: string;
    forHumans: string[];
    warnings: string[];
  };
  meta: {
    blockhash: string;
    lastValidBlockHeight: number;
    expiresAt: string;
  };
}

async function getStakeAccountInfo(connection: Connection, stakeAccountPubkey: PublicKey): Promise<StakeAccountInfo | null> {
  const accountInfo = await connection.getParsedAccountInfo(stakeAccountPubkey);
  
  if (!accountInfo.value) {
    return null;
  }
  
  const data = accountInfo.value.data;
  if (!("parsed" in data)) {
    return null;
  }
  
  const parsed = data.parsed;
  const info = parsed.info;
  const stake = info.stake;
  const meta = info.meta;
  
  let state: StakeAccountInfo["state"] = "inactive";
  let validator: string | null = null;
  let activationEpoch: number | null = null;
  let deactivationEpoch: number | null = null;
  
  if (stake?.delegation) {
    validator = stake.delegation.voter;
    activationEpoch = stake.delegation.activationEpoch;
    deactivationEpoch = stake.delegation.deactivationEpoch;
    
    // Determine state
    const deactivationEpochNum = parseInt(deactivationEpoch?.toString() || "0");
    if (deactivationEpochNum > 0 && deactivationEpochNum < 999999999) {
      state = "deactivating";
    } else {
      state = "active";
    }
  }
  
  return {
    pubkey: stakeAccountPubkey.toBase58(),
    state,
    lamports: accountInfo.value.lamports,
    solAmount: accountInfo.value.lamports / LAMPORTS_PER_SOL,
    validator,
    stakeAuthority: meta?.authorized?.staker || "",
    withdrawAuthority: meta?.authorized?.withdrawer || "",
    activationEpoch,
    deactivationEpoch,
    rentExemptReserve: meta?.rentExemptReserve || 0,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PrepareUnstakeRequest = await request.json();
    
    const { stakeAccount, wallet, action = "deactivate", withdrawTo } = body;
    
    // Validation
    if (!stakeAccount || !wallet) {
      return NextResponse.json(
        { error: "Missing required fields: stakeAccount, wallet" },
        { status: 400 }
      );
    }
    
    // Parse public keys
    let stakeAccountPubkey: PublicKey;
    let walletPubkey: PublicKey;
    let withdrawToPubkey: PublicKey;
    
    try {
      stakeAccountPubkey = new PublicKey(stakeAccount);
      walletPubkey = new PublicKey(wallet);
      withdrawToPubkey = withdrawTo ? new PublicKey(withdrawTo) : walletPubkey;
    } catch {
      return NextResponse.json(
        { error: "Invalid public key format" },
        { status: 400 }
      );
    }
    
    const connection = new Connection(RPC_URL, "confirmed");
    
    // Get stake account info
    const stakeInfo = await getStakeAccountInfo(connection, stakeAccountPubkey);
    
    if (!stakeInfo) {
      return NextResponse.json(
        { error: "Stake account not found or invalid" },
        { status: 404 }
      );
    }
    
    // Verify authority
    if (stakeInfo.stakeAuthority !== wallet && stakeInfo.withdrawAuthority !== wallet) {
      return NextResponse.json(
        { error: "Wallet is not authorized for this stake account" },
        { status: 403 }
      );
    }
    
    // Get blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    
    // Get current epoch for timeline calculation
    const epochInfo = await connection.getEpochInfo();
    const currentEpoch = epochInfo.epoch;
    
    const transactions: PrepareUnstakeResponse["transactions"] = {};
    const warnings: string[] = [];
    const humanInstructions: string[] = [];
    let agentInstruction = "";
    let timeline: PrepareUnstakeResponse["timeline"] = null;
    
    // Build deactivate transaction if needed
    if ((action === "deactivate" || action === "both") && stakeInfo.state === "active") {
      const deactivateTx = new Transaction();
      deactivateTx.add(
        StakeProgram.deactivate({
          stakePubkey: stakeAccountPubkey,
          authorizedPubkey: new PublicKey(stakeInfo.stakeAuthority),
        })
      );
      deactivateTx.recentBlockhash = blockhash;
      deactivateTx.feePayer = walletPubkey;
      
      const serialized = deactivateTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      
      transactions.deactivate = {
        base64: serialized.toString("base64"),
        description: `Deactivate ${stakeInfo.solAmount.toFixed(4)} SOL stake`,
      };
      
      // Calculate cooldown timeline
      const cooldownEpochs = 1; // Typically 1 epoch cooldown
      const estimatedUnlockEpoch = currentEpoch + cooldownEpochs + 1;
      const epochDurationMs = 2 * 24 * 60 * 60 * 1000; // ~2 days per epoch
      const estimatedUnlockDate = new Date(Date.now() + (cooldownEpochs + 1) * epochDurationMs);
      
      timeline = {
        currentEpoch,
        cooldownEpochs,
        estimatedUnlockEpoch,
        estimatedUnlockDate: estimatedUnlockDate.toISOString(),
      };
      
      humanInstructions.push(`1. Sign deactivate transaction to begin cooldown`);
      humanInstructions.push(`2. Wait ~${cooldownEpochs + 1} epochs (~${((cooldownEpochs + 1) * 2).toFixed(0)} days) for funds to unlock`);
      humanInstructions.push(`3. After unlock, withdraw funds to your wallet`);
      
      agentInstruction = `SIGN_AND_SEND deactivate.base64 THEN WAIT_EPOCHS ${cooldownEpochs + 1}`;
    } else if (action === "deactivate" && stakeInfo.state !== "active") {
      warnings.push(`Stake is already ${stakeInfo.state}, cannot deactivate`);
    }
    
    // Build withdraw transaction if needed
    if ((action === "withdraw" || action === "both") && stakeInfo.state === "inactive") {
      const withdrawableLamports = stakeInfo.lamports;
      
      const withdrawTx = new Transaction();
      withdrawTx.add(
        StakeProgram.withdraw({
          stakePubkey: stakeAccountPubkey,
          authorizedPubkey: new PublicKey(stakeInfo.withdrawAuthority),
          toPubkey: withdrawToPubkey,
          lamports: withdrawableLamports,
        })
      );
      withdrawTx.recentBlockhash = blockhash;
      withdrawTx.feePayer = walletPubkey;
      
      const serialized = withdrawTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      
      transactions.withdraw = {
        base64: serialized.toString("base64"),
        description: `Withdraw ${(withdrawableLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`,
        amount: withdrawableLamports,
      };
      
      humanInstructions.push(`Sign withdraw transaction to receive ${(withdrawableLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      agentInstruction = `SIGN_AND_SEND withdraw.base64`;
    } else if (action === "withdraw" && stakeInfo.state !== "inactive") {
      warnings.push(`Stake is ${stakeInfo.state}, must be inactive to withdraw. Deactivate first and wait for cooldown.`);
    } else if (action === "both" && stakeInfo.state === "active") {
      warnings.push(`After deactivating, wait for cooldown period before withdrawing`);
    }
    
    // Handle "deactivating" state
    if (stakeInfo.state === "deactivating") {
      const deactivationEpoch = stakeInfo.deactivationEpoch || currentEpoch;
      const epochsRemaining = Math.max(0, deactivationEpoch - currentEpoch + 1);
      
      timeline = {
        currentEpoch,
        cooldownEpochs: epochsRemaining,
        estimatedUnlockEpoch: deactivationEpoch + 1,
        estimatedUnlockDate: new Date(Date.now() + epochsRemaining * 2 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      warnings.push(`Stake is currently deactivating. ~${epochsRemaining} epoch(s) remaining until withdrawal.`);
      humanInstructions.push(`Wait for cooldown to complete, then withdraw`);
    }
    
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    
    const response: PrepareUnstakeResponse = {
      stakeAccountInfo: stakeInfo,
      transactions,
      timeline,
      instructions: {
        forAgents: agentInstruction || "NO_ACTION_NEEDED",
        forHumans: humanInstructions.length > 0 ? humanInstructions : ["No action available for current stake state"],
        warnings,
      },
      meta: {
        blockhash,
        lastValidBlockHeight,
        expiresAt,
      },
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Prepare unstake error:", error);
    return NextResponse.json(
      { error: "Failed to prepare unstake transaction", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/agent/prepare-unstake",
    description: "Generate unsigned unstake (deactivate/withdraw) transactions",
    example: {
      stakeAccount: "StakeAccountAddress...",
      wallet: "YourWalletAddress...",
      action: "deactivate", // or "withdraw" or "both"
    },
    notes: [
      "Deactivate: Starts cooldown period (~1-2 epochs)",
      "Withdraw: Only works after stake is fully inactive",
      "Both: Returns deactivate tx, withdraw must be done later after cooldown",
    ],
  });
}
