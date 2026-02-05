import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

const PROGRAM_ID = new PublicKey('66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b');
const RPC = 'https://api.devnet.solana.com';

const keypairData = JSON.parse(fs.readFileSync('/home/ilhan/.config/solana/id.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));

function getVaultPDA(owner) {
  return PublicKey.findProgramAddressSync([Buffer.from('vault'), owner.toBuffer()], PROGRAM_ID);
}

function getStrategyPDA(vault) {
  return PublicKey.findProgramAddressSync([Buffer.from('strategy'), vault.toBuffer()], PROGRAM_ID);
}

async function main() {
  const connection = new Connection(RPC, 'confirmed');
  
  const [vault] = getVaultPDA(wallet.publicKey);
  const [strategy] = getStrategyPDA(vault);
  
  console.log('Updating strategy...');
  console.log('- Risk: Medium (1)');
  console.log('- Target APY: 8% (800 basis points)');
  console.log('- Max Validators: 5');
  console.log('- Prefer Decentralization: true');
  
  // Correct discriminator for update_strategy
  const discriminator = Buffer.from([16, 76, 138, 179, 171, 112, 196, 21]);
  
  const riskTolerance = 1; // Medium
  const targetApy = 800; // 8%
  const maxValidators = 5;
  const preferDecentralization = 1; // true
  
  const targetApyBuffer = Buffer.alloc(2);
  targetApyBuffer.writeUInt16LE(targetApy);
  
  const data = Buffer.concat([
    discriminator,
    Buffer.from([riskTolerance]),
    targetApyBuffer,
    Buffer.from([maxValidators]),
    Buffer.from([preferDecentralization]),
  ]);
  
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: false },
      { pubkey: strategy, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data,
  });
  
  const tx = new Transaction().add(ix);
  
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log('STRATEGY UPDATE SUCCESS! Signature:', sig);
  } catch (e) {
    console.error('Error:', e.message);
    if (e.logs) console.log('Logs:', e.logs);
  }
}

main();
