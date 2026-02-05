import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

const PROGRAM_ID = new PublicKey('66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b');
const RPC = 'https://api.devnet.solana.com';

// Load wallet
const keypairData = JSON.parse(fs.readFileSync('/home/ilhan/.config/solana/id.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log('Wallet:', wallet.publicKey.toBase58());

// Derive PDAs
function getVaultPDA(owner) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), owner.toBuffer()],
    PROGRAM_ID
  );
}

function getStrategyPDA(vault) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('strategy'), vault.toBuffer()],
    PROGRAM_ID
  );
}

function getVaultSolPDA(vault) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault_sol'), vault.toBuffer()],
    PROGRAM_ID
  );
}

async function main() {
  const connection = new Connection(RPC, 'confirmed');
  
  const [vault, vaultBump] = getVaultPDA(wallet.publicKey);
  const [strategy, strategyBump] = getStrategyPDA(vault);
  const [vaultSol, vaultSolBump] = getVaultSolPDA(vault);
  
  console.log('Vault PDA:', vault.toBase58());
  console.log('Strategy PDA:', strategy.toBase58());
  console.log('VaultSol PDA:', vaultSol.toBase58());
  
  // Check if vault already exists
  const vaultAccount = await connection.getAccountInfo(vault);
  if (vaultAccount) {
    console.log('Vault already exists!');
    return;
  }
  
  // Initialize vault instruction
  // Discriminator for initialize_vault (first 8 bytes of sha256("global:initialize_vault"))
  const discriminator = Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: false, isWritable: false }, // agent = owner for now
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: strategy, isSigner: false, isWritable: true },
      { pubkey: vaultSol, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: discriminator,
  });
  
  const tx = new Transaction().add(ix);
  
  console.log('Sending initialize_vault transaction...');
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log('SUCCESS! Signature:', sig);
  } catch (e) {
    console.error('Error:', e.message);
    if (e.logs) console.log('Logs:', e.logs);
  }
}

main();
