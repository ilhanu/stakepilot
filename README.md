# StakePilot — Autonomous Staking Vault

An AI agent that autonomously stakes SOL to the best underserved validators. It can stake — but can **never** withdraw to itself. Enforced by smart contract.

**Live:** https://stakepilot-olig.vercel.app  
**Network:** Solana Testnet  
**Program:** `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b`

---

## How It Works

1. **Deposit** SOL into the vault (on-chain smart contract)
2. **Agent scores** 1,500+ validators by commission, uptime, stake concentration
3. **Agent stakes** to top underserved validators (up to 5)
4. **Agent rebalances** — deactivates underperformers, withdraws after cooldown, restakes
5. **Withdraw anytime** — only you can withdraw, ~2 day cooldown

## Security

The smart contract enforces that the agent can only:
- Stake vault funds **to validators**
- Deactivate stake accounts
- Withdraw deactivated stake **back to the vault** (not to the agent)

The agent **cannot** transfer funds to itself or any other address.

## Project Structure

```
stakepilot/
├── programs/agent-vault/src/lib.rs    # Anchor smart contract
├── dashboard/                          # Next.js frontend
│   ├── scripts/agent-execute.ts       # Agent cron job
│   ├── src/app/                       # Pages (vault, dashboard, etc.)
│   └── src/components/                # UI components
├── SUBMISSION.md                       # Hackathon submission
└── README.md
```

## Quick Start

```bash
# Install & run dashboard
cd dashboard
npm install
npm run dev

# Run agent manually
npx ts-node scripts/agent-execute.ts

# Set up cron (hourly)
# 0 * * * * cd /path/to/dashboard && npx ts-node scripts/agent-execute.ts >> /var/log/stakepilot-agent.log 2>&1
```

## Agent Algorithm

```
EVERY HOUR:
  1. Scan existing stake accounts
  2. Score validators (commission ≤5%, uptime, not delinquent, <1M SOL stake)
  3. Deactivate underperformers (score <30 or <50% of best)
  4. Withdraw fully-deactivated stakes → vault
  5. Stake vault balance to top validators (evenly distributed)
  6. Log all activity for dashboard transparency
```

## Smart Contract Instructions

| Instruction | Caller | Description |
|-------------|--------|-------------|
| `initialize_vault` | Admin | One-time vault setup |
| `deposit` | User | Add SOL to vault |
| `request_unstake` | User | Begin withdrawal process |
| `withdraw` | User | Withdraw after cooldown |
| `stake_to_validator` | Agent | Stake to a validator |
| `deactivate_stake` | Agent | Begin unstaking |
| `withdraw_stake` | Agent | Pull deactivated stake back to vault |
| `update_agent` | Admin | Change agent wallet |

## Tech Stack

- **Smart Contract:** Anchor (Rust)
- **Agent:** TypeScript + @solana/web3.js
- **Dashboard:** Next.js 16, React 19, Tailwind CSS
- **Data:** validators.app API, Solana RPC

## Built by [Staker Space](https://staker.space)

We run a Solana validator. We built StakePilot because we live the staking centralization problem every day.

---

*Colosseum Agent Hackathon 2026*
