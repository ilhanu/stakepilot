export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");

function getVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_ID
  );
}

function getStrategyPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("strategy"), vault.toBuffer()],
    PROGRAM_ID
  );
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
    const [strategyPDA] = getStrategyPDA(vaultPDA);

    // Fetch vault account
    const vaultAccount = await connection.getAccountInfo(vaultPDA);
    
    if (!vaultAccount) {
      return NextResponse.json({
        exists: false,
        vault: null,
        strategy: null,
      });
    }

    // Parse vault data (skip 8-byte discriminator)
    const vaultData = vaultAccount.data.slice(8);
    const vault = {
      owner: new PublicKey(vaultData.slice(0, 32)).toBase58(),
      agent: new PublicKey(vaultData.slice(32, 64)).toBase58(),
      balance: Number(vaultData.readBigUInt64LE(64)) / 1e9,
      totalStaked: Number(vaultData.readBigUInt64LE(72)) / 1e9,
    };

    // Fetch strategy account
    const strategyAccount = await connection.getAccountInfo(strategyPDA);
    let strategy = null;

    if (strategyAccount) {
      const strategyData = strategyAccount.data.slice(8);
      const riskValues = ["Low", "Medium", "High"];
      strategy = {
        riskTolerance: riskValues[strategyData[32]] || "Medium",
        targetApy: strategyData.readUInt16LE(33),
        maxValidators: strategyData[35],
        preferDecentralization: strategyData[36] === 1,
      };
    }

    return NextResponse.json({
      exists: true,
      vault,
      strategy,
    });
  } catch (error) {
    console.error("Error fetching vault:", error);
    return NextResponse.json(
      { error: "Failed to fetch vault status" },
      { status: 500 }
    );
  }
}
