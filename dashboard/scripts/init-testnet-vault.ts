/**
 * Initialize vault on testnet
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

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const RPC_URL = "https://api.testnet.solana.com";

// Initialize vault discriminator
const INIT_DISCRIMINATOR = Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]);

async function main() {
  console.log("🏗️  Initializing vault on testnet...\n");

  // Load authority
  const keypairPath = process.env.HOME + "/.config/solana/id.json";
  const authority = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
  );
  console.log("Authority:", authority.publicKey.toBase58());

  // Load agent
  const agentData = JSON.parse(fs.readFileSync("agent.json", "utf-8"));
  const agent = Keypair.fromSecretKey(new Uint8Array(agentData));
  console.log("Agent:", agent.publicKey.toBase58());

  // Derive vault PDA
  const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    PROGRAM_ID
  );
  console.log("Vault PDA:", vaultPDA.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");

  // Check if vault exists
  const vaultAccount = await connection.getAccountInfo(vaultPDA);
  if (vaultAccount) {
    console.log("\n⚠️  Vault already exists on testnet!");
    console.log("Balance:", vaultAccount.lamports / 1e9, "SOL");
    return;
  }

  // Build initialize instruction
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: agent.publicKey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: INIT_DISCRIMINATOR,
  });

  const tx = new Transaction().add(ix);

  console.log("\n📤 Sending transaction...");
  const sig = await sendAndConfirmTransaction(connection, tx, [authority]);

  console.log("\n✅ Vault initialized on testnet!");
  console.log("Signature:", sig);
  console.log("Vault PDA:", vaultPDA.toBase58());
  console.log("Agent:", agent.publicKey.toBase58());
}

main().catch(console.error);
