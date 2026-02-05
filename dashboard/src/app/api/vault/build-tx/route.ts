import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from "@solana/web3.js";

const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");

// Default agent wallet (in production, this would be configurable)
const DEFAULT_AGENT = new PublicKey("By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny");

// PDA derivation
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

function getVaultSolPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_sol"), vault.toBuffer()],
    PROGRAM_ID
  );
}

// Instruction discriminators (sha256("global:<name>")[0..8])
const DISCRIMINATORS = {
  initialize_vault: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  withdraw: Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]),
  update_strategy: Buffer.from([16, 76, 138, 179, 171, 112, 196, 21]),
  execute_stake: Buffer.from([123, 140, 82, 174, 137, 211, 238, 49]),
  execute_unstake: Buffer.from([136, 166, 210, 104, 134, 184, 142, 230]),
  change_agent: Buffer.from([163, 82, 144, 6, 24, 107, 48, 119]),
};

/**
 * POST /api/vault/build-tx
 * 
 * Builds unsigned transactions for vault operations.
 * Client signs and sends.
 * 
 * Body:
 * - action: "initialize" | "deposit" | "withdraw" | "update_strategy"
 * - owner: string (pubkey)
 * - amount?: number (SOL, for deposit/withdraw)
 * - strategy?: { riskTolerance, targetApy, maxValidators, preferDecentralization }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, owner: ownerStr, amount, strategy } = body;

    if (!action || !ownerStr) {
      return NextResponse.json(
        { error: "action and owner required" },
        { status: 400 }
      );
    }

    const connection = new Connection(RPC_URL);
    const owner = new PublicKey(ownerStr);
    const [vault] = getVaultPDA(owner);
    const [strategyPDA] = getStrategyPDA(vault);
    const [vaultSol] = getVaultSolPDA(vault);

    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = owner;

    switch (action) {
      case "initialize": {
        // Initialize vault instruction
        const ix = new TransactionInstruction({
          keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: DEFAULT_AGENT, isSigner: false, isWritable: false },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: strategyPDA, isSigner: false, isWritable: true },
            { pubkey: vaultSol, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: PROGRAM_ID,
          data: DISCRIMINATORS.initialize_vault,
        });
        transaction.add(ix);
        break;
      }

      case "deposit": {
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: "amount required for deposit" },
            { status: 400 }
          );
        }

        const lamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
        const data = Buffer.concat([
          DISCRIMINATORS.deposit,
          Buffer.from(new BigUint64Array([lamports]).buffer),
        ]);

        const ix = new TransactionInstruction({
          keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: vaultSol, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: PROGRAM_ID,
          data,
        });
        transaction.add(ix);
        break;
      }

      case "withdraw": {
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: "amount required for withdraw" },
            { status: 400 }
          );
        }

        const lamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
        const data = Buffer.concat([
          DISCRIMINATORS.withdraw,
          Buffer.from(new BigUint64Array([lamports]).buffer),
        ]);

        const ix = new TransactionInstruction({
          keys: [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: vaultSol, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: PROGRAM_ID,
          data,
        });
        transaction.add(ix);
        break;
      }

      case "update_strategy": {
        if (!strategy) {
          return NextResponse.json(
            { error: "strategy required for update_strategy" },
            { status: 400 }
          );
        }

        const riskMap: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
        const riskValue = riskMap[strategy.riskTolerance] ?? 1;

        const data = Buffer.concat([
          DISCRIMINATORS.update_strategy,
          Buffer.from([riskValue]),
          Buffer.from(new Uint16Array([strategy.targetApy]).buffer),
          Buffer.from([strategy.maxValidators]),
          Buffer.from([strategy.preferDecentralization ? 1 : 0]),
        ]);

        const ix = new TransactionInstruction({
          keys: [
            { pubkey: owner, isSigner: true, isWritable: false },
            { pubkey: vault, isSigner: false, isWritable: false },
            { pubkey: strategyPDA, isSigner: false, isWritable: true },
          ],
          programId: PROGRAM_ID,
          data,
        });
        transaction.add(ix);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Serialize transaction (base64)
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return NextResponse.json({
      transaction: serialized.toString("base64"),
      blockhash,
      lastValidBlockHeight,
      accounts: {
        vault: vault.toBase58(),
        strategy: strategyPDA.toBase58(),
        vaultSol: vaultSol.toBase58(),
      },
    });
  } catch (error) {
    console.error("Error building transaction:", error);
    return NextResponse.json(
      { error: "Failed to build transaction" },
      { status: 500 }
    );
  }
}
