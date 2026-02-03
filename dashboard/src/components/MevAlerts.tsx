"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: string;
  type: "performance_drop" | "yield_opportunity" | "epoch_change" | "lst_discount" | "validator_commission";
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  message: string;
  timestamp: Date;
  actionLabel?: string;
  actionUrl?: string;
  data?: Record<string, any>;
  read: boolean;
}

interface NotificationPreferences {
  performanceDrops: boolean;
  yieldOpportunities: boolean;
  epochChanges: boolean;
  lstDiscounts: boolean;
  commissionChanges: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
}

const MOCK_ALERTS: Alert[] = [
  {
    id: "1",
    type: "yield_opportunity",
    severity: "success",
    title: "Higher Yield Available",
    message: "jitoSOL APY has increased to 8.5%! Consider moving more stake for better returns.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    actionLabel: "View Details",
    actionUrl: "#compare",
    data: { previousApy: 8.0, newApy: 8.5 },
    read: false,
  },
  {
    id: "2",
    type: "epoch_change",
    severity: "info",
    title: "Epoch 742 Started",
    message: "New epoch began. MEV leaderboard has been updated with fresh data.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    data: { epoch: 742 },
    read: false,
  },
  {
    id: "3",
    type: "lst_discount",
    severity: "success",
    title: "jitoSOL Trading at Discount",
    message: "jitoSOL is trading 0.8% below redemption value. Arbitrage opportunity available.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    actionLabel: "Buy jitoSOL",
    data: { discount: 0.8, redemptionValue: 1.25, marketPrice: 1.24 },
    read: true,
  },
  {
    id: "4",
    type: "performance_drop",
    severity: "warning",
    title: "Validator Performance Alert",
    message: "Everstake's MEV revenue dropped 25% this epoch compared to average.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    actionLabel: "Check Validator",
    actionUrl: "/validator/7K8DVxtNJGnMtUY1CQJT5jcs8sFGSZTDiG7kowvFpECh",
    data: { validator: "Everstake", drop: 25 },
    read: true,
  },
  {
    id: "5",
    type: "validator_commission",
    severity: "critical",
    title: "Commission Increase Detected",
    message: "A validator you're staked with increased commission from 5% to 10%.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    actionLabel: "Review Position",
    data: { validator: "Unknown Validator", oldCommission: 5, newCommission: 10 },
    read: true,
  },
];

export function MevAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [showAll, setShowAll] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    performanceDrops: true,
    yieldOpportunities: true,
    epochChanges: true,
    lstDiscounts: true,
    commissionChanges: true,
    emailNotifications: false,
    browserNotifications: false,
  });

  const unreadCount = alerts.filter((a) => !a.read).length;
  const visibleAlerts = showAll ? alerts : alerts.slice(0, 3);

  const markAsRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const getSeverityStyles = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "border-red-500/50 bg-red-900/10";
      case "warning":
        return "border-yellow-500/50 bg-yellow-900/10";
      case "success":
        return "border-green-500/50 bg-green-900/10";
      default:
        return "border-blue-500/50 bg-blue-900/10";
    }
  };

  const getSeverityIcon = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "🚨";
      case "warning":
        return "⚠️";
      case "success":
        return "✅";
      default:
        return "ℹ️";
    }
  };

  const getTypeIcon = (type: Alert["type"]) => {
    switch (type) {
      case "performance_drop":
        return "📉";
      case "yield_opportunity":
        return "💰";
      case "epoch_change":
        return "🔄";
      case "lst_discount":
        return "🏷️";
      case "validator_commission":
        return "📊";
      default:
        return "📢";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🔔</span> MEV Alerts
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              title="Notification Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Stay informed about MEV opportunities and validator changes
        </p>
      </CardHeader>
      <CardContent>
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
            <h4 className="font-medium mb-3">Notification Preferences</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: "performanceDrops", label: "Validator Performance Drops" },
                { key: "yieldOpportunities", label: "Yield Opportunities" },
                { key: "epochChanges", label: "Epoch Changes" },
                { key: "lstDiscounts", label: "LST Discounts" },
                { key: "commissionChanges", label: "Commission Changes" },
              ].map((pref) => (
                <label
                  key={pref.key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={preferences[pref.key as keyof NotificationPreferences] as boolean}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        [pref.key]: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">{pref.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h5 className="text-sm font-medium mb-2">Delivery Methods (Coming Soon)</h5>
              <div className="flex gap-4 opacity-50">
                <label className="flex items-center gap-2 cursor-not-allowed">
                  <input type="checkbox" disabled className="rounded border-gray-600" />
                  <span className="text-sm text-gray-400">Email Notifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-not-allowed">
                  <input type="checkbox" disabled className="rounded border-gray-600" />
                  <span className="text-sm text-gray-400">Browser Push</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl block mb-3">🔕</span>
            <p>No alerts at the moment</p>
            <p className="text-sm mt-1">We'll notify you when something important happens</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border transition-all ${getSeverityStyles(alert.severity)} ${
                  !alert.read ? "ring-1 ring-white/10" : "opacity-75"
                }`}
                onClick={() => markAsRead(alert.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl flex-shrink-0">
                    {getTypeIcon(alert.type)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{alert.title}</span>
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      )}
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "destructive"
                            : alert.severity === "warning"
                            ? "warning"
                            : alert.severity === "success"
                            ? "success"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{alert.message}</p>
                    
                    {/* Alert Data */}
                    {alert.data && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {alert.type === "yield_opportunity" && (
                          <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                            {alert.data.previousApy}% → {alert.data.newApy}% APY
                          </span>
                        )}
                        {alert.type === "lst_discount" && (
                          <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                            {alert.data.discount}% discount
                          </span>
                        )}
                        {alert.type === "performance_drop" && (
                          <span className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded">
                            -{alert.data.drop}% revenue
                          </span>
                        )}
                        {alert.type === "validator_commission" && (
                          <span className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded">
                            {alert.data.oldCommission}% → {alert.data.newCommission}%
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-4">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(alert.timestamp)}
                      </span>
                      {alert.actionLabel && (
                        <a
                          href={alert.actionUrl || "#"}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                        >
                          {alert.actionLabel} →
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                    className="text-gray-500 hover:text-white transition-colors"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {alerts.length > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {showAll ? "Show less" : `Show all (${alerts.length})`}
              </button>
            )}
          </div>
        )}

        {/* Live Updates Indicator */}
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-gray-500">Live updates enabled</span>
          </div>
          <span className="text-gray-500">
            Checking every epoch (~2.5 days)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
