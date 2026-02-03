# StakePilot Vision v2

## The Problem

Solana staking is confusing and centralized:
1. **Confusing:** Which is better — native staking, jitoSOL, mSOL, bSOL? Nobody knows.
2. **Centralized:** 80% of stake goes to top 20 validators
3. **Opaque:** Base yield vs MEV vs fees — hard to compare fairly
4. **Static:** Users stake once and forget, missing better opportunities

## The Solution: StakePilot

**The complete staking intelligence platform.**

We give users ONE place to:
1. **Compare ALL options** — Native staking vs every LST, with real data
2. **See true yields** — Base APY + MEV bonus + fees, all broken down
3. **Discover hidden validators** — Rising stars, not just the big names
4. **Track over time** — Historical performance, not just current snapshot

### The Three Pillars

#### 1. YIELD TRUTH 📊
Real APY from real APIs. No guessing.

| Protocol | Source | Data |
|----------|--------|------|
| jitoSOL | Jito Kobe API | Base yield + MEV rewards |
| mSOL | api.marinade.finance | APY, TVL, conversion |
| bSOL | stake.solblaze.org | APY, conversion, gauges |
| Native | Solana RPC | Validator rewards, commission |

Show users:
- **Base yield:** The guaranteed part (~6-7%)
- **MEV bonus:** The variable upside (0-2%+)
- **Net yield:** After protocol fees
- **Historical:** 30/90/365 day performance

#### 2. VALIDATOR DISCOVERY 🌟
Help small validators get found.

- **Rising Stars:** Small validators with improving performance
- **MEV Prediction:** Who will earn most next epoch?
- **Decentralization Score:** Bonus for supporting network health
- **One-click support:** Easy delegation to underdogs

#### 3. SMART ROUTING 🛤️
Tell me where to put my SOL.

Input: Amount + Risk tolerance + Decentralization preference
Output: Optimal allocation with reasoning

```
"Put 100 SOL in:"
- 40 SOL → jitoSOL (highest yield, MEV exposure)
- 30 SOL → Native to Rising Star validator (support decentralization)
- 30 SOL → mSOL (deepest liquidity, DeFi composability)

Expected yield: 7.2% | Decentralization score: A
```

## What We're NOT

- Not just another MEV tracker (everyone has Kobe API)
- Not just yield aggregator (SolanaYield does that)
- Not just validator list (StakeWiz does that)

We're the **complete staking brain** — yield truth + discovery + routing.

## Technical Implementation

### Data Sources

```typescript
// All real, all live
const DATA_SOURCES = {
  jito: {
    stakePool: 'https://kobe.mainnet.jito.network/api/v1/stake_pool_stats',
    validators: 'https://kobe.mainnet.jito.network/api/v1/validator_rewards',
    ratio: 'https://kobe.mainnet.jito.network/api/v1/jitosol_sol_ratio'
  },
  marinade: {
    tvl: 'https://api.marinade.finance/tlv',
    apy: 'https://api.marinade.finance/msol/apy/30d'
  },
  blaze: {
    stats: 'https://stake.solblaze.org/api/v1/stats'
  },
  solana: {
    validators: 'RPC getVoteAccounts',
    inflation: 'RPC getInflationRate'
  }
};
```

### Key Features

1. **LST Comparison Dashboard**
   - Real APY from each protocol's API
   - Fees breakdown
   - Liquidity depth
   - DeFi integrations

2. **Yield Calculator**
   - Input amount + time horizon
   - Show base yield vs MEV scenarios
   - Compare protocols side by side
   - Historical backtest

3. **Rising Stars**
   - Validators below median stake
   - Above median MEV performance
   - Trend analysis (momentum)
   - Easy delegation links

4. **Smart Route**
   - Multi-factor optimization
   - Decentralization weighting
   - Risk adjustment
   - Clear reasoning

## The Narrative

**"Staking shouldn't be guesswork."**

- See real yields, not marketing numbers
- Discover validators before everyone else
- Support decentralization while maximizing returns
- One platform, complete intelligence

## Success Metrics

For hackathon judges:
1. **Accuracy:** Real data from real APIs (verifiable)
2. **Utility:** Actually helps users make better decisions
3. **Innovation:** MEV prediction + decentralization routing
4. **Execution:** Polished, working, deployed

For users:
1. Can I compare LSTs fairly? ✓
2. Can I find good small validators? ✓
3. Can I see historical performance? ✓
4. Do I know where to stake? ✓

---

*StakePilot: Yield Truth. Validator Discovery. Smart Routing.*
