/**
 * Liquid Staking Token Comparison - UPDATED WITH REAL DATA
 * 
 * Now powered by lst-data.ts with accurate API calls
 */

import { getLstComparison as getAccurateLstComparison, type LstProtocol as NewLstProtocol } from './lst-data';

// Legacy interface for backward compatibility
export interface LstProtocol {
  id: string;
  name: string;
  token: string;
  mint: string;
  apy: number;
  baseAPY: number;
  mevBonus: number;
  tvl: number;
  mevShare: "full" | "partial" | "none";
  liquidity: "deep" | "medium" | "low";
  depositFee: number;
  withdrawFee: number;
  instantUnstake: boolean;
  fees: number;
  ratio: number;
  defiIntegrations: string[];
}

export interface LstComparison {
  protocols: LstProtocol[];
  bestForYield: string;
  bestForMev: string;
  bestForLiquidity: string;
  bestForBaseYield: string;
  bestForDecentralization: string;
  recommendation: string;
  yieldBreakdown: string;
  updatedAt: string;
}

// Transform new data format to legacy format for backward compatibility
function transformProtocol(p: NewLstProtocol): LstProtocol {
  return {
    id: p.id,
    name: p.name,
    token: p.token,
    mint: p.mint,
    apy: p.totalAPY,
    baseAPY: p.baseAPY,
    mevBonus: p.mevBonus,
    tvl: p.tvlSol,
    mevShare: p.mevExposure === 'full' ? 'full' : p.mevExposure === 'partial' ? 'partial' : 'none',
    liquidity: p.liquidity,
    depositFee: 0,
    withdrawFee: 0,
    instantUnstake: p.instantUnstake,
    fees: p.fees,
    ratio: p.ratio,
    defiIntegrations: p.defiIntegrations,
  };
}

export async function getLstComparison(): Promise<LstComparison> {
  const accurateData = await getAccurateLstComparison();

  return {
    protocols: accurateData.protocols.map(transformProtocol),
    bestForYield: accurateData.bestForYield,
    bestForMev: accurateData.protocols.find(p => p.mevExposure === 'full')?.id || 'jito',
    bestForLiquidity: accurateData.bestForLiquidity,
    bestForBaseYield: accurateData.bestForBaseYield,
    bestForDecentralization: accurateData.bestForDecentralization,
    recommendation: accurateData.recommendation,
    yieldBreakdown: accurateData.yieldBreakdown,
    updatedAt: accurateData.lastUpdated,
  };
}
