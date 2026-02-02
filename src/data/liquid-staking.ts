/**
 * Liquid Staking Protocol Data
 * 
 * Fetches and compares data across major Solana liquid staking protocols:
 * - Jito (jitoSOL) - Full MEV sharing
 * - Marinade (mSOL) - Largest TVL
 * - BlazeStake (bSOL) - Community-focused
 * - Sanctum (various) - LST aggregator
 */

// ============================================
// Types
// ============================================

export interface LiquidStakingProtocol {
  id: string;
  name: string;
  token: string;
  mint: string;
  website: string;
  
  // Stats
  tvl: number; // Total Value Locked in SOL
  apy: number; // Current APY percentage
  mevShare: 'full' | 'partial' | 'none';
  
  // Token data
  price: number; // Price in SOL
  ratio: number; // How many SOL per LST
  liquidity: 'deep' | 'medium' | 'low';
  
  // Fees
  depositFee: number;
  withdrawFee: number;
  managementFee: number;
  
  // Features
  instantUnstake: boolean;
  defiIntegrations: string[];
}

export interface LiquidStakingComparison {
  protocols: LiquidStakingProtocol[];
  bestForYield: string;
  bestForLiquidity: string;
  bestForMev: string;
  recommendation: string;
  updatedAt: string;
}

// ============================================
// Protocol Configs
// ============================================

const PROTOCOLS: Omit<LiquidStakingProtocol, 'tvl' | 'apy' | 'price' | 'ratio'>[] = [
  {
    id: 'jito',
    name: 'Jito',
    token: 'jitoSOL',
    mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    website: 'https://jito.network',
    mevShare: 'full',
    liquidity: 'deep',
    depositFee: 0,
    withdrawFee: 0,
    managementFee: 0.04, // 4%
    instantUnstake: true,
    defiIntegrations: ['Jupiter', 'Kamino', 'Marinade', 'Orca', 'Raydium'],
  },
  {
    id: 'marinade',
    name: 'Marinade Finance',
    token: 'mSOL',
    mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    website: 'https://marinade.finance',
    mevShare: 'none',
    liquidity: 'deep',
    depositFee: 0,
    withdrawFee: 0,
    managementFee: 0.06, // 6% on rewards
    instantUnstake: true,
    defiIntegrations: ['Jupiter', 'Kamino', 'Orca', 'Raydium', 'Solend'],
  },
  {
    id: 'blaze',
    name: 'BlazeStake',
    token: 'bSOL',
    mint: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
    website: 'https://stake.solblaze.org',
    mevShare: 'partial',
    liquidity: 'medium',
    depositFee: 0,
    withdrawFee: 0,
    managementFee: 0,
    instantUnstake: true,
    defiIntegrations: ['Jupiter', 'Orca', 'Raydium'],
  },
  {
    id: 'sanctum-inf',
    name: 'Sanctum Infinity',
    token: 'INF',
    mint: '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm',
    website: 'https://sanctum.so',
    mevShare: 'partial',
    liquidity: 'medium',
    depositFee: 0,
    withdrawFee: 0,
    managementFee: 0.05,
    instantUnstake: true,
    defiIntegrations: ['Jupiter', 'Kamino'],
  },
];

// ============================================
// Data Fetching
// ============================================

/**
 * Fetch Jito stats from Kobe API
 */
async function fetchJitoStats(): Promise<{ apy: number; tvl: number; ratio: number }> {
  try {
    // Fetch APY from stake pool stats
    const statsRes = await fetch('https://kobe.mainnet.jito.network/api/v1/stake_pool_stats');
    const stats = await statsRes.json() as { stake_pool_stats: { apy: number; tvl: number }[] };
    
    const latest = stats.stake_pool_stats?.[0];
    const apy = latest?.apy || 0;
    const tvl = latest?.tvl || 0;
    
    // Fetch ratio
    const ratioRes = await fetch('https://kobe.mainnet.jito.network/api/v1/jitosol_sol_ratio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const ratioData = await ratioRes.json() as { ratios: { data: number }[] };
    const ratio = ratioData.ratios?.[0]?.data || 1.0;
    
    return { apy: apy * 100, tvl, ratio };
  } catch (error) {
    console.error('Error fetching Jito stats:', error);
    return { apy: 8.0, tvl: 0, ratio: 1.0 };
  }
}

/**
 * Fetch Marinade stats
 */
async function fetchMarinadeStats(): Promise<{ apy: number; tvl: number; ratio: number }> {
  try {
    const res = await fetch('https://api.marinade.finance/tlv');
    const data = await res.json() as { total_sol: number; apy: number; msol_price: number };
    
    return {
      apy: data.apy * 100 || 7.0,
      tvl: data.total_sol || 0,
      ratio: data.msol_price || 1.0,
    };
  } catch (error) {
    console.error('Error fetching Marinade stats:', error);
    return { apy: 7.0, tvl: 0, ratio: 1.0 };
  }
}

/**
 * Fetch BlazeStake stats
 */
async function fetchBlazeStats(): Promise<{ apy: number; tvl: number; ratio: number }> {
  try {
    const res = await fetch('https://stake.solblaze.org/api/v1/stats');
    const data = await res.json() as { apy: number; tvl: number; bsol_supply: number; sol_in_pool: number };
    
    const ratio = data.sol_in_pool && data.bsol_supply 
      ? data.sol_in_pool / data.bsol_supply 
      : 1.0;
    
    return {
      apy: data.apy || 7.2,
      tvl: data.tvl || 0,
      ratio,
    };
  } catch (error) {
    console.error('Error fetching Blaze stats:', error);
    return { apy: 7.2, tvl: 0, ratio: 1.0 };
  }
}

/**
 * Fetch token price from Jupiter
 */
async function fetchTokenPrice(mint: string): Promise<number> {
  try {
    const res = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
    const data = await res.json() as { data: { [key: string]: { price: number } } };
    return data.data?.[mint]?.price || 0;
  } catch {
    return 0;
  }
}

// ============================================
// Main Functions
// ============================================

/**
 * Get comprehensive comparison of all liquid staking protocols
 */
export async function getLiquidStakingComparison(): Promise<LiquidStakingComparison> {
  // Fetch stats in parallel
  const [jitoStats, marinadeStats, blazeStats] = await Promise.all([
    fetchJitoStats(),
    fetchMarinadeStats(),
    fetchBlazeStats(),
  ]);
  
  // Build protocol data
  const protocols: LiquidStakingProtocol[] = PROTOCOLS.map(p => {
    let stats = { apy: 7.0, tvl: 0, ratio: 1.0 };
    
    switch (p.id) {
      case 'jito':
        stats = jitoStats;
        break;
      case 'marinade':
        stats = marinadeStats;
        break;
      case 'blaze':
        stats = blazeStats;
        break;
      case 'sanctum-inf':
        stats = { apy: 7.5, tvl: 0, ratio: 1.0 }; // Default
        break;
    }
    
    return {
      ...p,
      tvl: stats.tvl,
      apy: stats.apy,
      ratio: stats.ratio,
      price: stats.ratio, // Price in SOL
    };
  });
  
  // Sort by APY
  const sortedByApy = [...protocols].sort((a, b) => b.apy - a.apy);
  const sortedByTvl = [...protocols].sort((a, b) => b.tvl - a.tvl);
  
  // Determine bests
  const bestForYield = sortedByApy[0].id;
  const bestForLiquidity = sortedByTvl[0].id;
  const bestForMev = protocols.find(p => p.mevShare === 'full')?.id || 'jito';
  
  // Generate recommendation
  let recommendation = '';
  if (jitoStats.apy > marinadeStats.apy + 0.5) {
    recommendation = `jitoSOL offers the best yield at ${jitoStats.apy.toFixed(2)}% APY with full MEV sharing. `;
  } else {
    recommendation = `Yields are close. mSOL has deeper liquidity, jitoSOL has MEV. `;
  }
  recommendation += `For maximum MEV exposure, choose jitoSOL. For maximum liquidity and DeFi integrations, choose mSOL.`;
  
  return {
    protocols,
    bestForYield,
    bestForLiquidity,
    bestForMev,
    recommendation,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get the best liquid staking option based on criteria
 */
export async function getBestLiquidStaking(
  criteria: 'yield' | 'liquidity' | 'mev' | 'balanced'
): Promise<LiquidStakingProtocol> {
  const comparison = await getLiquidStakingComparison();
  
  switch (criteria) {
    case 'yield':
      return comparison.protocols.find(p => p.id === comparison.bestForYield)!;
    case 'liquidity':
      return comparison.protocols.find(p => p.id === comparison.bestForLiquidity)!;
    case 'mev':
      return comparison.protocols.find(p => p.id === comparison.bestForMev)!;
    case 'balanced':
    default:
      // Score each protocol
      const scored = comparison.protocols.map(p => ({
        ...p,
        score: p.apy * 10 + (p.mevShare === 'full' ? 20 : p.mevShare === 'partial' ? 10 : 0) + 
               (p.liquidity === 'deep' ? 15 : p.liquidity === 'medium' ? 10 : 5),
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored[0];
  }
}

/**
 * Calculate optimal allocation across liquid staking protocols
 */
export function calculateOptimalAllocation(
  amount: number, // SOL amount
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
): { protocol: string; allocation: number; amount: number }[] {
  switch (riskTolerance) {
    case 'conservative':
      // Heavy on mSOL (most liquid), some jitoSOL
      return [
        { protocol: 'marinade', allocation: 0.6, amount: amount * 0.6 },
        { protocol: 'jito', allocation: 0.3, amount: amount * 0.3 },
        { protocol: 'blaze', allocation: 0.1, amount: amount * 0.1 },
      ];
    
    case 'moderate':
      // Balanced between mSOL and jitoSOL
      return [
        { protocol: 'jito', allocation: 0.5, amount: amount * 0.5 },
        { protocol: 'marinade', allocation: 0.35, amount: amount * 0.35 },
        { protocol: 'blaze', allocation: 0.15, amount: amount * 0.15 },
      ];
    
    case 'aggressive':
      // Heavy on jitoSOL for max MEV
      return [
        { protocol: 'jito', allocation: 0.7, amount: amount * 0.7 },
        { protocol: 'sanctum-inf', allocation: 0.2, amount: amount * 0.2 },
        { protocol: 'blaze', allocation: 0.1, amount: amount * 0.1 },
      ];
  }
}
