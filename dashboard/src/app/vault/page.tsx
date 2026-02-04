"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";

// Types
interface VaultData {
  owner: string;
  agent: string;
  balance: number;
  totalStaked: number;
}

interface StrategyData {
  riskTolerance: "Low" | "Medium" | "High";
  targetApy: number;
  maxValidators: number;
  preferDecentralization: boolean;
}

export default function VaultPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  
  // Strategy form state
  const [riskTolerance, setRiskTolerance] = useState<"Low" | "Medium" | "High">("Medium");
  const [targetApy, setTargetApy] = useState(8);
  const [maxValidators, setMaxValidators] = useState(5);
  const [preferDecentralization, setPreferDecentralization] = useState(true);

  // Fetch vault data
  useEffect(() => {
    if (connected && publicKey) {
      fetchVaultData();
    }
  }, [connected, publicKey]);

  const fetchVaultData = async () => {
    if (!publicKey) return;
    
    try {
      const res = await fetch(`/api/vault/status?owner=${publicKey.toBase58()}`);
      const data = await res.json();
      
      if (data.vault) {
        setVault(data.vault);
        setStrategy(data.strategy);
        
        // Update form with current strategy
        if (data.strategy) {
          setRiskTolerance(data.strategy.riskTolerance);
          setTargetApy(data.strategy.targetApy / 100);
          setMaxValidators(data.strategy.maxValidators);
          setPreferDecentralization(data.strategy.preferDecentralization);
        }
      }
    } catch (error) {
      console.error("Failed to fetch vault:", error);
    }
  };

  const handleCreateVault = async () => {
    if (!publicKey || !signTransaction) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/vault/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: publicKey.toBase58() }),
      });
      
      const { transaction } = await res.json();
      // Sign and send transaction...
      
      await fetchVaultData();
    } catch (error) {
      console.error("Failed to create vault:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!publicKey || !signTransaction || !depositAmount) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/vault/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: publicKey.toBase58(),
          amount: parseFloat(depositAmount),
        }),
      });
      
      const { transaction } = await res.json();
      // Sign and send transaction...
      
      await fetchVaultData();
      setDepositAmount("");
    } catch (error) {
      console.error("Failed to deposit:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !withdrawAmount) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/vault/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: publicKey.toBase58(),
          amount: parseFloat(withdrawAmount),
        }),
      });
      
      const { transaction } = await res.json();
      // Sign and send transaction...
      
      await fetchVaultData();
      setWithdrawAmount("");
    } catch (error) {
      console.error("Failed to withdraw:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStrategy = async () => {
    if (!publicKey || !signTransaction) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/vault/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: publicKey.toBase58(),
          riskTolerance,
          targetApy: targetApy * 100, // Convert to basis points
          maxValidators,
          preferDecentralization,
        }),
      });
      
      const { transaction } = await res.json();
      // Sign and send transaction...
      
      await fetchVaultData();
    } catch (error) {
      console.error("Failed to update strategy:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-emerald-400">
            StakePilot
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/vault" className="text-emerald-400 font-medium">
              Vault
            </Link>
            <Link href="/dashboard" className="text-white/60 hover:text-white">
              Dashboard
            </Link>
            <WalletMultiButton />
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Agent Vault</h1>
        <p className="text-white/60 mb-8">
          Autonomous staking controlled by AI. You set the strategy, agent executes.
        </p>

        {!connected ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
            <p className="text-white/60 mb-6">
              Connect your wallet to create or access your vault
            </p>
            <WalletMultiButton />
          </div>
        ) : !vault ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Create Your Vault</h2>
            <p className="text-white/60 mb-6">
              Set up your personal staking vault. You control the strategy, the agent executes.
            </p>
            <button
              onClick={handleCreateVault}
              disabled={loading}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Vault"}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Vault Overview */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Vault Overview</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-white/40 text-sm mb-1">Available Balance</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {vault.balance.toFixed(4)} SOL
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-sm mb-1">Total Staked</p>
                  <p className="text-3xl font-bold text-white">
                    {vault.totalStaked.toFixed(4)} SOL
                  </p>
                </div>
              </div>
            </div>

            {/* Deposit / Withdraw */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold mb-4">Deposit SOL</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount in SOL"
                    className="flex-1 px-4 py-3 bg-black border border-white/20 rounded-xl focus:border-emerald-500 outline-none"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={loading || !depositAmount}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition disabled:opacity-50"
                  >
                    Deposit
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold mb-4">Withdraw SOL</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Amount in SOL"
                    className="flex-1 px-4 py-3 bg-black border border-white/20 rounded-xl focus:border-emerald-500 outline-none"
                  />
                  <button
                    onClick={handleWithdraw}
                    disabled={loading || !withdrawAmount}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </div>

            {/* Strategy Configuration */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6">Strategy Configuration</h2>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Risk Tolerance
                  </label>
                  <select
                    value={riskTolerance}
                    onChange={(e) => setRiskTolerance(e.target.value as any)}
                    className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl focus:border-emerald-500 outline-none"
                  >
                    <option value="Low">Low (Conservative)</option>
                    <option value="Medium">Medium (Balanced)</option>
                    <option value="High">High (Aggressive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Target APY: {targetApy}%
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="15"
                    step="0.5"
                    value={targetApy}
                    onChange={(e) => setTargetApy(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    Max Validators: {maxValidators}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={maxValidators}
                    onChange={(e) => setMaxValidators(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferDecentralization}
                      onChange={(e) => setPreferDecentralization(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500"
                    />
                    <span>Prefer Decentralization</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleUpdateStrategy}
                disabled={loading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Strategy"}
              </button>
            </div>

            {/* Agent Info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Agent Status</h2>
              <div className="flex items-center gap-3 text-white/60">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span>Agent is monitoring your vault and will execute staking based on your strategy</span>
              </div>
              <p className="text-sm text-white/40 mt-4">
                Agent: {vault.agent.slice(0, 8)}...{vault.agent.slice(-8)}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
