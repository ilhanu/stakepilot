/**
 * Agent Analysis API
 * 
 * This endpoint returns the agent's current decision-making process.
 * It evaluates the vault state, available validators, and generates
 * a detailed staking plan with reasoning.
 */

import { NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getTopValidators } from "@/lib/stakewiz";

const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");

// Minimum balance to keep in vault
const MIN_VAULT_RESERVE = 0.1 * LAMPORTS_PER_SOL;
// Minimum stake per validator
const MIN_STAKE_PER_VALIDATOR = 1 * LAMPORTS_PER_SOL;
// Maximum validators to stake to
const MAX_VALIDATORS = 5;

interface ValidatorAnalysis {
  name: string;
  voteAccount: string;
  totalApy: number;
  wizScore: number;
  stake: number;
  commission: number;
  mevCommission: number;
  uptime: number;
  reasons: string[];
  allocation: number;
}

export async function GET() {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    
    // Get vault state
    const vaultAccount = await connection.getAccountInfo(VAULT_PDA);
    if (!vaultAccount) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 });
    }

    const vaultBalance = vaultAccount.lamports / LAMPORTS_PER_SOL;
    const availableToStake = Math.max(0, (vaultAccount.lamports - MIN_VAULT_RESERVE) / LAMPORTS_PER_SOL);

    // Parse vault data
    const vaultData = vaultAccount.data.slice(8);
    const totalStaked = Number(vaultData.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;

    // Get qualified validators from StakeWiz
    const validators = await getTopValidators(20);
    
    // Agent reasoning process
    const reasoning: string[] = [];
    let action: "stake" | "hold" | "rebalance" = "hold";

    // Step 1: Evaluate vault state
    reasoning.push(`Vault balance: ${vaultBalance.toFixed(4)} SOL (reserve: 0.1 SOL)`);
    reasoning.push(`Available to stake: ${availableToStake.toFixed(4)} SOL`);
    reasoning.push(`Currently staked: ${totalStaked.toFixed(4)} SOL`);

    if (availableToStake < 1) {
      reasoning.push("❌ Insufficient balance - need at least 1 SOL per validator");
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        vaultBalance,
        availableToStake,
        analysis: [],
        reasoning,
        action: "hold",
        status: "simulated",
      });
    }

    // Step 2: Filter and score validators
    reasoning.push(`Found ${validators.length} validators matching criteria`);
    reasoning.push("Criteria: <1M stake, ≤5% comm, ≤10% MEV comm, >95% uptime");

    // Step 3: Select top validators
    // Allow partial SOL per validator (min 0.5 SOL each) for better diversification
    const minPerValidator = 0.5;
    const maxByBalance = Math.floor(availableToStake / minPerValidator);
    const numValidators = Math.min(MAX_VALIDATORS, maxByBalance, validators.length);
    const selectedValidators = validators.slice(0, Math.max(1, numValidators));
    
    reasoning.push(`Selected top ${selectedValidators.length} validators for diversification`);
    reasoning.push(`Staker Space always included for alignment`);

    // Step 4: Calculate allocation
    const stakePerValidator = availableToStake / selectedValidators.length;
    
    const analysis: ValidatorAnalysis[] = selectedValidators.map((v, i) => {
      const reasons: string[] = [];
      
      // Why this validator?
      if (v.name === "Staker Space") {
        reasons.push("🌟 Our validator - always included");
      }
      if (v.wiz_score >= 95) {
        reasons.push("Excellent reliability score");
      } else if (v.wiz_score >= 90) {
        reasons.push("Strong reliability score");
      } else {
        reasons.push("Good reliability");
      }
      
      if (v.activated_stake < 100000) {
        reasons.push("Supports decentralization (small stake)");
      } else if (v.activated_stake < 500000) {
        reasons.push("Medium stake pool");
      }
      
      if (v.total_apy >= 6.3) {
        reasons.push("Above average APY");
      }
      
      return {
        name: v.name,
        voteAccount: v.vote_identity,
        totalApy: v.total_apy,
        wizScore: v.wiz_score,
        stake: v.activated_stake,
        commission: v.commission || 0,
        mevCommission: v.jito_commission_bps ? v.jito_commission_bps / 100 : 0,
        uptime: v.uptime || 99,
        reasons,
        allocation: stakePerValidator,
      };
    });

    // Step 5: Determine action
    if (availableToStake >= 1 && selectedValidators.length > 0) {
      action = "stake";
      reasoning.push(`✅ Ready to stake ${availableToStake.toFixed(2)} SOL across ${selectedValidators.length} validators`);
      reasoning.push(`Each validator receives: ${stakePerValidator.toFixed(2)} SOL`);
      reasoning.push(`Expected weighted APY: ${(analysis.reduce((sum, v) => sum + v.totalApy, 0) / analysis.length).toFixed(2)}%`);
    }

    // On devnet, we simulate rather than execute
    reasoning.push("⚠️ Devnet mode: Execution simulated (mainnet will execute automatically)");

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      vaultBalance,
      availableToStake,
      analysis,
      reasoning,
      action,
      status: "simulated",
    });
  } catch (error) {
    console.error("Agent analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
