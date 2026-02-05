import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  StakeProgram,
} from "@solana/web3.js";
import bs58 from "bs58";

export const dynamic = "force-dynamic";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");
const STAKE_CONFIG = new PublicKey("StakeConfig11111111111111111111111111111111");
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com";

// Minimum stake per validator (1 SOL)
const MIN_STAKE = 1;

interface StakeAllocation {
  validatorVote: string;
  amount: number;
}

interface StakeRequest {
  allocations: StakeAllocation[];
  dryRun?: boolean;
}

/**
 * POST /api/agent/stake
 * 
 * Execute staking to validators.
 * Requires agent authentication via API key.
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
    const body: StakeRequest = await request.json();
    const { allocations, dryRun = false } = body;

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: "allocations array is required" },
        { status: 400 }
      );
    }

    // Validate allocations
    for (const alloc of allocations) {
      if (!alloc.validatorVote || !alloc.amount) {
        return NextResponse.json(
          { error: "Each allocation needs validatorVote and amount" },
          { status: 400 }
        );
      }
      if (alloc.amount < MIN_STAKE) {
        return NextResponse.json(
          { error: `Minimum stake is ${MIN_STAKE} SOL per validator` },
          { status: 400 }
        );
      }
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const transactions: { signature: string; validator: string; amount: number }[] = [];
    const errors: string[] = [];

    // Load agent keypair
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    if (!agentPrivateKey && !dryRun) {
      return NextResponse.json(
        { 
          error: "Agent keypair not configured",
          hint: "Set AGENT_PRIVATE_KEY environment variable",
          dryRun: true,
          allocations,
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

    // Get vault bump
    const [, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      PROGRAM_ID
    );

    // Process each allocation
    for (const alloc of allocations) {
      try {
        const validatorVote = new PublicKey(alloc.validatorVote);
        const lamports = Math.floor(alloc.amount * LAMPORTS_PER_SOL);

        // Derive stake account PDA
        const [stakeAccount, stakeBump] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("stake"),
            VAULT_PDA.toBuffer(),
            validatorVote.toBuffer(),
          ],
          PROGRAM_ID
        );

        // Build stake_to_validator instruction
        // Discriminator for stake_to_validator (first 8 bytes of sha256("global:stake_to_validator"))
        const discriminator = Buffer.from([0x62, 0x3c, 0x67, 0x5c, 0x54, 0x39, 0x4d, 0x8c]);
        const amountBuffer = Buffer.alloc(8);
        amountBuffer.writeBigUInt64LE(BigInt(lamports));
        
        const data = Buffer.concat([discriminator, amountBuffer]);

        const instruction = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
            { pubkey: agentKeypair?.publicKey || PublicKey.default, isSigner: true, isWritable: true },
            { pubkey: stakeAccount, isSigner: false, isWritable: true },
            { pubkey: validatorVote, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_STAKE_HISTORY_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: STAKE_CONFIG, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
          ],
          data,
        });

        if (dryRun) {
          transactions.push({
            signature: "DRY_RUN",
            validator: alloc.validatorVote,
            amount: alloc.amount,
          });
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

        transactions.push({
          signature,
          validator: alloc.validatorVote,
          amount: alloc.amount,
        });
      } catch (error: any) {
        errors.push(`Failed to stake to ${alloc.validatorVote}: ${error.message}`);
      }
    }

    const totalStaked = transactions.reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      success: errors.length === 0,
      dryRun,
      stakesCreated: transactions.length,
      totalStaked,
      transactions,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Stake execution error:", error);
    return NextResponse.json(
      { error: error.message || "Stake execution failed" },
      { status: 500 }
    );
  }
}
