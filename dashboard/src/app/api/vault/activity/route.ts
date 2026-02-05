export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";

const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");

function getVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_ID
  );
}

interface AgentActivity {
  id: string;
  type: "stake" | "unstake" | "rebalance" | "deposit" | "withdraw" | "strategy_update" | "check";
  summary: string;
  timestamp: string;
  txSignature: string;
  details?: string;
  amount?: number;
}

// Map instruction discriminators to activity types
const INSTRUCTION_MAP: Record<string, { type: AgentActivity["type"]; name: string }> = {
  "f223c68952e1f2b6": { type: "deposit", name: "Deposit" },
  "b712469c946da122": { type: "withdraw", name: "Withdraw" },
  "1d9acb512ea54565": { type: "strategy_update", name: "Strategy Update" },
  "4e7812ab56cd34ef": { type: "stake", name: "Execute Stake" },
  // Add more as needed
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get("owner");
  const limit = parseInt(searchParams.get("limit") || "20");

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

    // Get recent signatures for the vault account
    const signatures = await connection.getSignaturesForAddress(vaultPDA, {
      limit,
    });

    if (signatures.length === 0) {
      return NextResponse.json({
        activities: [],
        count: 0,
      });
    }

    // Fetch transaction details
    const txSignatures = signatures.map(s => s.signature);
    const transactions = await connection.getParsedTransactions(txSignatures, {
      maxSupportedTransactionVersion: 0,
    });

    const activities: AgentActivity[] = [];

    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      const tx = transactions[i];

      if (!tx || tx.meta?.err) continue;

      // Try to determine activity type from instructions
      let activityType: AgentActivity["type"] = "check";
      let summary = "Transaction";
      let details: string | undefined;
      let amount: number | undefined;

      // Check for our program's instructions
      const instructions = tx.transaction.message.instructions;
      for (const ix of instructions) {
        if ('programId' in ix && ix.programId.equals(PROGRAM_ID)) {
          // Found our program instruction
          if ('data' in ix && typeof ix.data === 'string') {
            const discriminator = ix.data.slice(0, 16); // First 8 bytes hex
            const mapped = INSTRUCTION_MAP[discriminator];
            if (mapped) {
              activityType = mapped.type;
              summary = mapped.name;
            }
          }
        }
      }

      // Parse SOL amounts from balance changes
      if (tx.meta?.preBalances && tx.meta?.postBalances) {
        const balanceChange = (tx.meta.postBalances[0] - tx.meta.preBalances[0]) / 1e9;
        if (Math.abs(balanceChange) > 0.001) {
          amount = Math.abs(balanceChange);
          if (activityType === "deposit") {
            summary = `Deposited ${amount.toFixed(4)} SOL`;
          } else if (activityType === "withdraw") {
            summary = `Withdrew ${amount.toFixed(4)} SOL`;
          }
        }
      }

      // Add logs as details
      if (tx.meta?.logMessages) {
        const relevantLogs = tx.meta.logMessages.filter(
          log => log.includes("Program log:") && !log.includes("invoke")
        );
        if (relevantLogs.length > 0) {
          details = relevantLogs.slice(0, 3).join("; ");
        }
      }

      activities.push({
        id: sig.signature.slice(0, 8),
        type: activityType,
        summary,
        timestamp: sig.blockTime 
          ? new Date(sig.blockTime * 1000).toISOString()
          : new Date().toISOString(),
        txSignature: sig.signature,
        details,
        amount,
      });
    }

    return NextResponse.json({
      activities,
      count: activities.length,
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch vault activity" },
      { status: 500 }
    );
  }
}
