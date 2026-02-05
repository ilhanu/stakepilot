"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import wallet button to avoid SSR issues
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-32 bg-[var(--bg-elevated)] rounded-xl animate-pulse" /> }
);

export function Header() {
  const pathname = usePathname();
  
  const navLinks = [
    { href: "/vault", label: "Vault" },
    { href: "/discover", label: "Discover" },
    { href: "/docs", label: "Docs" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg group-hover:shadow-[var(--accent)]/30 transition-shadow">
              <span className="text-black font-bold text-lg">S</span>
            </div>
            <span className="font-semibold text-lg tracking-tight hidden sm:block">
              Staker Space
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-[var(--accent)] bg-[var(--accent)]/10"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Network badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--coral)]/10 border border-[var(--coral)]/20">
              <div className="w-2 h-2 rounded-full bg-[var(--coral)] animate-pulse" />
              <span className="text-xs font-medium text-[var(--coral)]">Devnet</span>
            </div>
            
            {/* Wallet button */}
            <WalletMultiButton className="!bg-[var(--accent)] hover:!bg-[var(--accent-hover)] !text-black !font-semibold !rounded-xl !h-10 !px-4 !text-sm !transition-all hover:!shadow-lg hover:!shadow-[var(--accent)]/20" />
          </div>
        </div>
      </div>
    </header>
  );
}
