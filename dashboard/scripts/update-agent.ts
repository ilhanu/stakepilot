/**
 * Update vault agent to current wallet
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const RPC_URL = "https://api.devnet.solana.com";

async function main() {
  console.log("🔧 Updating Vault Agent\n");

  // Load authority keypair
  const keypairPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log("Authority:", authority.publicKey.toBase58());
  console.log("New Agent:", authority.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");

  // Build update_agent instruction
  // sha256("global:update_agent") = 5502b209778b66a4
  const discriminator = Buffer.from([0x55, 0x02, 0xb2, 0x09, 0x77, 0x8b, 0x66, 0xa4]);
  const newAgentBytes = authority.publicKey.toBuffer();

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([discriminator, newAgentBytes]),
  });

  console.log("\n📤 Sending update_agent transaction...");

  try {
    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authority],
      { commitment: "confirmed" }
    );

    console.log("\n✅ Agent updated!");
    console.log("Signature:", signature);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.error("\nLogs:");
      error.logs.forEach((log: string) => console.error("  ", log));
    }
  }
}

main().catch(console.error);
