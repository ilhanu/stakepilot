"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import Link from "next/link";
import { AgentActivity } from "@/components/AgentActivity";

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
  wizScore: number;
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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-bold">
              S
            </div>
            <span className="font-semibold text-lg">Staker Space</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/discover" className="text-gray-400 hover:text-white transition">
              Discover
            </Link>
            <Link href="/docs" className="text-gray-400 hover:text-white transition">
              Docs
            </Link>
            <WalletMultiButton className="!bg-emerald-600 hover:!bg-emerald-700 !rounded-lg" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Staker Space Vault</h1>
          <p className="text-gray-400">
            Deposit SOL and let our agent stake to quality decentralized validators
          </p>
        </div>

        {!connected ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center border border-gray-800">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Connect your wallet to deposit and earn staking rewards</p>
            <WalletMultiButton className="!bg-emerald-600 hover:!bg-emerald-700 !rounded-lg" />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vault Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vault Overview */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Vault Overview</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">Total Deposits</div>
                    <div className="text-2xl font-bold">{vaultStatus?.totalDeposits.toFixed(2) || "0"} SOL</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Total Staked</div>
                    <div className="text-2xl font-bold text-emerald-400">{vaultStatus?.totalStaked.toFixed(2) || "0"} SOL</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Depositors</div>
                    <div className="text-2xl font-bold">{vaultStatus?.totalUsers || 0}</div>
                  </div>
                </div>
              </div>

              {/* Your Position */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Your Position</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-gray-400 text-sm">Wallet Balance</div>
                    <div className="text-xl font-bold">{walletBalance.toFixed(4)} SOL</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Your Deposit</div>
                    <div className="text-xl font-bold text-emerald-400">{vaultStatus?.userDeposit.toFixed(4) || "0"} SOL</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Pending Unstake</div>
                    <div className="text-xl font-bold text-yellow-400">{vaultStatus?.userPendingUnstake.toFixed(4) || "0"} SOL</div>
                  </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                    {success}
                  </div>
                )}

                {/* Deposit/Withdraw Forms */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Deposit SOL</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                        disabled={txPending}
                      />
                      <button
                        onClick={handleDeposit}
                        disabled={txPending || !depositAmount}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
                      >
                        {txPending ? "..." : "Deposit"}
                      </button>
                    </div>
                    <button
                      onClick={() => setDepositAmount(walletBalance.toFixed(4))}
                      className="mt-1 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Max: {walletBalance.toFixed(4)} SOL
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Request Unstake</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-500"
                        disabled={txPending}
                      />
                      <button
                        onClick={handleRequestUnstake}
                        disabled={txPending || !withdrawAmount}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
                      >
                        {txPending ? "..." : "Unstake"}
                      </button>
                    </div>
                    <button
                      onClick={() => setWithdrawAmount(vaultStatus?.userDeposit.toFixed(4) || "0")}
                      className="mt-1 text-xs text-yellow-400 hover:text-yellow-300"
                    >
                      Max: {vaultStatus?.userDeposit.toFixed(4) || "0"} SOL
                    </button>
                  </div>
                </div>
              </div>

              {/* Agent Activity */}
              <AgentActivity />

              {/* Validator Targets */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Validator Targets</h2>
                <p className="text-gray-400 text-sm mb-4">
                  The agent stakes to these quality decentralized validators
                </p>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={rec.validator} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium">{rec.validatorName}</div>
                          <div className="text-xs text-gray-400 font-mono">
                            {rec.validator.slice(0, 8)}...{rec.validator.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-medium">{rec.expectedApy.toFixed(2)}% APY</div>
                        <div className="text-xs text-gray-400">Score: {rec.wizScore.toFixed(0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* How it Works */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">How it Works</h2>
                <div className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">1</div>
                    <div>
                      <div className="font-medium">Deposit SOL</div>
                      <div className="text-gray-400">Transfer SOL to the vault</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">2</div>
                    <div>
                      <div className="font-medium">Agent Stakes</div>
                      <div className="text-gray-400">AI agent stakes to quality validators</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">3</div>
                    <div>
                      <div className="font-medium">Earn Rewards</div>
                      <div className="text-gray-400">Get staking + MEV rewards</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center flex-shrink-0">4</div>
                    <div>
                      <div className="font-medium">Unstake Anytime</div>
                      <div className="text-gray-400">~2 day cooldown period</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validator Criteria */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Validator Criteria</h2>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Stake &lt; 1M SOL (decentralization)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Commission ≤ 5%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> MEV Commission ≤ 10%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Uptime &gt; 95%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Always includes Staker Space
                  </li>
                </ul>
              </div>

              {/* Vault Address */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Vault Info</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-gray-400">Network</div>
                    <div className="font-mono text-yellow-400">Devnet</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Vault Address</div>
                    <a
                      href={`https://explorer.solana.com/address/${VAULT_PDA.toBase58()}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-400 hover:underline break-all"
                    >
                      {VAULT_PDA.toBase58().slice(0, 16)}...
                    </a>
                  </div>
                  <div>
                    <div className="text-gray-400">Program</div>
                    <a
                      href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-400 hover:underline break-all"
                    >
                      {PROGRAM_ID.toBase58().slice(0, 16)}...
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
