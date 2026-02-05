/**
 * Native Staking Script
 * 
 * Creates stake accounts and delegates to validators using native Solana staking.
 * Run with: npx ts-node scripts/native-stake.ts <validator_vote_account> <amount_sol>
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  StakeProgram,
  Authorized,
  Lockup,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";

const RPC_URL = "https://api.devnet.solana.com";
const AGENT_KEYPAIR_PATH = "/home/ilhan/projects/stakepilot/dashboard/agent.json";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage: npx ts-node scripts/native-stake.ts <validator_vote_account> <amount_sol>");
    console.log("\nExample validators on devnet:");
    console.log("  E7RDqAkZrZ8agpxEWhy9Eeu2T3qwbmHLtaSwQZDz5y84 (5% commission)");
    console.log("  FDQHfbqgSUk94XKFKWu6E8qidL7bwGEXDPzAoTVTXEDm (10% commission)");
    process.exit(1);
  }

  const validatorVote = new PublicKey(args[0]);
  const amountSol = parseFloat(args[1]);
  const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  console.log("🥩 Native Staking\n");

  // Load agent keypair
  const agentData = JSON.parse(fs.readFileSync(AGENT_KEYPAIR_PATH, "utf-8"));
  const agent = Keypair.fromSecretKey(new Uint8Array(agentData));
  console.log("Agent:", agent.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");

  // Check agent balance
  const balance = await connection.getBalance(agent.publicKey);
  console.log("Agent balance:", balance / LAMPORTS_PER_SOL, "SOL");

  // Need rent + stake amount
  const rentExempt = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
  const totalNeeded = amountLamports + rentExempt;
  
  console.log("\nStake amount:", amountSol, "SOL");
  console.log("Rent exempt:", rentExempt / LAMPORTS_PER_SOL, "SOL");
  console.log("Total needed:", totalNeeded / LAMPORTS_PER_SOL, "SOL");

  if (balance < totalNeeded) {
    console.error(`\n❌ Insufficient balance. Need ${totalNeeded / LAMPORTS_PER_SOL} SOL, have ${balance / LAMPORTS_PER_SOL} SOL`);
    process.exit(1);
  }

  // Create a new stake account keypair
  const stakeAccount = Keypair.generate();
  console.log("\nStake account:", stakeAccount.publicKey.toBase58());
  console.log("Validator:", validatorVote.toBase58());

  // Create stake account instruction
  const createStakeAccountIx = StakeProgram.createAccount({
    fromPubkey: agent.publicKey,
    stakePubkey: stakeAccount.publicKey,
    authorized: new Authorized(
      agent.publicKey, // staker
      agent.publicKey, // withdrawer
    ),
    lockup: new Lockup(0, 0, agent.publicKey), // no lockup
    lamports: totalNeeded,
  });

  // Delegate stake instruction
  const delegateIx = StakeProgram.delegate({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: agent.publicKey,
    votePubkey: validatorVote,
  });

  // Build transaction
  const transaction = new Transaction().add(
    ...createStakeAccountIx.instructions,
    ...delegateIx.instructions,
  );

  console.log("\n📤 Sending transaction...");

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [agent, stakeAccount],
      { commitment: "confirmed" }
    );

    console.log("\n✅ Staking successful!");
    console.log("Signature:", signature);
    console.log("\nStake account:", stakeAccount.publicKey.toBase58());
    console.log("Amount staked:", amountSol, "SOL");
    console.log("Validator:", validatorVote.toBase58());
    
    // Check stake account
    const stakeAccountInfo = await connection.getAccountInfo(stakeAccount.publicKey);
    console.log("\nStake account balance:", (stakeAccountInfo?.lamports || 0) / LAMPORTS_PER_SOL, "SOL");
    
    console.log("\n📊 View on explorer:");
    console.log(`https://explorer.solana.com/address/${stakeAccount.publicKey.toBase58()}?cluster=devnet`);
    
  } catch (error) {
    console.error("\n❌ Staking failed:", error);
    process.exit(1);
  }
}

main();
