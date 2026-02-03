# StakePilot Development Plan

*Colosseum Agent Hackathon - February 2026*
*Deadline: February 12, 2026*

---

## Vision

**StakePilot is the first MEV-aware staking autopilot for Solana.** 

While existing tools show basic APY, StakePilot reveals the *actual* yield by incorporating real-time Jito MEV data, enabling users to automatically optimize their staking returns across native staking, liquid staking, and DeFi strategies.

---

## What Makes StakePilot Novel

### 1. MEV-First Validator Scoring

**Problem**: Traditional staking dashboards show advertised APY and commission, ignoring MEV rewards that can add 1-3% additional yield.

**Solution**: StakePilot uses JIP-31/BAM data to score validators on *actual* MEV earnings, not promises.

```
Traditional Score: commission + uptime
StakePilot Score: commission + uptime + MEV revenue + MEV momentum + risk
```

### 2. Cross-Protocol Optimization

**Problem**: Users manually compare jitoSOL vs mSOL vs bSOL vs native staking.

**Solution**: StakePilot provides unified comparison with real-time data:
- Actual APY (not advertised)
- MEV exposure level
- Liquidity depth
- DeFi integration opportunities
- Risk-adjusted returns

### 3. Autonomous Rebalancing

**Problem**: Optimal staking strategy changes as validator performance shifts, but users don't actively manage.

**Solution**: StakePilot monitors and rebalances:
- Detects underperforming validators
- Identifies better yield opportunities
- Executes swaps only when benefit > gas cost
- Runs 24/7 without user intervention

### 4. MEV Intelligence Layer

**Problem**: MEV is opaque—users don't understand it or how to capture it.

**Solution**: StakePilot makes MEV accessible:
- MEV leaderboards
- Epoch-over-epoch MEV trends
- Predictive MEV scoring
- Educational tooltips

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          STAKEPILOT                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                       FRONTEND (Next.js)                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
│  │  │Dashboard │  │Validators│  │   LST    │  │ Strategy │     │   │
│  │  │  (Home)  │  │  Ranking │  │Comparison│  │  Config  │     │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │   │
│  └─────────────────────────────┬────────────────────────────────┘   │
│                                │                                     │
│  ┌─────────────────────────────┴────────────────────────────────┐   │
│  │                        API LAYER (Next.js API / tRPC)         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
│  │  │Validators│  │   MEV    │  │   LST    │  │ Execute  │     │   │
│  │  │   API    │  │  Stats   │  │  Stats   │  │   API    │     │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │   │
│  └─────────────────────────────┬────────────────────────────────┘   │
│                                │                                     │
│  ┌─────────────────────────────┴────────────────────────────────┐   │
│  │                       CORE ENGINE (TypeScript)                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ Data Layer   │  │  Analysis    │  │  Execution   │       │   │
│  │  │ • Jito Kobe  │  │  • Scoring   │  │  • Jupiter   │       │   │
│  │  │ • Solana RPC │  │  • Ranking   │  │  • Stake     │       │   │
│  │  │ • LST APIs   │  │  • Predictor │  │  • Rebalance │       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 (App Router) | Fast, SSR, great DX |
| Styling | Tailwind CSS + shadcn/ui | Rapid development |
| State | React Query | Caching, refetching |
| Charts | Recharts | Lightweight, React-native |
| Wallet | @solana/wallet-adapter | Standard Solana wallet connection |
| API | Next.js API Routes + tRPC | Type-safe, co-located |
| Core | TypeScript | Already built foundation |
| Swaps | Jupiter SDK | Best aggregation |
| Data | Jito Kobe, Helius | Real MEV data |

---

## Feature Prioritization

### 🔴 P0: Must Have for Hackathon Demo

| Feature | Description | Effort |
|---------|-------------|--------|
| Dashboard UI | Home page with key metrics | 3h |
| Validator Ranking | Top validators by MEV-aware score | 4h |
| MEV Leaderboard | Real-time MEV earnings per validator | 2h |
| LST Comparison | jitoSOL vs mSOL vs bSOL table | 2h |
| Wallet Connect | Connect and show user's positions | 2h |
| API Endpoints | Validators, MEV stats, LST data | 3h |

### 🟡 P1: Should Have

| Feature | Description | Effort |
|---------|-------------|--------|
| Validator Detail Page | Deep dive on single validator | 3h |
| Historical Charts | MEV trends over epochs | 3h |
| Risk Assessment | Visual risk indicators | 2h |
| Stake Action | Button to stake with validator | 4h |
| Position Tracker | Show user's current stakes | 3h |

### 🟢 P2: Nice to Have

| Feature | Description | Effort |
|---------|-------------|--------|
| Auto-Rebalancer | Autonomous stake optimization | 6h |
| Notifications | Alert on yield opportunities | 4h |
| Strategy Builder | Custom allocation strategies | 4h |
| Dark Mode | Theme toggle | 1h |
| Mobile Responsive | Full mobile support | 2h |

---

## Implementation Details

### Phase 1: Foundation (Day 1-2)

#### 1.1 Next.js Project Setup
```bash
npx create-next-app@latest dashboard --typescript --tailwind --app --src-dir
cd dashboard
npx shadcn-ui@latest init
npx shadcn-ui@latest add card button table badge
```

#### 1.2 API Integration Layer
```typescript
// src/lib/jito.ts
export async function getValidatorMevStats(epoch?: number) {
  const response = await fetch(
    `https://kobe.mainnet.jito.network/api/v1/validator_rewards?epoch=${epoch}`
  );
  return response.json();
}

// src/lib/solana.ts
export async function getValidatorInfo(voteAccount: string) {
  const connection = new Connection(RPC_URL);
  const voteAccountInfo = await connection.getVoteAccounts();
  // ...
}
```

#### 1.3 Core Components
```typescript
// Components to build:
// - ValidatorCard
// - MevBadge
// - ApyDisplay
// - RiskIndicator
// - LstComparisonTable
// - PositionCard
```

### Phase 2: Dashboard (Day 3-4)

#### 2.1 Home Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│  StakePilot                        [Connect Wallet]         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Total MEV   │  │ Best Yield  │  │ Active      │         │
│  │ This Epoch  │  │ Validator   │  │ Validators  │         │
│  │ 12,345 SOL  │  │ 8.7% APY    │  │ 1,423       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           MEV LEADERBOARD                              │  │
│  │  Rank │ Validator    │ MEV/Epoch │ APY    │ Score     │  │
│  │  1    │ Everstake    │ 234 SOL   │ 8.7%   │ 95        │  │
│  │  2    │ Chorus One   │ 198 SOL   │ 8.3%   │ 92        │  │
│  │  ...                                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           LST COMPARISON                               │  │
│  │  Token   │ Protocol  │ APY    │ MEV    │ Liquidity   │  │
│  │  jitoSOL │ Jito      │ 8.2%   │ Full   │ Deep        │  │
│  │  mSOL    │ Marinade  │ 7.1%   │ None   │ Very Deep   │  │
│  │  bSOL    │ Blaze     │ 7.4%   │ Partial│ Medium      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 API Routes
```typescript
// app/api/validators/route.ts
export async function GET() {
  const validators = await getTopValidators();
  return Response.json(validators);
}

// app/api/mev/[epoch]/route.ts
export async function GET(req, { params }) {
  const mevStats = await getMevStats(params.epoch);
  return Response.json(mevStats);
}

// app/api/lst/route.ts
export async function GET() {
  const comparison = await getLstComparison();
  return Response.json(comparison);
}
```

### Phase 3: Polish & Integration (Day 5-6)

#### 3.1 Wallet Integration
```typescript
import { useWallet } from '@solana/wallet-adapter-react';

function UserPositions() {
  const { publicKey } = useWallet();
  const { data: stakes } = useQuery({
    queryKey: ['stakes', publicKey?.toString()],
    queryFn: () => getUserStakes(publicKey!),
    enabled: !!publicKey,
  });
  
  return (/* render positions */);
}
```

#### 3.2 Real-Time Updates
```typescript
// Poll for new epoch data
useEffect(() => {
  const interval = setInterval(async () => {
    const currentEpoch = await getCurrentEpoch();
    if (currentEpoch !== lastEpoch) {
      refetchMevStats();
      refetchValidators();
    }
  }, 30000); // Every 30 seconds
  
  return () => clearInterval(interval);
}, [lastEpoch]);
```

#### 3.3 Error Handling & Loading States
```typescript
function ValidatorList() {
  const { data, isLoading, error } = useQuery(...);
  
  if (isLoading) return <ValidatorSkeleton />;
  if (error) return <ErrorCard message="Failed to load validators" />;
  
  return <ValidatorTable data={data} />;
}
```

---

## Directory Structure

```
stakepilot/
├── src/                          # Core engine (existing)
│   ├── data/
│   │   ├── jito-mev.ts          ✅ Done
│   │   ├── liquid-staking.ts    ✅ Done
│   │   └── validators.ts        🔨 TODO
│   ├── analysis/
│   │   ├── validator-scorer.ts  ✅ Done
│   │   ├── mev-predictor.ts     🔨 TODO
│   │   └── apy-calculator.ts    🔨 TODO
│   ├── strategy/
│   │   ├── rebalancer.ts        🔨 TODO
│   │   └── compounder.ts        🔨 TODO
│   └── execution/
│       ├── stake.ts             🔨 TODO
│       └── swap.ts              🔨 TODO
│
├── dashboard/                    # Next.js frontend (NEW)
│   ├── app/
│   │   ├── page.tsx             # Home/Dashboard
│   │   ├── validators/
│   │   │   └── page.tsx         # Validator list
│   │   ├── validator/[id]/
│   │   │   └── page.tsx         # Validator detail
│   │   ├── compare/
│   │   │   └── page.tsx         # LST comparison
│   │   └── api/
│   │       ├── validators/
│   │       ├── mev/
│   │       └── lst/
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── ValidatorCard.tsx
│   │   ├── MevLeaderboard.tsx
│   │   ├── LstComparison.tsx
│   │   └── PositionCard.tsx
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   └── utils.ts
│   └── hooks/
│       ├── useValidators.ts
│       └── useMevStats.ts
│
├── api/                          # Standalone API (optional)
│
├── RESEARCH.md                   ✅ Done
├── DEVPLAN.md                    ✅ This file
└── README.md                     ✅ Done
```

---

## API Design

### GET /api/validators

Returns top validators sorted by MEV-aware score.

```typescript
interface ValidatorResponse {
  voteAccount: string;
  name: string | null;
  totalScore: number;
  mevScore: number;
  totalApy: number;
  mevApy: number;
  baseApy: number;
  commission: number;
  stake: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

// Response
{
  validators: ValidatorResponse[];
  epoch: number;
  updatedAt: string;
}
```

### GET /api/mev/stats

Returns aggregate MEV statistics.

```typescript
interface MevStatsResponse {
  currentEpoch: number;
  totalMevThisEpoch: number;
  totalMevAllTime: number;
  averageMevPerValidator: number;
  topValidator: {
    voteAccount: string;
    name: string;
    mevThisEpoch: number;
  };
  mevByEpoch: { epoch: number; total: number }[];
}
```

### GET /api/lst/compare

Returns liquid staking comparison.

```typescript
interface LstCompareResponse {
  protocols: {
    id: string;
    name: string;
    token: string;
    apy: number;
    mevShare: 'full' | 'partial' | 'none';
    tvl: number;
    liquidity: 'deep' | 'medium' | 'low';
  }[];
  recommendation: string;
  bestForYield: string;
  bestForMev: string;
  updatedAt: string;
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// Test validator scoring
describe('ValidatorScorer', () => {
  it('scores MEV correctly', () => {
    const score = scoreMev(mockMevStats, allStats);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
  
  it('penalizes high commission', () => {
    const low = scoreCommission(1);
    const high = scoreCommission(10);
    expect(low).toBeGreaterThan(high);
  });
});
```

### Integration Tests
```typescript
// Test API endpoints
describe('API Routes', () => {
  it('returns validators', async () => {
    const res = await fetch('/api/validators');
    const data = await res.json();
    expect(data.validators).toHaveLength(20);
  });
});
```

### E2E Tests
```typescript
// Test user flows with Playwright
test('user can view validator ranking', async ({ page }) => {
  await page.goto('/validators');
  await expect(page.getByTestId('validator-table')).toBeVisible();
  await expect(page.getByText('Everstake')).toBeVisible();
});
```

---

## Deployment

### Vercel (Frontend)
```bash
cd dashboard
vercel deploy
```

### Environment Variables
```env
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=xxx
NEXT_PUBLIC_JITO_API=https://kobe.mainnet.jito.network
HELIUS_API_KEY=xxx
```

---

## Timeline

| Day | Date | Focus | Deliverables |
|-----|------|-------|--------------|
| 1 | Feb 3 | Research + Plan | RESEARCH.md, DEVPLAN.md ✅ |
| 2 | Feb 4 | Dashboard Setup | Next.js project, components |
| 3 | Feb 5 | API Integration | All API routes working |
| 4 | Feb 6 | Core Features | Validator ranking, MEV leaderboard |
| 5 | Feb 7 | LST + Wallet | LST comparison, wallet connect |
| 6 | Feb 8 | Polish | UI polish, error handling |
| 7 | Feb 9 | Testing | Integration tests, bug fixes |
| 8 | Feb 10 | Demo Prep | Demo video, screenshots |
| 9 | Feb 11 | Final Push | Last fixes, forum engagement |
| 10 | Feb 12 | DEADLINE | Submit! 🚀 |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Validators displayed | 100+ |
| API response time | < 500ms |
| Page load time | < 2s |
| MEV data freshness | < 1 epoch old |
| UI completeness | All P0 features |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Jito API down | Low | High | Cache data, fallback |
| RPC rate limits | Medium | Medium | Multiple RPC providers |
| Time crunch | Medium | High | Focus on P0 only |
| Complex MEV calc | Medium | Medium | Simplify, iterate later |

---

## Notes

- Keep commits small and frequent
- Test against mainnet data early
- Focus on working demo over perfect code
- Document everything for judges

---

*Let's build something that wins! 🏆*
