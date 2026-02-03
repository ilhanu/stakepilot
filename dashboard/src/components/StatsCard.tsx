"use client";

import { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  tooltip?: string;
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  tooltip,
  loading = false,
}: StatsCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="relative overflow-hidden group hover:border-gray-700 transition-colors"
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-grow">
            <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
              {title}
              {tooltip && (
                <span className="text-gray-600 cursor-help">ⓘ</span>
              )}
            </p>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
            {trend && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={`text-xs font-medium ${
                    trend.value >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 p-2 rounded-lg bg-gray-800/50 group-hover:bg-gray-800 transition-colors">
              {icon}
            </div>
          )}
        </div>
      </CardContent>

      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div className="absolute z-10 top-full left-4 right-4 mt-2 p-3 rounded-lg bg-gray-900 border border-gray-700 shadow-xl">
          <p className="text-sm text-gray-300">{tooltip}</p>
          <div className="absolute top-0 left-8 -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-l border-t border-gray-700"></div>
        </div>
      )}

      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
    </Card>
  );
}
