"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { truncateAddress } from "@/lib/utils";
import type { ValidatorData } from "@/lib/validator-insights";

interface ValidatorInsightsProps {
  validators: ValidatorData[];
  currentEpoch: number;
}

const TABS = [
  { id: "rising", label: "🌟 Rising Stars", description: "Validators with improving MEV" },
  { id: "consistent", label: "🏆 Top Performers", description: "Consistently high MEV" },
  { id: "commission", label: "📊 Commission Watch", description: "Commission change alerts" },
];

export function ValidatorInsights({ validators, currentEpoch }: ValidatorInsightsProps) {
  const [activeTab, setActiveTab] = useState("rising");
  const [sortBy, setSortBy] = useState<"mev" | "trend" | "score">("trend");

  // Calculate rising stars (positive trend)
  const risingStars = validators
    .filter((v) => v.mevTrend > 10 && v.mevRevenueSol > 1)
    .sort((a, b) => b.mevTrend - a.mevTrend)
    .slice(0, 10);

  // Top consistent performers
  const topPerformers = validators
    .filter((v) => v.score >= 70)
    .sort((a, b) => b.mevRevenueSol - a.mevRevenueSol)
    .slice(0, 10);

  // Validators with commission changes
  const commissionAlerts = validators
    .filter((v) => v.commissionChange !== undefined && v.commissionChange !== 0)
    .sort((a, b) => Math.abs(b.commissionChange!) - Math.abs(a.commissionChange!));

  const getDisplayValidators = () => {
    switch (activeTab) {
      case "rising":
        return risingStars;
      case "consistent":
        return topPerformers;
      case "commission":
        return commissionAlerts;
      default:
        return [];
    }
  };

  const displayValidators = getDisplayValidators();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 pb-4">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🔍</span> Validator Insights
        </CardTitle>
        <p className="text-sm text-gray-400">
          Deep analysis of validator MEV performance and trends
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Description */}
        <p className="text-sm text-gray-500 mb-4">
          {TABS.find((t) => t.id === activeTab)?.description}
        </p>

        {/* Validator List */}
        {displayValidators.length > 0 ? (
          <div className="space-y-3">
            {displayValidators.map((validator, index) => (
              <Link
                key={validator.voteAccount}
                href={`/validator/${validator.voteAccount}`}
                className="block"
              >
                <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-purple-500/50 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Validator Info */}
                    <div className="flex items-start gap-3 flex-grow">
                      <div className="flex-shrink-0">
                        {activeTab === "rising" && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-lg">
                            {index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}
                          </div>
                        )}
                        {activeTab === "consistent" && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg">
                            {index < 3 ? "🏆" : `#${index + 1}`}
                          </div>
                        )}
                        {activeTab === "commission" && (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg">
                            {validator.commissionChange! > 0 ? "📈" : "📉"}
                          </div>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium group-hover:text-purple-400 transition-colors">
                            {validator.name || "Unknown Validator"}
                          </span>
                          {validator.isRisingStar && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                              Rising Star
                            </Badge>
                          )}
                          {validator.isBamEligible && (
                            <Badge variant="success" className="text-xs">BAM</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-1">
                          {truncateAddress(validator.voteAccount, 8)}
                        </p>

                        {/* Mini Sparkline */}
                        {validator.epochHistory.length > 0 && (
                          <div className="mt-2 flex items-end gap-0.5 h-8">
                            {validator.epochHistory.slice(-10).map((h, i) => {
                              const max = Math.max(...validator.epochHistory.map((x) => x.mev));
                              const height = max > 0 ? (h.mev / max) * 100 : 10;
                              const isRecent = i >= validator.epochHistory.length - 3;
                              return (
                                <div
                                  key={h.epoch}
                                  className={`w-2 rounded-t transition-all ${
                                    isRecent
                                      ? "bg-purple-500"
                                      : "bg-gray-600"
                                  }`}
                                  style={{ height: `${Math.max(height, 5)}%` }}
                                  title={`Epoch ${h.epoch}: ${h.mev.toFixed(2)} SOL`}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-semibold text-green-400">
                        {validator.mevRevenueSol.toFixed(2)} SOL
                      </div>
                      <div className="text-xs text-gray-500">MEV this epoch</div>
                      
                      {activeTab === "rising" && (
                        <div className="mt-2">
                          <Badge
                            variant="success"
                            className="bg-green-900/50 text-green-400"
                          >
                            ↑ {validator.mevTrend.toFixed(1)}%
                          </Badge>
                        </div>
                      )}
                      
                      {activeTab === "consistent" && (
                        <div className="mt-2">
                          <Badge
                            variant={validator.score >= 80 ? "success" : "secondary"}
                          >
                            Score: {validator.score}/100
                          </Badge>
                        </div>
                      )}
                      
                      {activeTab === "commission" && validator.commissionChange && (
                        <div className="mt-2">
                          <Badge
                            variant={validator.commissionChange > 0 ? "destructive" : "success"}
                          >
                            {validator.commissionChange > 0 ? "+" : ""}
                            {validator.commissionChange}% commission
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Now: {validator.commission}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl block mb-3">📊</span>
            <p>No validators in this category</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-purple-400">
              {risingStars.length}
            </p>
            <p className="text-xs text-gray-500">Rising Stars</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {topPerformers.length}
            </p>
            <p className="text-xs text-gray-500">Top Performers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">
              {commissionAlerts.length}
            </p>
            <p className="text-xs text-gray-500">Commission Alerts</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Data from epoch {currentEpoch} • Updated every epoch
        </p>
      </CardContent>
    </Card>
  );
}
