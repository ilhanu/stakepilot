"use client";

import { useState } from "react";
import Link from "next/link";

interface Alert {
  id: string;
  type: "yield" | "risk" | "opportunity" | "rebalance";
  title: string;
  description: string;
  impact: string;
  urgency: "low" | "medium" | "high";
  timestamp: string;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "yield",
    title: "🚀 Rising Star Outperforming",
    description: "Validator 'Solana Beach' has increased MEV earnings by 45% this epoch",
    impact: "+1.2% potential APY boost",
    urgency: "high",
    timestamp: "2 hours ago",
    actionUrl: "/validator/solana-beach",
    actionLabel: "View Validator",
    read: false,
  },
  {
    id: "2",
    type: "opportunity",
    title: "💎 MEV Spike Detected",
    description: "Block rewards unusually high this epoch. jitoSOL stakers earning 40% more MEV than average.",
    impact: "Temporary opportunity",
    urgency: "medium",
    timestamp: "5 hours ago",
    actionUrl: "/compare",
    actionLabel: "Compare LSTs",
    read: false,
  },
  {
    id: "3",
    type: "rebalance",
    title: "⚖️ Portfolio Drift Alert",
    description: "Your mSOL position has grown to 65% of portfolio (target: 50%). Consider rebalancing.",
    impact: "Risk optimization",
    urgency: "low",
    timestamp: "1 day ago",
    actionUrl: "/autopilot",
    actionLabel: "Auto-Rebalance",
    read: true,
  },
  {
    id: "4",
    type: "risk",
    title: "⚠️ Validator Commission Change",
    description: "Validator 'CryptoStake' increased commission from 5% to 10%. Your estimated APY decreased.",
    impact: "-0.3% APY",
    urgency: "high",
    timestamp: "3 days ago",
    actionUrl: "/discover",
    actionLabel: "Find Alternative",
    read: true,
  },
  {
    id: "5",
    type: "yield",
    title: "📈 New High-Yield Validator",
    description: "Independent validator 'SolanaMax' now in top 10 for MEV with only 3% commission",
    impact: "+0.8% potential APY",
    urgency: "medium",
    timestamp: "5 days ago",
    read: true,
  },
];

interface AlertConfig {
  yieldAlerts: boolean;
  riskAlerts: boolean;
  opportunityAlerts: boolean;
  rebalanceAlerts: boolean;
  minImpact: number;
  frequency: "instant" | "daily" | "weekly";
  channels: {
    email: boolean;
    telegram: boolean;
    discord: boolean;
    push: boolean;
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [showConfig, setShowConfig] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | Alert["type"]>("all");
  const [config, setConfig] = useState<AlertConfig>({
    yieldAlerts: true,
    riskAlerts: true,
    opportunityAlerts: true,
    rebalanceAlerts: true,
    minImpact: 0.5,
    frequency: "instant",
    channels: {
      email: false,
      telegram: true,
      discord: false,
      push: true,
    },
  });

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "unread") return !a.read;
    return a.type === filter;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAllRead = () => {
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
  };

  const markRead = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial pointer-events-none" />
      <Header />

      <main className="relative pt-8 pb-16 px-6">
        <div className="container-lg">
          {/* Hero */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                🔔 Smart Alerts
              </h1>
              <p className="text-[var(--text-secondary)]">
                AI-powered notifications for yield opportunities and risks
              </p>
            </div>
            <button
              onClick={() => setShowConfig(true)}
              className="btn-secondary"
            >
              ⚙️ Configure
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <div className="text-2xl font-mono text-[var(--accent)]">{unreadCount}</div>
              <div className="text-sm text-[var(--text-muted)]">Unread Alerts</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-mono">+2.1%</div>
              <div className="text-sm text-[var(--text-muted)]">Yield Captured</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-mono">3</div>
              <div className="text-sm text-[var(--text-muted)]">Risks Avoided</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-mono">24/7</div>
              <div className="text-sm text-[var(--text-muted)]">AI Monitoring</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {[
              { key: "all", label: "All" },
              { key: "unread", label: `Unread (${unreadCount})` },
              { key: "yield", label: "🚀 Yield" },
              { key: "opportunity", label: "💎 Opportunity" },
              { key: "risk", label: "⚠️ Risk" },
              { key: "rebalance", label: "⚖️ Rebalance" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filter === f.key
                    ? "bg-[var(--accent)] text-black font-medium"
                    : "bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
            
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="ml-auto text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-[var(--text-muted)]">
                  No alerts matching your filter. Check back soon or adjust your alert settings.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`card p-6 transition-all ${
                    !alert.read ? "border-[var(--accent)]/50 bg-[var(--accent)]/5" : ""
                  }`}
                  onClick={() => markRead(alert.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Urgency Indicator */}
                    <div
                      className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        alert.urgency === "high"
                          ? "bg-red-500 animate-pulse"
                          : alert.urgency === "medium"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold">{alert.title}</h3>
                        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                          {alert.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mb-3">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm font-medium ${
                            alert.impact.includes("+")
                              ? "text-green-400"
                              : alert.impact.includes("-")
                              ? "text-red-400"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {alert.impact}
                        </span>
                        {alert.actionUrl && alert.actionLabel && (
                          <Link
                            href={alert.actionUrl}
                            className="text-sm text-[var(--accent)] hover:underline"
                          >
                            {alert.actionLabel} →
                          </Link>
                        )}
                      </div>
                    </div>

                    {!alert.read && (
                      <div className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Alert Settings</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            {/* Alert Types */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">
                Alert Types
              </h3>
              <div className="space-y-3">
                {[
                  { key: "yieldAlerts", label: "🚀 Yield Opportunities" },
                  { key: "riskAlerts", label: "⚠️ Risk Warnings" },
                  { key: "opportunityAlerts", label: "💎 MEV Opportunities" },
                  { key: "rebalanceAlerts", label: "⚖️ Rebalance Suggestions" },
                ].map((type) => (
                  <label
                    key={type.key}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] cursor-pointer"
                  >
                    <span>{type.label}</span>
                    <input
                      type="checkbox"
                      checked={config[type.key as keyof AlertConfig] as boolean}
                      onChange={(e) =>
                        setConfig({ ...config, [type.key]: e.target.checked })
                      }
                      className="w-5 h-5 accent-[var(--accent)]"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Min Impact */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">
                Minimum Impact Threshold
              </h3>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.minImpact}
                  onChange={(e) =>
                    setConfig({ ...config, minImpact: parseFloat(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="font-mono text-sm w-16">
                  {config.minImpact.toFixed(1)}% APY
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Only alert for opportunities with at least this impact
              </p>
            </div>

            {/* Notification Channels */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">
                Notification Channels
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "push", label: "📱 Push" },
                  { key: "email", label: "📧 Email" },
                  { key: "telegram", label: "✈️ Telegram" },
                  { key: "discord", label: "💬 Discord" },
                ].map((channel) => (
                  <label
                    key={channel.key}
                    className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-secondary)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={
                        config.channels[channel.key as keyof typeof config.channels]
                      }
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          channels: {
                            ...config.channels,
                            [channel.key]: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm">{channel.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowConfig(false)}
              className="w-full btn-primary"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border)]">
      <div className="container-lg">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-lg font-semibold hidden sm:inline">StakePilot</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/compare" className="btn-ghost">Compare</Link>
            <Link href="/discover" className="btn-ghost">Discover</Link>
            <Link href="/autopilot" className="btn-ghost">Autopilot</Link>
            <Link href="/alerts" className="btn-ghost text-[var(--accent)]">🔔 Alerts</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
