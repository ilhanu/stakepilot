# StakePilot — Autonomous Staking for Decentralization

**StakePilot** is an autonomous staking agent that directs stake to high-quality, underserved validators — helping secure Solana's decentralization while earning competitive yields.

## The Problem

Solana's security depends on stake distribution. But stake keeps concentrating at the top:

- **Top validators** already have millions in stake — they don't need more
- **Smaller validators** with excellent uptime and low fees struggle to attract stake
- **Stakers** don't have time to research 1,500+ validators
- **Stake pools** route to their own validators, not the broader ecosystem

The result: a few large operators control an outsized share of block production, MEV extraction, and network influence.

## The Solution

StakePilot is an **autonomous agent** that actively routes stake to validators that:

- ✅ Have **less than 1M SOL** stake (underserved)
- ✅ Charge **≤5% commission** (fair to stakers)
- ✅ Maintain **≥95% uptime** (reliable)
- ✅ Are **not delinquent** (actively voting)

You deposit SOL. The agent handles the rest.

## How It Works

### 1. Deposit SOL
Send SOL to the StakePilot vault. You remain in full control — **only you can withdraw**.

### 2. Agent Analyzes Validators
Every hour, the agent pulls fresh data and scores validators:

| Data Source | Metrics |
|-------------|---------|
| validators.app API | Stake, commission, MEV commission, uptime, quality score, location |
| Solana RPC | Vote status, epoch credits, liveness |

### 3. Agent Stakes to Best Matches
The agent distributes your stake across qualified validators based on a weighted scoring algorithm.

### 4. You Earn Rewards
Standard Solana staking yields (~7-8% APY), with your stake actively supporting decentralization.

---

## Agent Scoring Algorithm

The agent scores each validator and picks the top performers:

```
Score = Decentralization + Commission + MEV + Uptime + Quality + Infrastructure

Decentralization Bonus (smaller = better):
  < 100K SOL stake  → +40 pts
  < 500K SOL stake  → +30 pts  
  < 1M SOL stake    → +15 pts
  ≥ 1M SOL stake    → EXCLUDED

Commission (lower = better):
  0%  → +25 pts
  5%  → +15 pts
  10% → +0 pts

MEV Commission (Jito validators):
  0%   → +20 pts
  10%  → +10 pts
  100% → +0 pts

Uptime:
  100% → +15 pts
  95%  → +7.5 pts

Quality (validators.app score):
  ≥8 → +10 pts
  ≥6 → +5 pts

Infrastructure:
  DoubleZero participant → +5 pts
```

### Hard Filters (Must Pass All)

| Criteria | Threshold |
|----------|-----------|
| Max stake | < 1,000,000 SOL |
| Max commission | ≤ 5% |
| Max MEV commission | ≤ 10% |
| Min uptime | ≥ 95% |
| Delinquent | No |

---

## Why An Agent?

| Manual Staking | StakePilot Agent |
|----------------|------------------|
| Check validators occasionally | Monitors every hour |
| Overwhelmed by 1,500+ options | Filters to qualified subset |
| Follow popular choices | Actively seeks underserved validators |
| React slowly to changes | Rebalances automatically |
| Emotional decisions | Data-driven scoring |

The agent doesn't pick favorites. It follows the algorithm.

---

## Security Model

**The agent can stake but NEVER withdraw.**

| Action | Who Can Do It |
|--------|---------------|
| Deposit SOL | You |
| Withdraw SOL | You only |
| Stake to validators | Agent |
| Change strategy | You |
| Replace agent | You |

Your funds are always under your control. The agent only has permission to stake — never to move funds to itself or any other destination.

---

## Earning Model

StakePilot is currently **free** during the launch phase.

Future sustainability options under consideration:
- Small protocol fee on staking yields (5-10%)
- Premium features for advanced users
- MEV tip-sharing integration

All fees will be transparent and visible before you stake.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contract | Anchor (Rust) on Solana |
| Agent | Node.js + TypeScript |
| Frontend | Next.js + React |
| Data | validators.app API + Solana RPC |
| Hosting | Vercel |

---

## Testnet Deployment

| Component | Address |
|-----------|---------|
| Program | `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b` |
| Vault PDA | `HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u` |
| Agent Wallet | `By596jaboXuq2jt6EKB8XuMMWxpccTdEJdmmgL1HoBny` |

**Live Demo:** [stakepilot-olig.vercel.app](https://stakepilot-olig.vercel.app)

---

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/agent/positions` | Current stake positions |
| `GET /api/agent/validators` | Qualified validators list |
| `GET /api/agent/recommend` | Staking recommendations |
| `GET /api/agent/analyze` | Agent decision reasoning |
| `GET /api/vault/status` | Vault balance and state |

---

## Project Structure

```
dashboard/
├── src/
│   ├── app/           # Next.js pages
│   ├── components/    # React components
│   └── lib/           # SDK, validators, utilities
├── scripts/
│   └── agent-execute.ts  # Agent cron script
└── programs/
    └── agent-vault/   # Solana smart contract
```

---

## Built For

🏆 **Colosseum Agent Hackathon** — February 2026

---

## The Mission

Stake shouldn't flow to whoever has the best marketing. It should flow to whoever runs the best infrastructure.

StakePilot is infrastructure for a more decentralized Solana.

---

*Your SOL. Quality validators. Autonomous execution.*
