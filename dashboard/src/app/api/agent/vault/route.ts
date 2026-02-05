import { NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export const dynamic = "force-dynamic";

const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const AGENT_PUBKEY = new PublicKey("By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny");
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Minimum SOL to keep for rent
const MIN_VAULT_BALANCE = 0.1;

/**
 * GET /api/agent/vault
 * 
 * Returns current vault state for agents to read.
 */
export async function GET() {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    
    // Get vault account
    const vaultAccount = await connection.getAccountInfo(VAULT_PDA);
    if (!vaultAccount) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404 });
    }

    const vaultBalance = vaultAccount.lamports / LAMPORTS_PER_SOL;
    
    // Parse vault data (skip 8-byte discriminator)
    const vaultData = vaultAccount.data.slice(8);
    const authority = new PublicKey(vaultData.slice(0, 32));
    const agent = new PublicKey(vaultData.slice(32, 64));
    const totalDeposits = Number(vaultData.readBigUInt64LE(64)) / LAMPORTS_PER_SOL;
    const totalStaked = Number(vaultData.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;
    const totalUsers = Number(vaultData.readBigUInt64LE(80));

    const availableToStake = Math.max(0, vaultBalance - MIN_VAULT_BALANCE);

    return NextResponse.json({
      vault: {
        address: VAULT_PDA.toBase58(),
        balance: vaultBalance,
        totalDeposits,
        totalStaked,
        totalUsers,
        authority: authority.toBase58(),
      },
      agent: agent.toBase58(),
      availableToStake,
      minVaultBalance: MIN_VAULT_BALANCE,
      network: RPC_URL.includes("devnet") ? "devnet" : "mainnet",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Vault status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get vault status" },
      { status: 500 }
    );
  }
}
