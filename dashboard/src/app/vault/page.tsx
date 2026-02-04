"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface VaultData {
  balance: number;
  totalStaked: number;
  owner: string;
  agent: string;
}

interface StrategyData {
  riskTolerance: "Low" | "Medium" | "High";
  targetApy: number;
  maxValidators: number;
  preferDecentralization: boolean;
}

type TabType = "deposit" | "withdraw" | "strategy";

// ============================================
// COMPONENT
// ============================================

export default function VaultPage() {
  const { publicKey, connected, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  // Data state
  const [vault, setVault] = useState<VaultData | null>(null);
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [vaultExists, setVaultExists] = useState<boolean | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("deposit");

  // Form state
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [riskTolerance, setRiskTolerance] = useState<"Low" | "Medium" | "High">("Medium");
  const [targetApy, setTargetApy] = useState(8);
  const [maxValidators, setMaxValidators] = useState(5);
  const [preferDecentralization, setPreferDecentralization] = useState(true);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchData = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch wallet balance
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);

      // Fetch vault status
      const res = await fetch(`/api/vault/status?owner=${publicKey.toBase58()}`);
      const data = await res.json();

      if (data.exists && data.vault) {
        setVault(data.vault);
        setStrategy(data.strategy);
        setVaultExists(true);

        // Populate form with current strategy
        if (data.strategy) {
          setRiskTolerance(data.strategy.riskTolerance);
          setTargetApy(data.strategy.targetApy / 100);
          setMaxValidators(data.strategy.maxValidators);
          setPreferDecentralization(data.strategy.preferDecentralization);
        }
      } else {
        setVault(null);
        setStrategy(null);
        setVaultExists(false);
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
      setVaultExists(null);
    }
  }, [connected, publicKey, fetchData]);

  // ============================================
  // TRANSACTION HANDLERS
  // ============================================

  const buildAndSendTx = async (action: string, params: any = {}) => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    // Build transaction
    const res = await fetch("/api/vault/build-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        owner: publicKey.toBase58(),
        ...params,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to build transaction");
    }

    const { transaction: txBase64, blockhash } = await res.json();

    // Deserialize and sign
    const tx = Transaction.from(Buffer.from(txBase64, "base64"));
    const signedTx = await signTransaction(tx);

    // Send
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    // Confirm
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
    });

    return signature;
  };

  const handleCreateVault = async () => {
    setTxLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const sig = await buildAndSendTx("initialize");
      setSuccess(`Vault created! TX: ${sig.slice(0, 8)}...`);
      await fetchData();
    } catch (err) {
      console.error("Create vault failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create vault");
    } finally {
      setTxLoading(false);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setTxLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const sig = await buildAndSendTx("deposit", { amount });
      setSuccess(`Deposited ${amount} SOL! TX: ${sig.slice(0, 8)}...`);
      setDepositAmount("");
      await fetchData();
    } catch (err) {
      console.error("Deposit failed:", err);
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setTxLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setTxLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const sig = await buildAndSendTx("withdraw", { amount });
      setSuccess(`Withdrew ${amount} SOL! TX: ${sig.slice(0, 8)}...`);
      setWithdrawAmount("");
      await fetchData();
    } catch (err) {
      console.error("Withdraw failed:", err);
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setTxLoading(false);
    }
  };

  const handleUpdateStrategy = async () => {
    setTxLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const sig = await buildAndSendTx("update_strategy", {
        strategy: {
          riskTolerance,
          targetApy: Math.round(targetApy * 100),
          maxValidators,
          preferDecentralization,
        },
      });
      setSuccess(`Strategy updated! TX: ${sig.slice(0, 8)}...`);
      await fetchData();
    } catch (err) {
      console.error("Update strategy failed:", err);
      setError(err instanceof Error ? err.message : "Strategy update failed");
    } finally {
      setTxLoading(false);
    }
  };

  // ============================================
  // RENDER: Not connected
  // ============================================

  if (!connected) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-3">Agent Vault</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Autonomous staking controlled by AI. Connect your wallet to get started.
          </p>
          <WalletMultiButton className="!bg-[var(--accent)] !text-black hover:!bg-[var(--accent-hover)] !rounded-xl !py-4 !px-8 !font-semibold" />
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Loading
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)]">Loading vault...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Create Vault
  // ============================================

  if (vaultExists === false) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="container-lg py-12">
          <div className="max-w-xl mx-auto">
            <div className="card p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-3">Create Your Agent Vault</h1>
              <p className="text-[var(--text-secondary)] mb-6">
                Set up your personal staking vault. You control the strategy, the agent executes optimal staking decisions.
              </p>
              
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 text-left">
                <h3 className="font-medium mb-3 text-sm">How it works:</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">1.</span>
                    Create vault → sets up on-chain accounts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">2.</span>
                    Deposit SOL → funds your vault
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">3.</span>
                    Set strategy → define your preferences
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)]">4.</span>
                    Agent stakes → optimizes based on your strategy
                  </li>
                </ul>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateVault}
                disabled={txLoading}
                className="btn-primary w-full !py-4"
              >
                {txLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Create Vault"
                )}
              </button>

              <p className="text-xs text-[var(--text-muted)] mt-4">
                Wallet balance: {walletBalance.toFixed(4)} SOL
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Vault Management
  // ============================================

  const totalValue = vault ? vault.balance + vault.totalStaked : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="container-lg py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Manage Vault</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm !py-2 !px-4">
            Dashboard →
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">×</button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl text-[var(--accent)] flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-[var(--accent)] hover:opacity-80">×</button>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card p-5">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">Total Value</p>
            <p className="text-2xl font-bold">{totalValue.toFixed(4)} <span className="text-sm text-[var(--text-muted)]">SOL</span></p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">Vault Balance</p>
            <p className="text-2xl font-bold text-[var(--accent)]">{vault?.balance.toFixed(4) || "0"} <span className="text-sm text-[var(--text-muted)]">SOL</span></p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">Staked</p>
            <p className="text-2xl font-bold">{vault?.totalStaked.toFixed(4) || "0"} <span className="text-sm text-[var(--text-muted)]">SOL</span></p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">Wallet</p>
            <p className="text-2xl font-bold">{walletBalance.toFixed(4)} <span className="text-sm text-[var(--text-muted)]">SOL</span></p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Actions */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              {/* Tab Switcher */}
              <div className="flex border-b border-[var(--border)]">
                {(["deposit", "withdraw", "strategy"] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Deposit Tab */}
                {activeTab === "deposit" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Deposit SOL</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                      Add SOL to your vault. The agent will stake it according to your strategy.
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm text-[var(--text-muted)] mb-2">Amount (SOL)</label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none"
                        />
                        <button
                          onClick={() => setDepositAmount((walletBalance * 0.95).toFixed(4))}
                          className="px-4 py-3 text-sm text-[var(--accent)] border border-[var(--border)] rounded-xl hover:bg-[var(--bg-card-hover)]"
                        >
                          Max
                        </button>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        Available: {walletBalance.toFixed(4)} SOL
                      </p>
                    </div>

                    <button
                      onClick={handleDeposit}
                      disabled={txLoading || !depositAmount}
                      className="btn-primary w-full !py-4"
                    >
                      {txLoading ? "Processing..." : "Deposit"}
                    </button>
                  </div>
                )}

                {/* Withdraw Tab */}
                {activeTab === "withdraw" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Withdraw SOL</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                      Withdraw available SOL from your vault. Staked SOL must be unstaked first.
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm text-[var(--text-muted)] mb-2">Amount (SOL)</label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none"
                        />
                        <button
                          onClick={() => setWithdrawAmount((vault?.balance || 0).toFixed(4))}
                          className="px-4 py-3 text-sm text-[var(--accent)] border border-[var(--border)] rounded-xl hover:bg-[var(--bg-card-hover)]"
                        >
                          Max
                        </button>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        Available: {vault?.balance.toFixed(4) || "0"} SOL
                      </p>
                    </div>

                    <button
                      onClick={handleWithdraw}
                      disabled={txLoading || !withdrawAmount}
                      className="btn-secondary w-full !py-4"
                    >
                      {txLoading ? "Processing..." : "Withdraw"}
                    </button>
                  </div>
                )}

                {/* Strategy Tab */}
                {activeTab === "strategy" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Staking Strategy</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                      Configure how the agent should stake your funds.
                    </p>

                    <div className="space-y-6">
                      {/* Risk Tolerance */}
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-2">Risk Tolerance</label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["Low", "Medium", "High"] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => setRiskTolerance(level)}
                              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-colors ${
                                riskTolerance === level
                                  ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]"
                                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-2">
                          {riskTolerance === "Low" && "Only established validators (>1M SOL stake)"}
                          {riskTolerance === "Medium" && "Mix of established and growing validators"}
                          {riskTolerance === "High" && "Maximize APY, accept more variance"}
                        </p>
                      </div>

                      {/* Target APY */}
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-2">
                          Target APY: <span className="text-[var(--accent)]">{targetApy.toFixed(1)}%</span>
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="12"
                          step="0.5"
                          value={targetApy}
                          onChange={(e) => setTargetApy(parseFloat(e.target.value))}
                          className="w-full accent-[var(--accent)]"
                        />
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                          <span>5%</span>
                          <span>12%</span>
                        </div>
                      </div>

                      {/* Max Validators */}
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-2">
                          Max Validators: <span className="text-[var(--accent)]">{maxValidators}</span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={maxValidators}
                          onChange={(e) => setMaxValidators(parseInt(e.target.value))}
                          className="w-full accent-[var(--accent)]"
                        />
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                          <span>1</span>
                          <span>10</span>
                        </div>
                      </div>

                      {/* Decentralization */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferDecentralization}
                            onChange={(e) => setPreferDecentralization(e.target.checked)}
                            className="w-5 h-5 accent-[var(--accent)] rounded"
                          />
                          <span>Prefer decentralization</span>
                        </label>
                        <p className="text-xs text-[var(--text-muted)] mt-2 ml-8">
                          Avoid validators with high datacenter concentration
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleUpdateStrategy}
                      disabled={txLoading}
                      className="btn-primary w-full !py-4 mt-8"
                    >
                      {txLoading ? "Updating..." : "Update Strategy"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div className="space-y-6">
            {/* Current Strategy */}
            {strategy && (
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Current Strategy</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Risk</span>
                    <span className={`${
                      strategy.riskTolerance === "Low" ? "text-blue-400" :
                      strategy.riskTolerance === "Medium" ? "text-yellow-400" : "text-red-400"
                    }`}>{strategy.riskTolerance}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Target APY</span>
                    <span>{(strategy.targetApy / 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Max validators</span>
                    <span>{strategy.maxValidators}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Decentralization</span>
                    <span className={strategy.preferDecentralization ? "text-[var(--accent)]" : ""}>
                      {strategy.preferDecentralization ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Info */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Agent</h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
                <span className="text-sm text-[var(--accent)]">Active</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono break-all">
                {vault?.agent}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-4">
                Agent checks your vault hourly and executes staking based on your strategy.
              </p>
            </div>

            {/* Security Note */}
            <div className="card p-6 border-[var(--accent)]/20 bg-[var(--accent)]/5">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Security
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Agent can stake your funds but can <strong>never withdraw</strong>. Only you can withdraw.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
