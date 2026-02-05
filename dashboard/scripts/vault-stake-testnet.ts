/**
 * Test vault staking on testnet
 * This calls the vault contract's stake_to_validator instruction
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

// stake_to_validator discriminator: sha256("global:stake_to_validator")[0..8]
const STAKE_DISCRIMINATOR = Buffer.from([11, 111, 254, 86, 247, 52, 8, 233]);

async function main() {
  const args = process.argv.slice(2);
  const validatorVote = args[0] || "EF2HGsnKf8jQ59mUFzJiNRLTBuNhYB4HusmFEsCRH6be"; // 5% commission
  const amountSol = parseFloat(args[1] || "1");

  console.log("🥩 Vault Staking on Testnet\n");

  // Load agent keypair
  const agentData = JSON.parse(fs.readFileSync("agent.json", "utf-8"));
  const agent = Keypair.fromSecretKey(new Uint8Array(agentData));
  console.log("Agent:", agent.publicKey.toBase58());

  const connection = new Connection(RPC_URL, "confirmed");

  // Check vault balance
  const vaultInfo = await connection.getAccountInfo(VAULT_PDA);
  if (!vaultInfo) {
    console.error("❌ Vault not found!");
    return;
  }
  console.log("Vault balance:", vaultInfo.lamports / LAMPORTS_PER_SOL, "SOL");

  // Check agent balance (for rent)
  const agentBalance = await connection.getBalance(agent.publicKey);
  console.log("Agent balance:", agentBalance / LAMPORTS_PER_SOL, "SOL");

  // First, deposit some SOL to the vault (agent deposits to vault)
  console.log("\n📥 Depositing", amountSol + 0.1, "SOL to vault first...");
  
  // Derive user deposit PDA
  const [userDepositPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("deposit"), agent.publicKey.toBuffer()],
    PROGRAM_ID
  );

  // Deposit discriminator
  const depositDiscriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]);
  const depositAmount = BigInt(Math.floor((amountSol + 0.1) * LAMPORTS_PER_SOL));
  const depositData = Buffer.concat([
    depositDiscriminator,
    Buffer.from(new BigUint64Array([depositAmount]).buffer),
  ]);

  const depositIx = new TransactionInstruction({
    keys: [
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: userDepositPDA, isSigner: false, isWritable: true },
      { pubkey: agent.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: depositData,
  });

  const depositTx = new Transaction().add(depositIx);
  const depositSig = await sendAndConfirmTransaction(connection, depositTx, [agent]);
  console.log("Deposit tx:", depositSig);

  // Now stake from vault
  console.log("\n📤 Staking", amountSol, "SOL to validator", validatorVote);

  // Create new stake account keypair
  const stakeAccount = Keypair.generate();
  console.log("Stake account:", stakeAccount.publicKey.toBase58());

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

  const stakeTx = new Transaction().add(stakeIx);

  try {
    const stakeSig = await sendAndConfirmTransaction(connection, stakeTx, [agent, stakeAccount]);
    console.log("\n✅ Vault staking successful!");
    console.log("Signature:", stakeSig);
    console.log("Stake account:", stakeAccount.publicKey.toBase58());
    console.log("\n📊 View on explorer:");
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
