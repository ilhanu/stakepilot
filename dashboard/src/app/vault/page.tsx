"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-32 bg-[var(--bg-elevated)] rounded-xl animate-pulse" /> }
);
import {
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import Link from "next/link";
import { AgentActivity } from "@/components/AgentActivity";
import { VaultPositions } from "@/components/VaultPositions";

const PROGRAM_ID = new PublicKey("66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b");

// Helper to encode u64 as little-endian bytes (browser compatible)
function encodeU64(value: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  // Split into two 32-bit parts for browser compatibility
  view.setUint32(0, value & 0xffffffff, true); // lower 32 bits
  view.setUint32(4, Math.floor(value / 0x100000000), true); // upper 32 bits
  return new Uint8Array(buffer);
}
const VAULT_PDA = new PublicKey("HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u");

interface VaultStatus {
  totalDeposits: number;
  totalStaked: number;
  totalUsers: number;
  userDeposit: number;
  userPendingUnstake: number;
}

interface Recommendation {
  validator: string;
  validatorName: string;
  allocatedAmount: number;
  expectedApy: number;
  score: number;
  wizScore?: number;
}

export default function VaultPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  // Form state
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [txPending, setTxPending] = useState(false);

  // Fetch vault and user data
  const fetchData = useCallback(async () => {
    if (!publicKey) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch wallet balance
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);

      // Fetch vault account
      const vaultAccount = await connection.getAccountInfo(VAULT_PDA);
      if (!vaultAccount) {
        setError("Vault not found");
        return;
      }

      // Parse vault data (skip 8-byte discriminator)
      const vaultData = vaultAccount.data.slice(8);
      const totalDeposits = Number(vaultData.readBigUInt64LE(64)) / LAMPORTS_PER_SOL;
      const totalStaked = Number(vaultData.readBigUInt64LE(72)) / LAMPORTS_PER_SOL;
      const totalUsers = Number(vaultData.readBigUInt64LE(80));

      // Fetch user deposit account
      const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("deposit"), publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      let userDeposit = 0;
      let userPendingUnstake = 0;
      
      const userDepositAccount = await connection.getAccountInfo(userDepositPDA);
      if (userDepositAccount) {
        const depositData = userDepositAccount.data.slice(8);
        userDeposit = Number(depositData.readBigUInt64LE(32)) / LAMPORTS_PER_SOL;
        userPendingUnstake = Number(depositData.readBigUInt64LE(40)) / LAMPORTS_PER_SOL;
      }

      setVaultStatus({
        totalDeposits,
        totalStaked,
        totalUsers,
        userDeposit,
        userPendingUnstake,
      });

      // Fetch recommendations
      const recRes = await fetch("/api/agent/recommend?balance=1000&maxValidators=5");
      const recData = await recRes.json();
      if (recData.success) {
        setRecommendations(recData.decision.recommendations);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load vault data");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey, fetchData]);

  // Deposit SOL
  const handleDeposit = async () => {
    if (!publicKey || !signTransaction) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 0.01) {
      setError("Minimum deposit is 0.01 SOL");
      return;
    }

    setTxPending(true);
    setError(null);
    setSuccess(null);

    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      // Get user deposit PDA
      const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("deposit"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Build deposit instruction
      // Discriminator: sha256("global:deposit") first 8 bytes
      const discriminator = new Uint8Array([0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6]);
      const amountBuffer = encodeU64(lamports);
      
      // Combine discriminator + amount
      const data = new Uint8Array(16);
      data.set(discriminator, 0);
      data.set(amountBuffer, 8);
      
      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(data),
      });

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      setSuccess(`Deposited ${amount} SOL! Tx: ${signature.slice(0, 8)}...`);
      setDepositAmount("");
      fetchData();
    } catch (err: any) {
      console.error("Deposit failed:", err);
      setError(err.message || "Deposit failed");
    } finally {
      setTxPending(false);
    }
  };

  // Request unstake
  const handleRequestUnstake = async () => {
    if (!publicKey || !signTransaction) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    if (vaultStatus && amount > vaultStatus.userDeposit) {
      setError("Amount exceeds your deposit");
      return;
    }

    setTxPending(true);
    setError(null);
    setSuccess(null);

    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("deposit"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Build request_unstake instruction
      // sha256("global:request_unstake") = 2c9a6efda0ca3622...
      const discriminator = new Uint8Array([0x2c, 0x9a, 0x6e, 0xfd, 0xa0, 0xca, 0x36, 0x22]);
      const amountBuffer = encodeU64(lamports);
      
      // Combine discriminator + amount
      const data = new Uint8Array(16);
      data.set(discriminator, 0);
      data.set(amountBuffer, 8);
      
      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: VAULT_PDA, isSigner: false, isWritable: false },
          { pubkey: userDepositPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: false },
        ],
        data: Buffer.from(data),
      });

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      setSuccess(`Unstake requested for ${amount} SOL! Available after cooldown.`);
      setWithdrawAmount("");
      fetchData();
    } catch (err: any) {
      console.error("Request unstake failed:", err);
      setError(err.message || "Request unstake failed");
    } finally {
      setTxPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Testnet Banner */}
      <div className="bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 py-2 px-4 text-center">
        <span className="text-[var(--accent)] text-sm font-medium">
          🧪 Running on Solana Testnet — 
          <a 
            href="https://faucet.solana.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:no-underline ml-1"
          >
            Get testnet SOL
          </a>
        </span>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">StakePilot Vault</h1>
          <p className="text-[var(--text-secondary)]">
            Deposit SOL and let our agent stake to quality decentralized validators
          </p>
        </div>

        {!connected ? (
          <div className="bg-[var(--bg-card)] rounded-2xl p-12 text-center border border-[var(--border)]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-[var(--text-secondary)] mb-6">Connect your wallet to deposit and earn staking rewards</p>
            <WalletMultiButton className="!bg-[var(--accent)] hover:!bg-[var(--accent-hover)] !text-black !rounded-xl !font-semibold" />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--accent)] border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vault Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vault Overview */}
              <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
                <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Vault Overview</h2>
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  <div>
                    <div className="text-[var(--text-secondary)] text-xs md:text-sm">Total Deposits</div>
                    <div className="text-lg md:text-2xl font-bold">{vaultStatus?.totalDeposits.toFixed(2) || "0"} <span className="text-sm md:text-base">SOL</span></div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] text-xs md:text-sm">Total Staked</div>
                    <div className="text-lg md:text-2xl font-bold text-[var(--accent)]">{vaultStatus?.totalStaked.toFixed(2) || "0"} <span className="text-sm md:text-base">SOL</span></div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] text-xs md:text-sm">Depositors</div>
                    <div className="text-lg md:text-2xl font-bold">{vaultStatus?.totalUsers || 0}</div>
                  </div>
                </div>
              </div>

              {/* Your Position */}
              <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
                <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Your Position</h2>
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
                  <div>
                    <div className="text-[var(--text-secondary)] text-xs md:text-sm">Wallet</div>
                    <div className="text-base md:text-xl font-bold">{walletBalance.toFixed(2)} <span className="text-xs md:text-sm">SOL</span></div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] text-xs md:text-sm">Deposited</div>
                    <div className="text-base md:text-xl font-bold text-[var(--accent)]">{vaultStatus?.userDeposit.toFixed(2) || "0"} <span className="text-xs md:text-sm">SOL</span></div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] text-xs md:text-sm">Pending</div>
                    <div className="text-base md:text-xl font-bold text-[var(--coral)]">{vaultStatus?.userPendingUnstake.toFixed(2) || "0"} <span className="text-xs md:text-sm">SOL</span></div>
                  </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg text-[var(--accent)] text-sm">
                    {success}
                  </div>
                )}

                {/* Deposit/Withdraw Forms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm text-[var(--text-secondary)] mb-2">Deposit SOL</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 min-w-0 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                        disabled={txPending}
                      />
                      <button
                        onClick={handleDeposit}
                        disabled={txPending || !depositAmount}
                        className="px-3 md:px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium text-sm text-black transition whitespace-nowrap"
                      >
                        {txPending ? "..." : "Deposit"}
                      </button>
                    </div>
                    <button
                      onClick={() => setDepositAmount(walletBalance.toFixed(4))}
                      className="mt-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                    >
                      Max: {walletBalance.toFixed(2)} SOL
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm text-[var(--text-secondary)] mb-2">Request Unstake</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 min-w-0 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--coral)]"
                        disabled={txPending}
                      />
                      <button
                        onClick={handleRequestUnstake}
                        disabled={txPending || !withdrawAmount}
                        className="px-3 md:px-4 py-2 bg-[var(--coral)] hover:opacity-90 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium text-sm text-white transition whitespace-nowrap"
                      >
                        {txPending ? "..." : "Unstake"}
                      </button>
                    </div>
                    <button
                      onClick={() => setWithdrawAmount(vaultStatus?.userDeposit.toFixed(4) || "0")}
                      className="mt-1 text-xs text-[var(--coral)] hover:opacity-80"
                    >
                      Max: {vaultStatus?.userDeposit.toFixed(2) || "0"} SOL
                    </button>
                  </div>
                </div>
              </div>

              {/* Stake Positions */}
              <VaultPositions />

              {/* Agent Activity */}
              <AgentActivity />

              {/* Validator Targets */}
              <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
                <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Validator Targets</h2>
                <p className="text-[var(--text-secondary)] text-xs md:text-sm mb-3 md:mb-4">
                  The agent stakes to these quality decentralized validators
                </p>
                <div className="space-y-2 md:space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={rec.validator} className="flex items-center justify-between p-2.5 md:p-3 bg-[var(--bg-elevated)] rounded-lg">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center text-xs md:text-sm font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm md:text-base truncate">{rec.validatorName}</div>
                          <div className="text-[10px] md:text-xs text-[var(--text-secondary)] font-mono">
                            {rec.validator.slice(0, 6)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-[var(--accent)] font-medium text-sm md:text-base">{(rec.expectedApy ?? 0).toFixed(1)}%</div>
                        <div className="text-[10px] md:text-xs text-[var(--text-secondary)]">Score: {(rec.score ?? rec.wizScore ?? 0).toFixed(0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 md:space-y-6">
              {/* How it Works - Collapsed on mobile */}
              <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
                <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">How it Works</h2>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 md:gap-4 text-xs md:text-sm">
                  <div className="flex gap-2 md:gap-3">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center flex-shrink-0 text-xs">1</div>
                    <div>
                      <div className="font-medium">Deposit SOL</div>
                      <div className="text-[var(--text-secondary)] hidden sm:block">Transfer SOL to the vault</div>
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-3">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center flex-shrink-0 text-xs">2</div>
                    <div>
                      <div className="font-medium">Agent Stakes</div>
                      <div className="text-[var(--text-secondary)] hidden sm:block">AI agent stakes to quality validators</div>
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-3">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center flex-shrink-0 text-xs">3</div>
                    <div>
                      <div className="font-medium">Earn Rewards</div>
                      <div className="text-[var(--text-secondary)] hidden sm:block">Get staking + MEV rewards</div>
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-3">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[var(--coral)]/20 text-[var(--coral)] flex items-center justify-center flex-shrink-0 text-xs">4</div>
                    <div>
                      <div className="font-medium">Unstake Anytime</div>
                      <div className="text-[var(--text-secondary)] hidden sm:block">~2 day cooldown period</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validator Criteria */}
              <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
                <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Validator Criteria</h2>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">
                    <span className="text-[var(--accent)]">✓</span> Stake &lt; 1M SOL (decentralization)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[var(--accent)]">✓</span> Commission ≤ 5%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[var(--accent)]">✓</span> MEV Commission ≤ 10%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[var(--accent)]">✓</span> Uptime &gt; 95%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[var(--accent)]">✓</span> Includes Staker Space validator
                  </li>
                </ul>
              </div>

              {/* Vault Address */}
              <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border border-[var(--border)]">
                <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Vault Info</h2>
                <div className="space-y-2 text-xs md:text-sm">
                  <div>
                    <div className="text-[var(--text-secondary)]">Network</div>
                    <div className="font-mono text-[var(--accent)]">Testnet</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)]">Vault Address</div>
                    <a
                      href={`https://explorer.solana.com/address/${VAULT_PDA.toBase58()}?cluster=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[var(--accent)] hover:underline break-all text-[11px] md:text-xs"
                    >
                      {VAULT_PDA.toBase58().slice(0, 16)}...
                    </a>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)]">Program</div>
                    <a
                      href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[var(--accent)] hover:underline break-all text-[11px] md:text-xs"
                    >
                      {PROGRAM_ID.toBase58().slice(0, 16)}...
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
