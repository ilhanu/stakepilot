import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getTopValidators } from "@/lib/stakewiz";
import { loadAgentKeypair, stakeToValidator, getStakeAccounts } from "@/lib/native-staking";

export const dynamic = "force-dynamic";

/**
 * Agent Execution API
 * 
 * This endpoint executes staking operations using native Solana staking.
 * The agent creates stake accounts and delegates to qualified validators.
 * 
 * Security: Only Vercel cron or valid Bearer token can execute.
 */

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const AGENT_PUBKEY = new PublicKey("By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny");
const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.testnet.solana.com";

// Minimum SOL to keep for operations
const MIN_RESERVE = 0.1 * LAMPORTS_PER_SOL;
// Minimum stake per validator (1 SOL)
const MIN_STAKE_AMOUNT = 1 * LAMPORTS_PER_SOL;

interface StakeExecution {
  validator: string;
  validatorName: string;
  amount: number;
  stakeAccount?: string;
  signature?: string;
  success: boolean;
  error?: string;
}

interface ExecutionResult {
  success: boolean;
  agentBalance: number;
  availableToStake: number;
  stakesCreated: number;
  totalStaked: number;
  executions: StakeExecution[];
  errors: string[];
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
    
    // Get agent balance
    const agentBalance = await connection.getBalance(AGENT_PUBKEY);
    
    // Get existing stake accounts
    const stakeAccounts = await getStakeAccounts(AGENT_PUBKEY);
    const totalStaked = stakeAccounts.reduce((sum, sa) => sum + sa.lamports, 0);

    const validators = await getTopValidators(10);

    return NextResponse.json({
      agent: AGENT_PUBKEY.toBase58(),
      balance: agentBalance / LAMPORTS_PER_SOL,
      totalStaked: totalStaked / LAMPORTS_PER_SOL,
      stakeAccounts: stakeAccounts.length,
      availableToStake: Math.max(0, (agentBalance - MIN_RESERVE) / LAMPORTS_PER_SOL),
      topValidators: validators.map((v) => ({
        name: v.name,
        voteAccount: v.vote_identity,
        totalApy: v.total_apy,
        wizScore: v.wiz_score,
        stake: v.activated_stake,
        commission: v.commission,
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
  const executions: StakeExecution[] = [];
  const errors: string[] = [];

  // Load agent keypair
  const agent = loadAgentKeypair();
  if (!agent) {
    return {
      success: false,
      agentBalance: 0,
      availableToStake: 0,
      stakesCreated: 0,
      totalStaked: 0,
      executions: [],
      errors: ["Agent keypair not configured. Set AGENT_PRIVATE_KEY or run locally with agent.json"],
    };
  }

  // Get agent balance
  const agentBalance = await connection.getBalance(agent.publicKey);
  const availableToStake = agentBalance - MIN_RESERVE;

  if (availableToStake < MIN_STAKE_AMOUNT) {
    return {
      success: true,
      agentBalance: agentBalance / LAMPORTS_PER_SOL,
      availableToStake: availableToStake / LAMPORTS_PER_SOL,
      stakesCreated: 0,
      totalStaked: 0,
      executions: [],
      errors: [`Insufficient balance to stake. Need at least ${MIN_STAKE_AMOUNT / LAMPORTS_PER_SOL + MIN_RESERVE / LAMPORTS_PER_SOL} SOL`],
    };
  }

  // Get top validators
  const validators = await getTopValidators(5);
  if (validators.length === 0) {
    return {
      success: false,
      agentBalance: agentBalance / LAMPORTS_PER_SOL,
      availableToStake: availableToStake / LAMPORTS_PER_SOL,
      stakesCreated: 0,
      totalStaked: 0,
      executions: [],
      errors: ["No qualified validators found"],
    };
  }

  // Calculate stake per validator
  const stakePerValidator = Math.floor(availableToStake / validators.length);
  if (stakePerValidator < MIN_STAKE_AMOUNT) {
    return {
      success: true,
      agentBalance: agentBalance / LAMPORTS_PER_SOL,
      availableToStake: availableToStake / LAMPORTS_PER_SOL,
      stakesCreated: 0,
      totalStaked: 0,
      executions: [],
      errors: [`Stake per validator (${stakePerValidator / LAMPORTS_PER_SOL} SOL) below minimum ${MIN_STAKE_AMOUNT / LAMPORTS_PER_SOL} SOL`],
    };
  }

  // Execute staking to each validator
  let stakesCreated = 0;
  let totalStaked = 0;

  for (const validator of validators) {
    const execution: StakeExecution = {
      validator: validator.vote_identity,
      validatorName: validator.name,
      amount: stakePerValidator / LAMPORTS_PER_SOL,
      success: false,
    };

    try {
      const result = await stakeToValidator(
        agent,
        new PublicKey(validator.vote_identity),
        stakePerValidator,
      );

      if (result.success) {
        execution.success = true;
        execution.stakeAccount = result.stakeAccount;
        execution.signature = result.signature;
        stakesCreated++;
        totalStaked += stakePerValidator;
      } else {
        execution.error = result.error;
        errors.push(`Failed to stake to ${validator.name}: ${result.error}`);
      }
    } catch (error: any) {
      execution.error = error.message;
      errors.push(`Error staking to ${validator.name}: ${error.message}`);
    }

    executions.push(execution);
  }

  return {
    success: stakesCreated > 0,
    agentBalance: agentBalance / LAMPORTS_PER_SOL,
    availableToStake: availableToStake / LAMPORTS_PER_SOL,
    stakesCreated,
    totalStaked: totalStaked / LAMPORTS_PER_SOL,
    executions,
    errors,
  };
}
