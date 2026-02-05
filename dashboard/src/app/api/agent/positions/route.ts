import { NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

export const dynamic = "force-dynamic";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const AGENT_WALLET = new PublicKey("By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny");
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com";

interface StakePosition {
  stakeAccount: string;
  validatorVote: string;
  stakedAmount: number;
  status: "activating" | "active" | "deactivating" | "inactive";
  activationEpoch: number | null;
  deactivationEpoch: number | null;
}

/**
 * GET /api/agent/positions
 * 
 * Returns all stake accounts owned by the vault.
 * Used by agents to understand current staking state.
 */
export async function GET() {
  try {
    const connection = new Connection(RPC_URL, "confirmed");

    // Get current epoch info
    const epochInfo = await connection.getEpochInfo();
    const currentEpoch = epochInfo.epoch;

    // Find all stake accounts where vault PDA is the staker/withdrawer
    // Program creates stake accounts with vault as the authority
    const stakeAccounts = await connection.getProgramAccounts(
      new PublicKey("Stake11111111111111111111111111111111111111"),
      {
        filters: [
          // Filter by staker (vault PDA) - offset 12, size 32
          {
            memcmp: {
              offset: 12,
              bytes: VAULT_PDA.toBase58(),
            },
          },
        ],
      }
    );

    const positions: StakePosition[] = [];
    let totalStaked = 0;

    for (const account of stakeAccounts) {
      try {
        const data = account.account.data;
        const lamports = account.account.lamports;
        
        // Parse stake account data
        // Layout: 4 bytes state, 8 bytes meta, 8 bytes rent_exempt_reserve, ...
        // Delegation starts at offset 124
        const delegationOffset = 124;
        
        if (data.length > delegationOffset + 72) {
          const voterPubkey = new PublicKey(data.slice(delegationOffset, delegationOffset + 32));
          const stake = Number(data.readBigUInt64LE(delegationOffset + 32)) / LAMPORTS_PER_SOL;
          const activationEpoch = Number(data.readBigUInt64LE(delegationOffset + 40));
          const deactivationEpoch = Number(data.readBigUInt64LE(delegationOffset + 48));

          // Determine status
          let status: StakePosition["status"];
          if (deactivationEpoch !== 0xffffffffffffffff && deactivationEpoch <= currentEpoch) {
            status = "inactive";
          } else if (deactivationEpoch !== 0xffffffffffffffff) {
            status = "deactivating";
          } else if (activationEpoch >= currentEpoch) {
            status = "activating";
          } else {
            status = "active";
          }

          positions.push({
            stakeAccount: account.pubkey.toBase58(),
            validatorVote: voterPubkey.toBase58(),
            stakedAmount: stake,
            status,
            activationEpoch: activationEpoch,
            deactivationEpoch: deactivationEpoch === 0xffffffffffffffff ? null : deactivationEpoch,
          });

          if (status === "active" || status === "activating") {
            totalStaked += stake;
          }
        }
      } catch (parseError) {
        console.error("Failed to parse stake account:", account.pubkey.toBase58());
      }
    }

    // Sort by staked amount descending
    positions.sort((a, b) => b.stakedAmount - a.stakedAmount);

    return NextResponse.json({
      positions,
      count: positions.length,
      totalStaked,
      currentEpoch,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Positions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get positions" },
      { status: 500 }
    );
  }
}
