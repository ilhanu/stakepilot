"use client";

import { useState } from "react";

export function Header() {
  const [connected, setConnected] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚀</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                StakePilot
              </h1>
              <p className="text-xs text-gray-500">
                MEV-Aware Staking Autopilot
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#dashboard"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Dashboard
            </a>
            <a
              href="#validators"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Validators
            </a>
            <a
              href="#compare"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Compare LSTs
            </a>
          </nav>

          <button
            onClick={() => setConnected(!connected)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              connected
                ? "bg-green-600/20 text-green-400 border border-green-600"
                : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90"
            }`}
          >
            {connected ? "◉ Connected" : "Connect Wallet"}
          </button>
        </div>
      </div>
    </header>
  );
}
