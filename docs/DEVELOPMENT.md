# StakePilot Development Guide

This document captures development principles, conventions, and decisions. **Stick to these.**

---

## Core Principles

### 1. Agent-First Design
Every feature should be API-callable first, UI second.

```
❌ Wrong: Build UI, then add API
✅ Right: Build API, then wrap with UI
```

### 2. Honest Data
Never promise what we can't deliver.

```
❌ Wrong: "MEV Oracle predicts +2% APY"
✅ Right: "Historical MEV average: +1.2% APY (varies)"
```

### 3. User Control
User always has final say. No forced execution.

```
❌ Wrong: Agent auto-stakes without user signing
✅ Right: Agent prepares tx, user signs
```

### 4. NET Yields
Always show what the staker actually receives.

```
❌ Wrong: "8% APY" (gross, before commissions)
✅ Right: "6.5% NET APY" (after stake + MEV commissions)
```

---

## Data Model

### Validator Metrics

| Field | Source | Description |
|-------|--------|-------------|
| `netBaseApy` | Calculated | `BASE_APY * (1 - stakeCommission/100)` |
| `netMevApy` | Jito + Calculated | Historical MEV / stake, after MEV commission |
| `netTotalApy` | Calculated | `netBaseApy + netMevApy` |
| `qualityScore` | validators.app | 0-10 composite score |
| `uptimePercent` | validators.app | `100 - skipRate` |
| `stakeRank` | Calculated | small/medium/large/whale based on SOL |

### Constants
```typescript
const BASE_APY = 6.5;           // Solana inflation ~6.5%
const EPOCHS_PER_YEAR = 73;     // ~5 days per epoch
const LAMPORTS_PER_SOL = 1_000_000_000;
```

### Stake Ranks
```typescript
function getStakeRank(stakeSol: number) {
  if (stakeSol < 50_000) return "small";
  if (stakeSol < 200_000) return "medium";
  if (stakeSol < 1_000_000) return "large";
  return "whale";
}
```

---

## API Conventions

### Endpoint Structure
```
/api/agent/{resource}          GET  - List/query
/api/agent/{resource}          POST - Create/prepare
/api/agent/{resource}/{id}     GET  - Get specific
```

### Response Format
```typescript
interface ApiResponse<T> {
  // Main payload
  [key: string]: T;
  
  // Always include meta
  meta: {
    epoch: number;
    timestamp: string;
    [key: string]: any;
  };
}

interface ErrorResponse {
  error: string;
  details?: string;
}
```

### Query Parameters
- Use camelCase: `amountSol`, `minScore`
- Boolean: `jitoOnly=true` (not `jito_only=1`)
- Numbers: Parse with defaults, validate ranges

### HTTP Status Codes
- `200` — Success
- `400` — Bad request (invalid params)
- `403` — Forbidden (unauthorized)
- `404` — Not found
- `500` — Server error (log it!)

---

## Code Organization

```
/dashboard
├── /src
│   ├── /app
│   │   ├── /api
│   │   │   └── /agent          # Agent API endpoints
│   │   │       ├── /validators
│   │   │       ├── /recommend
│   │   │       ├── /analyze
│   │   │       ├── /prepare-stake
│   │   │       └── /prepare-unstake
│   │   ├── /my-stakes          # User stake view
│   │   ├── /autopilot          # Automation config
│   │   └── /route              # Stake routing
│   ├── /components             # React components
│   └── /lib
│       ├── jito.ts             # Jito Kobe API client
│       ├── validators-app.ts   # validators.app client
│       ├── solana.ts           # RPC utilities
│       ├── user-stakes.ts      # Stake account parsing
│       └── intelligence.ts     # Analysis & triggers
└── /docs                       # Documentation
```

---

## Environment Variables

Required:
```env
HELIUS_API_KEY=xxx              # Helius RPC
VALIDATORS_APP_TOKEN=xxx        # validators.app API
```

Optional:
```env
NEXT_PUBLIC_RPC_URL=xxx         # Override RPC (defaults to Helius)
```

---

## Testing

### API Testing
```bash
# Validators endpoint
curl "http://localhost:3001/api/agent/validators?limit=5"

# Recommend endpoint
curl "http://localhost:3001/api/agent/recommend?amount=100&preference=yield"

# Analyze endpoint
curl "http://localhost:3001/api/agent/analyze?wallet=PUBKEY"
```

### Build Check
```bash
cd dashboard
npm run build
# Should complete without errors
```

---

## Common Patterns

### Fetching Validator Data
```typescript
// Always combine both sources
const [validators, mevRewards] = await Promise.all([
  getAllValidators({ limit: 1500, activeOnly: true }),
  getValidatorRewards(currentEpoch),
]);

// Create lookup for O(1) access
const mevLookup = new Map(mevRewards.map(r => [r.vote_account, r]));
```

### Calculating NET APY
```typescript
// Base APY after stake commission
const netBaseApy = BASE_APY * (1 - validator.commission / 100);

// MEV APY after MEV commission
let netMevApy = 0;
if (mev && validator.stakeSol > 0) {
  const mevPerEpoch = mev.mev_revenue * (1 - mev.mev_commission / 100);
  const mevPerYear = mevPerEpoch * EPOCHS_PER_YEAR;
  netMevApy = (mevPerYear / validator.active_stake) * 100;
}

const netTotalApy = netBaseApy + netMevApy;
```

### Building Transactions
```typescript
// Always use Connection from RPC_URL
const connection = new Connection(RPC_URL, "confirmed");

// Get fresh blockhash
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

// Serialize unsigned
const serialized = transaction.serialize({
  requireAllSignatures: false,
  verifySignatures: false,
});
```

---

## Do's and Don'ts

### Do
- ✅ Show NET yields (after commissions)
- ✅ Include `meta` in every response
- ✅ Log errors with context
- ✅ Validate all inputs
- ✅ Use TypeScript interfaces
- ✅ Handle edge cases (no data, empty arrays)

### Don't
- ❌ Promise predictions ("will earn")
- ❌ Hide fees/commissions
- ❌ Auto-execute without user consent
- ❌ Cache stale validator data
- ❌ Hardcode secrets
- ❌ Skip error handling

---

## Deployment

### Vercel
```bash
# Deploy preview
vercel

# Deploy production
vercel --prod
```

### Environment
Set in Vercel dashboard:
- `HELIUS_API_KEY`
- `VALIDATORS_APP_TOKEN`

---

## Future Considerations

### Planned Features
1. Alert delivery (Telegram, webhooks)
2. Historical yield tracking
3. Multi-sig support
4. DAO treasury management

### Technical Debt
- [ ] Add proper API key authentication
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Set up monitoring

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-02-04 | Agent-first API design | Hackathon is about agents |
| 2026-02-04 | NET yields only | Honest data, no inflated numbers |
| 2026-02-04 | No MEV predictions | MEV is stochastic, can't predict |
| 2026-02-04 | Unsigned transactions | User always signs, maintains control |

---

*Last updated: 2026-02-04*
