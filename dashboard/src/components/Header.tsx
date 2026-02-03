"use client";

import Link from "next/link";
import { WalletButton } from "./WalletButton";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="text-3xl">🚀</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                StakePilot
              </h1>
              <p className="text-xs text-gray-500">
                MEV-Aware Staking Autopilot
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a
              href="/#dashboard"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/#validators"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Validators
            </a>
            <a
              href="/#compare"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Compare LSTs
            </a>
          </nav>

          <WalletButton />
        </div>
      </div>
    </header>
  );
}
