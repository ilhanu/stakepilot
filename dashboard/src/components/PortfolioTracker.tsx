"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  uiAmount: number;
  valueInSol: number;
  apy: number;
  mevShare: boolean;
}

interface StakeAccount {
  pubkey: string;
  validator: string;
  validatorName?: string;
  stake: number;
  rewards: number;
  epoch: number;
}

interface PortfolioData {
  solBalance: number;
  lstBalances: TokenBalance[];
  stakeAccounts: StakeAccount[];
  totalStakedValue: number;
  projectedAnnualYield: number;
  optimizations: Optimization[];
}

interface Optimization {
  id: string;
  type: "switch_lst" | "rebalance" | "compound" | "unstake_inactive";
  title: string;
  description: string;
  potentialGain: number;
  potentialGainPercent: number;
  risk: "low" | "medium" | "high";
  action: string;
}

const LST_MINTS = {
  jitoSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  mSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  bSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  INF: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
};

const SOL_PRICE = 150;

export function PortfolioTracker() {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      fetchPortfolio();
    } else {
      setPortfolio(null);
    }
  }, [connected, publicKey]);

  const fetchPortfolio = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    setError(null);

    try {
      // For demo, use mock data that shows real value
      // In production, this would fetch from RPC + parse token accounts
      const mockPortfolio: PortfolioData = generateMockPortfolio(publicKey.toString());
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setPortfolio(mockPortfolio);
    } catch (err) {
      setError("Failed to load portfolio data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return null; // Don't render if wallet not connected
  }

  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-900/30 to-blue-900/30 pb-4">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">💼</span> Your Portfolio
        </CardTitle>
        <p className="text-sm text-gray-400">
          Complete overview of your staking positions and optimization opportunities
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Analyzing your positions...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : portfolio ? (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Staked</p>
                <p className="text-2xl font-bold text-white">
                  {portfolio.totalStakedValue.toFixed(2)} SOL
                </p>
                <p className="text-xs text-gray-500">
                  ≈ ${(portfolio.totalStakedValue * SOL_PRICE).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Projected Annual Yield</p>
                <p className="text-2xl font-bold text-green-400">
                  {portfolio.projectedAnnualYield.toFixed(2)} SOL
                </p>
                <p className="text-xs text-gray-500">
                  ≈ ${(portfolio.projectedAnnualYield * SOL_PRICE).toLocaleString()}/yr
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Avg Effective APY</p>
                <p className="text-2xl font-bold text-blue-400">
                  {portfolio.totalStakedValue > 0 
                    ? ((portfolio.projectedAnnualYield / portfolio.totalStakedValue) * 100).toFixed(2)
                    : 0}%
                </p>
                <p className="text-xs text-gray-500">
                  Weighted across all positions
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Available SOL</p>
                <p className="text-2xl font-bold text-gray-300">
                  {portfolio.solBalance.toFixed(2)} SOL
                </p>
                <p className="text-xs text-gray-500">
                  Not staked
                </p>
              </div>
            </div>

            {/* Portfolio Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LST Holdings */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span>🪙</span> Liquid Staking Tokens
                </h3>
                <div className="space-y-2">
                  {portfolio.lstBalances.length > 0 ? (
                    portfolio.lstBalances.map((token) => (
                      <div
                        key={token.mint}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                            {token.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{token.symbol}</p>
                            <p className="text-xs text-gray-500">{token.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{token.uiAmount.toFixed(4)}</p>
                          <p className="text-xs text-gray-500">
                            ≈ {token.valueInSol.toFixed(2)} SOL
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={token.mevShare ? "success" : "secondary"}>
                            {token.apy.toFixed(1)}% APY
                          </Badge>
                          {token.mevShare && (
                            <p className="text-xs text-green-400 mt-1">+MEV</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No LST holdings found
                    </div>
                  )}
                </div>
              </div>

              {/* Native Stake Accounts */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span>🔒</span> Native Stake Accounts
                </h3>
                <div className="space-y-2">
                  {portfolio.stakeAccounts.length > 0 ? (
                    portfolio.stakeAccounts.map((account) => (
                      <div
                        key={account.pubkey}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/50"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {account.validatorName || "Unknown Validator"}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {account.validator.slice(0, 8)}...{account.validator.slice(-6)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{account.stake.toFixed(2)} SOL</p>
                          <p className="text-xs text-green-400">
                            +{account.rewards.toFixed(4)} rewards
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No native stake accounts found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Allocation Chart (Visual) */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>📊</span> Allocation
              </h3>
              <div className="h-6 rounded-full overflow-hidden flex bg-gray-800">
                {portfolio.lstBalances.map((token, i) => {
                  const percent = (token.valueInSol / portfolio.totalStakedValue) * 100;
                  const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500"];
                  return (
                    <div
                      key={token.mint}
                      className={`${colors[i % colors.length]} flex items-center justify-center text-xs font-medium transition-all hover:opacity-80`}
                      style={{ width: `${percent}%` }}
                      title={`${token.symbol}: ${percent.toFixed(1)}%`}
                    >
                      {percent > 10 ? token.symbol : ""}
                    </div>
                  );
                })}
                {portfolio.stakeAccounts.length > 0 && (
                  <div
                    className="bg-orange-500 flex items-center justify-center text-xs font-medium"
                    style={{
                      width: `${(portfolio.stakeAccounts.reduce((s, a) => s + a.stake, 0) / portfolio.totalStakedValue) * 100}%`,
                    }}
                    title="Native Stake"
                  >
                    Native
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {portfolio.lstBalances.map((token, i) => {
                  const percent = (token.valueInSol / portfolio.totalStakedValue) * 100;
                  const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500"];
                  return (
                    <div key={token.mint} className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`}></div>
                      <span className="text-gray-400">{token.symbol}</span>
                      <span className="font-medium">{percent.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optimization Suggestions */}
            {portfolio.optimizations.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span>💡</span> Optimization Opportunities
                </h3>
                <div className="space-y-3">
                  {portfolio.optimizations.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-4 rounded-lg border ${
                        opt.risk === "low"
                          ? "bg-green-900/10 border-green-800/50"
                          : opt.risk === "medium"
                          ? "bg-yellow-900/10 border-yellow-800/50"
                          : "bg-red-900/10 border-red-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {opt.type === "switch_lst" ? "🔄" : 
                             opt.type === "rebalance" ? "⚖️" :
                             opt.type === "compound" ? "🔁" : "📤"}
                          </span>
                          <span className="font-medium">{opt.title}</span>
                          <Badge variant={opt.risk === "low" ? "success" : opt.risk === "medium" ? "warning" : "destructive"}>
                            {opt.risk} risk
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-semibold">
                            +{opt.potentialGain.toFixed(2)} SOL/yr
                          </p>
                          <p className="text-xs text-gray-500">
                            +{opt.potentialGainPercent.toFixed(1)}% yield
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{opt.description}</p>
                      <button
                        className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={() => alert("Coming soon: Auto-execute optimizations!")}
                      >
                        {opt.action} →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Connect your wallet to see your portfolio
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Generate mock portfolio data based on wallet address
function generateMockPortfolio(walletAddress: string): PortfolioData {
  // Use wallet address to generate consistent "random" data
  const seed = walletAddress.charCodeAt(0) + walletAddress.charCodeAt(walletAddress.length - 1);
  
  const hasJito = seed % 2 === 0;
  const hasMsol = seed % 3 !== 0;
  const hasNative = seed % 4 === 0;
  
  const lstBalances: TokenBalance[] = [];
  
  if (hasJito) {
    lstBalances.push({
      mint: LST_MINTS.jitoSOL,
      symbol: "jitoSOL",
      name: "Jito Staked SOL",
      amount: (50 + (seed * 3.7)) * 1e9,
      uiAmount: 50 + (seed % 100),
      valueInSol: (50 + (seed % 100)) * 1.25,
      apy: 8.2,
      mevShare: true,
    });
  }
  
  if (hasMsol) {
    lstBalances.push({
      mint: LST_MINTS.mSOL,
      symbol: "mSOL",
      name: "Marinade Staked SOL",
      amount: (30 + (seed * 2.1)) * 1e9,
      uiAmount: 30 + (seed % 50),
      valueInSol: (30 + (seed % 50)) * 1.22,
      apy: 7.1,
      mevShare: false,
    });
  }
  
  const stakeAccounts: StakeAccount[] = [];
  if (hasNative) {
    stakeAccounts.push({
      pubkey: `${walletAddress.slice(0, 8)}stake1`,
      validator: "7K8DVxtNJGnMtUY1CQJT5jcs8sFGSZTDiG7kowvFpECh",
      validatorName: "Everstake",
      stake: 100 + (seed % 200),
      rewards: 0.5 + (seed % 10) * 0.1,
      epoch: 741,
    });
  }
  
  const totalStaked = 
    lstBalances.reduce((sum, t) => sum + t.valueInSol, 0) +
    stakeAccounts.reduce((sum, a) => sum + a.stake, 0);
  
  const projectedYield = lstBalances.reduce((sum, t) => sum + (t.valueInSol * t.apy / 100), 0) +
    stakeAccounts.reduce((sum, a) => sum + (a.stake * 0.065), 0); // 6.5% native APY
  
  const optimizations: Optimization[] = [];
  
  // Suggest switching from mSOL to jitoSOL
  if (hasMsol && !hasJito) {
    const msolAmount = lstBalances.find(t => t.symbol === "mSOL")!.valueInSol;
    optimizations.push({
      id: "switch-to-jito",
      type: "switch_lst",
      title: "Switch mSOL to jitoSOL",
      description: `Moving ${msolAmount.toFixed(0)} SOL from mSOL to jitoSOL gives you full MEV exposure and ~1.1% higher APY.`,
      potentialGain: msolAmount * 0.011,
      potentialGainPercent: 1.1,
      risk: "low",
      action: "Preview swap",
    });
  }
  
  // Suggest staking idle SOL
  const solBalance = 10 + (seed % 50);
  if (solBalance > 5) {
    optimizations.push({
      id: "stake-idle",
      type: "rebalance",
      title: "Stake idle SOL",
      description: `You have ${solBalance.toFixed(0)} SOL sitting idle. Stake with jitoSOL to earn ~8% APY + MEV.`,
      potentialGain: solBalance * 0.08,
      potentialGainPercent: 8,
      risk: "low",
      action: "Stake now",
    });
  }
  
  // Compound suggestion
  if (stakeAccounts.length > 0 && stakeAccounts.some(a => a.rewards > 0.5)) {
    const rewardsTotal = stakeAccounts.reduce((sum, a) => sum + a.rewards, 0);
    optimizations.push({
      id: "compound-rewards",
      type: "compound",
      title: "Compound staking rewards",
      description: `You have ${rewardsTotal.toFixed(2)} SOL in unclaimed rewards. Restake to maximize compounding.`,
      potentialGain: rewardsTotal * 0.08 * (1 / 12), // Monthly gain from restaking
      potentialGainPercent: 0.7,
      risk: "low",
      action: "Compound",
    });
  }
  
  return {
    solBalance,
    lstBalances,
    stakeAccounts,
    totalStakedValue: totalStaked,
    projectedAnnualYield: projectedYield,
    optimizations,
  };
}
