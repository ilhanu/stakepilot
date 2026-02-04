/**
 * Agent Vault SDK
 * TypeScript client for interacting with the Agent Vault program
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import * as borsh from 'borsh';

// Program ID - will be updated after deployment
export const AGENT_VAULT_PROGRAM_ID = new PublicKey(
  'AgentVau1t11111111111111111111111111111111111'
);

// ============================================
// TYPES
// ============================================

export enum RiskTolerance {
  Low = 0,
  Medium = 1,
  High = 2,
}

export interface VaultAccount {
  owner: PublicKey;
  agent: PublicKey;
  balance: bigint;
  totalStaked: bigint;
  bump: number;
}

export interface StrategyAccount {
  vault: PublicKey;
  riskTolerance: RiskTolerance;
  targetApy: number; // basis points
  maxValidators: number;
  preferDecentralization: boolean;
  bump: number;
}

export interface StrategyParams {
  riskTolerance: RiskTolerance;
  targetApy: number;
  maxValidators: number;
  preferDecentralization: boolean;
}

// ============================================
// PDA DERIVATION
// ============================================

export function getVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), owner.toBuffer()],
    AGENT_VAULT_PROGRAM_ID
  );
}

export function getStrategyPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('strategy'), vault.toBuffer()],
    AGENT_VAULT_PROGRAM_ID
  );
}

export function getVaultSolPDA(vault: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault_sol'), vault.toBuffer()],
    AGENT_VAULT_PROGRAM_ID
  );
}

// ============================================
// INSTRUCTION BUILDERS
// ============================================

/**
 * Create instruction to initialize a new vault
 */
export function createInitializeVaultInstruction(
  owner: PublicKey,
  agent: PublicKey
): TransactionInstruction {
  const [vault] = getVaultPDA(owner);
  const [strategy] = getStrategyPDA(vault);
  const [vaultSol] = getVaultSolPDA(vault);

  // Instruction discriminator for "initialize_vault"
  const discriminator = Buffer.from([
    0x5b, 0x4f, 0x4d, 0x89, 0x8b, 0x37, 0x0e, 0x7a,
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: agent, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: strategy, isSigner: false, isWritable: true },
      { pubkey: vaultSol, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: AGENT_VAULT_PROGRAM_ID,
    data: discriminator,
  });
}

/**
 * Create instruction to deposit SOL into the vault
 */
export function createDepositInstruction(
  owner: PublicKey,
  amount: bigint
): TransactionInstruction {
  const [vault] = getVaultPDA(owner);
  const [vaultSol] = getVaultSolPDA(vault);

  // Instruction discriminator for "deposit"
  const discriminator = Buffer.from([
    0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6,
  ]);

  const data = Buffer.concat([
    discriminator,
    Buffer.from(new BigUint64Array([amount]).buffer),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: vaultSol, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: AGENT_VAULT_PROGRAM_ID,
    data,
  });
}

/**
 * Create instruction to withdraw SOL from the vault
 */
export function createWithdrawInstruction(
  owner: PublicKey,
  amount: bigint
): TransactionInstruction {
  const [vault] = getVaultPDA(owner);
  const [vaultSol] = getVaultSolPDA(vault);

  // Instruction discriminator for "withdraw"
  const discriminator = Buffer.from([
    0xb7, 0x12, 0x46, 0x9c, 0x94, 0x6d, 0xa1, 0x22,
  ]);

  const data = Buffer.concat([
    discriminator,
    Buffer.from(new BigUint64Array([amount]).buffer),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: vaultSol, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: AGENT_VAULT_PROGRAM_ID,
    data,
  });
}

/**
 * Create instruction to update strategy
 */
export function createUpdateStrategyInstruction(
  owner: PublicKey,
  params: StrategyParams
): TransactionInstruction {
  const [vault] = getVaultPDA(owner);
  const [strategy] = getStrategyPDA(vault);

  // Instruction discriminator for "update_strategy"
  const discriminator = Buffer.from([
    0x1d, 0x9a, 0xcb, 0x51, 0x2e, 0xa5, 0x45, 0x65,
  ]);

  const data = Buffer.concat([
    discriminator,
    Buffer.from([params.riskTolerance]),
    Buffer.from(new Uint16Array([params.targetApy]).buffer),
    Buffer.from([params.maxValidators]),
    Buffer.from([params.preferDecentralization ? 1 : 0]),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: false },
      { pubkey: strategy, isSigner: false, isWritable: true },
    ],
    programId: AGENT_VAULT_PROGRAM_ID,
    data,
  });
}

/**
 * Create instruction to execute stake (agent only)
 */
export function createExecuteStakeInstruction(
  agent: PublicKey,
  vault: PublicKey,
  validator: PublicKey,
  amount: bigint
): TransactionInstruction {
  const [strategy] = getStrategyPDA(vault);
  const [vaultSol] = getVaultSolPDA(vault);

  // Instruction discriminator for "execute_stake"
  const discriminator = Buffer.from([
    0x4e, 0x78, 0x12, 0xab, 0x56, 0xcd, 0x34, 0xef,
  ]);

  const data = Buffer.concat([
    discriminator,
    validator.toBuffer(),
    Buffer.from(new BigUint64Array([amount]).buffer),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: strategy, isSigner: false, isWritable: false },
      { pubkey: vaultSol, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: AGENT_VAULT_PROGRAM_ID,
    data,
  });
}

// ============================================
// CLIENT CLASS
// ============================================

export class AgentVaultClient {
  constructor(
    public connection: Connection,
    public programId: PublicKey = AGENT_VAULT_PROGRAM_ID
  ) {}

  /**
   * Get vault account data
   */
  async getVault(owner: PublicKey): Promise<VaultAccount | null> {
    const [vaultPDA] = getVaultPDA(owner);
    const accountInfo = await this.connection.getAccountInfo(vaultPDA);
    
    if (!accountInfo) return null;
    
    // Skip 8-byte discriminator
    const data = accountInfo.data.slice(8);
    
    return {
      owner: new PublicKey(data.slice(0, 32)),
      agent: new PublicKey(data.slice(32, 64)),
      balance: BigInt(new DataView(data.buffer, data.byteOffset + 64, 8).getBigUint64(0, true)),
      totalStaked: BigInt(new DataView(data.buffer, data.byteOffset + 72, 8).getBigUint64(0, true)),
      bump: data[80],
    };
  }

  /**
   * Get strategy account data
   */
  async getStrategy(vault: PublicKey): Promise<StrategyAccount | null> {
    const [strategyPDA] = getStrategyPDA(vault);
    const accountInfo = await this.connection.getAccountInfo(strategyPDA);
    
    if (!accountInfo) return null;
    
    // Skip 8-byte discriminator
    const data = accountInfo.data.slice(8);
    
    return {
      vault: new PublicKey(data.slice(0, 32)),
      riskTolerance: data[32] as RiskTolerance,
      targetApy: new DataView(data.buffer, data.byteOffset + 33, 2).getUint16(0, true),
      maxValidators: data[35],
      preferDecentralization: data[36] === 1,
      bump: data[37],
    };
  }

  /**
   * Get vault SOL balance
   */
  async getVaultBalance(vault: PublicKey): Promise<bigint> {
    const [vaultSol] = getVaultSolPDA(vault);
    const balance = await this.connection.getBalance(vaultSol);
    return BigInt(balance);
  }

  /**
   * Build transaction to initialize vault
   */
  buildInitializeVaultTx(owner: PublicKey, agent: PublicKey): Transaction {
    const tx = new Transaction();
    tx.add(createInitializeVaultInstruction(owner, agent));
    return tx;
  }

  /**
   * Build transaction to deposit SOL
   */
  buildDepositTx(owner: PublicKey, amountSol: number): Transaction {
    const tx = new Transaction();
    const lamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
    tx.add(createDepositInstruction(owner, lamports));
    return tx;
  }

  /**
   * Build transaction to withdraw SOL
   */
  buildWithdrawTx(owner: PublicKey, amountSol: number): Transaction {
    const tx = new Transaction();
    const lamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
    tx.add(createWithdrawInstruction(owner, lamports));
    return tx;
  }

  /**
   * Build transaction to update strategy
   */
  buildUpdateStrategyTx(owner: PublicKey, params: StrategyParams): Transaction {
    const tx = new Transaction();
    tx.add(createUpdateStrategyInstruction(owner, params));
    return tx;
  }
}

// ============================================
// AGENT FUNCTIONS
// ============================================

export interface ValidatorRecommendation {
  validator: PublicKey;
  allocatedAmount: bigint;
  reason: string;
}

export interface StakingDecision {
  recommendations: ValidatorRecommendation[];
  totalToStake: bigint;
}

/**
 * Generate staking decision based on strategy
 * This is the core agent algorithm
 */
export async function generateStakingDecision(
  strategy: StrategyAccount,
  availableBalance: bigint,
  validators: Array<{
    voteAccount: string;
    netApy: number;
    commission: number;
    activatedStake: number;
    delinquent: boolean;
    datacenterConcentration: number;
  }>
): Promise<StakingDecision> {
  const recommendations: ValidatorRecommendation[] = [];
  
  // Filter out delinquent validators
  let eligible = validators.filter(v => !v.delinquent);
  
  // Apply risk tolerance filter
  if (strategy.riskTolerance === RiskTolerance.Low) {
    // Conservative: only validators with >1M SOL stake
    eligible = eligible.filter(v => v.activatedStake > 1_000_000);
  } else if (strategy.riskTolerance === RiskTolerance.Medium) {
    // Medium: validators with >100K SOL stake
    eligible = eligible.filter(v => v.activatedStake > 100_000);
  }
  // High risk: all non-delinquent validators
  
  // Apply decentralization preference
  if (strategy.preferDecentralization) {
    // Prefer validators with low datacenter concentration
    eligible = eligible.filter(v => v.datacenterConcentration < 0.1);
  }
  
  // Sort by net APY (highest first)
  eligible.sort((a, b) => b.netApy - a.netApy);
  
  // Filter by target APY
  const targetApyDecimal = strategy.targetApy / 10000;
  eligible = eligible.filter(v => v.netApy >= targetApyDecimal * 0.9); // Allow 10% tolerance
  
  // Take top N validators based on maxValidators
  const selected = eligible.slice(0, strategy.maxValidators);
  
  if (selected.length === 0) {
    return { recommendations: [], totalToStake: BigInt(0) };
  }
  
  // Distribute stake evenly (for simplicity)
  const amountPerValidator = availableBalance / BigInt(selected.length);
  
  for (const validator of selected) {
    recommendations.push({
      validator: new PublicKey(validator.voteAccount),
      allocatedAmount: amountPerValidator,
      reason: `APY: ${(validator.netApy * 100).toFixed(2)}%, Commission: ${validator.commission}%`,
    });
  }
  
  const totalToStake = amountPerValidator * BigInt(selected.length);
  
  return { recommendations, totalToStake };
}
