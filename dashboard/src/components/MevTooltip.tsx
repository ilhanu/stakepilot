"use client";

import { useState, ReactNode } from "react";

interface MevTooltipProps {
  term: string;
  children: ReactNode;
}

const MEV_GLOSSARY: Record<string, { title: string; description: string; example?: string }> = {
  mev: {
    title: "MEV (Maximal Extractable Value)",
    description: "The maximum value that can be extracted from block production beyond standard block rewards. On Solana, this comes from transaction ordering and bundle tips.",
    example: "When traders pay tips for priority execution, validators earn MEV."
  },
  bam: {
    title: "BAM (Block Auction Market)",
    description: "Jito's system introduced in JIP-31 that distributes MEV rewards to stakers, not just validators. Launched at epoch 912 (Dec 2024).",
    example: "With BAM, your staked SOL earns a share of MEV tips."
  },
  jitosol: {
    title: "jitoSOL",
    description: "Jito's liquid staking token. Holders receive full MEV rewards on top of base staking yield, making it typically the highest-yielding LST on Solana.",
    example: "1 jitoSOL ≈ 1.25 SOL (including accrued rewards)"
  },
  epoch: {
    title: "Epoch",
    description: "A period of approximately 2-3 days on Solana during which validator rewards are calculated. There are about 146 epochs per year.",
    example: "MEV data is aggregated and distributed each epoch."
  },
  bundle: {
    title: "Bundle",
    description: "A group of transactions submitted together to Jito's Block Engine. Bundles execute atomically (all or nothing) and include a tip.",
    example: "Searchers pay tips for their bundles to be included."
  },
  searcher: {
    title: "Searcher",
    description: "A trader or bot that identifies MEV opportunities and submits bundles to capture value from arbitrage, liquidations, or other strategies.",
    example: "Searchers compete to find profitable trading opportunities."
  },
  arbitrage: {
    title: "Arbitrage",
    description: "Profiting from price differences between exchanges or pools. On Solana, this is a major source of MEV.",
    example: "Buy on Orca at $100, sell on Raydium at $101 = $1 profit"
  },
  sandwich: {
    title: "Sandwich Attack",
    description: "A harmful MEV strategy where a searcher front-runs and back-runs a user's trade, extracting value. This is what MEV protection prevents.",
    example: "Attacker buys before you, sells after you, profiting from your slippage."
  },
  lst: {
    title: "LST (Liquid Staking Token)",
    description: "A token representing staked SOL that remains liquid and tradeable. Examples: jitoSOL, mSOL, bSOL.",
    example: "Stake SOL → Get jitoSOL → Use in DeFi while earning yield"
  },
  commission: {
    title: "Validator Commission",
    description: "The percentage of staking/MEV rewards that validators keep before distributing to stakers. Lower is better for stakers.",
    example: "5% commission means stakers get 95% of rewards."
  },
  apy: {
    title: "APY (Annual Percentage Yield)",
    description: "The annualized return including compounding. For staking, this includes base rewards plus any MEV share.",
    example: "8% APY means 100 SOL becomes 108 SOL after 1 year (with compounding)."
  },
  "mev-share": {
    title: "MEV Share",
    description: "Whether an LST or validator passes MEV rewards to stakers. jitoSOL has full MEV share; mSOL has none.",
    example: "Full MEV share = higher potential yield."
  },
  "priority-fee": {
    title: "Priority Fee",
    description: "Extra fee users pay for faster transaction inclusion. Higher priority fees = transactions processed sooner.",
    example: "During congestion, priority fees can be 100x normal."
  },
  "block-engine": {
    title: "Jito Block Engine",
    description: "Jito's infrastructure that receives bundles from searchers, runs auctions, and forwards winning bundles to validators.",
    example: "~90% of Solana stake uses Jito's Block Engine."
  },
  stake: {
    title: "Active Stake",
    description: "The amount of SOL delegated to a validator. Higher stake = more frequent block production = more MEV opportunities.",
    example: "Top validators have millions of SOL staked."
  },
};

export function MevTooltip({ term, children }: MevTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const glossaryEntry = MEV_GLOSSARY[term.toLowerCase()];
  
  if (!glossaryEntry) {
    return <>{children}</>;
  }

  return (
    <span className="relative inline-block">
      <span
        className="border-b border-dashed border-gray-500 cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
      </span>
      
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-lg bg-gray-900 border border-gray-700 shadow-xl">
          <div className="font-semibold text-white mb-1">
            {glossaryEntry.title}
          </div>
          <p className="text-sm text-gray-300 mb-2">
            {glossaryEntry.description}
          </p>
          {glossaryEntry.example && (
            <p className="text-xs text-gray-500 italic">
              💡 {glossaryEntry.example}
            </p>
          )}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-r border-b border-gray-700"></div>
        </div>
      )}
    </span>
  );
}

// Standalone glossary component
export function MevGlossary() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredTerms = Object.entries(MEV_GLOSSARY).filter(
    ([key, value]) =>
      key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      value.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      value.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search terms..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTerms.map(([key, entry]) => (
          <div
            key={key}
            className="p-4 rounded-lg bg-gray-800/50 border border-gray-700"
          >
            <div className="font-semibold text-white mb-1">
              {entry.title}
            </div>
            <p className="text-sm text-gray-400 mb-2">
              {entry.description}
            </p>
            {entry.example && (
              <p className="text-xs text-gray-500 italic">
                💡 {entry.example}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
