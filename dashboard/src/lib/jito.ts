/**
 * Jito Kobe API Client
 */

const JITO_KOBE_BASE = "https://kobe.mainnet.jito.network";

export interface ValidatorReward {
  vote_account: string;
  mev_revenue: number;
  mev_commission: number;
  priority_fee_revenue: number;
  priority_fee_commission: number | null;
  num_stakers: number;
  epoch: number;
}

export interface BamValidator {
  vote_account: string;
  identity_account: string;
  name: string | null;
  active_stake: number;
  is_eligible: boolean;
  ineligibility_reason: string | null;
  score: number;
  epoch: number;
}

export interface StakePoolStats {
  apy: number;
  tvl: number;
  epoch: number;
}

export async function getValidatorRewards(
  epoch: number
): Promise<ValidatorReward[]> {
  const res = await fetch(
    `${JITO_KOBE_BASE}/api/v1/validator_rewards?epoch=${epoch}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch validator rewards: ${res.status}`);
  }

  const data = await res.json();
  return data.rewards || [];
}

export async function getBamValidators(epoch: number): Promise<BamValidator[]> {
  const res = await fetch(
    `${JITO_KOBE_BASE}/api/v1/bam_validators?epoch=${epoch}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch BAM validators: ${res.status}`);
  }

  const data = await res.json();
  return data.bam_validators || [];
}

export async function getStakePoolStats(): Promise<StakePoolStats[]> {
  const res = await fetch(`${JITO_KOBE_BASE}/api/v1/stake_pool_stats`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch stake pool stats: ${res.status}`);
  }

  const data = await res.json();
  return data.stake_pool_stats || [];
}

export async function getJitoSolRatio(): Promise<number> {
  const res = await fetch(`${JITO_KOBE_BASE}/api/v1/jitosol_sol_ratio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return 1.25; // Fallback
  }

  const data = await res.json();
  if (data.ratios?.length > 0) {
    const sorted = [...data.ratios].sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].data;
  }

  return 1.25;
}

export interface MevStats {
  epoch: number;
  totalMev: number;
  totalMevSol: number;
  validatorCount: number;
  avgMevPerValidator: number;
  topValidators: {
    voteAccount: string;
    name: string | null;
    mevRevenue: number;
    mevRevenueSol: number;
    stake: number;
  }[];
}

export async function getMevStats(epoch: number): Promise<MevStats> {
  const [rewards, bamValidators] = await Promise.all([
    getValidatorRewards(epoch),
    getBamValidators(epoch),
  ]);

  const bamLookup = new Map(
    bamValidators.map((v) => [v.vote_account, v])
  );

  const totalMev = rewards.reduce((sum, r) => sum + r.mev_revenue, 0);
  const avgMev = rewards.length > 0 ? totalMev / rewards.length : 0;

  const topValidators = rewards
    .sort((a, b) => b.mev_revenue - a.mev_revenue)
    .slice(0, 20)
    .map((r) => {
      const bam = bamLookup.get(r.vote_account);
      return {
        voteAccount: r.vote_account,
        name: bam?.name || null,
        mevRevenue: r.mev_revenue,
        mevRevenueSol: r.mev_revenue / 1_000_000_000,
        stake: bam?.active_stake || 0,
      };
    });

  return {
    epoch,
    totalMev,
    totalMevSol: totalMev / 1_000_000_000,
    validatorCount: rewards.length,
    avgMevPerValidator: avgMev,
    topValidators,
  };
}
