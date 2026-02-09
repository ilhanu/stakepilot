# StakePilot — Autonomous Staking Vault

**Colosseum Agent Hackathon Submission**

---

## 🎯 One-Liner

**An AI agent that autonomously stakes SOL to the best underserved validators — and can never steal your funds.**

---

## 📝 Description

StakePilot is an **autonomous staking vault** on Solana. Users deposit SOL into an on-chain vault. An AI agent continuously evaluates 1,500+ validators, stakes to the best underserved ones, and automatically rebalances when performance drops — all without any user intervention.

The key innovation: **the agent can stake and rebalance, but the smart contract makes it mathematically impossible for the agent to withdraw funds to itself.** Only depositors can withdraw. This is not a promise — it's enforced by code.

### Why This Matters

- **19 validators control 33% of Solana's stake** — massive centralization risk
- Most users stake once and forget — no optimization, no rebalancing
- Comparing validators is overwhelming (APY, commission, MEV, uptime, location...)

StakePilot solves all three: deposit once, the agent handles everything, and it actively supports network decentralization by favoring underserved validators.

---

## 🔐 Security Model — The Core Innovation

The smart contract enforces a strict permission model:

| Action | Who | Enforced By |
|--------|-----|-------------|
| Deposit SOL | User only | Smart contract |
| Withdraw SOL | User only | Smart contract |
| Stake to validators | Agent only | Smart contract |
| Deactivate stake | Agent only | Smart contract |
| Withdraw stake (back to vault) | Agent only | Smart contract |
| Change agent | Admin only | Smart contract |

The agent wallet (`By596j...`) can **only** move funds between the vault and stake accounts. It cannot transfer SOL to any arbitrary address. The vault PDA is the staker and withdrawer on all stake accounts — the agent merely triggers instructions that the program validates.

---

## 🤖 Agent Algorithm

The agent runs hourly via cron and executes this flow:

### Phase 1: Rebalancing
1. **Scan** existing stake accounts (vault PDA as authority)
2. **Score** each validator using validators.app API (commission, uptime, delinquency, active stake)
3. **Deactivate** underperformers (score < 30, or dropped to <50% of best)
4. **Withdraw** fully-deactivated stakes back to the vault (after epoch cooldown)
5. **Staker Space validator is always kept** — skin in the game

### Phase 2: New Staking
1. **Check** vault balance (minus 0.1 SOL reserve)
2. **Select** top validators from recommendations (≤5% commission, <1M SOL stake, not delinquent)
3. **Allocate** evenly across up to 5 validators
4. **Execute** on-chain stake transactions
5. **Log** all activity for dashboard transparency

### Scoring Factors
- Commission (≤5%)
- Active status (not delinquent)
- Stake concentration (<1M SOL — favor decentralization)
- validators.app total score

---

## 🏗️ Architecture

```
┌──────────────────────────────────────┐
│           USERS                      │
│  Deposit SOL → Vault PDA            │
│  Withdraw SOL ← Vault PDA           │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│    AGENT VAULT — Smart Contract      │
│    Program: 66VGaTF2qqo...           │
│                                      │
│  Vault PDA (HpsHuysk...)             │
│  ├─ authority (admin)                │
│  ├─ agent (By596j...)                │
│  ├─ total_deposits                   │
│  ├─ total_staked                     │
│  └─ total_users                      │
│                                      │
│  Instructions:                       │
│  • initialize_vault                  │
│  • deposit / withdraw                │
│  • stake_to_validator (agent)        │
│  • deactivate_stake (agent)          │
│  • withdraw_stake (agent → vault)    │
│  • update_agent (admin)              │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│         AI AGENT (Cron)              │
│                                      │
│  1. Fetch validator data             │
│  2. Score & rank                     │
│  3. Rebalance underperformers        │
│  4. Stake to new validators          │
│  5. Log activity to dashboard        │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│     STAKE ACCOUNTS (Native)          │
│  Staker: Vault PDA                   │
│  Withdrawer: Vault PDA               │
│  Delegated to: Selected validators   │
└──────────────────────────────────────┘
```

---

## ✅ What's Working (Testnet)

- [x] **Smart contract deployed** — Program ID: `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b`
- [x] **Vault initialized** — PDA: `HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u`
- [x] **User deposits work** — Deposit SOL via dashboard
- [x] **Agent stakes to 5 validators** — Real testnet transactions
- [x] **Rebalancing logic** — Deactivate underperformers, withdraw after cooldown, restake
- [x] **Dashboard** — Live vault status, stake positions, agent reasoning, activity log
- [x] **Agent activity logging** — Full transparency of all agent decisions

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contract | Anchor (Rust) on Solana |
| Agent | TypeScript (Node.js cron job) |
| Dashboard | Next.js 16 + React 19 + Tailwind |
| Data Sources | validators.app API + Solana RPC |
| Deployment | Vercel (dashboard) + Local server (agent) |

---

## 🔗 Links

- **Live Dashboard:** https://stakepilot-olig.vercel.app
- **GitHub:** https://github.com/ilhanu/stakepilot
- **Program (Testnet):** [Explorer](https://explorer.solana.com/address/66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b?cluster=testnet)
- **Vault (Testnet):** [Explorer](https://explorer.solana.com/address/HpsHuysk6HJ8HW5VcRJvBCqdw4jpwLoHi1EW3Lma2p5u?cluster=testnet)

---

## 👤 Team

**Staker Space** — We run a Solana validator. We built this because we live the problem.

- Twitter: [@StakerSpace](https://twitter.com/StakerSpace)
- Website: [staker.space](https://staker.space)

---

*StakePilot: Your SOL. Smart staking. Agent execution.*
