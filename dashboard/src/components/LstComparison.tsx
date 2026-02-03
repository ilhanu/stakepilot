"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import type { LstProtocol } from "@/lib/lst";

interface LstComparisonProps {
  protocols: LstProtocol[];
  bestForYield: string;
  bestForMev: string;
  recommendation: string;
}

export function LstComparison({
  protocols,
  bestForYield,
  bestForMev,
  recommendation,
}: LstComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">💧</span> Liquid Staking Comparison
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">{recommendation}</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">
                  Token
                </th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">
                  Protocol
                </th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                  APY
                </th>
                <th className="text-center py-3 px-2 text-gray-400 font-medium text-sm">
                  MEV Share
                </th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                  TVL
                </th>
                <th className="text-center py-3 px-2 text-gray-400 font-medium text-sm">
                  Liquidity
                </th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((protocol) => {
                const isBest =
                  protocol.id === bestForYield || protocol.id === bestForMev;

                return (
                  <tr
                    key={protocol.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                      isBest ? "bg-blue-900/10" : ""
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {protocol.token}
                        </span>
                        {protocol.id === bestForYield && (
                          <Badge variant="success" className="text-[10px]">
                            Best Yield
                          </Badge>
                        )}
                        {protocol.id === bestForMev && (
                          <Badge variant="default" className="text-[10px]">
                            Best MEV
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-300">{protocol.name}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-semibold text-green-400">
                        {protocol.apy.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
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
                    <td className="py-3 px-2 text-right text-gray-300">
                      {formatNumber(protocol.tvl)} SOL
                    </td>
                    <td className="py-3 px-2 text-center">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
