"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

interface StakePosition {
  validator: string;
  validatorName: string;
  amount: number;
  apy: number;
  stakedAt: string;
}

interface AgentActivity {
  action: string;
  details: string;
  timestamp: string;
  txSignature?: string;
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const [vaultBalance, setVaultBalance] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected && publicKey) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // In production, this would fetch from chain
      // For now, we'll use mock data for the demo
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data for demo
      setVaultBalance(12.5);
      setTotalStaked(87.5);
      setPositions([
        {
          validator: "J2nUH...",
          validatorName: "Helius",
          amount: 25,
          apy: 7.8,
          stakedAt: "2026-02-01",
        },
        {
          validator: "mrgn2...",
          validatorName: "marginfi",
          amount: 30,
          apy: 7.5,
          stakedAt: "2026-02-01",
        },
        {
          validator: "Cube1...",
          validatorName: "Cubik",
          amount: 32.5,
          apy: 8.1,
          stakedAt: "2026-02-02",
        },
      ]);
      setActivities([
        {
          action: "Stake",
          details: "Staked 32.5 SOL to Cubik validator",
          timestamp: "2026-02-02 14:30",
          txSignature: "3xK2j...",
        },
        {
          action: "Rebalance",
          details: "Moved 5 SOL from Jito to marginfi (better APY)",
          timestamp: "2026-02-01 22:15",
          txSignature: "7mNp2...",
        },
        {
          action: "Stake",
          details: "Initial stake of 55 SOL across 2 validators",
          timestamp: "2026-02-01 10:00",
          txSignature: "9xQr4...",
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = vaultBalance + totalStaked;
  const avgApy = positions.length > 0 
    ? positions.reduce((sum, p) => sum + p.apy * p.amount, 0) / totalStaked 
    : 0;

  if (!connected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Connect Wallet</h1>
          <p className="text-white/60 mb-6">Connect your wallet to view your dashboard</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-white/60">Your vault performance at a glance</p>
          </div>
          <Link 
            href="/vault"
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold transition"
          >
            Manage Vault
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-white/40 text-sm mb-1">Total Value</p>
                <p className="text-2xl font-bold">{totalValue.toFixed(2)} SOL</p>
                <p className="text-xs text-white/40 mt-1">~${(totalValue * 120).toFixed(0)} USD</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-white/40 text-sm mb-1">Staked</p>
                <p className="text-2xl font-bold text-emerald-400">{totalStaked.toFixed(2)} SOL</p>
                <p className="text-xs text-white/40 mt-1">{((totalStaked / totalValue) * 100).toFixed(0)}% deployed</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-white/40 text-sm mb-1">Available</p>
                <p className="text-2xl font-bold">{vaultBalance.toFixed(2)} SOL</p>
                <p className="text-xs text-white/40 mt-1">Ready to stake</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-white/40 text-sm mb-1">Avg APY</p>
                <p className="text-2xl font-bold text-emerald-400">{avgApy.toFixed(1)}%</p>
                <p className="text-xs text-white/40 mt-1">Weighted average</p>
              </div>
            </div>

            {/* Positions */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Stake Positions</h2>
              
              {positions.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p>No stake positions yet</p>
                  <p className="text-sm mt-2">The agent will start staking based on your strategy</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((position, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between bg-black/30 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">
                          {position.validatorName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold">{position.validatorName}</p>
                          <p className="text-sm text-white/40">{position.validator}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{position.amount.toFixed(2)} SOL</p>
                        <p className="text-sm text-emerald-400">{position.apy.toFixed(1)}% APY</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Agent Activity</h2>
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Agent Active
                </div>
              </div>
              
              {activities.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p>No activity yet</p>
                  <p className="text-sm mt-2">Agent is monitoring validators...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, i) => (
                    <div 
                      key={i}
                      className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0"
                    >
                      <div className={`
                        px-2 py-1 rounded text-xs font-bold
                        ${activity.action === 'Stake' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                        ${activity.action === 'Unstake' ? 'bg-red-500/20 text-red-400' : ''}
                        ${activity.action === 'Rebalance' ? 'bg-blue-500/20 text-blue-400' : ''}
                      `}>
                        {activity.action}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.details}</p>
                        <p className="text-xs text-white/40 mt-1">{activity.timestamp}</p>
                      </div>
                      {activity.txSignature && (
                        <a 
                          href={`https://solscan.io/tx/${activity.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          View TX
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Projected Earnings */}
            <div className="mt-8 bg-gradient-to-r from-emerald-900/20 to-transparent border border-emerald-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-2">Projected Earnings</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {((totalStaked * avgApy / 100) / 12).toFixed(3)} SOL
                  </p>
                  <p className="text-sm text-white/40">Per Month</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {(totalStaked * avgApy / 100).toFixed(2)} SOL
                  </p>
                  <p className="text-sm text-white/40">Per Year</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    ${((totalStaked * avgApy / 100) * 120).toFixed(0)}
                  </p>
                  <p className="text-sm text-white/40">Yearly (USD)</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
