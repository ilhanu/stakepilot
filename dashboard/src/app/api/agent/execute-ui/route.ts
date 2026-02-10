import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { STAKER_SPACE_VALIDATOR } from "@/lib/validators";
import { loadAgentKeypair, stakeToValidator, getStakeAccounts } from "@/lib/native-staking";

export const dynamic = "force-dynamic";

/**
 * UI-triggered agent execution - TESTNET ONLY
 * 
 * Allows the dashboard to trigger real staking transactions.
 * Stakes to Staker Space validator only for demo.
 */

const RPC_URL = "https://api.testnet.solana.com";
const MIN_STAKE_AMOUNT = 1 * LAMPORTS_PER_SOL;
const MIN_RESERVE = 0.1 * LAMPORTS_PER_SOL;

export async function POST(request: NextRequest) {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    
    // Load agent keypair
    const agent = loadAgentKeypair();
    if (!agent) {
      return NextResponse.json({
        success: false,
        error: "Agent keypair not available. Agent runs on a secure local server.",
        hint: "The agent private key is kept secure on the local machine, not in Vercel.",
      }, { status: 400 });
    }

    // Get agent balance
    const agentBalance = await connection.getBalance(agent.publicKey);
    const availableToStake = agentBalance - MIN_RESERVE;

    if (availableToStake < MIN_STAKE_AMOUNT) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Need ${(MIN_STAKE_AMOUNT + MIN_RESERVE) / LAMPORTS_PER_SOL} SOL, have ${agentBalance / LAMPORTS_PER_SOL} SOL`,
        agentBalance: agentBalance / LAMPORTS_PER_SOL,
        availableToStake: availableToStake / LAMPORTS_PER_SOL,
      }, { status: 400 });
    }

    // Check if already staked to Staker Space
    const existingStakes = await getStakeAccounts(agent.publicKey);
    const alreadyStaked = existingStakes.some(
      (sa) => sa.validator === STAKER_SPACE_VALIDATOR
    );

    if (alreadyStaked) {
      return NextResponse.json({
        success: true,
        message: "Already staked to Staker Space validator",
        existingStakes: existingStakes.map(sa => ({
          stakeAccount: sa.pubkey,
          validator: sa.validator,
          lamports: sa.lamports / LAMPORTS_PER_SOL,
          state: sa.state,
        })),
      });
    }

    // Stake to Staker Space validator
    const stakeAmount = Math.min(availableToStake, 1.1 * LAMPORTS_PER_SOL);
    
    const result = await stakeToValidator(
      agent,
      new PublicKey(STAKER_SPACE_VALIDATOR),
      stakeAmount,
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        network: "testnet",
        validator: STAKER_SPACE_VALIDATOR,
        validatorName: "Staker Space",
        amount: stakeAmount / LAMPORTS_PER_SOL,
        stakeAccount: result.stakeAccount,
        signature: result.signature,
        explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=testnet`,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("UI execution failed:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Execution failed",
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "execute-ui",
    description: "UI-triggered agent execution for demo",
    method: "POST",
    note: "Stakes to Staker Space validator on testnet",
  });
}
