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

// stake_to_validator discriminator
const STAKE_DISCRIMINATOR = Buffer.from([11, 111, 254, 86, 247, 52, 8, 233]);

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

async function getExistingStakeAccounts(
  connection: Connection,
  agent: PublicKey
): Promise<Set<string>> {
  // Get stake accounts where agent is authorized staker
  const stakeAccounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          memcmp: {
            offset: 12, // Authorized staker offset
            bytes: agent.toBase58(),
          },
        },
      ],
    }
  );
  
  const validators = new Set<string>();
  for (const acc of stakeAccounts) {
    const parsed = (acc.account.data as any).parsed;
    if (parsed?.info?.stake?.delegation?.voter) {
      validators.add(parsed.info.stake.delegation.voter);
    }
  }
  
  return validators;
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
  
  // Check if there's enough to stake
  const availableToStake = vaultBalance - MIN_VAULT_RESERVE;
  if (availableToStake < MIN_STAKE_AMOUNT) {
    log(`⏭️ Not enough to stake. Need ${MIN_STAKE_AMOUNT / LAMPORTS_PER_SOL} SOL, have ${availableToStake / LAMPORTS_PER_SOL} SOL available.`);
    return;
  }
  
  // Agent needs funds for tx fees and rent
  const agentMinBalance = MIN_STAKE_AMOUNT + 0.01 * LAMPORTS_PER_SOL;
  if (agentBalance < agentMinBalance) {
    log(`⚠️ Agent needs more SOL for transactions. Has ${agentBalance / LAMPORTS_PER_SOL}, needs ${agentMinBalance / LAMPORTS_PER_SOL}`);
    return;
  }
  
  // Get existing stake accounts
  const existingValidators = await getExistingStakeAccounts(connection, agent.publicKey);
  log(`Existing stakes: ${existingValidators.size} validators`);
  
  // Get recommendations
  log("📊 Fetching validator recommendations...");
  const recommendations = await getRecommendations();
  log(`Got ${recommendations.length} recommendations`);
  
  // Filter out validators we're already staking to
  const newValidators = recommendations.filter(
    (r) => !existingValidators.has(r.validator)
  );
  
  if (newValidators.length === 0) {
    log("✅ Already staking to all recommended validators");
    return;
  }
  
  log(`New validators to stake to: ${newValidators.length}`);
  
  // Distribute available stake across new validators
  const stakePerValidator = Math.floor(availableToStake / newValidators.length);
  
  if (stakePerValidator < MIN_STAKE_AMOUNT) {
    // Just stake to the top validator
    const topValidator = newValidators[0];
    log(`Staking ${availableToStake / LAMPORTS_PER_SOL} SOL to ${topValidator.validatorName}`);
    
    const sig = await stakeToValidator(
      connection,
      agent,
      topValidator.validator,
      BigInt(availableToStake)
    );
    
    if (sig) {
      log(`✅ Staked to ${topValidator.validatorName}`);
      log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
    }
  } else {
    // Stake to multiple validators
    for (const validator of newValidators) {
      log(`Staking ${stakePerValidator / LAMPORTS_PER_SOL} SOL to ${validator.validatorName}`);
      
      const sig = await stakeToValidator(
        connection,
        agent,
        validator.validator,
        BigInt(stakePerValidator)
      );
      
      if (sig) {
        log(`✅ Staked to ${validator.validatorName}`);
        log(`   TX: https://explorer.solana.com/tx/${sig}?cluster=testnet`);
      }
    }
  }
  
  // Final balance check
  const finalVault = await connection.getAccountInfo(VAULT_PDA);
  log(`\n📊 Final vault balance: ${finalVault ? finalVault.lamports / LAMPORTS_PER_SOL : 0} SOL`);
  
  log("🤖 Agent execution complete");
}

main().catch((error) => {
  log(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
