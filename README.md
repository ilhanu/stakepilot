# StakePilot 🚀

**The MEV-Aware Staking Autopilot for Solana**

StakePilot uses real-time JIP-31 data, validator MEV earnings, and on-chain analytics to automatically optimize your staking yield.

## What It Does

- 📊 **Tracks Real MEV** — Not just advertised APY, but actual MEV earnings per validator via JIP-31
- 🔄 **Auto-Rebalances** — Moves stake to higher-performing validators automatically  
- 💧 **Liquid Staking Intelligence** — Compares jitoSOL, mSOL, bSOL, and native staking in real-time
- 🎯 **Yield Optimization** — Compounds rewards and executes optimal strategies 24/7
- ⚡ **Set and Forget** — Autonomous operation, just connect your wallet

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         STAKEPILOT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │ JIP-31   │    │ Validator│    │ Liquid   │                 │
│   │ MEV Data │    │ Stats    │    │ Staking  │                 │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                 │
│        │               │               │                        │
│        └───────────────┼───────────────┘                        │
│                        ▼                                         │
│              ┌─────────────────┐                                │
│              │  AI Optimizer   │                                │
│              │  (Yield Model)  │                                │
│              └────────┬────────┘                                │
│                       ▼                                          │
│              ┌─────────────────┐                                │
│              │ Execution Layer │                                │
│              │ (Jupiter/Stake) │                                │
│              └─────────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Sources

| Source | Data |
|--------|------|
| [Jito Kobe API](https://kobe.mainnet.jito.network) | JIP-31 MEV rewards, BAM validator data |
| [Helius](https://helius.dev) | Stake account tracking, real-time updates |
| Solana RPC | Validator stats, epoch info, stake weights |
| [Jupiter](https://jup.ag) | Liquid staking swaps, price feeds |

## Architecture

```
stakepilot/
├── src/
│   ├── data/           # Data fetchers
│   │   ├── jip31.ts    # JIP-31 MEV rewards
│   │   ├── validators.ts
│   │   └── liquid-staking.ts
│   ├── analysis/       # Yield analysis
│   │   ├── mev-predictor.ts
│   │   ├── apy-calculator.ts
│   │   └── risk-scorer.ts
│   ├── strategy/       # Optimization strategies
│   │   ├── rebalancer.ts
│   │   └── compounder.ts
│   └── execution/      # On-chain execution
│       ├── stake.ts
│       └── swap.ts
├── api/                # REST API endpoints
└── dashboard/          # Web interface
```

## Key Features

### 1. MEV-Aware Validator Scoring

Unlike traditional staking dashboards that only show commission rates, StakePilot tracks **actual MEV earnings** from JIP-31:

```typescript
interface ValidatorScore {
  address: string;
  baseApy: number;        // Standard staking rewards
  mevApy: number;         // JIP-31 MEV earnings (the secret sauce)
  totalApy: number;       // Combined real yield
  riskScore: number;      // Concentration, uptime, etc.
  recommendation: 'stake' | 'unstake' | 'hold';
}
```

### 2. Liquid Staking Comparison

Real-time comparison across all major liquid staking tokens:

| Token | Protocol | APY | MEV Share | Liquidity |
|-------|----------|-----|-----------|-----------|
| jitoSOL | Jito | 8.2% | ✅ Full MEV | Deep |
| mSOL | Marinade | 7.1% | ❌ None | Very Deep |
| bSOL | BlazeStake | 7.4% | ⚠️ Partial | Medium |

### 3. Auto-Rebalancing

When yield opportunities shift, StakePilot automatically:
1. Detects higher-yield opportunities
2. Calculates if the gain exceeds transaction costs
3. Executes the optimal swap/stake transaction
4. Compounds rewards back into the position

## Solana Integration

- **Stake Program** — Native stake account management
- **Jupiter** — Liquid staking token swaps
- **Helius** — Real-time account tracking via webhooks
- **Jito** — MEV reward tracking and claiming

## Tech Stack

- **Runtime**: Node.js / TypeScript
- **Solana**: @solana/web3.js, @solana/spl-token
- **Data**: Helius API, Jito Kobe API
- **Swaps**: Jupiter Aggregator
- **Frontend**: Next.js (dashboard)

## Getting Started

```bash
# Clone
git clone https://github.com/ilhanu/stakepilot
cd stakepilot

# Install
npm install

# Configure
cp .env.example .env
# Add your RPC URL, Helius API key

# Run
npm run dev
```

## Roadmap

- [x] JIP-31 MEV data integration
- [x] Validator scoring algorithm
- [ ] Liquid staking comparison engine
- [ ] Auto-rebalancing logic
- [ ] Jupiter swap integration
- [ ] Web dashboard
- [ ] Autonomous execution mode

## Built For

[Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon) — Feb 2026

## License

MIT

---

*StakePilot: Because your SOL deserves the best yield.*
