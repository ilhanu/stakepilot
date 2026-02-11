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
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Rebalancing thresholds — conservative to protect APY
// Deactivating stake = ~2 epochs of ZERO rewards, so only do it when justified
const MAX_COMMISSION_TOLERATED = 15;  // Deactivate if commission rises above this (relaxed for testnet)
const COMMISSION_JUMP_THRESHOLD = 3;  // Deactivate if commission increased by 3%+ from what we expected  
const DELINQUENCY_TRIGGER = true;     // Deactivate if validator goes delinquent

interface ValidatorRecommendation {
  validator: string;
  validatorName: string;
  score: number;
  commission: number;
  delinquent: boolean;
  activeStake: number;
}

// Cache file for tracking validator state between runs
const STATE_FILE = path.join(__dirname, "..", "public", "agent-state.json");

interface AgentState {
  lastRun: string;
  validatorCommissions: Record<string, number>; // vote_account -> commission at time of staking
  epochAtLastRebalance: number;
}

function loadState(): AgentState {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {}
  return { lastRun: "", validatorCommissions: {}, epochAtLastRebalance: 0 };
}

function saveState(state: AgentState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Activity log file — dashboard reads this to show agent history
const ACTIVITY_LOG_PATH = path.join(__dirname, "..", "public", "agent-activity.json");

interface ActivityEntry {
  timestamp: string;
  type: "stake" | "deactivate" | "withdraw" | "rebalance" | "check" | "error";
  summary: string;
  txSignature?: string;
  validator?: string;
  amount?: number;
}

function loadActivityLog(): ActivityEntry[] {
  try {
    if (fs.existsSync(ACTIVITY_LOG_PATH)) {
      return JSON.parse(fs.readFileSync(ACTIVITY_LOG_PATH, "utf-8"));
    }
  } catch {}
  return [];
}

function appendActivity(entry: Omit<ActivityEntry, "timestamp">) {
  const activities = loadActivityLog();
  activities.unshift({ ...entry, timestamp: new Date().toISOString() });
  // Keep last 200 entries
  const trimmed = activities.slice(0, 200);
  try {
    fs.writeFileSync(ACTIVITY_LOG_PATH, JSON.stringify(trimmed, null, 2));
  } catch (e) {
    console.error("Failed to write activity log:", e);
  }
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
    
    // Build a full map for lookups (used in rebalancing too)
    const allValidators = new Map<string, ValidatorRecommendation>();
    for (const v of validators) {
      allValidators.set(v.vote_account, {
        validator: v.vote_account,
        validatorName: v.name || `${v.vote_account.slice(0, 8)}...`,
        score: v.total_score || 0,
        commission: v.commission ?? 0,
        delinquent: v.delinquent ?? false,
        activeStake: (v.active_stake || 0) / 1e9,
      });
    }
    
    // Store full map for rebalancing lookups
    (global as any).__validatorMap = allValidators;
    
    // Filter for new staking candidates
    const qualified = [...allValidators.values()]
      .filter((v) => 
        !v.delinquent && 
        v.commission <= 10 &&
        v.activeStake < 5_000_000
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_VALIDATORS);
    
    // Always include Staker Space
    const hasStakerSpace = qualified.some(
      (v) => v.validator === STAKER_SPACE_VALIDATOR
    );
    
    if (!hasStakerSpace) {
      const stakerSpace = allValidators.get(STAKER_SPACE_VALIDATOR);
      if (stakerSpace) {
        qualified.unshift(stakerSpace);
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
      commission: 0,
      delinquent: false,
      activeStake: 0,
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
    appendActivity({
      type: "stake",
      summary: `Staked ${Number(amountLamports) / LAMPORTS_PER_SOL} SOL to ${validatorVote.slice(0, 8)}...`,
      txSignature: sig,
      validator: validatorVote,
      amount: Number(amountLamports) / LAMPORTS_PER_SOL,
    });
    return sig;
  } catch (error: any) {
    log(`Stake failed: ${error.message}`);
    if (error.logs) {
      error.logs.forEach((l: string) => log(`  ${l}`));
    }
    appendActivity({ type: "error", summary: `Stake to ${validatorVote.slice(0, 8)}... failed: ${error.message}` });
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
    appendActivity({
      type: "deactivate",
      summary: `Deactivated stake ${stakeAccountPubkey.slice(0, 8)}...`,
      txSignature: sig,
    });
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
    appendActivity({
      type: "withdraw",
      summary: `Withdrew deactivated stake ${stakeAccountPubkey.slice(0, 8)}... back to vault`,
      txSignature: sig,
    });
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
  
  // Check epoch progress — only rebalance when 80%+ through epoch
  // (staking changes take effect next epoch, so act near end)
  const epochInfo = await connection.getEpochInfo();
  const epochProgress = epochInfo.slotIndex / epochInfo.slotsInEpoch;
  const slotsRemaining = epochInfo.slotsInEpoch - epochInfo.slotIndex;
  const hoursRemaining = (slotsRemaining * 0.4) / 3600; // ~400ms per slot on testnet
  log(`📅 Epoch ${epochInfo.epoch} — ${(epochProgress * 100).toFixed(1)}% complete, ~${hoursRemaining.toFixed(1)}h remaining`);
  
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
  // ECONOMICS: Deactivating = ~2 epochs of ZERO rewards (~4 days on testnet).
  // Only deactivate when the cost of NOT deactivating exceeds the lost yield:
  //   1. Commission raised significantly (staker is getting ripped off)
  //   2. Validator went delinquent (earning nothing anyway)
  //   3. Validator no longer exists / shut down
  // Do NOT deactivate just because score dropped — that destroys APY.
  
  const state = loadState();
  const validatorMap: Map<string, ValidatorRecommendation> = (global as any).__validatorMap || new Map();
  let deactivatedCount = 0;
  const deactivatedVoters = new Set<string>();
  
  for (const stake of activeStakes) {
    // Skip Staker Space — always keep
    if (stake.voter === STAKER_SPACE_VALIDATOR) continue;
    
    const currentInfo = validatorMap.get(stake.voter);
    const originalCommission = state.validatorCommissions[stake.voter];
    
    let shouldDeactivate = false;
    let reason = "";
    
    if (!currentInfo) {
      // Validator completely disappeared from the network
      shouldDeactivate = true;
      reason = "validator no longer found on network";
    } else if (currentInfo.delinquent) {
      // Delinquent = not voting = earning zero rewards anyway
      shouldDeactivate = true;
      reason = `validator is delinquent (earning no rewards)`;
    } else if (currentInfo.commission > MAX_COMMISSION_TOLERATED) {
      // Commission too high — staker is losing too much yield
      shouldDeactivate = true;
      reason = `commission too high (${currentInfo.commission}% > ${MAX_COMMISSION_TOLERATED}% max)`;
    } else if (originalCommission !== undefined && currentInfo.commission >= originalCommission + COMMISSION_JUMP_THRESHOLD) {
      // Commission was raised significantly since we staked
      shouldDeactivate = true;
      reason = `commission raised from ${originalCommission}% to ${currentInfo.commission}% (+${currentInfo.commission - originalCommission}%)`;
    }
    
    if (shouldDeactivate) {
      log(`🔄 Deactivating ${stake.pubkey.slice(0, 8)}... (${(stake.stake / LAMPORTS_PER_SOL).toFixed(2)} SOL) — ${reason}`);
      const sig = await deactivateStake(connection, agent, stake.pubkey);
      if (sig) {
        log(`✅ Deactivated — will be withdrawable in ~2 epochs`);
        log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
        deactivatedCount++;
        deactivatedVoters.add(stake.voter);
        appendActivity({ type: "deactivate", summary: `Deactivated ${stake.pubkey.slice(0, 8)}... — ${reason}`, txSignature: sig, validator: stake.voter, amount: stake.stake / LAMPORTS_PER_SOL });
      } else {
        log(`⚠️ Failed to deactivate`);
      }
    } else if (currentInfo) {
      // Validator is fine — log why we're keeping it
      log(`  ✅ ${stake.pubkey.slice(0, 8)}... → ${currentInfo.validatorName} | ${currentInfo.commission}% comm | score ${currentInfo.score} — KEEPING`);
    }
  }
  
  if (deactivatedCount > 0) {
    log(`\n🔄 Deactivated ${deactivatedCount} positions (only for commission/delinquency issues)`);
  } else {
    log(`\n✅ All active positions healthy — no deactivations needed`);
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
  
  // Get current active validators (exclude ones we just deactivated)
  const currentActiveVoters = new Set(
    activeStakes
      .filter(s => !deactivatedVoters.has(s.voter))
      .map(s => s.voter)
  );
  
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
        log(`Staking ${(amt / LAMPORTS_PER_SOL).toFixed(4)} SOL to ${top.validatorName} (${top.commission}% comm)`);
        const sig = await stakeToValidator(connection, agent, top.validator, BigInt(amt));
        if (sig) {
          log(`✅ Staked to ${top.validatorName}`);
          log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
          state.validatorCommissions[top.validator] = top.commission;
          appendActivity({ type: "stake", summary: `Staked ${(amt / LAMPORTS_PER_SOL).toFixed(2)} SOL to ${top.validatorName}`, txSignature: sig, validator: top.validator, amount: amt / LAMPORTS_PER_SOL });
        }
      } else {
        let successCount = 0;
        for (const validator of validatorsToStake) {
          log(`Staking ${(stakePerValidator / LAMPORTS_PER_SOL).toFixed(4)} SOL to ${validator.validatorName} (${validator.commission}% comm)`);
          const sig = await stakeToValidator(connection, agent, validator.validator, BigInt(stakePerValidator));
          if (sig) {
            log(`✅ Staked to ${validator.validatorName}`);
            log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
            successCount++;
            // Track commission at time of staking
            state.validatorCommissions[validator.validator] = validator.commission;
            appendActivity({ type: "stake", summary: `Staked ${(stakePerValidator / LAMPORTS_PER_SOL).toFixed(2)} SOL to ${validator.validatorName} (${validator.commission}% comm)`, txSignature: sig, validator: validator.validator, amount: stakePerValidator / LAMPORTS_PER_SOL });
          } else {
            log(`⚠️ Failed to stake to ${validator.validatorName}, continuing...`);
          }
        }
        log(`Staked to ${successCount}/${validatorsToStake.length} validators`);
      }
    }
  }
  
  // Save state (commission tracking, last run time)
  state.lastRun = new Date().toISOString();
  state.epochAtLastRebalance = currentEpoch;
  // Also record commissions for any existing active positions we kept
  for (const stake of activeStakes) {
    if (!deactivatedVoters.has(stake.voter)) {
      const info = validatorMap.get(stake.voter);
      if (info && state.validatorCommissions[stake.voter] === undefined) {
        state.validatorCommissions[stake.voter] = info.commission;
      }
    }
  }
  saveState(state);
  
  // Final summary
  const finalVault = await connection.getAccountInfo(VAULT_PDA);
  const finalBalance = finalVault ? finalVault.lamports / LAMPORTS_PER_SOL : 0;
  log(`\n📊 Final vault balance: ${finalBalance} SOL`);
  log("🤖 Agent execution complete");

  // Log check activity
  appendActivity({
    type: "check",
    summary: `Agent check complete. ${activeStakes.length} active positions, vault ${finalBalance.toFixed(2)} SOL`,
    amount: finalBalance,
  });
}

main().catch((error) => {
  log(`❌ Fatal error: ${error.message}`);
  appendActivity({ type: "error", summary: `Fatal error: ${error.message}` });
  process.exit(1);
});
