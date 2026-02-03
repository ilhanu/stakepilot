"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import type { LstProtocol } from "@/lib/lst";

interface LstComparisonProps {
  protocols: LstProtocol[];
  bestForYield: string;
  bestForMev: string;
  bestForBaseYield?: string;
  bestForDecentralization?: string;
  recommendation: string;
  yieldBreakdown?: string;
}

export function LstComparison({
  protocols,
  bestForYield,
  bestForMev,
  bestForBaseYield,
  bestForDecentralization,
  recommendation,
  yieldBreakdown,
}: LstComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📊</span> Yield Truth — Real APY from Real APIs
            </CardTitle>
            <p className="text-sm text-gray-400 mt-2">
              Compare fairly: Base yield + MEV bonus + fees. All transparent.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/30 border border-green-800/50">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-green-400 font-medium">Live Data</span>
          </div>
        </div>
        
        {/* Yield Breakdown Banner */}
        {yieldBreakdown && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
            <p className="text-sm text-blue-300">
              <span className="font-semibold">💡 How LST yields work:</span> {yieldBreakdown}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Recommendation */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/30 rounded-lg">
          <p className="text-sm">
            <span className="text-purple-400 font-semibold">🎯 Smart Take:</span>{" "}
            <span className="text-gray-300">{recommendation}</span>
          </p>
        </div>

        {/* LST Cards for Mobile */}
        <div className="lg:hidden space-y-4">
          {protocols.map((protocol) => {
            const isBest = protocol.id === bestForYield;
            const isBestBase = protocol.id === bestForBaseYield;
            const isBestMev = protocol.id === bestForMev;
            const isBestDecentral = protocol.id === bestForDecentralization;

            return (
              <div
                key={protocol.id}
                className={`p-4 rounded-xl border ${
                  isBest
                    ? "bg-gradient-to-br from-green-900/30 to-blue-900/20 border-green-700/50"
                    : "bg-gray-900/50 border-gray-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{protocol.token}</span>
                    <span className="text-gray-500">by {protocol.name}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {isBest && <Badge variant="success" className="text-[10px]">Best Yield</Badge>}
                    {isBestMev && !isBest && <Badge variant="default" className="text-[10px]">MEV</Badge>}
                    {isBestDecentral && <Badge variant="warning" className="text-[10px]">🌐 Decentral</Badge>}
                  </div>
                </div>

                {/* APY Breakdown */}
                <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Total APY</span>
                    <span className="text-2xl font-bold text-green-400">{protocol.apy.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Base: {protocol.baseAPY?.toFixed(2) || protocol.apy.toFixed(2)}%</span>
                    {protocol.mevBonus > 0 && (
                      <span className="text-yellow-400">+ MEV: {protocol.mevBonus.toFixed(2)}%</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">TVL</span>
                    <p className="text-white font-medium">{formatNumber(protocol.tvl)} SOL</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Fee</span>
                    <p className="text-white font-medium">{protocol.fees}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500">MEV</span>
                    <Badge
                      variant={
                        protocol.mevShare === "full" ? "success" : protocol.mevShare === "partial" ? "warning" : "secondary"
                      }
                    >
                      {protocol.mevShare === "full" ? "✓ Full" : protocol.mevShare === "partial" ? "◐ Partial" : "✗ None"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Liquidity</span>
                    <Badge
                      variant={protocol.liquidity === "deep" ? "success" : protocol.liquidity === "medium" ? "warning" : "destructive"}
                    >
                      {protocol.liquidity}
                    </Badge>
                  </div>
                </div>

                {/* DeFi Integrations */}
                {protocol.defiIntegrations && protocol.defiIntegrations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <span className="text-xs text-gray-500">DeFi: </span>
                    <span className="text-xs text-gray-400">{protocol.defiIntegrations.slice(0, 4).join(', ')}</span>
                    {protocol.defiIntegrations.length > 4 && (
                      <span className="text-xs text-gray-500"> +{protocol.defiIntegrations.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Token</th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                  <div className="flex flex-col items-end">
                    <span>Base APY</span>
                    <span className="text-[10px] text-gray-500">Guaranteed</span>
                  </div>
                </th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                  <div className="flex flex-col items-end">
                    <span>MEV Bonus</span>
                    <span className="text-[10px] text-gray-500">Variable</span>
                  </div>
                </th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                  <div className="flex flex-col items-end">
                    <span>Total APY</span>
                    <span className="text-[10px] text-gray-500">What you get</span>
                  </div>
                </th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">Fees</th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">TVL</th>
                <th className="text-center py-3 px-2 text-gray-400 font-medium text-sm">Liquidity</th>
                <th className="text-center py-3 px-2 text-gray-400 font-medium text-sm">MEV</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((protocol) => {
                const isBest = protocol.id === bestForYield;
                const isBestBase = protocol.id === bestForBaseYield;
                const isBestMev = protocol.id === bestForMev;
                const isBestDecentral = protocol.id === bestForDecentralization;

                return (
                  <tr
                    key={protocol.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                      isBest ? "bg-green-900/10" : ""
                    }`}
                  >
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{protocol.token}</span>
                        <span className="text-gray-500 text-sm">({protocol.name})</span>
                        <div className="flex gap-1 flex-wrap">
                          {isBest && <Badge variant="success" className="text-[10px]">🏆 Best Yield</Badge>}
                          {isBestMev && !isBest && <Badge variant="default" className="text-[10px]">⚡ MEV</Badge>}
                          {isBestDecentral && <Badge variant="warning" className="text-[10px]">🌐 Decentral</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="font-medium text-blue-400">
                        {protocol.baseAPY?.toFixed(2) || protocol.apy.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      {protocol.mevBonus > 0 ? (
                        <span className="font-medium text-yellow-400">+{protocol.mevBonus.toFixed(2)}%</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="font-bold text-green-400 text-lg">{protocol.apy.toFixed(2)}%</span>
                    </td>
                    <td className="py-4 px-2 text-right text-gray-400">
                      {protocol.fees}%
                    </td>
                    <td className="py-4 px-2 text-right text-gray-300">
                      {formatNumber(protocol.tvl)} SOL
                    </td>
                    <td className="py-4 px-2 text-center">
                      <Badge
                        variant={
                          protocol.liquidity === "deep"
                            ? "success"
                            : protocol.liquidity === "medium"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {protocol.liquidity}
                      </Badge>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <Badge
                        variant={
                          protocol.mevShare === "full"
                            ? "success"
                            : protocol.mevShare === "partial"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {protocol.mevShare === "full"
                          ? "✓ Full"
                          : protocol.mevShare === "partial"
                          ? "◐ Partial"
                          : "✗ None"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-500">
          <p>
            <strong>Base APY</strong> = Reliable staking rewards (~6-7% annually). 
            <strong> MEV Bonus</strong> = Variable rewards from Jito's MEV extraction (0-2%+). 
            <strong> Fees</strong> = Protocol's cut of rewards.
          </p>
          <p className="mt-1">
            Data from: <span className="text-gray-400">api.marinade.finance</span>, <span className="text-gray-400">stake.solblaze.org</span>, <span className="text-gray-400">kobe.mainnet.jito.network</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
