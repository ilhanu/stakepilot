#!/usr/bin/env npx ts-node
/**
 * StakePilot Agent Execution Script
 * 
 * Run via cron on beast to execute staking operations.
 * Agent key stays local (not in Vercel).
 * 
 * Usage: npx ts-node scripts/agent-execute.ts
 * Cron: 0 * * * * cd /path/to/dashboard && npx ts-node scripts/agent-execute.ts >> /var/log/stakepilot-agent.log 2>&1
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  SystemProgram,
  StakeProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Testnet constants
const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const RPC_URL = "https://api.testnet.solana.com";
const STAKE_CONFIG = new PublicKey("StakeConfig11111111111111111111111111111111");
const STAKER_SPACE_VALIDATOR = "3S4jVg5p1rw7t8MS5UtjhnChmo6ABdmh3nyXTVzAyP9f";

// Configuration
const MIN_VAULT_RESERVE = 0.1 * LAMPORTS_PER_SOL;
const MIN_STAKE_AMOUNT = 1 * LAMPORTS_PER_SOL;
const MAX_VALIDATORS = 5;

// Instruction discriminators (Anchor: sha256("global:<name>")[0..8])
const STAKE_DISCRIMINATOR = Buffer.from([11, 111, 254, 86, 247, 52, 8, 233]);
const DEACTIVATE_DISCRIMINATOR = Buffer.from([165, 158, 229, 97, 168, 220, 187, 225]);
const WITHDRAW_DISCRIMINATOR = Buffer.from([153, 8, 22, 138, 105, 176, 87, 66]);

// Rebalancing thresholds
const MIN_SCORE_THRESHOLD = 30;       // Below this score → deactivate
const SCORE_DROP_THRESHOLD = 0.5;     // If score drops to 50% of best → consider rebalancing
const DEACTIVATION_COOLDOWN = 2;      // ~2 epochs for deactivation cooldown

interface ValidatorRecommendation {
  validator: string;
  validatorName: string;
  score: number;
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function getRecommendations(): Promise<ValidatorRecommendation[]> {
  try {
    // Call local API or use validators.app directly
    const response = await fetch(
      `https://www.validators.app/api/v1/validators/testnet.json`,
      {
        headers: {
          Token: "uawTM1ynsnonDJ9z8YUun59F",
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`validators.app API error: ${response.status}`);
    }
    
    const validators = await response.json();
    
    // Filter and score validators
    const qualified = validators
      .filter((v: any) => 
        v.is_active && 
        !v.delinquent && 
        v.commission <= 5 &&
        (v.active_stake / 1e9) < 1_000_000
      )
      .map((v: any) => ({
        validator: v.vote_account,
        validatorName: v.name || `${v.vote_account.slice(0, 8)}...`,
        score: v.total_score || 0,
        stake: v.active_stake / 1e9,
        commission: v.commission,
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, MAX_VALIDATORS);
    
    // Always include Staker Space
    const hasStakerSpace = qualified.some(
      (v: any) => v.validator === STAKER_SPACE_VALIDATOR
    );
    
    if (!hasStakerSpace) {
      const stakerSpace = validators.find(
        (v: any) => v.vote_account === STAKER_SPACE_VALIDATOR
      );
      if (stakerSpace) {
        qualified.unshift({
          validator: STAKER_SPACE_VALIDATOR,
          validatorName: stakerSpace.name || "Staker Space",
          score: 100,
        });
        qualified.pop(); // Keep at MAX_VALIDATORS
      }
    }
    
    return qualified;
  } catch (error) {
    log(`Failed to get recommendations: ${error}`);
    // Fallback to just Staker Space
    return [{
      validator: STAKER_SPACE_VALIDATOR,
      validatorName: "Staker Space",
      score: 100,
    }];
  }
}

interface ExistingStake {
  pubkey: string;
  voter: string;
  stake: number;         // lamports
  activationEpoch: number;
  deactivationEpoch: string;
  isDeactivating: boolean;
  isActive: boolean;
}

async function getExistingStakeAccounts(
  connection: Connection,
  vaultPda: PublicKey
): Promise<ExistingStake[]> {
  // Get stake accounts where vault is the staker authority
  const stakeAccounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          memcmp: {
            offset: 12, // Authorized staker offset
            bytes: vaultPda.toBase58(),
          },
        },
      ],
    }
  );
  
  const results: ExistingStake[] = [];
  for (const acc of stakeAccounts) {
    const parsed = (acc.account.data as any).parsed;
    const delegation = parsed?.info?.stake?.delegation;
    if (delegation?.voter) {
      const deactivationEpoch = delegation.deactivationEpoch;
      results.push({
        pubkey: acc.pubkey.toBase58(),
        voter: delegation.voter,
        stake: parseInt(delegation.stake || "0"),
        activationEpoch: parseInt(delegation.activationEpoch || "0"),
        deactivationEpoch,
        isDeactivating: deactivationEpoch !== "18446744073709551615",
        isActive: deactivationEpoch === "18446744073709551615",
      });
    }
  }
  
  return results;
}

async function stakeToValidator(
  connection: Connection,
  agent: Keypair,
  validatorVote: string,
  amountLamports: bigint
): Promise<string | null> {
  const stakeAccount = Keypair.generate();
  
  const stakeData = Buffer.concat([
    STAKE_DISCRIMINATOR,
    Buffer.from(new BigUint64Array([amountLamports]).buffer),
  ]);

  const stakeIx = new TransactionInstruction({
    keys: [
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: agent.publicKey, isSigner: true, isWritable: true },
      { pubkey: stakeAccount.publicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(validatorVote), isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_STAKE_HISTORY_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: STAKE_CONFIG, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: stakeData,
  });

  const tx = new Transaction().add(stakeIx);
  
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [agent, stakeAccount]);
    return sig;
  } catch (error: any) {
    log(`Stake failed: ${error.message}`);
    if (error.logs) {
      error.logs.forEach((l: string) => log(`  ${l}`));
    }
    return null;
  }
}

async function deactivateStake(
  connection: Connection,
  agent: Keypair,
  stakeAccountPubkey: string
): Promise<string | null> {
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: VAULT_PDA, isSigner: false, isWritable: false },
      { pubkey: agent.publicKey, isSigner: true, isWritable: false },
      { pubkey: new PublicKey(stakeAccountPubkey), isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: DEACTIVATE_DISCRIMINATOR,
  });

  const tx = new Transaction().add(ix);
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [agent]);
    return sig;
  } catch (error: any) {
    log(`Deactivate failed: ${error.message}`);
    return null;
  }
}

async function withdrawStake(
  connection: Connection,
  agent: Keypair,
  stakeAccountPubkey: string
): Promise<string | null> {
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: agent.publicKey, isSigner: true, isWritable: false },
      { pubkey: new PublicKey(stakeAccountPubkey), isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_STAKE_HISTORY_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: WITHDRAW_DISCRIMINATOR,
  });

  const tx = new Transaction().add(ix);
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [agent]);
    return sig;
  } catch (error: any) {
    log(`Withdraw failed: ${error.message}`);
    return null;
  }
}

async function main() {
  log("🤖 StakePilot Agent Execution Starting");
  
  // Load agent keypair - look in current dir or parent
  let agentPath = "agent.json";
  if (!fs.existsSync(agentPath)) {
    agentPath = path.join(process.cwd(), "agent.json");
  }
  if (!fs.existsSync(agentPath)) {
    log("❌ Agent keypair not found. Expected at: " + process.cwd() + "/agent.json");
    process.exit(1);
  }
  
  const agentData = JSON.parse(fs.readFileSync(agentPath, "utf-8"));
  const agent = Keypair.fromSecretKey(new Uint8Array(agentData));
  log(`Agent: ${agent.publicKey.toBase58()}`);
  
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Check balances
  const vaultInfo = await connection.getAccountInfo(VAULT_PDA);
  const vaultBalance = vaultInfo ? vaultInfo.lamports : 0;
  const agentBalance = await connection.getBalance(agent.publicKey);
  
  log(`Vault balance: ${vaultBalance / LAMPORTS_PER_SOL} SOL`);
  log(`Agent balance: ${agentBalance / LAMPORTS_PER_SOL} SOL`);
  
  // Check vault has enough to stake
  const vaultAvailable = vaultBalance - MIN_VAULT_RESERVE;
  if (vaultAvailable < MIN_STAKE_AMOUNT) {
    log(`⏭️ Vault: not enough to stake. Need ${MIN_STAKE_AMOUNT / LAMPORTS_PER_SOL} SOL, have ${vaultAvailable / LAMPORTS_PER_SOL} SOL available.`);
    return;
  }
  
  // Agent needs SOL for tx fees + stake account rent (~0.003 SOL per stake account)
  const TX_FEE_RESERVE = 0.01 * LAMPORTS_PER_SOL;
  const STAKE_RENT = 0.00228288 * LAMPORTS_PER_SOL; // rent-exempt minimum for stake account
  const agentAvailable = agentBalance - TX_FEE_RESERVE;
  
  if (agentAvailable < STAKE_RENT) {
    log(`⚠️ Agent wallet too low for tx fees + rent. Has ${agentBalance / LAMPORTS_PER_SOL} SOL, needs at least ${(TX_FEE_RESERVE + STAKE_RENT) / LAMPORTS_PER_SOL} SOL`);
    return;
  }
  
  // The actual stakeable amount is limited by both vault balance and what the program transfers
  const availableToStake = vaultAvailable;
  
  // ==============================
  // PHASE 1: REBALANCING
  // ==============================
  
  // Get existing stake accounts (using vault PDA as staker authority)
  const existingStakes = await getExistingStakeAccounts(connection, VAULT_PDA);
  const activeStakes = existingStakes.filter(s => s.isActive);
  const deactivatingStakes = existingStakes.filter(s => s.isDeactivating);
  
  log(`Existing positions: ${activeStakes.length} active, ${deactivatingStakes.length} deactivating`);
  for (const s of existingStakes) {
    log(`  ${s.pubkey.slice(0, 8)}... → ${s.voter.slice(0, 12)}... | ${(s.stake / LAMPORTS_PER_SOL).toFixed(2)} SOL | ${s.isDeactivating ? "DEACTIVATING" : "ACTIVE"}`);
  }
  
  // Get recommendations
  log("\n📊 Fetching validator recommendations...");
  const recommendations = await getRecommendations();
  const recMap = new Map(recommendations.map(r => [r.validator, r]));
  log(`Got ${recommendations.length} recommendations`);
  
  // --- STEP 1A: Withdraw fully deactivated stake back to vault ---
  const epochInfo = await connection.getEpochInfo();
  const currentEpoch = epochInfo.epoch;
  
  for (const stake of deactivatingStakes) {
    // A deactivating stake can be withdrawn after deactivation epoch passes
    log(`Attempting to withdraw deactivated stake ${stake.pubkey.slice(0, 8)}...`);
    const sig = await withdrawStake(connection, agent, stake.pubkey);
    if (sig) {
      log(`✅ Withdrew ${(stake.stake / LAMPORTS_PER_SOL).toFixed(2)} SOL back to vault`);
      log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
    } else {
      log(`   ⏳ Not ready yet (cooldown not complete)`);
    }
  }
  
  // --- STEP 1B: Evaluate active stakes for rebalancing ---
  const bestScore = recommendations.length > 0 ? recommendations[0].score : 100;
  let deactivatedCount = 0;
  
  for (const stake of activeStakes) {
    const rec = recMap.get(stake.voter);
    
    // Skip Staker Space — always keep
    if (stake.voter === STAKER_SPACE_VALIDATOR) continue;
    
    let shouldDeactivate = false;
    let reason = "";
    
    if (!rec) {
      // Validator dropped out of recommendations entirely (delinquent, high commission, etc.)
      shouldDeactivate = true;
      reason = "no longer in recommended set";
    } else if (rec.score < MIN_SCORE_THRESHOLD) {
      shouldDeactivate = true;
      reason = `score too low (${rec.score} < ${MIN_SCORE_THRESHOLD})`;
    } else if (bestScore > 0 && rec.score / bestScore < SCORE_DROP_THRESHOLD) {
      shouldDeactivate = true;
      reason = `score dropped to ${((rec.score / bestScore) * 100).toFixed(0)}% of best`;
    }
    
    if (shouldDeactivate) {
      log(`🔄 Deactivating ${stake.pubkey.slice(0, 8)}... (${(stake.stake / LAMPORTS_PER_SOL).toFixed(2)} SOL) — ${reason}`);
      const sig = await deactivateStake(connection, agent, stake.pubkey);
      if (sig) {
        log(`✅ Deactivated — will be withdrawable in ~2 epochs`);
        log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
        deactivatedCount++;
      } else {
        log(`⚠️ Failed to deactivate`);
      }
    }
  }
  
  if (deactivatedCount > 0) {
    log(`\n🔄 Deactivated ${deactivatedCount} positions for rebalancing`);
  }
  
  // ==============================
  // PHASE 2: NEW STAKING
  // ==============================
  
  // Re-check vault balance (may have changed from withdrawals)
  const updatedVaultInfo = await connection.getAccountInfo(VAULT_PDA);
  const updatedVaultBalance = updatedVaultInfo ? updatedVaultInfo.lamports : 0;
  const updatedAgentBalance = await connection.getBalance(agent.publicKey);
  const updatedVaultAvailable = updatedVaultBalance - MIN_VAULT_RESERVE;
  const updatedAgentAvailable = updatedAgentBalance - TX_FEE_RESERVE;
  
  log(`\nPost-rebalance balances: Vault ${(updatedVaultBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL, Agent ${(updatedAgentBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Get current active validators (refresh after deactivations)
  const currentActiveVoters = new Set(
    activeStakes
      .filter(s => !deactivatingStakes.find(d => d.pubkey === s.pubkey))
      .map(s => s.voter)
  );
  
  // Also exclude validators we just deactivated (don't re-stake immediately)
  const newValidators = recommendations.filter(
    (r) => !currentActiveVoters.has(r.validator)
  );
  
  if (newValidators.length === 0 && deactivatedCount === 0) {
    log("✅ All positions optimal — nothing to do");
  } else if (updatedVaultAvailable < MIN_STAKE_AMOUNT) {
    log(`⏭️ Vault: not enough to stake new positions (${(updatedVaultAvailable / LAMPORTS_PER_SOL).toFixed(4)} SOL available)`);
  } else if (updatedAgentAvailable < STAKE_RENT) {
    log(`⚠️ Agent wallet too low for new stakes`);
  } else if (newValidators.length > 0) {
    const maxStakePerTx = updatedAgentAvailable - STAKE_RENT - TX_FEE_RESERVE;
    
    if (maxStakePerTx < MIN_STAKE_AMOUNT) {
      log(`⚠️ Agent can't front enough for staking (${(maxStakePerTx / LAMPORTS_PER_SOL).toFixed(4)} SOL available)`);
    } else {
      log(`\nNew validators to stake to: ${newValidators.length}`);
      log(`Agent can front up to ${(maxStakePerTx / LAMPORTS_PER_SOL).toFixed(4)} SOL per tx`);
      
      const validatorsToStake = newValidators.slice(0, MAX_VALIDATORS);
      const idealPerValidator = Math.floor(updatedVaultAvailable / validatorsToStake.length);
      const stakePerValidator = Math.min(idealPerValidator, maxStakePerTx);
      
      if (stakePerValidator < MIN_STAKE_AMOUNT) {
        // Stake to just the top one
        const top = validatorsToStake[0];
        const amt = Math.min(updatedVaultAvailable, maxStakePerTx);
        log(`Staking ${(amt / LAMPORTS_PER_SOL).toFixed(4)} SOL to ${top.validatorName}`);
        const sig = await stakeToValidator(connection, agent, top.validator, BigInt(amt));
        if (sig) {
          log(`✅ Staked to ${top.validatorName}`);
          log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
        }
      } else {
        let successCount = 0;
        for (const validator of validatorsToStake) {
          log(`Staking ${(stakePerValidator / LAMPORTS_PER_SOL).toFixed(4)} SOL to ${validator.validatorName}`);
          const sig = await stakeToValidator(connection, agent, validator.validator, BigInt(stakePerValidator));
          if (sig) {
            log(`✅ Staked to ${validator.validatorName}`);
            log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
            successCount++;
          } else {
            log(`⚠️ Failed to stake to ${validator.validatorName}, continuing...`);
          }
        }
        log(`Staked to ${successCount}/${validatorsToStake.length} validators`);
      }
    }
  }
  
  // Final summary
  const finalVault = await connection.getAccountInfo(VAULT_PDA);
  log(`\n📊 Final vault balance: ${finalVault ? finalVault.lamports / LAMPORTS_PER_SOL : 0} SOL`);
  log("🤖 Agent execution complete");
}

main().catch((error) => {
  log(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
