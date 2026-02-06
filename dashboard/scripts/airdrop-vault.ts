import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  const connection = new Connection("https://api.testnet.solana.com", "confirmed");
  const vault = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
  
  console.log("Requesting 2 SOL airdrop to vault...");
  try {
    const sig = await connection.requestAirdrop(vault, 2 * LAMPORTS_PER_SOL);
    console.log("Airdrop signature:", sig);
    await connection.confirmTransaction(sig);
    console.log("Confirmed!");
    
    const balance = await connection.getBalance(vault);
    console.log("New vault balance:", balance / LAMPORTS_PER_SOL, "SOL");
  } catch (e: any) {
    console.error("Airdrop failed:", e.message);
  }
}
main();
