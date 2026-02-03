/**
 * LST Data Layer - REAL APIs, REAL DATA
 * 
 * The Three Pillars of StakePilot:
 * 1. YIELD TRUTH - Real APY from real APIs
 * 2. VALIDATOR DISCOVERY - Find rising stars
 * 3. SMART ROUTING - Optimal stake allocation
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LstProtocol {
  id: 'jito' | 'marinade' | 'blaze';
  name: string;
  token: string;
  mint: string;
  baseAPY: number;          // The guaranteed staking yield (~6-7%)
  mevBonus: number;         // Additional MEV rewards (Jito only has this as a distinct bonus)
  totalAPY: number;         // baseAPY + mevBonus (what you actually get)
  fees: number;             // Protocol fee %
  tvlSol: number;           // Total staked in SOL
  ratio: number;            // Token/SOL conversion rate
  liquidity: 'deep' | 'medium' | 'low';
  mevExposure: 'full' | 'partial' | 'none';
  instantUnstake: boolean;
  defiIntegrations: string[];
}

export interface LstHistoricalData {
  date: string;
  apy: number;
  tvl: number;
  ratio?: number;
}

export interface LstComparison {
  protocols: LstProtocol[];
  historical: {
    jito: LstHistoricalData[];
    marinade: LstHistoricalData[];
    blaze: LstHistoricalData[];
  };
  bestForYield: 'jito' | 'marinade' | 'blaze';
  bestForBaseYield: 'jito' | 'marinade' | 'blaze';
  bestForLiquidity: 'jito' | 'marinade' | 'blaze';
  bestForDecentralization: 'jito' | 'marinade' | 'blaze';
  recommendation: string;
  yieldBreakdown: string;
  lastUpdated: string;
}

// ============================================================================
// JITO - Full MEV Exposure
// ============================================================================

interface JitoStakePoolStats {
  aggregated_mev_rewards: number;
  mev_rewards: { data: number; date: string }[];
  tvl: { data: number; date: string }[];
  apy: { data: number; date: string }[];
  supply: { data: number; date: string }[];
  num_validators: { data: number; date: string }[];
}

interface JitoRatioResponse {
  ratios: { data: number; date: string }[];
}

async function fetchJitoData(): Promise<{
  baseAPY: number;
  mevBonus: number;
  totalAPY: number;
  tvlSol: number;
  ratio: number;
  historical: LstHistoricalData[];
  validators: number;
}> {
  try {
    const [statsRes, ratioRes] = await Promise.all([
      fetch('https://kobe.mainnet.jito.network/api/v1/stake_pool_stats', { 
        next: { revalidate: 300 }
      }),
      fetch('https://kobe.mainnet.jito.network/api/v1/jitosol_sol_ratio', { 
        next: { revalidate: 300 }
      }),
    ]);

    const stats: JitoStakePoolStats = await statsRes.json();
    const ratioData: JitoRatioResponse = await ratioRes.json();

    // Latest data points
    const latestApy = stats.apy[stats.apy.length - 1]?.data || 0.0589;
    const latestTvl = stats.tvl[stats.tvl.length - 1]?.data || 14000000000000000;
    const latestRatio = ratioData.ratios[ratioData.ratios.length - 1]?.data || 1.259;
    const latestValidators = stats.num_validators[stats.num_validators.length - 1]?.data || 780;

    // Jito's reported APY already includes both base staking AND MEV rewards combined
    // Their API returns the total effective APY that jitoSOL holders receive
    // 
    // To estimate the MEV component:
    // - Compare to Marinade's pure staking APY (no MEV) as baseline
    // - Or use inflation rate (~5.5-6%) as conservative base estimate
    //
    // For transparency, we show:
    // - totalAPY: What Jito reports (the actual yield including MEV)
    // - baseAPY: Estimated staking component (similar to other LSTs)
    // - mevBonus: Estimated MEV contribution (totalAPY - estimated base, or 0 if negative)
    const totalApy = latestApy;
    
    // Conservative base estimate: typical Solana staking is ~5.5-6%
    // We use 5.5% to be conservative (ensures MEV bonus shows as positive when it exists)
    const conservativeBase = 0.055;
    const mevBonus = Math.max(0, totalApy - conservativeBase);
    const baseApyEstimate = totalApy - mevBonus;

    // Historical data (last 7 days available)
    const historical: LstHistoricalData[] = stats.apy.map((apyPoint, i) => ({
      date: apyPoint.date,
      apy: apyPoint.data * 100,
      tvl: (stats.tvl[i]?.data || 0) / 1e9, // Convert lamports to SOL
      ratio: ratioData.ratios[i]?.data,
    }));

    return {
      baseAPY: baseApyEstimate * 100,
      mevBonus: mevBonus * 100,
      totalAPY: totalApy * 100,
      tvlSol: latestTvl / 1e9, // Convert lamports to SOL
      ratio: latestRatio,
      historical,
      validators: latestValidators,
    };
  } catch (error) {
    console.error('Failed to fetch Jito data:', error);
    // Fallback values
    return {
      baseAPY: 6.0,
      mevBonus: 0.93,
      totalAPY: 6.93,
      tvlSol: 14248978,
      ratio: 1.259,
      historical: [],
      validators: 780,
    };
  }
}

// ============================================================================
// MARINADE - Delegated Stake, No MEV
// ============================================================================

interface MarinadeApyResponse {
  value: number;
  end_time: string;
  end_price: number;
  start_time: string;
  start_price: number;
}

interface MarinadeTlvResponse {
  staked_sol: number;
  total_sol: number;
  marinade_native_stake_sol: number;
}

async function fetchMarinadeData(): Promise<{
  baseAPY: number;
  tvlSol: number;
  ratio: number;
  historical: LstHistoricalData[];
}> {
  try {
    const [apyRes, tlvRes] = await Promise.all([
      fetch('https://api.marinade.finance/msol/apy/30d', { 
        next: { revalidate: 300 }
      }),
      fetch('https://api.marinade.finance/tlv', { 
        next: { revalidate: 300 }
      }),
    ]);

    const apyData: MarinadeApyResponse = await apyRes.json();
    const tlvData: MarinadeTlvResponse = await tlvRes.json();

    // APY is returned as decimal (0.0608 = 6.08%)
    const apy = apyData.value * 100;
    
    // Ratio calculated from prices
    const ratio = apyData.end_price; // mSOL/SOL ratio

    // Marinade doesn't have historical API, but we can use the 30d APY
    const historical: LstHistoricalData[] = [{
      date: apyData.start_time,
      apy: apy,
      tvl: tlvData.staked_sol,
      ratio: apyData.start_price,
    }, {
      date: apyData.end_time,
      apy: apy,
      tvl: tlvData.staked_sol,
      ratio: apyData.end_price,
    }];

    return {
      baseAPY: apy,
      tvlSol: tlvData.staked_sol,
      ratio: ratio,
      historical,
    };
  } catch (error) {
    console.error('Failed to fetch Marinade data:', error);
    return {
      baseAPY: 6.08,
      tvlSol: 3427406,
      ratio: 1.358,
      historical: [],
    };
  }
}

// ============================================================================
// BLAZESTAKE - Community Gauges
// ============================================================================

interface BlazeStatsResponse {
  success: boolean;
  stats: {
    conversion: {
      bsol_to_sol: number;
      sol_to_bsol: number;
    };
    apy: {
      base: number;
      blze: number;
      total: number;
      defi: number;
      lending: number;
      liquidity: number;
    };
    gauges: {
      sol_total: number;
    };
  };
}

async function fetchBlazeData(): Promise<{
  baseAPY: number;
  bonusAPY: number;
  totalAPY: number;
  tvlSol: number;
  ratio: number;
  defiYield: number;
}> {
  try {
    const res = await fetch('https://stake.solblaze.org/api/v1/stats', { 
      next: { revalidate: 300 }
    });
    const data: BlazeStatsResponse = await res.json();

    if (!data.success) throw new Error('BlazeStake API error');

    return {
      baseAPY: data.stats.apy.base,
      bonusAPY: data.stats.apy.blze,
      totalAPY: data.stats.apy.total,
      tvlSol: data.stats.gauges.sol_total,
      ratio: data.stats.conversion.bsol_to_sol,
      defiYield: data.stats.apy.defi,
    };
  } catch (error) {
    console.error('Failed to fetch BlazeStake data:', error);
    return {
      baseAPY: 6.09,
      bonusAPY: 0.01,
      totalAPY: 6.10,
      tvlSol: 109393,
      ratio: 1.274,
      defiYield: 1.25,
    };
  }
}

// ============================================================================
// COMPARISON ENGINE
// ============================================================================

export async function getLstComparison(): Promise<LstComparison> {
  const [jitoData, marinadeData, blazeData] = await Promise.all([
    fetchJitoData(),
    fetchMarinadeData(),
    fetchBlazeData(),
  ]);

  const protocols: LstProtocol[] = [
    {
      id: 'jito',
      name: 'Jito',
      token: 'jitoSOL',
      mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
      baseAPY: jitoData.baseAPY,
      mevBonus: jitoData.mevBonus,
      totalAPY: jitoData.totalAPY,
      fees: 4, // 4% of rewards
      tvlSol: jitoData.tvlSol,
      ratio: jitoData.ratio,
      liquidity: 'deep',
      mevExposure: 'full',
      instantUnstake: true,
      defiIntegrations: ['Jupiter', 'Orca', 'Raydium', 'Kamino', 'Drift', 'MarginFi'],
    },
    {
      id: 'marinade',
      name: 'Marinade',
      token: 'mSOL',
      mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
      baseAPY: marinadeData.baseAPY,
      mevBonus: 0, // No MEV sharing
      totalAPY: marinadeData.baseAPY,
      fees: 2, // 2% of rewards
      tvlSol: marinadeData.tvlSol,
      ratio: marinadeData.ratio,
      liquidity: 'deep',
      mevExposure: 'none',
      instantUnstake: true,
      defiIntegrations: ['Jupiter', 'Orca', 'Raydium', 'Kamino', 'Solend', 'Mango'],
    },
    {
      id: 'blaze',
      name: 'BlazeStake',
      token: 'bSOL',
      mint: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
      baseAPY: blazeData.baseAPY,
      mevBonus: blazeData.bonusAPY, // BLZE token bonus
      totalAPY: blazeData.totalAPY,
      fees: 3, // 3% of rewards
      tvlSol: blazeData.tvlSol,
      ratio: blazeData.ratio,
      liquidity: 'medium',
      mevExposure: 'partial', // Community gauges
      instantUnstake: true,
      defiIntegrations: ['Jupiter', 'Orca', 'Raydium', 'Solend'],
    },
  ];

  // Determine bests
  const sortedByTotal = [...protocols].sort((a, b) => b.totalAPY - a.totalAPY);
  const sortedByBase = [...protocols].sort((a, b) => b.baseAPY - a.baseAPY);
  const sortedByTvl = [...protocols].sort((a, b) => b.tvlSol - a.tvlSol);

  const bestForYield = sortedByTotal[0].id;
  const bestForBaseYield = sortedByBase[0].id;
  const bestForLiquidity = sortedByTvl[0].id;
  const bestForDecentralization = 'marinade'; // Marinade delegates to 400+ validators

  // Generate smart recommendation
  const yieldDiff = jitoData.totalAPY - marinadeData.baseAPY;
  let recommendation: string;
  let yieldBreakdown: string;

  if (yieldDiff > 0.5) {
    recommendation = `jitoSOL offers ${yieldDiff.toFixed(2)}% more yield with MEV exposure. Best for yield-focused stakers.`;
  } else if (yieldDiff < -0.2) {
    recommendation = `mSOL has competitive yield with deeper liquidity. Great for DeFi composability.`;
  } else {
    recommendation = `Yields are close. jitoSOL for MEV exposure, mSOL for liquidity, bSOL for gauge incentives.`;
  }

  yieldBreakdown = `Base staking: ~${blazeData.baseAPY.toFixed(1)}% • jitoSOL MEV bonus: +${jitoData.mevBonus.toFixed(2)}% • bSOL BLZE bonus: +${blazeData.bonusAPY.toFixed(2)}%`;

  return {
    protocols,
    historical: {
      jito: jitoData.historical,
      marinade: marinadeData.historical,
      blaze: [], // BlazeStake doesn't provide historical API
    },
    bestForYield,
    bestForBaseYield,
    bestForLiquidity,
    bestForDecentralization,
    recommendation,
    yieldBreakdown,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// SMART ROUTING
// ============================================================================

export interface StakeRouteInput {
  amount: number; // SOL
  riskTolerance: 'low' | 'medium' | 'high';
  decentralizationPriority: 'low' | 'medium' | 'high';
  liquidityNeed: 'low' | 'medium' | 'high';
}

export interface StakeAllocation {
  protocol: 'jito' | 'marinade' | 'blaze' | 'native';
  token: string;
  amount: number;
  percentage: number;
  reason: string;
  expectedAPY: number;
}

export interface StakeRoute {
  allocations: StakeAllocation[];
  totalExpectedAPY: number;
  decentralizationScore: 'A' | 'B' | 'C' | 'D';
  reasoning: string[];
}

export async function calculateSmartRoute(
  input: StakeRouteInput,
  lstData: LstComparison
): Promise<StakeRoute> {
  const { amount, riskTolerance, decentralizationPriority, liquidityNeed } = input;
  const allocations: StakeAllocation[] = [];
  const reasoning: string[] = [];

  // Get protocol data
  const jito = lstData.protocols.find(p => p.id === 'jito')!;
  const marinade = lstData.protocols.find(p => p.id === 'marinade')!;
  const blaze = lstData.protocols.find(p => p.id === 'blaze')!;

  // Calculate weights based on priorities
  let jitoWeight = 0;
  let marinadeWeight = 0;
  let blazeWeight = 0;

  // Risk tolerance affects MEV exposure
  if (riskTolerance === 'high') {
    jitoWeight += 40;
    reasoning.push('High risk tolerance → more jitoSOL for MEV exposure');
  } else if (riskTolerance === 'low') {
    marinadeWeight += 30;
    reasoning.push('Low risk tolerance → more mSOL for stable base yield');
  } else {
    jitoWeight += 25;
    marinadeWeight += 15;
  }

  // Decentralization priority
  if (decentralizationPriority === 'high') {
    marinadeWeight += 30;
    blazeWeight += 15;
    reasoning.push('High decentralization priority → mSOL delegates to 400+ validators');
  } else if (decentralizationPriority === 'low') {
    jitoWeight += 20;
    reasoning.push('Lower decentralization priority → focus on yield');
  } else {
    marinadeWeight += 15;
    blazeWeight += 10;
  }

  // Liquidity needs
  if (liquidityNeed === 'high') {
    marinadeWeight += 25;
    jitoWeight += 15;
    reasoning.push('High liquidity need → deep pools for mSOL and jitoSOL');
  } else if (liquidityNeed === 'low') {
    blazeWeight += 15;
    reasoning.push('Lower liquidity need → can use bSOL for gauge incentives');
  } else {
    marinadeWeight += 10;
    jitoWeight += 10;
  }

  // Normalize weights
  const totalWeight = jitoWeight + marinadeWeight + blazeWeight;
  if (totalWeight > 0) {
    const jitoAlloc = Math.round((jitoWeight / totalWeight) * 100);
    const marinadeAlloc = Math.round((marinadeWeight / totalWeight) * 100);
    const blazeAlloc = 100 - jitoAlloc - marinadeAlloc;

    if (jitoAlloc > 0) {
      allocations.push({
        protocol: 'jito',
        token: 'jitoSOL',
        amount: (amount * jitoAlloc) / 100,
        percentage: jitoAlloc,
        reason: 'MEV exposure for higher yield',
        expectedAPY: jito.totalAPY,
      });
    }

    if (marinadeAlloc > 0) {
      allocations.push({
        protocol: 'marinade',
        token: 'mSOL',
        amount: (amount * marinadeAlloc) / 100,
        percentage: marinadeAlloc,
        reason: 'Stable yield with deep liquidity',
        expectedAPY: marinade.totalAPY,
      });
    }

    if (blazeAlloc > 0) {
      allocations.push({
        protocol: 'blaze',
        token: 'bSOL',
        amount: (amount * blazeAlloc) / 100,
        percentage: blazeAlloc,
        reason: 'BLZE gauge incentives',
        expectedAPY: blaze.totalAPY,
      });
    }
  }

  // Calculate total expected APY
  const totalExpectedAPY = allocations.reduce(
    (sum, a) => sum + (a.percentage / 100) * a.expectedAPY,
    0
  );

  // Calculate decentralization score
  const marinadePercent = allocations.find(a => a.protocol === 'marinade')?.percentage || 0;
  const blazePercent = allocations.find(a => a.protocol === 'blaze')?.percentage || 0;
  const decentralScore = marinadePercent + blazePercent * 0.5;
  
  let decentralizationScore: 'A' | 'B' | 'C' | 'D';
  if (decentralScore >= 50) decentralizationScore = 'A';
  else if (decentralScore >= 30) decentralizationScore = 'B';
  else if (decentralScore >= 15) decentralizationScore = 'C';
  else decentralizationScore = 'D';

  return {
    allocations,
    totalExpectedAPY,
    decentralizationScore,
    reasoning,
  };
}
