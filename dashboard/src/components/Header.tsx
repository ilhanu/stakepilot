"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/vault", label: "Vault" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/discover", label: "Validators" },
];

export function Header() {
  const pathname = usePathname();
  const { connected } = useWallet();

  // Don't show header on landing page (it has its own)
  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-400">StakePilot</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isActive 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            
            {/* Wallet Button */}
            <div className="ml-4">
              <WalletMultiButton 
                style={{
                  backgroundColor: connected ? 'rgba(255,255,255,0.1)' : 'rgb(16, 185, 129)',
                  height: '40px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
