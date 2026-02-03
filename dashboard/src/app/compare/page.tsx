import Link from "next/link";
import { getLstComparison } from "@/lib/lst";
import { formatNumber } from "@/lib/utils";
import type { LstProtocol } from "@/lib/lst";

export const revalidate = 60;

export const metadata = {
  title: "Compare LSTs - StakePilot",
  description: "Compare Solana liquid staking tokens: jitoSOL vs mSOL vs bSOL with real APY data",
};

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "success" | "warning" | "default" }) {
  const colors = {
    success: "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    default: "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)] border-[var(--text-secondary)]/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${colors[variant]}`}>
      {children}
    </span>
  );
}

function LstCard({ protocol, isBest, isBestMev, isBestDecentral }: { 
  protocol: LstProtocol; 
  isBest: boolean;
  isBestMev: boolean;
  isBestDecentral: boolean;
}) {
  return (
    <div className={`card p-8 relative ${isBest ? "ring-2 ring-[var(--accent)]/50 glow-accent" : ""}`}>
      {/* Badges */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
        {isBest && <Badge variant="success">🏆 Best Yield</Badge>}
        {isBestMev && !isBest && <Badge variant="warning">⚡ Best MEV</Badge>}
        {isBestDecentral && <Badge>🌐 Decentralized</Badge>}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h3 className="text-3xl font-bold mb-1">{protocol.token}</h3>
        <p className="text-[var(--text-muted)] text-sm">{protocol.name}</p>
      </div>

      {/* APY Display */}
      <div className="bg-[var(--bg-primary)] rounded-2xl p-6 mb-8">
        <div className="stat-value text-[var(--accent)] mb-3">
          {protocol.apy.toFixed(2)}%
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[var(--text-muted)]">
            Base: <span className="text-blue-400 font-medium">{protocol.baseAPY?.toFixed(2) || protocol.apy.toFixed(2)}%</span>
          </span>
          {protocol.mevBonus > 0 && (
            <span className="text-[var(--text-muted)]">
              MEV: <span className="text-amber-400 font-medium">+{protocol.mevBonus.toFixed(2)}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[var(--text-muted)] text-xs mb-1">Total Value Locked</p>
          <p className="font-semibold">{formatNumber(protocol.tvl)} SOL</p>
        </div>
        <div>
          <p className="text-[var(--text-muted)] text-xs mb-1">Protocol Fee</p>
          <p className="font-semibold">{protocol.fees}%</p>
        </div>
        <div>
          <p className="text-[var(--text-muted)] text-xs mb-1">MEV Share</p>
          <p className={`font-semibold ${protocol.mevShare === "full" ? "text-[var(--accent)]" : protocol.mevShare === "partial" ? "text-amber-400" : "text-[var(--text-muted)]"}`}>
            {protocol.mevShare === "full" ? "✓ Full" : protocol.mevShare === "partial" ? "◐ Partial" : "✗ None"}
          </p>
        </div>
        <div>
          <p className="text-[var(--text-muted)] text-xs mb-1">Liquidity</p>
          <p className={`font-semibold ${protocol.liquidity === "deep" ? "text-[var(--accent)]" : ""}`}>
            {protocol.liquidity.charAt(0).toUpperCase() + protocol.liquidity.slice(1)}
          </p>
        </div>
      </div>

      {/* DeFi Integrations */}
      {protocol.defiIntegrations && protocol.defiIntegrations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] mb-2">DeFi Integrations</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {protocol.defiIntegrations.slice(0, 4).join(" • ")}
            {protocol.defiIntegrations.length > 4 && ` +${protocol.defiIntegrations.length - 4}`}
          </p>
        </div>
      )}
    </div>
  );
}

export default async function ComparePage() {
  const lstComparison = await getLstComparison();
  const { protocols, bestForYield, bestForMev, bestForDecentralization, recommendation, yieldBreakdown } = lstComparison;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
      <div className="absolute inset-x-0 top-0 h-[400px] bg-radial pointer-events-none" />
      
      

      <main className="relative">
        {/* Hero */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-16 px-6">
          <div className="container-lg text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm mb-8 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Compare LSTs
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
              Real APY from real APIs. Base yield + MEV bonus — fully transparent.
            </p>
          </div>
        </section>

        {/* Insight Banner */}
        {yieldBreakdown && (
          <section className="pb-8 px-6">
            <div className="container-lg">
              <div className="card p-5 bg-blue-500/5 border-blue-500/20">
                <p className="text-sm text-center">
                  <span className="font-medium text-blue-400">💡 How it works:</span>{" "}
                  <span className="text-[var(--text-secondary)]">{yieldBreakdown}</span>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Smart Take */}
        <section className="pb-12 px-6">
          <div className="container-lg">
            <div className="card p-6 bg-purple-500/5 border-purple-500/20">
              <p className="text-center">
                <span className="font-semibold text-purple-400">🎯 Smart Take:</span>{" "}
                <span className="text-[var(--text-secondary)]">{recommendation}</span>
              </p>
            </div>
          </div>
        </section>

        {/* LST Cards */}
        <section className="pb-16 px-6">
          <div className="container-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {protocols.map((protocol) => (
                <LstCard
                  key={protocol.id}
                  protocol={protocol}
                  isBest={protocol.id === bestForYield}
                  isBestMev={protocol.id === bestForMev}
                  isBestDecentral={protocol.id === bestForDecentralization}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="section-divider mx-6" />

        {/* Explanation */}
        <section className="py-16 px-6 text-center">
          <div className="container-lg">
            <p className="text-sm text-[var(--text-muted)] mb-2">
              <strong className="text-[var(--text-secondary)]">Base APY</strong> = Reliable staking rewards (~6-7%).{" "}
              <strong className="text-[var(--text-secondary)]">MEV Bonus</strong> = Variable rewards from Jito (0-2%+).
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Data from: api.marinade.finance • stake.solblaze.org • kobe.mainnet.jito.network
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24 px-6">
          <div className="container-lg text-center">
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/route" className="btn-primary">
                🛤️ Route My Stake
              </Link>
              <Link href="/discover" className="btn-secondary">
                🌟 Discover Validators
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Header Component
// Header imported from @/components/Header
