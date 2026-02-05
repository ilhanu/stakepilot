import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SYSVAR_CLOCK_PUBKEY,
  StakeProgram,
} from "@solana/web3.js";
import bs58 from "bs58";

export const dynamic = "force-dynamic";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

interface UnstakeRequest {
  stakeAccounts: string[];
  dryRun?: boolean;
}

/**
 * POST /api/agent/unstake
 * 
 * Deactivate stake accounts for rebalancing or user withdrawals.
 * Requires agent authentication.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    const agentKey = process.env.AGENT_API_KEY;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const providedKey = authHeader.slice(7);
    if (agentKey && providedKey !== agentKey) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Parse request
    const body: UnstakeRequest = await request.json();
    const { stakeAccounts, dryRun = false } = body;

    if (!stakeAccounts || !Array.isArray(stakeAccounts) || stakeAccounts.length === 0) {
      return NextResponse.json(
        { error: "stakeAccounts array is required" },
        { status: 400 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const transactions: string[] = [];
    const errors: string[] = [];

    // Load agent keypair
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    if (!agentPrivateKey && !dryRun) {
      return NextResponse.json(
        { 
          error: "Agent keypair not configured",
          dryRun: true,
          stakeAccounts,
        },
        { status: 500 }
      );
    }

    let agentKeypair: Keypair | null = null;
    if (agentPrivateKey && !dryRun) {
      try {
        agentKeypair = Keypair.fromSecretKey(bs58.decode(agentPrivateKey));
      } catch {
        return NextResponse.json(
          { error: "Invalid agent private key format" },
          { status: 500 }
        );
      }
    }

    // Process each stake account
    for (const stakeAccountStr of stakeAccounts) {
      try {
        const stakeAccount = new PublicKey(stakeAccountStr);

        // Build deactivate_stake instruction
        // Discriminator for deactivate_stake
        const discriminator = Buffer.from([0xd4, 0x5f, 0x3b, 0x8c, 0x2a, 0x91, 0x7e, 0x63]);
        
        const instruction = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: VAULT_PDA, isSigner: false, isWritable: false },
            { pubkey: agentKeypair?.publicKey || PublicKey.default, isSigner: true, isWritable: false },
            { pubkey: stakeAccount, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
          ],
          data: discriminator,
        });

        if (dryRun) {
          transactions.push(`DRY_RUN:${stakeAccountStr}`);
          continue;
        }

        // Build and send transaction
        const tx = new Transaction().add(instruction);
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.feePayer = agentKeypair!.publicKey;

        const signature = await connection.sendTransaction(tx, [agentKeypair!], {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });

        await connection.confirmTransaction(signature, "confirmed");
        transactions.push(signature);
      } catch (error: any) {
        errors.push(`Failed to deactivate ${stakeAccountStr}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      dryRun,
      deactivated: transactions.length,
      transactions,
      errors: errors.length > 0 ? errors : undefined,
      cooldownPeriod: "~2 days",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Unstake error:", error);
    return NextResponse.json(
      { error: error.message || "Unstake failed" },
      { status: 500 }
    );
  }
}
