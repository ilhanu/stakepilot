# StakePilot - Agent Skill

## Overview

StakePilot is an autonomous staking vault on Solana **testnet**. Users deposit SOL, and the AI agent stakes to quality decentralized validators. No LST tokens — just native SOL and stake accounts.

**Mission:** Route stake to high-quality, low-stake validators. Better yields for users, more decentralization for Solana.

## Architecture

```
User deposits SOL → Vault PDA holds funds → Agent analyzes validators
                                           → Agent stakes to best ones
                                           → Agent can NEVER withdraw
                                           → User unstakes anytime
```

## Key Addresses (Testnet)

| Account | Address |
|---------|---------|
| Program | `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b` |
| Vault PDA | `HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u` |
| Agent Wallet | `By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny` |
| Staker Space Validator (Testnet) | `3S4jVg5p1rw7t8MS5UtjhnChmo6ABdmh3nyXTVzAyP9f` |
| Staker Space Validator (Mainnet) | `49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru` |

## Validator Selection Criteria

The agent MUST select validators matching ALL criteria:

1. **Stake < 1M SOL** — Support decentralization
2. **Commission ≤ 5%** — Low fees for stakers
3. **MEV Commission ≤ 10%** — Fair MEV sharing
4. **Uptime > 95%** — Reliable performance
5. **Not delinquent** — Active and voting
6. **ALWAYS include Staker Space** — Our validator is always in the set (even if it exceeds criteria)

## Scoring Algorithm

The agent scores validators using a multi-factor algorithm:

```typescript
function scoreValidator(v: Validator, ibrlBonus = 0): number {
  let score = 0;

  // Always-include bonus (Staker Space)
  if (isStakerSpace(v)) score += 100;

  // Decentralization (30% weight)
  if (v.activatedStake < 100_000) score += 40;
  else if (v.activatedStake < 500_000) score += 30;
  else if (v.activatedStake < 1_000_000) score += 15;

  // Commission (20% weight)
  score += Math.max(0, 25 - v.commission * 2.5);

  // MEV Fairness (20% weight)
  if (v.isJito && v.mevCommission !== null) {
    score += Math.max(0, 20 - v.mevCommission * 0.2);
  }

  // Uptime (15% weight)
  score += Math.max(0, (v.uptime - 90) * 1.5);

  // validators.app quality score
  if (v.totalScore >= 8) score += 10;
  else if (v.totalScore >= 6) score += 5;

  // DoubleZero bonus
  if (v.isDz) score += 5;

  // IBRL block-building performance (15% weight, 0-25 points)
  score += ibrlBonus;

  return score;
}
```

## Data Sources

### validators.app API (Primary)
```bash
curl -H "Token: ${VALIDATORS_APP_TOKEN}" \
  "https://www.validators.app/api/v1/validators/testnet.json"
```
Returns: name, vote_account, commission, active_stake, delinquent, total_score, jito, jito_commission, is_dz, data_center_key

### IBRL Analytics (Block Performance)
```bash
curl "https://explorer.bam.dev/api/validators"
```
Returns: ibrl_score, build_time_score, vote_packing_score, non_vote_packing_score

### Solana RPC (Real-time)
Used for: current stake amounts, delinquency status, epoch credits

## Agent API Endpoints

Base URL: `https://stakepilot-olig.vercel.app`

### Get Recommendations
```bash
curl "/api/agent/recommend?balance=100&maxValidators=10"
```

### Analyze (Full Reasoning Chain)
```bash
curl "/api/agent/analyze?balance=100&maxValidators=10"
```

### Get Validators (with StakePilot Scores)
```bash
curl "/api/validators?filter=qualified&limit=50"
```
Returns validators with `stakepilotScore`, `ibrlScore`, `estimatedApy`

### Vault Status
```bash
curl "/api/agent/vault"
```

### Stake Positions
```bash
curl "/api/agent/positions"
```

### Execute Staking (Local Agent Only)
```bash
# Run from beast (agent keypair required)
cd /home/ilhan/projects/stakepilot/dashboard
npx tsx scripts/agent-execute.ts
```

## Current State (Testnet)

- **7 active stake positions** totaling ~12.097 SOL across 6 validators
- **Agent wallet:** 2.29 SOL
- **Cron:** Hourly execution from beast
- **All positions:** "activating" for current epoch

## Security Model

- ✅ Agent can **STAKE** to validators
- ❌ Agent can **NEVER withdraw** to itself
- ✅ Only the **user/owner** can withdraw funds
- ✅ User can **change agent** at any time
- ✅ All operations are **on-chain** and verifiable
- ✅ Agent private key stays **local on beast**, never in Vercel

## Stake Account States

1. **Initialized** — Has authority set, no delegation
2. **Activating** — Delegated, waiting for epoch boundary
3. **Active** — Earning rewards
4. **Deactivating** — Cooldown period (~2 days mainnet)
5. **Inactive** — Ready for withdrawal

## Built By

**Staker Space** — We run a validator ourselves (0% commission on mainnet, Netherlands 🇳🇱, Agave client, DoubleZero). We built StakePilot because we live this problem: small validators with great infrastructure can't attract stake.
