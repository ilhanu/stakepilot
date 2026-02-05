/**
 * Initialize the Staker Space Vault
 * 
 * Run with: npx ts-node scripts/initialize-vault.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const RPC_URL = "https://api.devnet.solana.com";

// Agent wallet - this will be the keeper that executes staking
const AGENT_PUBKEY = new PublicKey("By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny");

async function main() {
  console.log("🏗️  Initializing Staker Space Vault...\n");

  // Load authority keypair
  const keypairPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Agent:", AGENT_PUBKEY.toBase58());

  // Derive vault PDA
  const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    PROGRAM_ID
  );
  console.log("Vault PDA:", vaultPDA.toBase58());
  console.log("Vault Bump:", vaultBump);

  // Connect to devnet
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Check if vault already exists
  const vaultAccount = await connection.getAccountInfo(vaultPDA);
  if (vaultAccount) {
    console.log("\n⚠️  Vault already exists!");
    console.log("Balance:", vaultAccount.lamports / 1e9, "SOL");
    return;
  }

  // Build initialize_vault instruction
  // Anchor discriminator for "initialize_vault" = first 8 bytes of sha256("global:initialize_vault")
  // sha256("global:initialize_vault") starts with 30bfa32c47813fa4
  const discriminator = Buffer.from([0x30, 0xbf, 0xa3, 0x2c, 0x47, 0x81, 0x3f, 0xa4]);
  
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: AGENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });

  // Build and send transaction
  const transaction = new Transaction().add(instruction);
  
  console.log("\n📤 Sending transaction...");
  
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authority],
      { commitment: "confirmed" }
    );
    
    console.log("\n✅ Vault initialized!");
    console.log("Signature:", signature);
    console.log("Vault:", vaultPDA.toBase58());
    console.log("\nView on explorer:");
    console.log(`https://explorer.solana.com/address/${vaultPDA.toBase58()}?cluster=devnet`);
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

main().catch(console.error);
