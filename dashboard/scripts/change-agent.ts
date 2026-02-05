/**
 * Change the agent on the Staker Space Vault
 * 
 * Run with: npx ts-node scripts/change-agent.ts
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

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const RPC_URL = "https://api.devnet.solana.com";

// update_agent discriminator: sha256("global:update_agent")[0..8]
const UPDATE_AGENT_DISCRIMINATOR = Buffer.from([85, 2, 178, 9, 119, 139, 102, 164]);

async function main() {
  console.log("🔄 Changing vault agent...\n");

  // Load authority keypair (vault owner)
  const keypairPath = process.env.HOME + "/.config/solana/id.json";
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  // Load new agent pubkey
  const agentPath = "/home/ilhan/projects/stakepilot/dashboard/agent.json";
  const agentData = JSON.parse(fs.readFileSync(agentPath, "utf-8"));
  const newAgent = Keypair.fromSecretKey(new Uint8Array(agentData));
  
  console.log("Authority (owner):", authority.publicKey.toBase58());
  console.log("New agent:", newAgent.publicKey.toBase58());
  console.log("Vault:", VAULT_PDA.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");

  // Build update_agent instruction
  // Accounts: vault (mut), authority (signer)
  // Args: new_agent (Pubkey - 32 bytes)
  const data = Buffer.concat([
    UPDATE_AGENT_DISCRIMINATOR,
    newAgent.publicKey.toBuffer(),
  ]);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(ix);

  console.log("\n📤 Sending transaction...");
  
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [authority]);
    console.log("\n✅ Agent changed successfully!");
    console.log("Signature:", signature);
    console.log("\nNew agent pubkey:", newAgent.publicKey.toBase58());
    console.log("\n⚠️  Update AGENT_PUBKEY in your code to:", newAgent.publicKey.toBase58());
  } catch (error) {
    console.error("\n❌ Failed to change agent:", error);
    process.exit(1);
  }
}

main();
