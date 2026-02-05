/**
 * Test deposit to Staker Space Vault
 * 
 * Run with: npx tsx scripts/test-deposit.ts
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
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const RPC_URL = "https://api.devnet.solana.com";

async function main() {
  const amount = parseFloat(process.argv[2] || "0.1");
  console.log(`💰 Testing deposit of ${amount} SOL to Staker Space Vault\n`);

  // Load keypair
  const keypairPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const user = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log("User:", user.publicKey.toBase58());

  // Derive user deposit PDA
  const [userDepositPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("deposit"), user.publicKey.toBuffer()],
    PROGRAM_ID
  );
  console.log("User Deposit PDA:", userDepositPDA.toBase58());

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Check balance
  const balance = await connection.getBalance(user.publicKey);
  console.log("Wallet Balance:", balance / LAMPORTS_PER_SOL, "SOL");
  
  if (balance < amount * LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL) {
    console.log("\n❌ Insufficient balance");
    return;
  }

  // Build deposit instruction
  // Discriminator: sha256("global:deposit") first 8 bytes = f223c68952e1f2b6
  const discriminator = Buffer.from([0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6]);
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(lamports));

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: userDepositPDA, isSigner: false, isWritable: true },
      { pubkey: user.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator, amountBuffer]),
  });

  // Build and send transaction
  const transaction = new Transaction().add(instruction);
  
  console.log("\n📤 Sending deposit transaction...");
  
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [user],
      { commitment: "confirmed" }
    );
    
    console.log("\n✅ Deposit successful!");
    console.log("Signature:", signature);
    console.log("\nView on explorer:");
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Verify vault balance
    const vaultBalance = await connection.getBalance(VAULT_PDA);
    console.log("\nVault Balance:", vaultBalance / LAMPORTS_PER_SOL, "SOL");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.error("\nLogs:", error.logs);
    }
  }
}

main().catch(console.error);
