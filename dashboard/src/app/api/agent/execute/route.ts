/**
 * Agent Execution API
 * 
 * This endpoint is called by a cron job to execute staking operations.
 * It reads vault strategies and executes optimal staking decisions.
 * 
 * Protected by CRON_SECRET environment variable.
 */

import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { fetchAllValidators } from "@/lib/validators-app";

const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");
const CRON_SECRET = process.env.CRON_SECRET;

// Agent private key (in production, use secure key management)
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

interface VaultInfo {
  vaultPubkey: PublicKey;
  owner: PublicKey;
  agent: PublicKey;
  balance: number;
  totalStaked: number;
  strategy: {
    riskTolerance: number;
    targetApy: number;
    maxValidators: number;
    preferDecentralization: boolean;
  };
}

interface ExecutionResult {
  vault: string;
  action: "stake" | "unstake" | "rebalance" | "skip";
  details: string;
  txSignature?: string;
  error?: string;
}

// Discriminators
const DISCRIMINATORS = {
  execute_stake: Buffer.from([78, 120, 18, 171, 86, 205, 52, 239]),
};

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

/**
 * Generate staking decision based on strategy
 */
async function generateDecision(
  strategy: VaultInfo["strategy"],
  availableBalance: number,
  validators: any[]
): Promise<Array<{ validator: string; amount: number; reason: string }>> {
  // Filter out delinquent
  let eligible = validators.filter(v => !v.delinquent);
  
  // Apply risk tolerance
  const riskFilters = [1_000_000, 100_000, 0]; // Low, Medium, High
  const minStake = riskFilters[strategy.riskTolerance] || 100_000;
  eligible = eligible.filter(v => v.stakeSol >= minStake);
  
  // Apply decentralization preference
  if (strategy.preferDecentralization) {
    eligible = eligible.filter(v => 
      !v.data_center_concentration || v.data_center_concentration < 0.1
    );
  }
  
  // Sort by net APY
  eligible.sort((a, b) => b.netTotalApy - a.netTotalApy);
  
  // Filter by target APY (allow 10% tolerance)
  const targetApy = strategy.targetApy / 100; // Convert from basis points
  eligible = eligible.filter(v => v.netTotalApy >= targetApy * 0.9);
  
  // Select top N
  const selected = eligible.slice(0, strategy.maxValidators);
  
  if (selected.length === 0) {
    return [];
  }
  
  // Distribute evenly
  const amountPerValidator = availableBalance / selected.length;
  
  return selected.map(v => ({
    validator: v.vote_account,
    amount: amountPerValidator,
    reason: `APY: ${v.netTotalApy.toFixed(1)}%, Commission: ${v.commission}%`,
  }));
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if we have agent key
  if (!AGENT_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Agent private key not configured" },
      { status: 500 }
    );
  }

  const connection = new Connection(RPC_URL);
  const results: ExecutionResult[] = [];
  
  try {
    // Parse agent keypair
    const agentKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(AGENT_PRIVATE_KEY))
    );
    const agentPubkey = agentKeypair.publicKey;

    // Get request body for specific vault (optional)
    let targetVault: string | null = null;
    try {
      const body = await request.json();
      targetVault = body.vault || null;
    } catch {
      // No body, process all vaults
    }

    // Fetch all validators for decision making
    const validators = await fetchAllValidators();
    
    if (validators.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch validator data" },
        { status: 500 }
      );
    }

    // For now, we'll need the vault owner pubkeys to find vaults
    // In production, you'd scan program accounts or maintain a list
    // For the demo, we accept a specific vault to process
    
    if (!targetVault) {
      return NextResponse.json({
        message: "No vault specified. Pass { vault: 'ownerPubkey' } to execute for a specific vault.",
        hint: "In production, the agent would scan all vaults where it's authorized.",
      });
    }

    const ownerPubkey = new PublicKey(targetVault);
    const [vaultPDA] = getVaultPDA(ownerPubkey);
    const [strategyPDA] = getStrategyPDA(vaultPDA);
    const [vaultSolPDA] = getVaultSolPDA(vaultPDA);

    // Fetch vault account
    const vaultAccount = await connection.getAccountInfo(vaultPDA);
    
    if (!vaultAccount) {
      results.push({
        vault: targetVault,
        action: "skip",
        details: "Vault not found",
      });
      return NextResponse.json({ results });
    }

    // Parse vault data (skip 8-byte discriminator)
    const vaultData = vaultAccount.data.slice(8);
    const vault: VaultInfo = {
      vaultPubkey: vaultPDA,
      owner: new PublicKey(vaultData.slice(0, 32)),
      agent: new PublicKey(vaultData.slice(32, 64)),
      balance: Number(vaultData.readBigUInt64LE(64)) / 1e9,
      totalStaked: Number(vaultData.readBigUInt64LE(72)) / 1e9,
      strategy: { riskTolerance: 1, targetApy: 800, maxValidators: 5, preferDecentralization: true },
    };

    // Verify we're the authorized agent
    if (!vault.agent.equals(agentPubkey)) {
      results.push({
        vault: targetVault,
        action: "skip",
        details: `Not authorized. Vault agent: ${vault.agent.toBase58()}, Our key: ${agentPubkey.toBase58()}`,
      });
      return NextResponse.json({ results });
    }

    // Fetch strategy
    const strategyAccount = await connection.getAccountInfo(strategyPDA);
    if (strategyAccount) {
      const strategyData = strategyAccount.data.slice(8);
      vault.strategy = {
        riskTolerance: strategyData[32],
        targetApy: strategyData.readUInt16LE(33),
        maxValidators: strategyData[35],
        preferDecentralization: strategyData[36] === 1,
      };
    }

    // Check if we have balance to stake
    if (vault.balance < 0.1) {
      results.push({
        vault: targetVault,
        action: "skip",
        details: `Insufficient balance to stake: ${vault.balance} SOL`,
      });
      return NextResponse.json({ results });
    }

    // Generate staking decision
    const decisions = await generateDecision(vault.strategy, vault.balance, validators);
    
    if (decisions.length === 0) {
      results.push({
        vault: targetVault,
        action: "skip",
        details: "No validators match strategy criteria",
      });
      return NextResponse.json({ results });
    }

    // Execute staking (for demo, we'll just log what we would do)
    // In production, you'd build and sign actual transactions
    
    const executionDetails = decisions.map(d => 
      `${d.amount.toFixed(4)} SOL → ${d.validator.slice(0, 8)}... (${d.reason})`
    ).join("; ");

    results.push({
      vault: targetVault,
      action: "stake",
      details: `Would stake: ${executionDetails}`,
      // In production:
      // txSignature: await executeStakingTx(connection, agentKeypair, vault, decisions),
    });

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Agent execution error:", error);
    return NextResponse.json(
      { error: "Execution failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET: Status check for the agent
 */
export async function GET(request: NextRequest) {
  const hasKey = !!AGENT_PRIVATE_KEY;
  const hasSecret = !!CRON_SECRET;
  
  let agentPubkey: string | null = null;
  if (AGENT_PRIVATE_KEY) {
    try {
      const keypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(AGENT_PRIVATE_KEY))
      );
      agentPubkey = keypair.publicKey.toBase58();
    } catch {
      agentPubkey = "Invalid key format";
    }
  }

  return NextResponse.json({
    status: hasKey && hasSecret ? "ready" : "not configured",
    agentPubkey,
    config: {
      hasPrivateKey: hasKey,
      hasCronSecret: hasSecret,
      rpcUrl: RPC_URL,
      programId: PROGRAM_ID.toBase58(),
    },
  });
}
