/**
 * Agent Staking Script
 * 
 * Reads vault balance and stakes to qualified validators.
 * Run with: npx tsx scripts/agent-stake.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  StakeProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const STAKE_CONFIG = new PublicKey("StakeConfig11111111111111111111111111111111");
const RPC_URL = "https://api.devnet.solana.com";

// Staker Space validator (always stake here first)
const STAKER_SPACE_VOTE = new PublicKey("49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru");

// Minimum stake amount (1 SOL)
const MIN_STAKE = 1 * LAMPORTS_PER_SOL;
// Keep some SOL in vault for operations
const MIN_VAULT_BALANCE = 0.1 * LAMPORTS_PER_SOL;

async function main() {
  console.log("🤖 Agent Staking Script\n");

  // Load agent keypair (same as authority for now)
  const keypairPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const agent = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log("Agent:", agent.publicKey.toBase58());
  console.log("Vault:", VAULT_PDA.toBase58());

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");

  // Check vault balance
  const vaultAccount = await connection.getAccountInfo(VAULT_PDA);
  if (!vaultAccount) {
    console.log("❌ Vault not found");
    return;
  }

  const vaultBalance = vaultAccount.lamports;
  console.log("\nVault Balance:", vaultBalance / LAMPORTS_PER_SOL, "SOL");

  // Parse vault data
  const vaultData = vaultAccount.data.slice(8);
  const vaultAuthority = new PublicKey(vaultData.slice(0, 32));
  const vaultAgent = new PublicKey(vaultData.slice(32, 64));
  const totalDeposits = Number(vaultData.readBigUInt64LE(64)) / LAMPORTS_PER_SOL;
  const totalStaked = Number(vaultData.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;

  console.log("Authority:", vaultAuthority.toBase58());
  console.log("Agent:", vaultAgent.toBase58());
  console.log("Total Deposits:", totalDeposits, "SOL");
  console.log("Total Staked:", totalStaked, "SOL");

  // Check if agent matches
  if (!vaultAgent.equals(agent.publicKey) && !vaultAuthority.equals(agent.publicKey)) {
    console.log("\n❌ This wallet is not the vault agent");
    console.log("Expected:", vaultAgent.toBase58());
    console.log("Got:", agent.publicKey.toBase58());
    return;
  }

  // Calculate available to stake
  const availableToStake = vaultBalance - MIN_VAULT_BALANCE;
  console.log("\nAvailable to Stake:", availableToStake / LAMPORTS_PER_SOL, "SOL");

  if (availableToStake < MIN_STAKE) {
    console.log("❌ Insufficient balance to stake (need at least 1 SOL)");
    return;
  }

  // For now, stake all to Staker Space validator
  const stakeAmount = availableToStake;
  console.log("\n📍 Staking", stakeAmount / LAMPORTS_PER_SOL, "SOL to Staker Space");

  // Derive stake account PDA
  const [stakeAccountPDA, stakeBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("stake"),
      VAULT_PDA.toBuffer(),
      STAKER_SPACE_VOTE.toBuffer(),
    ],
    PROGRAM_ID
  );
  console.log("Stake Account PDA:", stakeAccountPDA.toBase58());

  // Check if stake account already exists
  const existingStake = await connection.getAccountInfo(stakeAccountPDA);
  if (existingStake) {
    console.log("⚠️ Stake account already exists");
    console.log("Balance:", existingStake.lamports / LAMPORTS_PER_SOL, "SOL");
    return;
  }

  // Build stake_to_validator instruction
  // Discriminator: sha256("global:stake_to_validator") = 0b6ffe56f73408e9
  const discriminator = Buffer.from([0x0b, 0x6f, 0xfe, 0x56, 0xf7, 0x34, 0x08, 0xe9]);
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(stakeAmount));

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: agent.publicKey, isSigner: true, isWritable: true },
      { pubkey: stakeAccountPDA, isSigner: false, isWritable: true },
      { pubkey: STAKER_SPACE_VOTE, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_STAKE_HISTORY_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: STAKE_CONFIG, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator, amountBuffer]),
  });

  console.log("\n📤 Sending stake transaction...");

  try {
    const transaction = new Transaction().add(instruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [agent],
      { commitment: "confirmed" }
    );

    console.log("\n✅ Stake successful!");
    console.log("Signature:", signature);
    console.log("\nView on explorer:");
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Verify
    const newVaultBalance = await connection.getBalance(VAULT_PDA);
    const stakeBalance = await connection.getBalance(stakeAccountPDA);
    console.log("\nNew Vault Balance:", newVaultBalance / LAMPORTS_PER_SOL, "SOL");
    console.log("Stake Account Balance:", stakeBalance / LAMPORTS_PER_SOL, "SOL");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.error("\nLogs:");
      error.logs.forEach((log: string) => console.error("  ", log));
    }
  }
}

main().catch(console.error);
