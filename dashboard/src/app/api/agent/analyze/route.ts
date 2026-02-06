/**
 * Agent Analysis API - TESTNET
 * 
 * This endpoint returns the agent's current decision-making process.
 * It evaluates the vault state, available validators, and generates
 * a detailed staking plan with reasoning.
 */

import { NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getTopValidators, STAKER_SPACE_VALIDATOR, estimateApy } from "@/lib/validators";

const RPC_URL = "https://api.testnet.solana.com";
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
  estimatedApy: number;
  score: number;
  stake: number;
  commission: number;
  mevCommission: number | null;
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

    // Get qualified testnet validators
    const validators = await getTopValidators(20);
    
    // Agent reasoning process
    const reasoning: string[] = [];
    let action: "stake" | "hold" | "rebalance" = "hold";

    // Step 1: Evaluate vault state
    reasoning.push(`📊 Network: Solana Testnet`);
    reasoning.push(`Vault balance: ${vaultBalance.toFixed(4)} SOL (reserve: 0.1 SOL)`);
    reasoning.push(`Available to stake: ${availableToStake.toFixed(4)} SOL`);
    reasoning.push(`Currently staked: ${totalStaked.toFixed(4)} SOL`);

    if (availableToStake < 1) {
      reasoning.push("❌ Insufficient balance - need at least 1 SOL per validator");
      return NextResponse.json({
        network: "testnet",
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
    reasoning.push(`Found ${validators.length} testnet validators matching criteria`);
    reasoning.push("Criteria: <1M stake, ≤5% comm, ≤10% MEV comm, >95% uptime");

    // Step 3: Select top validators
    const minPerValidator = 0.5;
    const maxByBalance = Math.floor(availableToStake / minPerValidator);
    const numValidators = Math.min(MAX_VALIDATORS, maxByBalance, validators.length);
    const selectedValidators = validators.slice(0, Math.max(1, numValidators));
    
    reasoning.push(`Selected top ${selectedValidators.length} validators for diversification`);
    reasoning.push(`⭐ Staker Space (testnet) always included`);

    // Step 4: Calculate allocation
    const stakePerValidator = availableToStake / selectedValidators.length;
    
    const analysis: ValidatorAnalysis[] = selectedValidators.map((v) => {
      const reasons: string[] = [];
      const apy = estimateApy(v);
      
      // Why this validator?
      if (v.voteAccount === STAKER_SPACE_VALIDATOR) {
        reasons.push("🌟 Our validator - always included");
      }
      if (v.totalScore >= 9) {
        reasons.push("Excellent reliability score");
      } else if (v.totalScore >= 7) {
        reasons.push("Strong reliability score");
      } else {
        reasons.push("Good reliability");
      }
      
      if (v.activatedStake < 100000) {
        reasons.push("Supports decentralization (small stake)");
      } else if (v.activatedStake < 500000) {
        reasons.push("Medium stake pool");
      }
      
      if (v.isDz) {
        reasons.push("DoubleZero validator");
      }
      
      return {
        name: v.name,
        voteAccount: v.voteAccount,
        estimatedApy: apy,
        score: v.totalScore,
        stake: v.activatedStake,
        commission: v.commission,
        mevCommission: v.mevCommission,
        uptime: v.uptime,
        reasons,
        allocation: stakePerValidator,
      };
    });

    // Step 5: Determine action
    if (availableToStake >= 1 && selectedValidators.length > 0) {
      action = "stake";
      reasoning.push(`✅ Ready to stake ${availableToStake.toFixed(2)} SOL across ${selectedValidators.length} validators`);
      reasoning.push(`Each validator receives: ${stakePerValidator.toFixed(2)} SOL`);
      const avgApy = analysis.reduce((sum, v) => sum + v.estimatedApy, 0) / analysis.length;
      reasoning.push(`Expected weighted APY: ${avgApy.toFixed(2)}%`);
    }

    reasoning.push("🧪 Testnet mode - demo execution");

    return NextResponse.json({
      network: "testnet",
      timestamp: new Date().toISOString(),
      vaultBalance,
      availableToStake,
      stakerSpaceValidator: STAKER_SPACE_VALIDATOR,
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
