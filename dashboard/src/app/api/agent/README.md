# StakePilot Agent API

API for AI agents to interact with the StakePilot autonomous staking vault on Solana.

## Base URL

```
https://stakepilot-olig.vercel.app/api/agent
```

## Quick Start

```bash
# 1. Get vault status
curl https://stakepilot-olig.vercel.app/api/agent/vault

# 2. Get qualified validators
curl https://stakepilot-olig.vercel.app/api/agent/validators

# 3. Get analysis and staking plan
curl https://stakepilot-olig.vercel.app/api/agent/analyze

# 4. Execute staking (requires auth)
curl -X POST https://stakepilot-olig.vercel.app/api/agent/stake \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"allocations": [{"validatorVote": "...", "amount": 1.0}]}'
```

## Endpoints

### Read Operations (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/vault` | GET | Vault status (balance, deposits, users) |
| `/validators` | GET | List qualified validators |
| `/positions` | GET | Current stake positions |
| `/analyze` | GET/POST | Run decision algorithm, get staking plan |
| `/docs` | GET | OpenAPI specification |

### Write Operations (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stake` | POST | Execute staking to validators |
| `/unstake` | POST | Deactivate stake positions |

## Authentication

For write operations, include your API key:

```
Authorization: Bearer <your-api-key>
```

## Validator Criteria

The agent only stakes to validators meeting these criteria:

| Criteria | Value | Reason |
|----------|-------|--------|
| Stake | < 1M SOL | Support decentralization |
| Commission | ≤ 5% | Maximize staker returns |
| MEV Commission | ≤ 10% | Fair MEV sharing |
| Uptime | > 95% | Reliable performance |
| WizScore | > 50 | Not delinquent |

**Staker Space validator is always included** for alignment.

## Smart Contract

| Item | Value |
|------|-------|
| Program ID | `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b` |
| Vault PDA | `HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u` |
| Network | Devnet |

### Contract Instructions

| Instruction | Caller | Description |
|-------------|--------|-------------|
| `initialize_vault` | Admin | One-time vault setup |
| `deposit` | User | Deposit SOL |
| `request_unstake` | User | Start withdrawal |
| `withdraw` | User | Complete withdrawal |
| `stake_to_validator` | **Agent** | Stake vault SOL |
| `deactivate_stake` | **Agent** | Deactivate position |
| `withdraw_stake` | **Agent** | Return SOL to vault |
| `update_agent` | Admin | Change agent wallet |

### Security Model

```
┌─────────────────────────────────────────┐
│ AGENT CAN:                              │
│  ✓ Stake vault funds TO validators      │
│  ✓ Deactivate stakes                    │
│  ✓ Return deactivated SOL to vault      │
├─────────────────────────────────────────┤
│ AGENT CANNOT:                           │
│  ✗ Withdraw SOL to itself               │
│  ✗ Withdraw SOL to any external address │
│  ✗ Change vault settings                │
│  ✗ Lock user funds                      │
└─────────────────────────────────────────┘
```

## Example: Build an Agent

```typescript
import axios from 'axios';

const API = 'https://stakepilot-olig.vercel.app/api/agent';
const API_KEY = 'your-api-key';

async function runStakingAgent() {
  // 1. Check vault state
  const { data: vault } = await axios.get(`${API}/vault`);
  console.log(`Vault balance: ${vault.vault.balance} SOL`);
  console.log(`Available to stake: ${vault.availableToStake} SOL`);

  if (vault.availableToStake < 1) {
    console.log('Insufficient balance to stake');
    return;
  }

  // 2. Get analysis and staking plan
  const { data: analysis } = await axios.get(`${API}/analyze`);
  console.log('Reasoning:', analysis.reasoning);
  console.log('Action:', analysis.action);

  if (analysis.action !== 'stake') {
    console.log('No staking needed');
    return;
  }

  // 3. Execute staking
  const allocations = analysis.analysis.map((v: any) => ({
    validatorVote: v.voteAccount,
    amount: v.allocation,
  }));

  const { data: result } = await axios.post(
    `${API}/stake`,
    { allocations },
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );

  console.log('Staking result:', result);
}

// Run every hour
setInterval(runStakingAgent, 60 * 60 * 1000);
runStakingAgent();
```

## Response Examples

### GET /vault

```json
{
  "vault": {
    "address": "HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u",
    "balance": 1.5,
    "totalDeposits": 1.5,
    "totalStaked": 0,
    "totalUsers": 1
  },
  "agent": "By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny",
  "availableToStake": 1.4,
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

### GET /validators

```json
{
  "validators": [
    {
      "name": "Staker Space",
      "voteAccount": "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru",
      "totalApy": 6.31,
      "wizScore": 93,
      "commission": 0,
      "mevCommission": 4,
      "activatedStake": 45000,
      "isStakerSpace": true
    }
  ],
  "count": 20,
  "criteria": {
    "maxStake": 1000000,
    "maxCommission": 5,
    "maxMevCommission": 10,
    "minUptime": 95
  }
}
```

### POST /stake

```json
{
  "success": true,
  "stakesCreated": 3,
  "totalStaked": 1.4,
  "transactions": [
    {
      "signature": "5xY9...",
      "validator": "49DJjUX3cwFvaZD5rCAwubiz7qdRWDez9xmB381XdHru",
      "amount": 0.47
    }
  ]
}
```

## Integration with AI Models

The API is designed for easy integration with LLMs:

1. **GET /analyze** returns structured reasoning that LLMs can interpret
2. **GET /validators** provides data for custom decision logic
3. **POST /stake** accepts simple JSON for execution

Example prompt for an AI agent:

```
You are a Solana staking agent for StakePilot. Your goal is to optimize staking yield while supporting network decentralization.

Available tools:
- GET /api/agent/vault - Check vault balance
- GET /api/agent/validators - Get qualified validators  
- GET /api/agent/analyze - Get recommended staking plan
- POST /api/agent/stake - Execute staking

Constraints:
- Only stake to validators meeting criteria
- Always include Staker Space validator
- Minimum 0.5 SOL per validator
- Maximum 5 validators for diversification

When vault has >1 SOL available, analyze and execute the optimal staking plan.
```

## Support

- GitHub: https://github.com/ilhanu/stakepilot
- Docs: https://stakepilot-olig.vercel.app/docs
