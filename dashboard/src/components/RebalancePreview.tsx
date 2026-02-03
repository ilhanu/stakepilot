"use client";

import { useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Allocation {
  asset: string;
  symbol: string;
  currentAmount: number;
  currentPercent: number;
  targetAmount: number;
  targetPercent: number;
  apy: number;
  change: number;
  color: string;
}

interface RebalanceStats {
  currentYield: number;
  projectedYield: number;
  yieldImprovement: number;
  yieldImprovementPercent: number;
  totalValue: number;
  riskScore: number;
  diversificationScore: number;
}

const STRATEGIES = [
  { id: "max_yield", name: "Maximum Yield", description: "100% jitoSOL for maximum MEV exposure", icon: "🚀" },
  { id: "balanced", name: "Balanced", description: "60% jitoSOL / 40% mSOL for diversification", icon: "⚖️" },
  { id: "conservative", name: "Conservative", description: "Mix of LSTs with liquidity focus", icon: "🛡️" },
  { id: "custom", name: "Custom", description: "Set your own allocation targets", icon: "🎛️" },
];

const ASSETS = [
  { id: "jito", name: "jitoSOL", apy: 8.2, mev: true, color: "bg-blue-500" },
  { id: "msol", name: "mSOL", apy: 7.1, mev: false, color: "bg-purple-500" },
  { id: "bsol", name: "bSOL", apy: 7.4, mev: true, color: "bg-green-500" },
  { id: "native", name: "Native Stake", apy: 6.5, mev: false, color: "bg-orange-500" },
];

const SOL_PRICE = 150;

export function RebalancePreview() {
  const { connected } = useWallet();
  const [selectedStrategy, setSelectedStrategy] = useState("max_yield");
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({
    jito: 60,
    msol: 40,
    bsol: 0,
    native: 0,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simulated current portfolio
  const currentPortfolio = useMemo(() => ({
    jito: { amount: 45, percent: 30 },
    msol: { amount: 60, percent: 40 },
    bsol: { amount: 0, percent: 0 },
    native: { amount: 45, percent: 30 },
    total: 150,
  }), []);

  const targetAllocations = useMemo(() => {
    switch (selectedStrategy) {
      case "max_yield":
        return { jito: 100, msol: 0, bsol: 0, native: 0 };
      case "balanced":
        return { jito: 60, msol: 40, bsol: 0, native: 0 };
      case "conservative":
        return { jito: 40, msol: 30, bsol: 20, native: 10 };
      case "custom":
        return customAllocations;
      default:
        return { jito: 100, msol: 0, bsol: 0, native: 0 };
    }
  }, [selectedStrategy, customAllocations]);

  const allocations: Allocation[] = useMemo(() => {
    const total = currentPortfolio.total;
    return ASSETS.map((asset) => {
      const current = currentPortfolio[asset.id as keyof typeof currentPortfolio];
      const currentAmount = typeof current === "object" ? current.amount : 0;
      const currentPercent = typeof current === "object" ? current.percent : 0;
      const targetPercent = targetAllocations[asset.id as keyof typeof targetAllocations];
      const targetAmount = (total * targetPercent) / 100;
      
      return {
        asset: asset.name,
        symbol: asset.id,
        currentAmount,
        currentPercent,
        targetAmount,
        targetPercent,
        apy: asset.apy,
        change: targetAmount - currentAmount,
        color: asset.color,
      };
    });
  }, [currentPortfolio, targetAllocations]);

  const stats: RebalanceStats = useMemo(() => {
    const total = currentPortfolio.total;
    
    const currentYield = ASSETS.reduce((sum, asset) => {
      const current = currentPortfolio[asset.id as keyof typeof currentPortfolio];
      const amount = typeof current === "object" ? current.amount : 0;
      return sum + (amount * asset.apy / 100);
    }, 0);
    
    const projectedYield = ASSETS.reduce((sum, asset) => {
      const targetPercent = targetAllocations[asset.id as keyof typeof targetAllocations];
      const targetAmount = (total * targetPercent) / 100;
      return sum + (targetAmount * asset.apy / 100);
    }, 0);
    
    const yieldImprovement = projectedYield - currentYield;
    const yieldImprovementPercent = (yieldImprovement / currentYield) * 100;
    
    // Risk score: lower concentration = lower risk
    const maxAllocation = Math.max(...Object.values(targetAllocations));
    const riskScore = maxAllocation <= 50 ? 1 : maxAllocation <= 80 ? 2 : 3;
    
    // Diversification: more assets = higher score
    const activeAssets = Object.values(targetAllocations).filter(v => v > 0).length;
    const diversificationScore = activeAssets;
    
    return {
      currentYield,
      projectedYield,
      yieldImprovement,
      yieldImprovementPercent,
      totalValue: total,
      riskScore,
      diversificationScore,
    };
  }, [currentPortfolio, targetAllocations]);

  if (!connected) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-900/30 to-red-900/30">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span> Auto-Rebalance Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-gray-400 mb-4">
            Connect your wallet to see rebalancing opportunities
          </p>
          <p className="text-sm text-gray-500">
            We'll analyze your current positions and suggest optimal allocations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-900/30 to-red-900/30">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">⚖️</span> Auto-Rebalance Preview
          <Badge variant="outline" className="ml-2">Preview Only</Badge>
        </CardTitle>
        <p className="text-sm text-gray-400">
          See how rebalancing could optimize your yield. Execution coming Phase 2.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-8">
          {/* Strategy Selection */}
          <div>
            <h3 className="font-semibold mb-3">Select Strategy</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {STRATEGIES.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={`p-4 rounded-lg text-left transition-all ${
                    selectedStrategy === strategy.id
                      ? "bg-gradient-to-br from-blue-600/50 to-purple-600/50 border-2 border-blue-500"
                      : "bg-gray-800/50 border border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <div className="text-2xl mb-2">{strategy.icon}</div>
                  <div className="font-medium">{strategy.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{strategy.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Allocation Sliders */}
          {selectedStrategy === "custom" && (
            <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
              <h4 className="font-medium mb-4">Custom Allocation</h4>
              <div className="space-y-4">
                {ASSETS.map((asset) => (
                  <div key={asset.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{asset.name}</span>
                      <span className="text-sm font-medium">
                        {customAllocations[asset.id]}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={customAllocations[asset.id]}
                      onChange={(e) => {
                        const newValue = Number(e.target.value);
                        const otherTotal = Object.entries(customAllocations)
                          .filter(([k]) => k !== asset.id)
                          .reduce((sum, [, v]) => sum + v, 0);
                        
                        // Adjust if total exceeds 100%
                        if (newValue + otherTotal <= 100) {
                          setCustomAllocations(prev => ({
                            ...prev,
                            [asset.id]: newValue,
                          }));
                        }
                      }}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                ))}
                <div className="text-sm text-gray-400 text-right">
                  Total: {Object.values(customAllocations).reduce((a, b) => a + b, 0)}%
                </div>
              </div>
            </div>
          )}

          {/* Allocation Visualization */}
          <div>
            <h3 className="font-semibold mb-3">Allocation Comparison</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Current */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Current</p>
                <div className="h-8 rounded-full overflow-hidden flex bg-gray-800 mb-2">
                  {allocations.map((alloc) => (
                    alloc.currentPercent > 0 && (
                      <div
                        key={`current-${alloc.symbol}`}
                        className={`${alloc.color} flex items-center justify-center text-xs font-medium`}
                        style={{ width: `${alloc.currentPercent}%` }}
                      >
                        {alloc.currentPercent >= 15 ? `${alloc.currentPercent}%` : ""}
                      </div>
                    )
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Est. yield: {stats.currentYield.toFixed(2)} SOL/yr
                </p>
              </div>
              
              {/* Target */}
              <div>
                <p className="text-sm text-gray-400 mb-2">After Rebalance</p>
                <div className="h-8 rounded-full overflow-hidden flex bg-gray-800 mb-2">
                  {allocations.map((alloc) => (
                    alloc.targetPercent > 0 && (
                      <div
                        key={`target-${alloc.symbol}`}
                        className={`${alloc.color} flex items-center justify-center text-xs font-medium`}
                        style={{ width: `${alloc.targetPercent}%` }}
                      >
                        {alloc.targetPercent >= 15 ? `${alloc.targetPercent}%` : ""}
                      </div>
                    )
                  ))}
                </div>
                <p className="text-sm text-green-400">
                  Est. yield: {stats.projectedYield.toFixed(2)} SOL/yr
                  <span className="text-green-500 ml-2">
                    (+{stats.yieldImprovement.toFixed(2)})
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Required Transactions */}
          <div>
            <h3 className="font-semibold mb-3">Required Moves</h3>
            <div className="space-y-2">
              {allocations
                .filter((a) => Math.abs(a.change) > 0.01)
                .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                .map((alloc) => (
                  <div
                    key={alloc.symbol}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      alloc.change > 0
                        ? "bg-green-900/20 border border-green-800/50"
                        : "bg-red-900/20 border border-red-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${alloc.color} flex items-center justify-center text-xs font-bold`}>
                        {alloc.asset.slice(0, 2)}
                      </div>
                      <span className="font-medium">{alloc.asset}</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${alloc.change > 0 ? "text-green-400" : "text-red-400"}`}>
                        {alloc.change > 0 ? "+" : ""}{alloc.change.toFixed(2)} SOL
                      </p>
                      <p className="text-xs text-gray-500">
                        {alloc.currentPercent}% → {alloc.targetPercent}%
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Yield Improvement</p>
              <p className="text-2xl font-bold text-green-400">
                +{stats.yieldImprovementPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                +{stats.yieldImprovement.toFixed(2)} SOL/yr
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Extra Annual Earnings</p>
              <p className="text-2xl font-bold text-green-400">
                ${(stats.yieldImprovement * SOL_PRICE).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">at current prices</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Risk Level</p>
              <p className="text-2xl font-bold">
                {stats.riskScore === 1 ? "🟢" : stats.riskScore === 2 ? "🟡" : "🔴"}
                {stats.riskScore === 1 ? " Low" : stats.riskScore === 2 ? " Med" : " High"}
              </p>
              <p className="text-xs text-gray-500">Concentration risk</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Diversification</p>
              <p className="text-2xl font-bold">
                {stats.diversificationScore}/4
              </p>
              <p className="text-xs text-gray-500">Assets used</p>
            </div>
          </div>

          {/* CTA */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <span>🚀</span> Ready to Rebalance?
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  Execution coming in Phase 2. For now, use these insights to manually optimize.
                </p>
              </div>
              <button
                disabled
                className="px-6 py-3 rounded-lg bg-gray-700 text-gray-400 cursor-not-allowed font-medium"
              >
                Execute (Coming Soon)
              </button>
            </div>
          </div>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showAdvanced ? "▼ Hide" : "▶ Show"} Advanced Details
          </button>

          {showAdvanced && (
            <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700 text-sm">
              <h4 className="font-medium mb-3">Transaction Breakdown</h4>
              <ul className="space-y-2 text-gray-400">
                <li>• Unstake/convert from lower-yield positions</li>
                <li>• Route through Jupiter for best swap rates</li>
                <li>• Estimated gas: ~0.01 SOL total</li>
                <li>• Slippage: &lt;0.5% expected</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-900/20 rounded border border-yellow-800/50">
                <p className="text-yellow-400 text-xs">
                  ⚠️ Rebalancing involves swaps which may incur slippage. Always review before executing.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
