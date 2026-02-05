import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

const PROGRAM_ID = new PublicKey('66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b');
const RPC = 'https://api.devnet.solana.com';

const keypairData = JSON.parse(fs.readFileSync('/home/ilhan/.config/solana/id.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));

function getVaultPDA(owner) {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), owner.toBuffer()], PROGRAM_ID);
}

function getVaultSolPDA(vault) {
  return PublicKey.findProgramAddressSync([Buffer.from('vault_sol'), vault.toBuffer()], PROGRAM_ID);
}

async function main() {
  const connection = new Connection(RPC, 'confirmed');
  
  const [vault] = getVaultPDA(wallet.publicKey);
  const [vaultSol] = getVaultSolPDA(vault);
  
  console.log('Depositing 0.1 SOL...');
  
  // Deposit discriminator
  const discriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]);
  const amount = BigInt(0.1 * LAMPORTS_PER_SOL);
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(amount);
  
  const data = Buffer.concat([discriminator, amountBuffer]);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: vaultSol, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(ix);
  
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log('DEPOSIT SUCCESS! Signature:', sig);
    
    // Check vault balance
    const vaultSolBalance = await connection.getBalance(vaultSol);
    console.log('Vault SOL Balance:', vaultSolBalance / LAMPORTS_PER_SOL, 'SOL');
  } catch (e) {
    console.error('Error:', e.message);
    if (e.logs) console.log('Logs:', e.logs);
  }
}

main();
