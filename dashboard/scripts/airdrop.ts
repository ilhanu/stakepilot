import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  const connection = new Connection("https://api.testnet.solana.com", "confirmed");
  const pubkey = new PublicKey("By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny");
  
  console.log("Requesting 1 SOL airdrop to agent wallet...");
  try {
    const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
    console.log("Airdrop signature:", sig);
    await connection.confirmTransaction(sig);
    console.log("Confirmed!");
    
    const balance = await connection.getBalance(pubkey);
    console.log("New balance:", balance / LAMPORTS_PER_SOL, "SOL");
  } catch (e: any) {
    console.error("Airdrop failed:", e.message);
  }
}
main();
