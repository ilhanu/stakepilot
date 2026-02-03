"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { truncateAddress, formatSol } from "@/lib/utils";

interface Validator {
  voteAccount: string;
  name: string | null;
  mevRevenue: number;
  mevRevenueSol: number;
  stake: number;
}

interface MevLeaderboardProps {
  validators: Validator[];
  epoch: number;
}

export function MevLeaderboard({ validators, epoch }: MevLeaderboardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🏆</span> MEV Leaderboard
          </CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Top validators by MEV earnings (Epoch {epoch})
          </p>
        </div>
        <Badge variant="outline">Live</Badge>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">
                  Rank
                </th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">
                  Validator
                </th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                  MEV Revenue
                </th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                  Stake
                </th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium text-sm">
                  MEV/Stake
                </th>
              </tr>
            </thead>
            <tbody>
              {validators.map((validator, index) => {
                const mevPerStake =
                  validator.stake > 0
                    ? (validator.mevRevenue / validator.stake) * 1000
                    : 0;

                return (
                  <Link
                    key={validator.voteAccount}
                    href={`/validator/${validator.voteAccount}`}
                    className="contents"
                  >
                    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {index < 3 ? (
                            <span className="text-lg">
                              {["🥇", "🥈", "🥉"][index]}
                            </span>
                          ) : (
                            <span className="text-gray-500 w-7 text-center">
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-white hover:text-blue-400 transition-colors">
                            {validator.name || "Unknown Validator"}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {truncateAddress(validator.voteAccount, 6)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-green-400">
                            {validator.mevRevenueSol.toFixed(2)} SOL
                          </span>
                          <span className="text-xs text-gray-500">
                            ≈ ${(validator.mevRevenueSol * 150).toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-300">
                        {formatSol(validator.stake)} SOL
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Badge
                          variant={
                            mevPerStake > 5
                              ? "success"
                              : mevPerStake > 2
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {mevPerStake.toFixed(2)}‰
                        </Badge>
                      </td>
                    </tr>
                  </Link>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
