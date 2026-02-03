"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

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

export function Header() {
  const pathname = usePathname();
  const { connected } = useWallet();

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
                  className={`btn-ghost ${isActive ? "text-[var(--accent)]" : ""}`}
                >
                  {item.emoji && <span className="mr-1 hidden sm:inline">{item.emoji}</span>}
                  {item.label}
                </Link>
              );
            })}
            
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
