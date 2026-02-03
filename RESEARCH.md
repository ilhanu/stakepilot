# StakePilot Research Document

*Deep research for the Colosseum Agent Hackathon - February 2026*

---

## Table of Contents

1. [Jito MEV & Block Building](#1-jito-mev--block-building)
2. [JIP-31 / BAM Mechanics](#2-jip-31--bam-mechanics)
3. [Paladin Analysis](#3-paladin-analysis)
4. [Harmonic on Solana](#4-harmonic-on-solana)
5. [Transaction Landing on Solana](#5-transaction-landing-on-solana)
6. [Arbitrage Detection](#6-arbitrage-detection)
7. [Slippage & Price Impact Models](#7-slippage--price-impact-models)
8. [Fault Tolerant Systems](#8-fault-tolerant-systems)
9. [Competitive Analysis](#9-competitive-analysis)
10. [Novel Opportunities for StakePilot](#10-novel-opportunities-for-stakepilot)

---

## 1. Jito MEV & Block Building

### Overview

Jito is the dominant MEV (Maximal Extractable Value) infrastructure on Solana, running a modified validator client that enables out-of-protocol block building. Unlike Ethereum's MEV-Boost/Flashbots model, Jito integrates directly into the validator client.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     JITO BLOCK ENGINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   Searchers  │    │   Bundles    │    │   Block      │     │
│   │   (Traders)  │───▶│   Service    │───▶│   Builder    │     │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                  │               │
│                                                  ▼               │
│                                        ┌──────────────┐         │
│                                        │  Validators  │         │
│                                        │  (Jito-Sol)  │         │
│                                        └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Jito-Solana Validator Client
- Fork of the Agave (formerly Solana Labs) validator
- Adds support for receiving bundles from the Block Engine
- ~90%+ of Solana stake runs Jito-Solana

#### 2. Block Engine
- Centralized service that collects bundles from searchers
- Runs auctions to determine bundle inclusion
- Forwards winning bundles to validators
- Regional endpoints for low latency (Amsterdam, Frankfurt, NY, Tokyo)

#### 3. Bundles
- Atomic set of transactions that execute together or not at all
- Searchers attach "tips" (SOL payments) to incentivize inclusion
- Tips go to validators (and now stakers via JIP-31)

#### 4. ShredStream
- Low-latency shred (block data) forwarding service
- Gives subscribers ~100-200ms advantage in seeing confirmed transactions
- Critical for competitive MEV extraction

### MEV Types on Solana

| Type | Description | Value |
|------|-------------|-------|
| **Sandwich Attacks** | Front/back-run AMM trades | High, but controversial |
| **Liquidations** | Seize undercollateralized positions | Moderate |
| **Arbitrage** | Cross-DEX price discrepancies | High volume |
| **JIT Liquidity** | Just-in-time LP for swaps | Growing |
| **NFT Mints** | Priority access to mints | Spiky |

### Tip Distribution

Prior to JIP-31, tips went 100% to validators. Now:
- **Stakers** receive MEV rewards proportional to their stake
- **Validators** keep a commission (configurable, typically 5-10%)
- Distribution happens through the BAM (Block Auction Market) system

---

## 2. JIP-31 / BAM Mechanics

### What is JIP-31?

JIP-31 (Jito Improvement Proposal 31) introduced the Block Auction Market (BAM), fundamentally changing how MEV rewards flow on Solana. Launched at **epoch 912** (December 2024).

### The Problem JIP-31 Solves

Before JIP-31:
- Validators captured 100% of MEV tips
- No incentive for stakers to consider MEV when choosing validators
- MEV was a "hidden yield" not visible in APY calculations

After JIP-31:
- MEV rewards flow to stakers proportionally
- Creates transparent MEV yield that stakers can optimize for
- Aligns validator and staker incentives

### How BAM Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCK AUCTION MARKET (BAM)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  EPOCH N:                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  1. Searchers submit bundles with tips                   │    │
│  │  2. Block Engine auctions block space                    │    │
│  │  3. Winning bundles included, tips collected             │    │
│  │  4. Tips aggregated to BAM pool                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  EPOCH N+1:                                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  5. BAM calculates rewards per validator                 │    │
│  │  6. Validators claim via BAM program                     │    │
│  │  7. Rewards distributed to stake accounts                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### BAM Eligibility

Validators must meet criteria to participate:
- Running Jito-Solana client
- Minimum stake threshold
- Connected to Block Engine
- Good performance (skip rate, uptime)

### BAM API Endpoints (Kobe)

The Jito Kobe API provides BAM data:

```typescript
// Validator rewards per epoch
GET /api/v1/validator_rewards?epoch={epoch}

// BAM-eligible validators
GET /api/v1/bam_validators?epoch={epoch}

// Boost validators (subsidies)
GET /api/v1/bam_boost_validators?epoch={epoch}

// JitoSOL/SOL ratio
POST /api/v1/jitosol_sol_ratio
```

### Reward Calculation

```typescript
// Per-validator MEV reward
reward_lamports = (validator_stake / total_bam_stake) * epoch_mev_pool

// Staker's share
staker_reward = reward_lamports * (staker_stake / validator_stake) * (1 - commission)

// MEV APY estimate
mev_apy = (avg_epoch_reward / stake) * epochs_per_year * 100
// epochs_per_year ≈ 146 (each epoch is ~2.5 days)
```

### Commission Structure

| Component | Typical Range | Notes |
|-----------|---------------|-------|
| MEV Commission | 5-10% | Validator keeps this |
| Priority Fee Commission | 0-100% | Some validators pass through 100% |
| Base Commission | 5-10% | On inflation rewards |

---

## 3. Paladin Analysis

### What is Paladin?

Paladin is an **MEV protection and redistribution protocol** on Solana. It aims to protect users from harmful MEV (like sandwich attacks) while capturing beneficial MEV for users.

### Core Concepts

#### 1. MEV Protection
- Transactions routed through Paladin are protected from sandwich attacks
- Works by submitting transactions to a private mempool
- Searchers cannot see transactions before they land

#### 2. MEV Redistribution
- When MEV is extracted on Paladin-protected transactions, value is returned to users
- Creates a "fair" MEV extraction model where victims become beneficiaries

#### 3. Integration with Staking

Paladin relates to staking through:
- **Validator Selection**: Recommends validators that support MEV protection
- **Reward Sharing**: Some MEV captured by Paladin flows back to stakers
- **jitoSOL Integration**: Works with liquid staking tokens

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PALADIN SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User TX ──▶ Paladin Router ──▶ Private Mempool                │
│                     │                   │                        │
│                     ▼                   ▼                        │
│              MEV Protection      Searcher Access                 │
│                     │                   │                        │
│                     └─────────┬─────────┘                        │
│                               ▼                                  │
│                     ┌─────────────────┐                         │
│                     │   Block Engine  │                         │
│                     └────────┬────────┘                         │
│                              ▼                                   │
│                     MEV Redistribution                          │
│                              │                                   │
│                     ┌────────┴────────┐                         │
│                     ▼                 ▼                          │
│                   Users           Stakers                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Relevance to StakePilot

1. **Validator Scoring**: Include Paladin compatibility as a scoring factor
2. **MEV Source**: Track Paladin-originated MEV separately
3. **User Protection**: Recommend Paladin for swap execution
4. **Additional Yield**: Paladin redistribution as bonus yield source

---

## 4. Harmonic on Solana

### What is Harmonic?

Harmonic refers to multiple concepts in the Solana ecosystem:

#### 1. Harmonic.xyz - Institutional DeFi

Harmonic.xyz is an institutional-grade DeFi platform providing:
- Yield optimization strategies
- Risk management tools
- Compliant DeFi access

#### 2. Harmonic in MEV Context

In the MEV/trading context, "harmonic" often refers to:
- **Harmonic patterns**: Technical analysis patterns (Gartley, Butterfly, etc.)
- **Harmonic arbitrage**: Price discovery across related assets

#### 3. Harmonic Validator Operations

Some validator operations refer to "harmonic" scheduling:
- Block production patterns
- Leader schedule optimization
- Coordinated validator behavior

### Relevance to Staking

If Harmonic.xyz integrates with staking:
1. May offer institutional staking products
2. Could provide yield aggregation across LSTs
3. Potential for StakePilot integration as data source

### Research Notes

*[Further investigation needed on specific Harmonic protocol if user means a different project]*

---

## 5. Transaction Landing on Solana

### Overview

Understanding how transactions land on Solana is critical for:
- MEV extraction timing
- Staking transaction optimization
- Bundle submission strategies

### Transaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 SOLANA TRANSACTION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. USER SUBMITS TX                                              │
│     ┌──────────────┐                                            │
│     │  RPC Node    │ ◀── User wallet sends TX                   │
│     └──────┬───────┘                                            │
│            │                                                     │
│  2. TX FORWARDING                                                │
│            ▼                                                     │
│     ┌──────────────┐    ┌──────────────┐                       │
│     │   TPU        │───▶│   Leader     │                       │
│     │   (UDP/QUIC) │    │   Validator  │                       │
│     └──────────────┘    └──────────────┘                       │
│                               │                                  │
│  3. BLOCK PRODUCTION                                             │
│                               ▼                                  │
│                        ┌──────────────┐                         │
│                        │   Block      │                         │
│                        │   Builder    │                         │
│                        └──────┬───────┘                         │
│                               │                                  │
│  4. SHRED PROPAGATION                                            │
│                               ▼                                  │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│     │  Validator A │    │  Validator B │    │  Validator C │   │
│     └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                  │
│  5. CONFIRMATION                                                 │
│     - Optimistic: 400-500ms                                     │
│     - Finalized: ~13 seconds (32 slots)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Priority Fees

Solana uses **priority fees** (Compute Unit Prices) to order transactions:

```typescript
// Priority fee calculation
priority_fee = compute_units * compute_unit_price

// Example: 200,000 CU at 1,000 microlamports/CU = 0.0002 SOL
fee = 200_000 * 1_000 / 1_000_000_000 = 0.0002 SOL
```

### Fee Markets

| Scenario | Typical Priority Fee | Notes |
|----------|---------------------|-------|
| Normal | 1-100 μLamports/CU | ~0.00001 SOL |
| Moderate congestion | 100-10,000 μL/CU | ~0.001 SOL |
| High demand (NFT mint) | 100,000-10M μL/CU | 0.1-10+ SOL |

### Bundle Submission

For MEV-protected or atomic transactions:

```typescript
// Using Jito bundles
const bundle = {
  transactions: [tx1, tx2, tx3], // Execute atomically
  tip: 10_000_000, // 0.01 SOL tip to validator
};

// Submit to Jito Block Engine
await jito.sendBundle(bundle);
```

### Key Insights for StakePilot

1. **Timing Sensitivity**: Stake/unstake transactions have lower urgency
2. **Bundle for Swaps**: Use bundles when converting between LSTs
3. **Priority Fee Optimization**: Can save users money on non-urgent actions
4. **Landing Statistics**: Track which validators land transactions faster

---

## 6. Arbitrage Detection

### Overview

Arbitrage opportunities arise from price discrepancies across venues. Understanding these helps StakePilot:
1. Predict MEV extraction (affects validator rewards)
2. Optimize LST conversions
3. Identify high-MEV-producing validators

### Types of Arbitrage

#### 1. Cross-DEX Arbitrage
```
Buy on Orca @ $100
Sell on Raydium @ $101
Profit: ~$1 (minus fees)
```

#### 2. Triangular Arbitrage
```
SOL → USDC (Orca)
USDC → mSOL (Raydium)  
mSOL → SOL (Jupiter)
Net profit if prices misaligned
```

#### 3. LST Arbitrage (Relevant to StakePilot!)
```
jitoSOL trading at 1.24 SOL on Jupiter
jitoSOL redeemable for 1.25 SOL via Jito
Arbitrage: Buy jitoSOL → Redeem → Profit
```

### Detection Methods

#### Price Feed Comparison
```typescript
interface ArbitrageOpportunity {
  tokenA: string;
  tokenB: string;
  buyVenue: string;
  sellVenue: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  profitBps: number;
  estimatedProfit: number;
  requiredCapital: number;
}

async function detectArbitrage(
  token: string,
  venues: string[]
): Promise<ArbitrageOpportunity[]> {
  // Fetch prices from all venues
  const prices = await Promise.all(
    venues.map(v => fetchPrice(token, v))
  );
  
  // Find price discrepancies
  const opportunities: ArbitrageOpportunity[] = [];
  
  for (let i = 0; i < venues.length; i++) {
    for (let j = i + 1; j < venues.length; j++) {
      const spread = (prices[j] - prices[i]) / prices[i];
      if (Math.abs(spread) > 0.001) { // 10 bps threshold
        opportunities.push({
          // ... details
        });
      }
    }
  }
  
  return opportunities;
}
```

#### On-Chain Analysis
```typescript
// Monitor DEX pools for price changes
// Detect opportunities before others
function monitorPoolReserves(poolAddress: string) {
  connection.onAccountChange(poolAddress, (accountInfo) => {
    const reserves = parsePoolReserves(accountInfo);
    const impliedPrice = reserves.tokenA / reserves.tokenB;
    // Compare with other pools
  });
}
```

### MEV Correlation

High arbitrage activity correlates with:
- More MEV tips to validators
- Higher JitoSOL yields
- Better returns for BAM-eligible validators

### StakePilot Application

1. **MEV Prediction**: Use arb activity as leading indicator for validator rewards
2. **LST Timing**: Identify when to swap between LSTs based on arb pressure
3. **Validator Intelligence**: Validators capturing more arb = higher MEV distribution

---

## 7. Slippage & Price Impact Models

### Overview

Understanding slippage is critical for StakePilot's swap execution when converting between LSTs or compounding rewards.

### Definitions

- **Slippage**: Difference between expected and executed price
- **Price Impact**: Market movement caused by the trade itself
- **Slippage Tolerance**: Maximum acceptable slippage

### AMM Price Impact Model (Constant Product)

For Uniswap-style AMMs (Orca, Raydium):

```typescript
// Constant Product: x * y = k
// Price impact for buying Δx of token X:

function calculatePriceImpact(
  reserveX: number,
  reserveY: number,
  amountIn: number
): { amountOut: number; priceImpact: number } {
  const k = reserveX * reserveY;
  const newReserveX = reserveX + amountIn;
  const newReserveY = k / newReserveX;
  const amountOut = reserveY - newReserveY;
  
  const spotPrice = reserveY / reserveX;
  const executionPrice = amountOut / amountIn;
  const priceImpact = (spotPrice - executionPrice) / spotPrice;
  
  return { amountOut, priceImpact };
}
```

### Concentrated Liquidity (CLMM)

For concentrated liquidity pools (Orca Whirlpools, Raydium CLMM):

```typescript
// Price impact depends on liquidity at current tick range
function calculateClmmPriceImpact(
  liquidity: number,
  sqrtPriceX64: bigint,
  amountIn: number,
  tickSpacing: number
): number {
  // More complex calculation across tick ranges
  // Lower impact when liquidity is concentrated around current price
}
```

### Slippage Budget for StakePilot

| Operation | Typical Slippage | Max Acceptable |
|-----------|-----------------|----------------|
| SOL → jitoSOL | 0.05-0.1% | 0.5% |
| jitoSOL → mSOL | 0.1-0.3% | 1% |
| Large rebalance (>100 SOL) | 0.5-2% | 3% |
| Instant unstake | 0.1-0.3% | 1% |

### Optimal Execution

```typescript
interface SwapStrategy {
  route: Route[];
  expectedSlippage: number;
  priceImpact: number;
  recommendation: 'execute' | 'split' | 'wait';
}

function optimizeSwap(
  fromToken: string,
  toToken: string,
  amount: number
): SwapStrategy {
  // Get Jupiter quote
  const quote = await jupiter.quoteGet({
    inputMint: fromToken,
    outputMint: toToken,
    amount,
    slippageBps: 50, // 0.5%
  });
  
  // Analyze price impact
  const priceImpact = quote.priceImpactPct;
  
  if (priceImpact > 2) {
    return { 
      recommendation: 'split',
      // Split into multiple smaller swaps
    };
  }
  
  if (priceImpact > 0.5) {
    return {
      recommendation: 'wait',
      // Wait for liquidity or better price
    };
  }
  
  return { recommendation: 'execute', ...quote };
}
```

---

## 8. Fault Tolerant Systems

### Overview

StakePilot must be fault tolerant to:
1. Handle RPC failures gracefully
2. Survive network congestion
3. Protect user funds during outages
4. Recover from partial failures

### Design Principles

#### 1. Redundancy
```
┌─────────────────────────────────────────────────────────────────┐
│                 FAULT TOLERANT ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   Helius     │    │   Triton     │    │   Quicknode  │     │
│   │   RPC        │    │   RPC        │    │   RPC        │     │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│          │                   │                   │               │
│          └───────────────────┼───────────────────┘               │
│                              ▼                                   │
│                     ┌─────────────────┐                         │
│                     │   RPC Router    │                         │
│                     │   (Failover)    │                         │
│                     └────────┬────────┘                         │
│                              │                                   │
│                              ▼                                   │
│                     ┌─────────────────┐                         │
│                     │   StakePilot    │                         │
│                     └─────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Retry with Exponential Backoff
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelayMs * Math.pow(2, i);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### 3. Circuit Breaker
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

#### 4. Idempotent Operations
```typescript
// All operations should be safe to retry
interface StakeOperation {
  id: string; // Unique operation ID
  type: 'stake' | 'unstake' | 'swap';
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txSignature?: string;
  createdAt: number;
  
  // Idempotency: same operation produces same result
  // Even if executed multiple times
}

async function executeOperation(op: StakeOperation): Promise<void> {
  // Check if already executed
  if (op.status === 'confirmed') return;
  
  // Check if transaction already landed
  if (op.txSignature) {
    const status = await connection.getSignatureStatus(op.txSignature);
    if (status?.value?.confirmationStatus === 'confirmed') {
      op.status = 'confirmed';
      return;
    }
  }
  
  // Execute and record signature
  // ...
}
```

#### 5. Health Monitoring
```typescript
interface HealthStatus {
  rpc: 'healthy' | 'degraded' | 'down';
  jitoApi: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  lastCheck: number;
}

async function checkHealth(): Promise<HealthStatus> {
  const [rpcHealth, jitoHealth, dbHealth] = await Promise.allSettled([
    checkRpcHealth(),
    checkJitoApiHealth(),
    checkDatabaseHealth(),
  ]);
  
  return {
    rpc: rpcHealth.status === 'fulfilled' ? 'healthy' : 'down',
    jitoApi: jitoHealth.status === 'fulfilled' ? 'healthy' : 'down',
    database: dbHealth.status === 'fulfilled' ? 'healthy' : 'down',
    lastCheck: Date.now(),
  };
}
```

---

## 9. Competitive Analysis

### Existing Staking Tools

#### Step Finance
- **Pros**: Portfolio tracking, multi-asset
- **Cons**: No MEV intelligence, no auto-rebalancing

#### Marinade Native
- **Pros**: Institutional-grade, SAM (Stake Auction Marketplace)
- **Cons**: Locked to Marinade validators, no cross-protocol optimization

#### Jito Stake Pool
- **Pros**: Full MEV exposure via jitoSOL
- **Cons**: Single strategy, no customization

#### Phantom Staking
- **Pros**: Simple UX, wallet-integrated
- **Cons**: No MEV data, limited validator choice

### StakePilot Differentiators

| Feature | StakePilot | Step | Marinade | Jito |
|---------|------------|------|----------|------|
| MEV-aware scoring | ✅ | ❌ | ⚠️ | ⚠️ |
| Cross-protocol optimization | ✅ | ❌ | ❌ | ❌ |
| Auto-rebalancing | ✅ | ❌ | ⚠️ | ❌ |
| Real-time APY tracking | ✅ | ⚠️ | ✅ | ⚠️ |
| Liquid staking comparison | ✅ | ⚠️ | ❌ | ❌ |
| Risk scoring | ✅ | ❌ | ⚠️ | ❌ |

---

## 10. Novel Opportunities for StakePilot

Based on this research, here are unique features we should build:

### 1. MEV Momentum Indicator
Track MEV reward velocity (not just total) to identify validators on upward trends:
```typescript
mevMomentum = (thisEpochMev - lastEpochMev) / lastEpochMev
```

### 2. LST Arbitrage Alert
Notify users when LST prices diverge from redemption value:
```typescript
if (marketPrice < redemptionValue * 0.995) {
  alert("jitoSOL is trading at a discount - buying opportunity!");
}
```

### 3. Epoch Timing Optimizer
Recommend best time to stake/unstake based on epoch cycle:
- Early epoch: Lower competition for stake
- Late epoch: Full epoch rewards
- Cross-epoch: Avoid cooldown penalties

### 4. MEV Exposure Dial
Let users choose their MEV exposure level:
- Conservative: mSOL-heavy (no MEV, stable)
- Balanced: 50/50 mSOL/jitoSOL
- Aggressive: jitoSOL + direct validator staking

### 5. Validator MEV Leaderboard
Real-time ranking of validators by MEV earnings per stake:
- Historical performance
- Recent momentum
- Risk-adjusted returns

### 6. Smart Compounding
Auto-compound rewards at optimal intervals:
- Factor in gas costs vs. compound benefit
- Batch transactions for efficiency
- Time compounds for low-fee periods

### 7. Decentralization Score
Bonus points for staking with smaller validators:
- Helps Solana decentralization
- Often better MEV share (lower commission)
- Network health contribution visible to users

---

## Data Sources Summary

| Source | Data | Update Frequency |
|--------|------|------------------|
| Jito Kobe API | MEV rewards, BAM validators | Per epoch |
| Solana RPC | Validator info, stake accounts | Real-time |
| Jupiter Price API | Token prices, swap routes | Real-time |
| Marinade API | mSOL stats, TVL | Hourly |
| BlazeStake API | bSOL stats | Hourly |
| Sanctum API | LST aggregator data | Real-time |
| Helius | Webhooks, account tracking | Real-time |

---

## Next Steps

1. **Build Dashboard**: Implement real-time MEV tracking UI
2. **Validator API**: Create comprehensive validator ranking endpoint
3. **LST Comparison Engine**: Live comparison across all protocols
4. **Auto-Rebalancer**: Logic for when to move stake
5. **Integration Tests**: Test against live Jito/Marinade APIs

---

*Research compiled for Colosseum Agent Hackathon - StakePilot*
*Last updated: February 2026*
