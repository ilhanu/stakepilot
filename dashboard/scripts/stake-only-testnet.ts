/**
 * Stake from vault on testnet (no deposit, just stake)
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

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const RPC_URL = "https://api.testnet.solana.com";
const STAKE_CONFIG = new PublicKey("StakeConfig11111111111111111111111111111111");

// stake_to_validator discriminator
const STAKE_DISCRIMINATOR = Buffer.from([11, 111, 254, 86, 247, 52, 8, 233]);

async function main() {
  const validatorVote = "EF2HGsnKf8jQ59mUFzJiNRLTBuNhYB4HusmFEsCRH6be"; // 5% commission
  const amountSol = 1;

  console.log("🥩 Vault Staking on Testnet (stake only)\n");

  // Load agent keypair
  const agentData = JSON.parse(fs.readFileSync("agent.json", "utf-8"));
  const agent = Keypair.fromSecretKey(new Uint8Array(agentData));
  console.log("Agent:", agent.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");

  // Check balances
  const vaultInfo = await connection.getAccountInfo(VAULT_PDA);
  const vaultBalance = vaultInfo ? vaultInfo.lamports / LAMPORTS_PER_SOL : 0;
  const agentBalance = await connection.getBalance(agent.publicKey) / LAMPORTS_PER_SOL;
  
  console.log("Vault balance:", vaultBalance, "SOL");
  console.log("Agent balance:", agentBalance, "SOL");
  console.log("Stake amount:", amountSol, "SOL");
  console.log("Validator:", validatorVote);

  // Agent needs at least stake amount + rent to create stake account
  const rentNeeded = 0.003; // ~0.00228 for rent
  if (agentBalance < amountSol + rentNeeded) {
    console.error(`\n❌ Agent needs at least ${amountSol + rentNeeded} SOL`);
    return;
  }

  if (vaultBalance < amountSol + 0.1) {
    console.error(`\n❌ Vault needs at least ${amountSol + 0.1} SOL`);
    return;
  }

  // Create new stake account keypair
  const stakeAccount = Keypair.generate();
  console.log("\nStake account:", stakeAccount.publicKey.toBase58());

  // Build stake_to_validator instruction
  const stakeAmount = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
  const stakeData = Buffer.concat([
    STAKE_DISCRIMINATOR,
    Buffer.from(new BigUint64Array([stakeAmount]).buffer),
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

  console.log("\n📤 Sending stake transaction...");

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [agent, stakeAccount]);
    console.log("\n✅ Vault staking successful!");
    console.log("Signature:", sig);
    console.log("Stake account:", stakeAccount.publicKey.toBase58());
    
    // Check final balances
    const finalVault = await connection.getAccountInfo(VAULT_PDA);
    const finalAgent = await connection.getBalance(agent.publicKey);
    const stakeInfo = await connection.getAccountInfo(stakeAccount.publicKey);
    
    console.log("\n📊 Final balances:");
    console.log("  Vault:", finalVault ? finalVault.lamports / LAMPORTS_PER_SOL : 0, "SOL");
    console.log("  Agent:", finalAgent / LAMPORTS_PER_SOL, "SOL");
    console.log("  Stake account:", stakeInfo ? stakeInfo.lamports / LAMPORTS_PER_SOL : 0, "SOL");
    
    console.log("\n🔗 View on explorer:");
    console.log(`https://explorer.solana.com/address/${stakeAccount.publicKey.toBase58()}?cluster=testnet`);
  } catch (error: any) {
    console.error("\n❌ Staking failed:", error.message);
    if (error.logs) {
      console.log("\nLogs:");
      error.logs.forEach((log: string) => console.log("  ", log));
    }
  }
}

main().catch(console.error);
