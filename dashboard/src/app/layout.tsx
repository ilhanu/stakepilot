import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "StakePilot - Autonomous Staking Vault",
  description:
    "Deposit SOL, set your strategy, let AI optimize your staking. You're always in control.",
  keywords: [
    "Solana",
    "staking",
    "AI",
    "autonomous",
    "vault",
    "yield",
    "DeFi",
    "agent",
  ],
  openGraph: {
    title: "StakePilot - Autonomous Staking Vault",
    description:
      "AI-powered staking optimization for Solana. Set your strategy, agent executes.",
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
        <WalletProvider>
          <Header />
          <main>{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
