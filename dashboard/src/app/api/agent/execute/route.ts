import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getTopValidators } from "@/lib/stakewiz";

/**
 * Agent Execution API
 * 
 * This endpoint is called by a cron job to execute staking operations.
 * It reads vault balance and stakes to qualified validators.
 * 
 * Security: Only Vercel cron or valid Bearer token can execute.
 */

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const AGENT_PUBKEY = new PublicKey("Fc8gNpU62evbZBdiu9TN1isD1Zx3HDPZbBAhDAdmqthS");
const RPC_URL = "https://api.devnet.solana.com";

// Minimum SOL to keep in vault for rent/operations
const MIN_VAULT_BALANCE = 0.1 * LAMPORTS_PER_SOL;
// Minimum stake per validator
const MIN_STAKE_AMOUNT = 1 * LAMPORTS_PER_SOL;

interface ExecutionResult {
  success: boolean;
  vaultBalance: number;
  availableToStake: number;
  stakesCreated: number;
  errors: string[];
  transactions: string[];
  stakingPlan?: Array<{
    validator: string;
    validatorName: string;
    amount: number;
    expectedApy: number;
  }>;
}

function isAuthorized(request: NextRequest): boolean {
  // Check Vercel cron header
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (vercelCronHeader === "true") return true;

  // Check Bearer token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeStaking();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Agent execution failed:", error);
    return NextResponse.json(
      { error: error.message || "Execution failed" },
      { status: 500 }
    );
  }
}

// GET handles both Vercel cron (executes) and status checks
export async function GET(request: NextRequest) {
  // Vercel cron calls GET with x-vercel-cron header
  if (isAuthorized(request)) {
    try {
      const result = await executeStaking();
      return NextResponse.json(result);
    } catch (error: any) {
      console.error("Agent execution failed:", error);
      return NextResponse.json(
        { error: error.message || "Execution failed" },
        { status: 500 }
      );
    }
  }

  // Regular GET = status check (public)
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    
    const vaultAccount = await connection.getAccountInfo(VAULT_PDA);
    if (!vaultAccount) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 });
    }

    const vaultBalance = vaultAccount.lamports / LAMPORTS_PER_SOL;
    
    // Parse vault data
    const vaultData = vaultAccount.data.slice(8);
    const totalDeposits = Number(vaultData.readBigUInt64LE(64)) / LAMPORTS_PER_SOL;
    const totalStaked = Number(vaultData.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;
    const totalUsers = Number(vaultData.readBigUInt64LE(80));

    const validators = await getTopValidators(10);

    return NextResponse.json({
      vault: {
        address: VAULT_PDA.toBase58(),
        balance: vaultBalance,
        totalDeposits,
        totalStaked,
        totalUsers,
      },
      agent: AGENT_PUBKEY.toBase58(),
      availableToStake: Math.max(0, vaultBalance - MIN_VAULT_BALANCE / LAMPORTS_PER_SOL),
      topValidators: validators.map((v) => ({
        name: v.name,
        voteAccount: v.vote_identity,
        totalApy: v.total_apy,
        wizScore: v.wiz_score,
        stake: v.activated_stake,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Status check failed:", error);
    return NextResponse.json(
      { error: error.message || "Status check failed" },
      { status: 500 }
    );
  }
}

async function executeStaking(): Promise<ExecutionResult> {
  const connection = new Connection(RPC_URL, "confirmed");

  // Get vault balance
  const vaultAccount = await connection.getAccountInfo(VAULT_PDA);
  if (!vaultAccount) {
    throw new Error("Vault not found");
  }

  const vaultBalance = vaultAccount.lamports;
  const availableToStake = vaultBalance - MIN_VAULT_BALANCE;

  if (availableToStake < MIN_STAKE_AMOUNT) {
    return {
      success: true,
      vaultBalance: vaultBalance / LAMPORTS_PER_SOL,
      availableToStake: availableToStake / LAMPORTS_PER_SOL,
      stakesCreated: 0,
      errors: ["Insufficient balance to stake (need at least 1 SOL per validator)"],
      transactions: [],
    };
  }

  // Get top validators
  const validators = await getTopValidators(5);
  if (validators.length === 0) {
    return {
      success: false,
      vaultBalance: vaultBalance / LAMPORTS_PER_SOL,
      availableToStake: availableToStake / LAMPORTS_PER_SOL,
      stakesCreated: 0,
      errors: ["No qualified validators found"],
      transactions: [],
    };
  }

  // Calculate stake per validator
  const stakePerValidator = Math.floor(availableToStake / validators.length);
  if (stakePerValidator < MIN_STAKE_AMOUNT) {
    return {
      success: true,
      vaultBalance: vaultBalance / LAMPORTS_PER_SOL,
      availableToStake: availableToStake / LAMPORTS_PER_SOL,
      stakesCreated: 0,
      errors: [`Stake per validator (${stakePerValidator / LAMPORTS_PER_SOL} SOL) below minimum`],
      transactions: [],
    };
  }

  // Build staking plan
  const stakingPlan = validators.map((v) => ({
    validator: v.vote_identity,
    validatorName: v.name,
    amount: stakePerValidator / LAMPORTS_PER_SOL,
    expectedApy: v.total_apy,
  }));

  // TODO: Load agent keypair from AGENT_PRIVATE_KEY and execute actual staking
  // For now, return the plan
  return {
    success: true,
    vaultBalance: vaultBalance / LAMPORTS_PER_SOL,
    availableToStake: availableToStake / LAMPORTS_PER_SOL,
    stakesCreated: 0,
    errors: ["Agent keypair not configured - staking plan generated but not executed"],
    transactions: [],
    stakingPlan,
  };
}
