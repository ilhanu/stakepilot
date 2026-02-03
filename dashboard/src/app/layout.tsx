import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "StakePilot - MEV-Aware Staking Autopilot for Solana",
  description:
    "Optimize your Solana staking yield with real-time MEV data, validator scoring, and liquid staking comparison.",
  keywords: [
    "Solana",
    "staking",
    "MEV",
    "Jito",
    "JIP-31",
    "jitoSOL",
    "mSOL",
    "yield",
    "DeFi",
  ],
  openGraph: {
    title: "StakePilot - MEV-Aware Staking Autopilot",
    description:
      "Real-time MEV tracking and yield optimization for Solana stakers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
