# StakePilot Agent API Documentation

Base URL: `https://stakepilot-olig.vercel.app/api/agent`

All endpoints return JSON. No authentication required (rate limits apply).

---

## Endpoints

### GET /validators

Returns ranked list of validators with all metrics.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Max validators to return (max 200) |
| `sort` | string | "netTotalApy" | Sort by: netTotalApy, qualityScore, stakeSol |
| `minScore` | number | 0 | Minimum quality score (0-10) |
| `maxCommission` | number | 100 | Maximum stake commission % |
| `jitoOnly` | boolean | false | Only Jito-enabled validators |
| `country` | string | - | Filter by country code (e.g., "US") |
| `excludeWhales` | boolean | false | Exclude validators >1M SOL stake |

**Example Request:**
```bash
curl "https://stakepilot-olig.vercel.app/api/agent/validators?limit=5&sort=netTotalApy&jitoOnly=true"
```

**Example Response:**
```json
{
  "validators": [
    {
      "voteAccount": "G8hvpQDLe7hGgYtWYt4TJJEbGbgLFCBJYiMi9pMD9Kk2",
      "identity": "...",
      "name": "ValidatorName",
      "netBaseApy": 6.18,
      "netMevApy": 1.05,
      "netTotalApy": 7.23,
      "stakeCommission": 5,
      "mevCommission": 8,
      "qualityScore": 9,
      "uptimePercent": 99.5,
      "skipRate": 0.5,
      "stakeSol": 150000,
      "stakeRank": "medium",
      "country": "US",
      "city": "Chicago",
      "dataCenter": "16509-US-Chicago",
      "isJito": true,
      "isActive": true,
      "isDelinquent": false,
      "ageInDays": 450,
      "recommendation": "strong",
      "reasons": ["High yield: 7.23%", "Excellent quality score"]
    }
  ],
  "meta": {
    "count": 5,
    "totalAvailable": 785,
    "epoch": 921,
    "timestamp": "2026-02-04T11:30:00.000Z",
    "filters": { ... }
  }
}
```

---

### GET /recommend

Returns a single stake recommendation based on amount and preference.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `amount` | number | 100 | Amount of SOL to stake |
| `preference` | string | "balanced" | One of: yield, safety, decentralization, balanced |
| `alternatives` | number | 3 | Number of alternative validators to show |

**Preferences Explained:**
- `yield` — Maximize APY, accept more risk
- `safety` — Prioritize established, high-uptime validators
- `decentralization` — Prefer smaller validators, support network health
- `balanced` — Balance all factors

**Example Request:**
```bash
curl "https://stakepilot-olig.vercel.app/api/agent/recommend?amount=1000&preference=yield"
```

**Example Response:**
```json
{
  "recommendation": {
    "validator": {
      "voteAccount": "G8hvpQDLe7hGgYtWYt4TJJEbGbgLFCBJYiMi9pMD9Kk2",
      "name": "ValidatorName",
      "netTotalApy": 7.23,
      "stakeCommission": 5,
      "mevCommission": 8,
      "qualityScore": 9,
      "stakeSol": 150000,
      "country": "US"
    },
    "reason": "Highest NET yield at 7.23% APY with acceptable quality (score 9/10)",
    "expectedYearlyReturn": {
      "apy": 7.23,
      "solPerYear": 72.3,
      "solPerMonth": 6.025
    },
    "alternatives": [
      {
        "voteAccount": "...",
        "name": "...",
        "netTotalApy": 7.1,
        "whyNot": "Slightly lower overall score"
      }
    ],
    "instructions": {
      "forAgents": "STAKE 1000 SOL TO G8hvpQDLe7hGgYtWYt4TJJEbGbgLFCBJYiMi9pMD9Kk2",
      "forHumans": "Stake 1000 SOL to validator \"ValidatorName\" for ~7.23% APY",
      "cliCommand": "solana stake-account create ... && solana delegate-stake ..."
    }
  },
  "meta": {
    "epoch": 921,
    "timestamp": "2026-02-04T11:30:00.000Z",
    "input": { "amountSol": 1000, "preference": "yield" },
    "validatorsAnalyzed": 785
  }
}
```

---

### GET /analyze

Analyzes a wallet's current stake positions and finds optimization opportunities.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `wallet` | string | Yes | Wallet public key to analyze |

**Example Request:**
```bash
curl "https://stakepilot-olig.vercel.app/api/agent/analyze?wallet=5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"
```

**Example Response:**
```json
{
  "wallet": "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
  "summary": {
    "totalStakedSol": 500,
    "activeStakeAccounts": 3,
    "currentWeightedApy": 6.5,
    "potentialApy": 7.2,
    "missedYieldPerYear": 3.5,
    "healthScore": 75
  },
  "positions": [
    {
      "voteAccount": "...",
      "name": "ValidatorName",
      "stakedSol": 200,
      "currentNetApy": 6.2,
      "qualityScore": 7,
      "issues": ["High commission: 10%"],
      "status": "warning"
    }
  ],
  "opportunities": [
    {
      "type": "switch",
      "priority": "high",
      "description": "Switch from ValidatorA to gain +0.8% APY",
      "currentValidator": "...",
      "suggestedValidator": "...",
      "suggestedValidatorName": "BetterValidator",
      "expectedApyGain": 0.8,
      "affectedSol": 200
    }
  ],
  "warnings": ["You could be earning 0.7% more APY"],
  "meta": { ... }
}
```

---

### POST /prepare-stake

Generates an unsigned stake transaction.

**Request Body:**
```json
{
  "wallet": "YourWalletPubkey",
  "validator": "ValidatorVoteAccount",
  "amountSol": 100,
  "stakeAuthority": "Optional - defaults to wallet",
  "withdrawAuthority": "Optional - defaults to wallet"
}
```

**Example Request:**
```bash
curl -X POST "https://stakepilot-olig.vercel.app/api/agent/prepare-stake" \
  -H "Content-Type: application/json" \
  -d '{"wallet":"5Q544...","validator":"G8hvp...","amountSol":100}'
```

**Example Response:**
```json
{
  "transaction": {
    "base64": "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABBPxK...",
    "base58": "..."
  },
  "stakeAccount": {
    "pubkey": "NewStakeAccountPubkey",
    "seed": "stake:1707045000000"
  },
  "details": {
    "amountLamports": 100000000000,
    "amountSol": 100,
    "validator": "G8hvpQDLe7hGgYtWYt4TJJEbGbgLFCBJYiMi9pMD9Kk2",
    "stakeAuthority": "5Q544...",
    "withdrawAuthority": "5Q544...",
    "rentExemptReserve": 2282880,
    "totalCost": 100002282880
  },
  "instructions": {
    "forAgents": "SIGN_AND_SEND transaction.base64 WITH signers=[wallet, stakeAccount]",
    "forHumans": [
      "1. This will create a new stake account: NewStak...",
      "2. Deposit 100 SOL + 0.0023 SOL rent",
      "3. Delegate to validator: G8hvpQ...",
      "4. Sign with your wallet to execute"
    ],
    "warnings": []
  },
  "meta": {
    "blockhash": "...",
    "lastValidBlockHeight": 123456789,
    "expiresAt": "2026-02-04T11:31:00.000Z"
  }
}
```

**Important Notes:**
- Transaction requires 2 signatures: wallet (payer) + stake account (new keypair)
- Transaction expires in ~60 seconds (blockhash validity)
- Stake account keypair must be generated client-side for production use

---

### POST /prepare-unstake

Generates unsigned deactivate and/or withdraw transactions.

**Request Body:**
```json
{
  "stakeAccount": "StakeAccountPubkey",
  "wallet": "YourWalletPubkey",
  "action": "deactivate",
  "withdrawTo": "Optional - defaults to wallet"
}
```

**Actions:**
- `deactivate` — Start cooldown period (stake becomes inactive after ~1-2 epochs)
- `withdraw` — Withdraw funds (only works when stake is fully inactive)
- `both` — Returns deactivate tx now, withdraw must be done later

**Example Response:**
```json
{
  "stakeAccountInfo": {
    "pubkey": "StakeAccount...",
    "state": "active",
    "lamports": 100002282880,
    "solAmount": 100.002,
    "validator": "G8hvp...",
    "stakeAuthority": "5Q544...",
    "withdrawAuthority": "5Q544..."
  },
  "transactions": {
    "deactivate": {
      "base64": "AQAAA...",
      "description": "Deactivate 100.002 SOL stake"
    }
  },
  "timeline": {
    "currentEpoch": 921,
    "cooldownEpochs": 1,
    "estimatedUnlockEpoch": 923,
    "estimatedUnlockDate": "2026-02-08T00:00:00.000Z"
  },
  "instructions": {
    "forAgents": "SIGN_AND_SEND deactivate.base64 THEN WAIT_EPOCHS 2",
    "forHumans": [
      "1. Sign deactivate transaction to begin cooldown",
      "2. Wait ~2 epochs (~4 days) for funds to unlock",
      "3. After unlock, withdraw funds to your wallet"
    ],
    "warnings": []
  },
  "meta": { ... }
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "details": "Additional context (optional)"
}
```

Common HTTP status codes:
- `400` — Bad request (invalid parameters)
- `403` — Forbidden (unauthorized for stake account)
- `404` — Not found (wallet/stake account doesn't exist)
- `500` — Server error

---

## Rate Limits

- 100 requests/minute per IP
- Cached responses where appropriate (see `revalidate` headers)

For higher limits, contact us.

---

## Integration Example

### Python Agent
```python
import requests

BASE_URL = "https://stakepilot-olig.vercel.app/api/agent"

# Get recommendation
resp = requests.get(f"{BASE_URL}/recommend", params={
    "amount": 1000,
    "preference": "yield"
})
rec = resp.json()["recommendation"]
print(f"Stake to: {rec['validator']['name']} for {rec['validator']['netTotalApy']}% APY")

# Prepare transaction
resp = requests.post(f"{BASE_URL}/prepare-stake", json={
    "wallet": "YOUR_WALLET",
    "validator": rec["validator"]["voteAccount"],
    "amountSol": 1000
})
tx = resp.json()["transaction"]["base64"]
# Sign and send tx...
```

### JavaScript Agent
```javascript
const BASE_URL = "https://stakepilot-olig.vercel.app/api/agent";

// Get recommendation
const rec = await fetch(`${BASE_URL}/recommend?amount=1000&preference=yield`)
  .then(r => r.json());

console.log(`Stake to: ${rec.recommendation.validator.name}`);

// Prepare transaction
const tx = await fetch(`${BASE_URL}/prepare-stake`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    wallet: "YOUR_WALLET",
    validator: rec.recommendation.validator.voteAccount,
    amountSol: 1000
  })
}).then(r => r.json());

// Sign and send tx.transaction.base64...
```

---

## Changelog

- **2026-02-04**: Initial API release (v1)
