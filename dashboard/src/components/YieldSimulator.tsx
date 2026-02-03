"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface YieldSimulatorProps {
  currentJitoApy: number;
  currentMsolApy: number;
  avgMevPerEpoch: number;
}

const SOL_PRICE = 150; // USD
const EPOCHS_PER_YEAR = 146;
const BASE_STAKING_APY = 6.5;

export function YieldSimulator({
  currentJitoApy,
  currentMsolApy,
  avgMevPerEpoch,
}: YieldSimulatorProps) {
  const [amount, setAmount] = useState(100);
  const [duration, setDuration] = useState(12); // months
  const [mevMultiplier, setMevMultiplier] = useState(1); // 1x = average
  const [compoundingFreq, setCompoundingFreq] = useState<"none" | "monthly" | "epoch">("monthly");

  const calculations = useMemo(() => {
    const durationYears = duration / 12;
    const epochsInDuration = Math.floor(EPOCHS_PER_YEAR * durationYears);

    // Compounding calculations
    const getCompoundedValue = (principal: number, apy: number, periods: number) => {
      const rate = apy / 100;
      if (compoundingFreq === "none") {
        return principal * (1 + rate * durationYears);
      } else if (compoundingFreq === "monthly") {
        const monthlyRate = rate / 12;
        return principal * Math.pow(1 + monthlyRate, duration);
      } else {
        // Epoch compounding
        const epochRate = rate / EPOCHS_PER_YEAR;
        return principal * Math.pow(1 + epochRate, epochsInDuration);
      }
    };

    // Native staking (no MEV)
    const nativeStakingValue = getCompoundedValue(amount, BASE_STAKING_APY, duration);
    const nativeStakingYield = nativeStakingValue - amount;

    // mSOL (Marinade) - no MEV share
    const msolValue = getCompoundedValue(amount, currentMsolApy, duration);
    const msolYield = msolValue - amount;

    // jitoSOL - with MEV
    const jitoValue = getCompoundedValue(amount, currentJitoApy, duration);
    const jitoYield = jitoValue - amount;

    // Custom MEV strategy (for "what if" scenarios)
    const customMevApy = BASE_STAKING_APY + (currentJitoApy - BASE_STAKING_APY) * mevMultiplier;
    const customMevValue = getCompoundedValue(amount, customMevApy, duration);
    const customMevYield = customMevValue - amount;

    // Best strategy
    const strategies = [
      { name: "Native Staking", value: nativeStakingValue, yield: nativeStakingYield, apy: BASE_STAKING_APY },
      { name: "mSOL (Marinade)", value: msolValue, yield: msolYield, apy: currentMsolApy },
      { name: "jitoSOL", value: jitoValue, yield: jitoYield, apy: currentJitoApy },
    ];
    const best = strategies.reduce((prev, current) => 
      current.yield > prev.yield ? current : prev
    );

    // Bonus from choosing jitoSOL over native
    const jitoBonus = jitoYield - nativeStakingYield;
    const jitoBonusPercent = ((jitoYield - nativeStakingYield) / nativeStakingYield) * 100;

    return {
      nativeStaking: { value: nativeStakingValue, yield: nativeStakingYield },
      msol: { value: msolValue, yield: msolYield },
      jito: { value: jitoValue, yield: jitoYield },
      customMev: { value: customMevValue, yield: customMevYield, apy: customMevApy },
      best,
      jitoBonus,
      jitoBonusPercent,
      epochsInDuration,
    };
  }, [amount, duration, mevMultiplier, compoundingFreq, currentJitoApy, currentMsolApy]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 pb-4">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🧮</span> Yield Simulator
        </CardTitle>
        <p className="text-sm text-gray-400">
          Compare projected earnings across staking strategies
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Controls */}
          <div className="space-y-6">
            {/* Stake Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Stake Amount (SOL)
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="10"
                  max="10000"
                  step="10"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10 SOL</span>
                  <span className="text-lg font-bold text-white">{amount.toLocaleString()} SOL</span>
                  <span>10,000 SOL</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  ≈ ${(amount * SOL_PRICE).toLocaleString()} USD
                </p>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Time Horizon
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 6, 12, 24].map((m) => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      duration === m
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {m < 12 ? `${m} mo` : `${m / 12} yr`}
                  </button>
                ))}
              </div>
            </div>

            {/* Compounding */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Compounding Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "none", label: "None" },
                  { key: "monthly", label: "Monthly" },
                  { key: "epoch", label: "Per Epoch" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setCompoundingFreq(opt.key as any)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      compoundingFreq === opt.key
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MEV Scenario Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                MEV Scenario
                <span className="ml-2 text-xs text-gray-500">
                  (What if MEV is {mevMultiplier < 1 ? "lower" : mevMultiplier > 1 ? "higher" : "average"}?)
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={mevMultiplier}
                onChange={(e) => setMevMultiplier(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-50% MEV</span>
                <span className={`text-sm font-medium ${mevMultiplier === 1 ? "text-gray-300" : mevMultiplier > 1 ? "text-green-400" : "text-red-400"}`}>
                  {mevMultiplier === 1 ? "Average" : `${((mevMultiplier - 1) * 100).toFixed(0)}%`}
                </span>
                <span>+100% MEV</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Strategy Comparison */}
            <div className="space-y-3">
              {/* Native Staking */}
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-gray-400 text-sm">Native Staking</span>
                    <Badge variant="secondary" className="ml-2">No MEV</Badge>
                  </div>
                  <span className="text-xs text-gray-500">{BASE_STAKING_APY}% APY</span>
                </div>
                <div className="text-2xl font-bold">{calculations.nativeStaking.value.toFixed(2)} SOL</div>
                <div className="text-sm text-green-400">
                  +{calculations.nativeStaking.yield.toFixed(2)} SOL
                  <span className="text-gray-500 ml-2">
                    (${(calculations.nativeStaking.yield * SOL_PRICE).toFixed(0)})
                  </span>
                </div>
              </div>

              {/* mSOL */}
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-gray-400 text-sm">mSOL (Marinade)</span>
                    <Badge variant="secondary" className="ml-2">Liquid</Badge>
                  </div>
                  <span className="text-xs text-gray-500">{currentMsolApy.toFixed(2)}% APY</span>
                </div>
                <div className="text-2xl font-bold">{calculations.msol.value.toFixed(2)} SOL</div>
                <div className="text-sm text-green-400">
                  +{calculations.msol.yield.toFixed(2)} SOL
                  <span className="text-gray-500 ml-2">
                    (${(calculations.msol.yield * SOL_PRICE).toFixed(0)})
                  </span>
                </div>
              </div>

              {/* jitoSOL - Highlighted */}
              <div className={`p-4 rounded-lg border-2 ${calculations.best.name === "jitoSOL" ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500" : "bg-gray-800/50 border-gray-700"}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">jitoSOL</span>
                    <Badge variant="success" className="ml-2">MEV Included</Badge>
                    {calculations.best.name === "jitoSOL" && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                        👑 Best
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{currentJitoApy.toFixed(2)}% APY</span>
                </div>
                <div className="text-2xl font-bold">{calculations.jito.value.toFixed(2)} SOL</div>
                <div className="text-sm text-green-400">
                  +{calculations.jito.yield.toFixed(2)} SOL
                  <span className="text-gray-500 ml-2">
                    (${(calculations.jito.yield * SOL_PRICE).toFixed(0)})
                  </span>
                </div>
              </div>
            </div>

            {/* Bonus Summary */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-800/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span>
                <span className="font-semibold text-green-400">MEV Advantage</span>
              </div>
              <p className="text-sm text-gray-300">
                Choosing <strong>jitoSOL</strong> over native staking earns you an extra{" "}
                <span className="text-green-400 font-bold">
                  {calculations.jitoBonus.toFixed(2)} SOL
                </span>{" "}
                ({calculations.jitoBonusPercent.toFixed(1)}% more yield) over {duration} months.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                That's ≈ ${(calculations.jitoBonus * SOL_PRICE).toFixed(0)} USD at current prices
              </p>
            </div>

            {/* Custom MEV Scenario */}
            {mevMultiplier !== 1 && (
              <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔮</span>
                  <span className="font-medium text-gray-300">Scenario: {mevMultiplier > 1 ? "High" : "Low"} MEV</span>
                </div>
                <p className="text-sm text-gray-400">
                  With {((mevMultiplier - 1) * 100).toFixed(0)}% {mevMultiplier > 1 ? "higher" : "lower"} MEV,
                  your {duration}-month yield would be{" "}
                  <span className={mevMultiplier > 1 ? "text-green-400" : "text-red-400"}>
                    {calculations.customMev.yield.toFixed(2)} SOL
                  </span>{" "}
                  ({calculations.customMev.apy.toFixed(2)}% effective APY)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Epochs Info */}
        <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-sm text-gray-500">
          <span>📅 {calculations.epochsInDuration} epochs in {duration} months</span>
          <span>Updated live with real APY data</span>
        </div>
      </CardContent>
    </Card>
  );
}
