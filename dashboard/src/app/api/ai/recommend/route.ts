import { NextRequest, NextResponse } from "next/server";

interface RecommendationRequest {
  amount: number;
  riskTolerance: "conservative" | "balanced" | "aggressive";
  goals: ("yield" | "decentralization" | "liquidity" | "mev")[];
  currentPositions?: { protocol: string; amount: number }[];
}

interface Allocation {
  target: string;
  type: "lst" | "native" | "defi";
  percentage: number;
  expectedApy: number;
  mevExposure: "full" | "partial" | "none";
  reasoning: string;
}

interface Recommendation {
  strategy: string;
  allocations: Allocation[];
  expectedApy: number;
  riskScore: number;
  rebalanceActions?: { action: string; from?: string; to: string; amount: number }[];
  insights: string[];
}

// Real APY data (would come from APIs in production)
const CURRENT_YIELDS = {
  jitoSOL: { apy: 7.65, mev: 1.2 },
  mSOL: { apy: 6.08, mev: 0 },
  bSOL: { apy: 6.1, mev: 0.3 },
  nativeTop: { apy: 7.2, mev: 0.8 },
  nativeRising: { apy: 8.5, mev: 1.5 },
  nativeMevMax: { apy: 9.2, mev: 2.1 },
  defiLP: { apy: 12.0, mev: 0 },
  defiHighRisk: { apy: 18.0, mev: 0 },
};

export async function POST(request: NextRequest) {
  try {
    const body: RecommendationRequest = await request.json();
    const { amount, riskTolerance, goals = ["yield"], currentPositions = [] } = body;

    // Calculate recommendation based on risk and goals
    const recommendation = generateRecommendation(amount, riskTolerance, goals);
    
    // If user has existing positions, suggest rebalancing
    if (currentPositions.length > 0) {
      recommendation.rebalanceActions = calculateRebalanceActions(
        currentPositions,
        recommendation.allocations,
        amount
      );
    }

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("AI recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}

function generateRecommendation(
  amount: number,
  risk: "conservative" | "balanced" | "aggressive",
  goals: string[]
): Recommendation {
  const wantsMev = goals.includes("mev");
  const wantsDecentralization = goals.includes("decentralization");
  const wantsLiquidity = goals.includes("liquidity");

  let allocations: Allocation[] = [];
  let strategyName = "";
  let insights: string[] = [];

  switch (risk) {
    case "conservative":
      strategyName = "🛡️ Safe Harbor Strategy";
      allocations = [
        {
          target: "mSOL (Marinade)",
          type: "lst",
          percentage: 50,
          expectedApy: CURRENT_YIELDS.mSOL.apy,
          mevExposure: "none",
          reasoning: "Largest Solana LST with deep liquidity and battle-tested contracts",
        },
        {
          target: "jitoSOL (Jito)",
          type: "lst",
          percentage: 35,
          expectedApy: CURRENT_YIELDS.jitoSOL.apy,
          mevExposure: "full",
          reasoning: "Full MEV redistribution adds ~1.2% extra yield with minimal extra risk",
        },
        {
          target: "Native Stake (Top 5 Validators)",
          type: "native",
          percentage: 15,
          expectedApy: CURRENT_YIELDS.nativeTop.apy,
          mevExposure: "partial",
          reasoning: "Direct staking with established validators, no smart contract risk",
        },
      ];
      insights = [
        "Your portfolio prioritizes capital preservation with established protocols",
        "MEV exposure through jitoSOL adds yield without increasing smart contract risk",
        "Consider increasing jitoSOL allocation if comfortable with more MEV exposure",
      ];
      break;

    case "balanced":
      strategyName = "⚖️ Yield Optimizer Strategy";
      allocations = [
        {
          target: "jitoSOL (Jito)",
          type: "lst",
          percentage: 40,
          expectedApy: CURRENT_YIELDS.jitoSOL.apy,
          mevExposure: "full",
          reasoning: "Full MEV capture with deep liquidity - best risk-adjusted yield",
        },
        {
          target: "Native Stake (Rising Stars)",
          type: "native",
          percentage: 25,
          expectedApy: CURRENT_YIELDS.nativeRising.apy,
          mevExposure: "full",
          reasoning: "High-potential validators with strong MEV performance, supports decentralization",
        },
        {
          target: "bSOL (BlazeStake)",
          type: "lst",
          percentage: 20,
          expectedApy: CURRENT_YIELDS.bSOL.apy,
          mevExposure: "partial",
          reasoning: "Delegation to smaller validators, community-driven protocol",
        },
        {
          target: "mSOL-SOL LP (Orca)",
          type: "defi",
          percentage: 15,
          expectedApy: CURRENT_YIELDS.defiLP.apy,
          mevExposure: "none",
          reasoning: "Concentrated liquidity pool adds DeFi yield layer",
        },
      ];
      insights = [
        "This portfolio balances MEV capture with decentralization support",
        "Rising Star validators currently outperforming large validators by 1.3% APY",
        "DeFi LP component adds yield but introduces impermanent loss risk",
        "Consider monitoring Rising Stars monthly for commission changes",
      ];
      break;

    case "aggressive":
      strategyName = "🚀 Alpha Hunter Strategy";
      allocations = [
        {
          target: "Native Stake (MEV Maximizers)",
          type: "native",
          percentage: 35,
          expectedApy: CURRENT_YIELDS.nativeMevMax.apy,
          mevExposure: "full",
          reasoning: "Top MEV-earning validators with 100% reward pass-through",
        },
        {
          target: "jitoSOL (Jito)",
          type: "lst",
          percentage: 25,
          expectedApy: CURRENT_YIELDS.jitoSOL.apy,
          mevExposure: "full",
          reasoning: "Liquid MEV exposure for flexibility",
        },
        {
          target: "Rising Stars (High Growth)",
          type: "native",
          percentage: 25,
          expectedApy: CURRENT_YIELDS.nativeRising.apy + 0.5,
          mevExposure: "full",
          reasoning: "Emerging validators with momentum - higher risk/reward",
        },
        {
          target: "High-APR DeFi Vaults",
          type: "defi",
          percentage: 15,
          expectedApy: CURRENT_YIELDS.defiHighRisk.apy,
          mevExposure: "none",
          reasoning: "Leverage and concentrated positions for maximum yield",
        },
      ];
      insights = [
        "⚠️ High-risk strategy - monitor positions actively",
        "MEV Maximizer validators may have concentrated stake - watch for slashing risk",
        "DeFi vault APRs can be volatile - actual returns may vary significantly",
        "Consider setting stop-loss rules for DeFi positions",
        "This strategy assumes high attention and quick response to market changes",
      ];
      break;
  }

  // Adjust based on goals
  if (wantsDecentralization && risk !== "conservative") {
    insights.push(
      "🌍 Your decentralization preference is reflected in Rising Star allocations"
    );
  }

  if (wantsMev) {
    const mevAllocPct = allocations
      .filter((a) => a.mevExposure === "full")
      .reduce((sum, a) => sum + a.percentage, 0);
    insights.push(
      `💎 ${mevAllocPct}% of your portfolio captures full MEV rewards`
    );
  }

  if (wantsLiquidity) {
    const lstPct = allocations
      .filter((a) => a.type === "lst")
      .reduce((sum, a) => sum + a.percentage, 0);
    insights.push(
      `💧 ${lstPct}% in liquid staking tokens for instant withdrawals`
    );
  }

  // Calculate weighted APY
  const expectedApy =
    allocations.reduce((sum, a) => sum + a.expectedApy * a.percentage, 0) / 100;

  // Risk score (1-10)
  const riskScore =
    risk === "conservative" ? 3 : risk === "balanced" ? 5 : 8;

  return {
    strategy: strategyName,
    allocations,
    expectedApy: Math.round(expectedApy * 100) / 100,
    riskScore,
    insights,
  };
}

function calculateRebalanceActions(
  current: { protocol: string; amount: number }[],
  target: Allocation[],
  totalAmount: number
): { action: string; from?: string; to: string; amount: number }[] {
  const actions: { action: string; from?: string; to: string; amount: number }[] = [];

  // Map current positions
  const currentMap = new Map(
    current.map((p) => [p.protocol.toLowerCase(), p.amount])
  );

  // Calculate target amounts
  for (const alloc of target) {
    const targetAmount = (totalAmount * alloc.percentage) / 100;
    const currentAmount = currentMap.get(alloc.target.toLowerCase()) || 0;
    const diff = targetAmount - currentAmount;

    if (Math.abs(diff) > 0.01 * totalAmount) {
      // Only suggest if >1% difference
      if (diff > 0) {
        actions.push({
          action: "increase",
          to: alloc.target,
          amount: Math.round(diff * 100) / 100,
        });
      } else {
        actions.push({
          action: "decrease",
          from: alloc.target,
          to: "rebalance pool",
          amount: Math.round(-diff * 100) / 100,
        });
      }
    }
  }

  return actions;
}

// GET endpoint for simple yield comparison
export async function GET() {
  const comparison = {
    protocols: [
      {
        name: "jitoSOL",
        type: "lst",
        apy: CURRENT_YIELDS.jitoSOL.apy,
        mevApy: CURRENT_YIELDS.jitoSOL.mev,
        baseApy: CURRENT_YIELDS.jitoSOL.apy - CURRENT_YIELDS.jitoSOL.mev,
        recommendation: "Best for MEV capture with liquidity",
      },
      {
        name: "mSOL",
        type: "lst",
        apy: CURRENT_YIELDS.mSOL.apy,
        mevApy: 0,
        baseApy: CURRENT_YIELDS.mSOL.apy,
        recommendation: "Safest with deepest liquidity",
      },
      {
        name: "bSOL",
        type: "lst",
        apy: CURRENT_YIELDS.bSOL.apy,
        mevApy: CURRENT_YIELDS.bSOL.mev,
        baseApy: CURRENT_YIELDS.bSOL.apy - CURRENT_YIELDS.bSOL.mev,
        recommendation: "Good for decentralization support",
      },
      {
        name: "Native (Rising Stars)",
        type: "native",
        apy: CURRENT_YIELDS.nativeRising.apy,
        mevApy: CURRENT_YIELDS.nativeRising.mev,
        baseApy: CURRENT_YIELDS.nativeRising.apy - CURRENT_YIELDS.nativeRising.mev,
        recommendation: "Highest yield, requires active monitoring",
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(comparison);
}
