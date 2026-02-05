export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.testnet.solana.com";
const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const STAKE_PROGRAM_ID = new PublicKey("Stake11111111111111111111111111111111111111");

// Validator name cache (would be fetched from validators.app in production)
const VALIDATOR_NAMES: Record<string, string> = {
  "J2nUHvoLv3x3bBp5g5v4vN6R1r1GZ1U5xCQp4KqRhqLH": "Helius",
  "mrgn2vsVBWDgCjVPEVNwRG4zbNS3J3sFaVAy4e5r1J5": "marginfi",
  "Cube1eeNNbpbvJ6xC4aQgVULYt8KxvWtspUc2WnTQSpN": "Cubik",
  "JitoVa1Gn2nYFCdkdLu6ERe4x7fFEJCPnNkQcn5kYhZ": "Jito",
};

function getVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_ID
  );
}

function getVaultSolPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_sol"), vault.toBuffer()],
    PROGRAM_ID
  );
}

interface StakePosition {
  stakeAccount: string;
  validator: string;
  validatorName: string;
  amount: number;
  status: "active" | "activating" | "deactivating" | "inactive";
  activationEpoch: number | null;
  deactivationEpoch: number | null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get("owner");

  if (!owner) {
    return NextResponse.json(
      { error: "Owner address required" },
      { status: 400 }
    );
  }

  try {
    const connection = new Connection(RPC_URL);
    const ownerPubkey = new PublicKey(owner);
    const [vaultPDA] = getVaultPDA(ownerPubkey);
    const [vaultSolPDA] = getVaultSolPDA(vaultPDA);

    // Get current epoch for status calculation
    const epochInfo = await connection.getEpochInfo();
    const currentEpoch = epochInfo.epoch;

    // Find stake accounts where the withdrawal authority is our vault PDA
    // This is how the agent vault owns stake accounts
    const stakeAccounts = await connection.getParsedProgramAccounts(
      STAKE_PROGRAM_ID,
      {
        filters: [
          {
            memcmp: {
              offset: 44, // Withdrawal authority offset in stake account
              bytes: vaultSolPDA.toBase58(),
            },
          },
        ],
      }
    );

    const positions: StakePosition[] = [];

    for (const account of stakeAccounts) {
      const parsed = account.account.data as any;
      
      if (parsed.parsed?.info?.stake?.delegation) {
        const delegation = parsed.parsed.info.stake.delegation;
        const meta = parsed.parsed.info.meta;
        
        const validator = delegation.voter;
        const activationEpoch = parseInt(delegation.activationEpoch);
        const deactivationEpoch = delegation.deactivationEpoch === "18446744073709551615" 
          ? null 
          : parseInt(delegation.deactivationEpoch);

        // Determine status
        let status: StakePosition["status"] = "inactive";
        if (deactivationEpoch !== null && deactivationEpoch <= currentEpoch) {
          status = "inactive";
        } else if (deactivationEpoch !== null) {
          status = "deactivating";
        } else if (activationEpoch > currentEpoch) {
          status = "activating";
        } else {
          status = "active";
        }

        positions.push({
          stakeAccount: account.pubkey.toBase58(),
          validator,
          validatorName: VALIDATOR_NAMES[validator] || `${validator.slice(0, 6)}...`,
          amount: (meta.rentExemptReserve + parseInt(delegation.stake)) / 1e9,
          status,
          activationEpoch: activationEpoch,
          deactivationEpoch,
        });
      }
    }

    // Sort by amount (largest first)
    positions.sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      positions,
      count: positions.length,
      totalStaked: positions.reduce((sum, p) => sum + p.amount, 0),
      currentEpoch,
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch stake positions" },
      { status: 500 }
    );
  }
}
