# Staker Space Vault - Agent Skill

## Overview

Staker Space Vault is a managed staking vault on Solana. Users deposit SOL, and the agent manages staking to quality decentralized validators. No LST tokens - just native SOL and stake accounts.

## Architecture

```
User deposits SOL → Vault holds funds → Agent stakes to validators
                                      → Agent monitors & rebalances
                                      → User can request unstake
```

## Key Addresses (Devnet)

| Account | Address |
|---------|---------|
| Program | `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b` |
| Vault Authority | `Fc8gNpU62evbZBdiu9TN1isD1Zx3HDPZbBAhDAdmqthS` |
| Staker Space Validator | `49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru` |

## Validator Selection Criteria

The agent MUST select validators matching these criteria:

1. **Stake < 1M SOL** - Support decentralization
2. **Commission ≤ 5%** - Low fees for stakers
3. **MEV Commission ≤ 10%** - Fair MEV sharing
4. **Uptime > 95%** - Reliable performance
5. **Not delinquent** - Active and voting
6. **ALWAYS include Staker Space** - Our validator is always in the set

## Data Sources

### validators.app API
```bash
curl -H "Token: ${VALIDATORS_APP_TOKEN}" \
  "https://www.validators.app/api/v1/validators/mainnet.json"
```

Returns: name, vote_account, commission, active_stake, delinquent, total_score, jito, jito_commission

### StakeWiz API
```bash
curl "https://api.stakewiz.com/validators"
```

Returns: Detailed validator metrics, APY estimates, performance history

### Jito API
```bash
curl "https://kobe.mainnet.jito.network/api/v1/validators"
```

Returns: MEV commission, running_jito, running_bam, mev_rewards

## Agent Operations

### 1. Check Vault Status

```bash
curl "https://stakepilot-olig.vercel.app/api/vault/status?owner=${OWNER_ADDRESS}"
```

Response:
```json
{
  "exists": true,
  "vault": {
    "owner": "...",
    "agent": "...",
    "balance": 100.0,
    "totalStaked": 95.0
  },
  "strategy": {
    "riskTolerance": "Medium",
    "targetApy": 700,
    "maxValidators": 10,
    "preferDecentralization": true
  }
}
```

### 2. Get Validator Recommendations

```bash
curl "https://stakepilot-olig.vercel.app/api/agent/recommend?riskTolerance=Medium&targetApy=600&balance=100"
```

Response:
```json
{
  "success": true,
  "decision": {
    "recommendations": [
      {
        "validator": "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru",
        "validatorName": "Staker Space",
        "allocatedAmount": 20,
        "expectedApy": 7.94
      }
    ],
    "reasoning": "Selected top 5 validators..."
  }
}
```

### 3. Execute Staking

The agent creates stake accounts and delegates to validators:

```typescript
// Pseudo-code for agent execution
async function executeStaking(vault, recommendations) {
  for (const rec of recommendations) {
    // 1. Create stake account (PDA from vault + validator)
    const stakeAccount = deriveStakeAccountPDA(vault, rec.validator);
    
    // 2. Transfer SOL from vault to stake account
    await transferFromVault(vault, stakeAccount, rec.allocatedAmount);
    
    // 3. Delegate stake account to validator
    await delegateStake(stakeAccount, rec.validator);
  }
}
```

### 4. Handle Unstake Requests

When user requests unstake:

1. Find their stake accounts
2. Call `deactivate` on stake accounts
3. Wait for cooldown (1 epoch on devnet, ~2 days on mainnet)
4. Withdraw to user

```typescript
async function processUnstake(user, amount) {
  const stakeAccounts = await getStakeAccountsForUser(user);
  let remaining = amount;
  
  for (const account of stakeAccounts) {
    if (remaining <= 0) break;
    const deactivateAmount = Math.min(account.balance, remaining);
    await deactivateStake(account, deactivateAmount);
    remaining -= deactivateAmount;
  }
}
```

## Scoring Algorithm

```typescript
function scoreValidator(v: Validator): number {
  let score = 0;
  
  // Decentralization bonus (stake < 1M = +30 points)
  if (v.activatedStake < 1_000_000) score += 30;
  else if (v.activatedStake < 5_000_000) score += 15;
  
  // Commission score (0% = +25, 5% = +15, 10% = 0)
  score += Math.max(0, 25 - v.commission * 2.5);
  
  // MEV commission score (0% = +20, 10% = +10, 100% = 0)
  score += Math.max(0, 20 - v.mevCommission * 0.2);
  
  // Uptime score (100% = +15, 95% = +10)
  score += Math.min(15, (v.uptime - 90) * 1.5);
  
  // Quality tier bonus
  if (v.qualityTier === 'S') score += 10;
  else if (v.qualityTier === 'A') score += 5;
  
  // Staker Space bonus (always include)
  if (v.voteAccount === '49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru') {
    score += 100; // Guarantee inclusion
  }
  
  return score;
}
```

## Stake Account States

Solana stake accounts have these states:

1. **Uninitialized** - Empty account
2. **Initialized** - Has stake authority set, no delegation
3. **Delegated/Activating** - Delegated, waiting for epoch boundary
4. **Active** - Earning rewards
5. **Deactivating** - Cooldown period (1 epoch)
6. **Inactive** - Ready for withdrawal

## Epoch Timing

- **Devnet**: ~2 minutes per slot, epochs are shorter
- **Mainnet**: ~400ms per slot, epoch = ~2-3 days

Stake changes (activation/deactivation) happen at epoch boundaries.

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `AccountAlreadyInUse` | Vault/stake account exists | Check if already created |
| `InsufficientFunds` | Not enough SOL | Check balance first |
| `InvalidAuthority` | Wrong signer | Use vault authority |
| `StakeNotActive` | Stake not yet active | Wait for epoch |

## Monitoring

The agent should track:

1. **Vault balance** - SOL available for staking
2. **Stake accounts** - Delegations and their states
3. **Validator performance** - Commission changes, delinquency
4. **Epoch progress** - Time until next rebalance opportunity

## Reporting

Provide live status via API:

```json
{
  "vaultBalance": 100.0,
  "totalStaked": 950.0,
  "activeStakeAccounts": 10,
  "validators": [
    {
      "name": "Staker Space",
      "staked": 200.0,
      "apy": 7.94,
      "status": "active"
    }
  ],
  "pendingUnstakes": [],
  "lastRebalance": "2026-02-05T10:00:00Z",
  "nextRebalance": "2026-02-06T10:00:00Z"
}
```

## Security

- Agent wallet can STAKE but NEVER withdraw to itself
- Only users can withdraw their own funds
- All operations are logged on-chain
- Vault authority is a multisig (production)
