/**
 * Liquid Staking Token Comparison
 */

export interface LstProtocol {
  id: string;
  name: string;
  token: string;
  mint: string;
  apy: number;
  tvl: number;
  mevShare: "full" | "partial" | "none";
  liquidity: "deep" | "medium" | "low";
  depositFee: number;
  withdrawFee: number;
  instantUnstake: boolean;
}

export interface LstComparison {
  protocols: LstProtocol[];
  bestForYield: string;
  bestForMev: string;
  bestForLiquidity: string;
  recommendation: string;
  updatedAt: string;
}

async function fetchJitoStats(): Promise<{
  apy: number;
  tvl: number;
}> {
  try {
    const res = await fetch(
      "https://kobe.mainnet.jito.network/api/v1/stake_pool_stats",
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    const latest = data.stake_pool_stats?.[0];
    return {
      apy: (latest?.apy || 0.08) * 100,
      tvl: latest?.tvl || 0,
    };
  } catch {
    return { apy: 8.0, tvl: 15_000_000 };
  }
}

async function fetchMarinadeStats(): Promise<{
  apy: number;
  tvl: number;
}> {
  try {
    const res = await fetch("https://api.marinade.finance/tlv", {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    return {
      apy: (data.apy || 0.07) * 100,
      tvl: data.total_sol || 0,
    };
  } catch {
    return { apy: 7.0, tvl: 8_000_000 };
  }
}

export async function getLstComparison(): Promise<LstComparison> {
  const [jitoStats, marinadeStats] = await Promise.all([
    fetchJitoStats(),
    fetchMarinadeStats(),
  ]);

  const protocols: LstProtocol[] = [
    {
      id: "jito",
      name: "Jito",
      token: "jitoSOL",
      mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      apy: jitoStats.apy,
      tvl: jitoStats.tvl,
      mevShare: "full",
      liquidity: "deep",
      depositFee: 0,
      withdrawFee: 0,
      instantUnstake: true,
    },
    {
      id: "marinade",
      name: "Marinade",
      token: "mSOL",
      mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      apy: marinadeStats.apy,
      tvl: marinadeStats.tvl,
      mevShare: "none",
      liquidity: "deep",
      depositFee: 0,
      withdrawFee: 0,
      instantUnstake: true,
    },
    {
      id: "blaze",
      name: "BlazeStake",
      token: "bSOL",
      mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      apy: 7.4,
      tvl: 2_500_000,
      mevShare: "partial",
      liquidity: "medium",
      depositFee: 0,
      withdrawFee: 0,
      instantUnstake: true,
    },
    {
      id: "sanctum",
      name: "Sanctum INF",
      token: "INF",
      mint: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
      apy: 7.5,
      tvl: 1_000_000,
      mevShare: "partial",
      liquidity: "medium",
      depositFee: 0,
      withdrawFee: 0,
      instantUnstake: true,
    },
  ];

  // Sort by APY for ranking
  const sortedByApy = [...protocols].sort((a, b) => b.apy - a.apy);
  const sortedByTvl = [...protocols].sort((a, b) => b.tvl - a.tvl);

  const bestForYield = sortedByApy[0].id;
  const bestForLiquidity = sortedByTvl[0].id;
  const bestForMev = protocols.find((p) => p.mevShare === "full")?.id || "jito";

  let recommendation = "";
  if (jitoStats.apy > marinadeStats.apy + 0.5) {
    recommendation = `jitoSOL offers the best yield at ${jitoStats.apy.toFixed(
      2
    )}% APY with full MEV sharing.`;
  } else {
    recommendation = `Yields are close. mSOL has deeper liquidity, jitoSOL has MEV.`;
  }

  return {
    protocols,
    bestForYield,
    bestForMev,
    bestForLiquidity,
    recommendation,
    updatedAt: new Date().toISOString(),
  };
}
