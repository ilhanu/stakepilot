/**
 * Validator insights data generator - Server-side compatible
 */

export interface ValidatorData {
  voteAccount: string;
  name: string | null;
  stake: number;
  mevRevenue: number;
  mevRevenueSol: number;
  mevTrend: number;
  commission: number;
  commissionChange?: number;
  epochHistory: { epoch: number; mev: number }[];
  score: number;
  isRisingStar: boolean;
  isBamEligible: boolean;
}

export function generateMockInsightsData(currentEpoch: number): ValidatorData[] {
  const mockValidators: ValidatorData[] = [
    {
      voteAccount: "7K8DVxtNJGnMtUY1CQJT5jcs8sFGSZTDiG7kowvFpECh",
      name: "Everstake",
      stake: 2500000000000000,
      mevRevenue: 234000000000,
      mevRevenueSol: 234,
      mevTrend: 45,
      commission: 5,
      epochHistory: [
        { epoch: currentEpoch - 9, mev: 150 },
        { epoch: currentEpoch - 8, mev: 160 },
        { epoch: currentEpoch - 7, mev: 155 },
        { epoch: currentEpoch - 6, mev: 170 },
        { epoch: currentEpoch - 5, mev: 180 },
        { epoch: currentEpoch - 4, mev: 190 },
        { epoch: currentEpoch - 3, mev: 200 },
        { epoch: currentEpoch - 2, mev: 210 },
        { epoch: currentEpoch - 1, mev: 220 },
        { epoch: currentEpoch, mev: 234 },
      ],
      score: 92,
      isRisingStar: true,
      isBamEligible: true,
    },
    {
      voteAccount: "CertusDeBmqN8ZawdkxK5kFGMwBXdudvWHYwtNgNhvLu",
      name: "Certus One",
      stake: 2100000000000000,
      mevRevenue: 198000000000,
      mevRevenueSol: 198,
      mevTrend: 18,
      commission: 10,
      commissionChange: 3,
      epochHistory: [
        { epoch: currentEpoch - 4, mev: 165 },
        { epoch: currentEpoch - 3, mev: 170 },
        { epoch: currentEpoch - 2, mev: 185 },
        { epoch: currentEpoch - 1, mev: 190 },
        { epoch: currentEpoch, mev: 198 },
      ],
      score: 85,
      isRisingStar: true,
      isBamEligible: true,
    },
    {
      voteAccount: "ChorusmmC7X6H73VWvWvMhczLxWpPoCXTvFZqvkFswvL",
      name: "Chorus One",
      stake: 1900000000000000,
      mevRevenue: 187000000000,
      mevRevenueSol: 187,
      mevTrend: -5,
      commission: 7,
      commissionChange: -2,
      epochHistory: [
        { epoch: currentEpoch - 4, mev: 195 },
        { epoch: currentEpoch - 3, mev: 192 },
        { epoch: currentEpoch - 2, mev: 190 },
        { epoch: currentEpoch - 1, mev: 188 },
        { epoch: currentEpoch, mev: 187 },
      ],
      score: 78,
      isRisingStar: false,
      isBamEligible: true,
    },
    {
      voteAccount: "StakeWithUs11111111111111111111111111111111",
      name: "StakeWithUs",
      stake: 500000000000000,
      mevRevenue: 45000000000,
      mevRevenueSol: 45,
      mevTrend: 120,
      commission: 5,
      epochHistory: [
        { epoch: currentEpoch - 4, mev: 15 },
        { epoch: currentEpoch - 3, mev: 22 },
        { epoch: currentEpoch - 2, mev: 28 },
        { epoch: currentEpoch - 1, mev: 35 },
        { epoch: currentEpoch, mev: 45 },
      ],
      score: 68,
      isRisingStar: true,
      isBamEligible: true,
    },
    {
      voteAccount: "SolanaFloor11111111111111111111111111111111",
      name: "Solana Floor",
      stake: 350000000000000,
      mevRevenue: 28000000000,
      mevRevenueSol: 28,
      mevTrend: 85,
      commission: 3,
      epochHistory: [
        { epoch: currentEpoch - 4, mev: 10 },
        { epoch: currentEpoch - 3, mev: 14 },
        { epoch: currentEpoch - 2, mev: 18 },
        { epoch: currentEpoch - 1, mev: 22 },
        { epoch: currentEpoch, mev: 28 },
      ],
      score: 62,
      isRisingStar: true,
      isBamEligible: true,
    },
  ];

  return mockValidators;
}
