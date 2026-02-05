/**
 * Test agent execution locally
 * 
 * This simulates what the cron job does - finds validators and stakes to them.
 * Run with: npx ts-node scripts/test-execute.ts
 */

import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from "fs";

// Import our libraries (adjust paths for ts-node)
const RPC_URL = "https://api.devnet.solana.com";
const MIN_RESERVE = 0.1 * LAMPORTS_PER_SOL;
const MIN_STAKE_AMOUNT = 1 * LAMPORTS_PER_SOL;

interface StakeWizValidator {
  vote_identity: string;
  name: string;
  commission: number;
  wiz_score: number;
  activated_stake: number;
  delinquent: boolean;
  uptime: number;
  is_jito: boolean;
  jito_commission_bps: number;
  total_apy: number;
  staking_apy: number;
  jito_apy?: number;
}

async function getTopValidators(limit = 5): Promise<StakeWizValidator[]> {
  const res = await fetch("https://api.stakewiz.com/validators");
  const validators: StakeWizValidator[] = await res.json();
  
  const STAKER_SPACE = "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru";
  
  // Filter qualified validators
  const qualified = validators.filter((v) => {
    if (v.vote_identity === STAKER_SPACE) return true;
    if (v.delinquent) return false;
    if (v.activated_stake >= 1_000_000) return false;
    if (v.commission > 5) return false;
    if (v.is_jito && v.jito_commission_bps > 1000) return false;
    if (v.uptime < 95) return false;
    return true;
  });
  
  // Simple scoring
  qualified.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.vote_identity === STAKER_SPACE) scoreA += 100;
    if (b.vote_identity === STAKER_SPACE) scoreB += 100;
    scoreA += a.wiz_score;
    scoreB += b.wiz_score;
    return scoreB - scoreA;
  });
  
  return qualified.slice(0, limit);
}

async function main() {
  console.log("🤖 Agent Execution Test\n");
  
  // Load agent
  const agentData = JSON.parse(fs.readFileSync("agent.json", "utf-8"));
  const agent = Keypair.fromSecretKey(new Uint8Array(agentData));
  console.log("Agent:", agent.publicKey.toBase58());
  
  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(agent.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");
  
  const availableToStake = balance - MIN_RESERVE;
  console.log("Available to stake:", availableToStake / LAMPORTS_PER_SOL, "SOL\n");
  
  if (availableToStake < MIN_STAKE_AMOUNT) {
    console.log("❌ Not enough balance to stake");
    return;
  }
  
  // Get validators
  console.log("📡 Fetching validators from StakeWiz...");
  const validators = await getTopValidators(3);
  console.log(`Found ${validators.length} qualified validators:\n`);
  
  for (const v of validators) {
    console.log(`  ${v.name}`);
    console.log(`    Vote: ${v.vote_identity}`);
    console.log(`    Commission: ${v.commission}%, APY: ${v.total_apy?.toFixed(2)}%`);
    console.log(`    Stake: ${(v.activated_stake / 1000).toFixed(0)}k SOL, Score: ${v.wiz_score}`);
    console.log();
  }
  
  // Calculate stake per validator
  const stakePerValidator = Math.floor(availableToStake / validators.length);
  console.log(`Stake per validator: ${stakePerValidator / LAMPORTS_PER_SOL} SOL\n`);
  
  // Confirm
  console.log("⚠️  This will actually stake SOL on devnet!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Import staking function
  const { StakeProgram, Transaction, Authorized, Lockup, sendAndConfirmTransaction } = await import("@solana/web3.js");
  
  for (const validator of validators) {
    console.log(`📤 Staking to ${validator.name}...`);
    
    try {
      const stakeAccount = Keypair.generate();
      const rentExempt = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
      
      const createIx = StakeProgram.createAccount({
        fromPubkey: agent.publicKey,
        stakePubkey: stakeAccount.publicKey,
        authorized: new Authorized(agent.publicKey, agent.publicKey),
        lockup: new Lockup(0, 0, agent.publicKey),
        lamports: stakePerValidator + rentExempt,
      });
      
      const delegateIx = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: agent.publicKey,
        votePubkey: new PublicKey(validator.vote_identity),
      });
      
      const tx = new Transaction().add(...createIx.instructions, ...delegateIx.instructions);
      
      const sig = await sendAndConfirmTransaction(connection, tx, [agent, stakeAccount]);
      
      console.log(`  ✅ Success!`);
      console.log(`     Stake account: ${stakeAccount.publicKey.toBase58()}`);
      console.log(`     Signature: ${sig}\n`);
    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message}\n`);
    }
  }
  
  // Final balance
  const finalBalance = await connection.getBalance(agent.publicKey);
  console.log(`\nFinal balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Staked: ${(balance - finalBalance) / LAMPORTS_PER_SOL} SOL`);
}

main().catch(console.error);
