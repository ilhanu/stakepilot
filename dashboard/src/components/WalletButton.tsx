"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        Connect Wallet
      </button>
    );
  }

  return (
    <WalletMultiButton
      style={{
        background: "linear-gradient(to right, #2563eb, #9333ea)",
        borderRadius: "0.5rem",
        height: "40px",
        padding: "0 16px",
        fontSize: "14px",
        fontWeight: 500,
      }}
    />
  );
}
