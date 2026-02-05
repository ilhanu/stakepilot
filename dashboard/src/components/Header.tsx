"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-10 w-28 bg-[var(--bg-elevated)] rounded-xl animate-pulse" /> }
);

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navLinks = [
    { href: "/vault", label: "Vault" },
    { href: "/discover", label: "Validators" },
    { href: "/docs", label: "Docs" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg">
              <span className="text-black font-bold text-base md:text-lg">S</span>
            </div>
            <span className="font-semibold text-base md:text-lg tracking-tight">
              StakePilot
            </span>
          </Link>

          {/* Desktop Navigation */}
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
          <div className="flex items-center gap-2 md:gap-3">
            {/* Network badge - Testnet */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[10px] md:text-xs font-medium text-[var(--accent)]">Testnet</span>
            </div>
            
            {/* Wallet button */}
            <div className="hidden sm:block">
              <WalletMultiButton className="!bg-[var(--accent)] hover:!bg-[var(--accent-hover)] !text-black !font-semibold !rounded-xl !h-9 md:!h-10 !px-3 md:!px-4 !text-xs md:!text-sm" />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)]">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "text-[var(--accent)] bg-[var(--accent)]/10"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 px-4">
              <WalletMultiButton className="!w-full !bg-[var(--accent)] hover:!bg-[var(--accent-hover)] !text-black !font-semibold !rounded-xl !h-11 !text-sm" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
