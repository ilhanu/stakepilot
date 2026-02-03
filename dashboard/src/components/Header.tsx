"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getUserStakeAccounts } from "@/lib/user-stakes";

interface NavItem {
  href: string;
  label: string;
  emoji?: string;
}

const navItems: NavItem[] = [
  { href: "/compare", label: "Compare" },
  { href: "/discover", label: "Discover" },
  { href: "/autopilot", label: "Autopilot", emoji: "🤖" },
  { href: "/my-stakes", label: "My Stakes", emoji: "💼" },
];

interface StakeSummary {
  totalStaked: number;
  accountCount: number;
  potentialGain: number;
}

export function Header() {
  const pathname = usePathname();
  const { publicKey, connected } = useWallet();
  const [stakeSummary, setStakeSummary] = useState<StakeSummary | null>(null);
  const [showStakePopup, setShowStakePopup] = useState(false);

  // Fetch user stakes when connected
  useEffect(() => {
    async function fetchStakes() {
      if (!publicKey) {
        setStakeSummary(null);
        return;
      }

      try {
        const stakes = await getUserStakeAccounts(publicKey.toBase58());
        const totalStaked = stakes.reduce((sum, s) => sum + s.solAmount, 0);
        
        // Calculate potential gain (assuming 1.5% improvement possible on average)
        const potentialGain = totalStaked * 0.015;
        
        setStakeSummary({
          totalStaked,
          accountCount: stakes.length,
          potentialGain,
        });
      } catch (e) {
        console.error("Failed to fetch stakes for header:", e);
      }
    }

    if (connected) {
      fetchStakes();
    }
  }, [publicKey, connected]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border)]">
      <div className="container-lg">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-lg font-semibold hidden sm:inline">StakePilot</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`btn-ghost text-sm ${isActive ? "text-[var(--accent)]" : ""}`}
                >
                  {item.emoji && <span className="mr-1 hidden sm:inline">{item.emoji}</span>}
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.emoji || item.label.charAt(0)}</span>
                </Link>
              );
            })}
            
            {/* Stake Summary Badge (when connected) */}
            {connected && stakeSummary && stakeSummary.totalStaked > 0 && (
              <div 
                className="relative hidden md:block"
                onMouseEnter={() => setShowStakePopup(true)}
                onMouseLeave={() => setShowStakePopup(false)}
              >
                <Link
                  href="/my-stakes"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-sm"
                >
                  <span className="text-[var(--accent)] font-medium">
                    {stakeSummary.totalStaked.toFixed(1)} SOL
                  </span>
                  {stakeSummary.potentialGain > 0.1 && (
                    <span className="text-green-400 text-xs">
                      +{stakeSummary.potentialGain.toFixed(2)}
                    </span>
                  )}
                </Link>

                {/* Popup on hover */}
                {showStakePopup && (
                  <div className="absolute top-full right-0 mt-2 w-64 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] shadow-xl animate-fade-in">
                    <div className="text-sm font-medium mb-3">Your Staking Summary</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Total Staked</span>
                        <span className="font-medium">{stakeSummary.totalStaked.toFixed(2)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Stake Accounts</span>
                        <span className="font-medium">{stakeSummary.accountCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Potential Extra/Year</span>
                        <span className="font-medium text-green-400">+{stakeSummary.potentialGain.toFixed(2)} SOL</span>
                      </div>
                    </div>
                    <Link 
                      href="/my-stakes" 
                      className="block mt-3 text-center text-xs text-[var(--accent)] hover:underline"
                    >
                      View Details & Optimize →
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {/* Wallet Button */}
            <div className="ml-2">
              <WalletMultiButton 
                className={`!rounded-lg !h-10 !text-sm !font-medium ${
                  connected 
                    ? "!bg-[var(--bg-secondary)] !border !border-[var(--border)]" 
                    : "!bg-[var(--accent)] hover:!bg-[var(--accent-hover)]"
                }`} 
              />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
