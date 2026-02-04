# StakePilot — Agent Stake Vaults

**Colosseum Agent Hackathon Submission**

---

## 🎯 One-Liner

**Autonomous staking vault controlled by AI agents — you set the strategy, the agent executes.**

---

## 📝 Description

StakePilot is an **Agent Stake Vault** — a smart contract that holds your SOL while an AI agent optimizes your staking based on your preferences.

### How It Works

1. **Create Vault** → Connect wallet, create your personal vault on-chain
2. **Set Strategy** → Choose risk level, target APY, max validators, decentralization preference
3. **Deposit SOL** → Add funds to your vault
4. **Agent Works** → AI analyzes 1,500+ validators, executes optimal staking decisions
5. **Withdraw Anytime** → Full control, exit whenever you want

### The Key Innovation

**The agent can stake your funds TO validators, but can NEVER withdraw to itself.**

This is enforced at the smart contract level. Only you can withdraw. The agent is a powerful executor with limited permissions — it optimizes, you control.

---

## 🔐 Security Model

| Action | Who Can Do It |
|--------|---------------|
| Deposit | User only |
| Withdraw | User only |
| Update Strategy | User only |
| Change Agent | User only |
| Execute Stake | Agent only |
| Execute Unstake | Agent only |

The agent is a separate wallet with constrained permissions. Users can revoke the agent at any time.

---

## 🧠 Agent Algorithm

The agent runs hourly and makes decisions based on your strategy:

```
1. Filter: Remove delinquent validators (score < 50)
2. Risk: Apply stake minimums based on risk tolerance
   - Low: Only validators with >1M SOL stake
   - Medium: Validators with >100K SOL stake  
   - High: No minimum (maximize APY)
3. Decentralization: Filter by datacenter concentration (if enabled)
4. Rank: Sort by NET APY (after commission)
5. Target: Filter validators within 10% of target APY
6. Select: Choose top N validators (up to max_validators)
7. Allocate: Distribute stake evenly
8. Execute: Submit transactions
```

All decisions are logged on-chain via events for full transparency.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│  • Deposits SOL                                             │
│  • Sets strategy (risk, APY target, preferences)            │
│  • Withdraws anytime                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENT VAULT — SMART CONTRACT                   │
│                                                             │
│  Vault Account         Strategy Account                     │
│  ├─ owner              ├─ risk_tolerance                    │
│  ├─ agent              ├─ target_apy                        │
│  ├─ balance            ├─ max_validators                    │
│  └─ total_staked       └─ prefer_decentralization           │
│                                                             │
│  Instructions:                                              │
│  • initialize_vault    • execute_stake (agent)              │
│  • deposit             • execute_unstake (agent)            │
│  • withdraw (owner)    • change_agent (owner)               │
│  • update_strategy                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI AGENT                               │
│                                                             │
│  1. Read strategy from chain                                │
│  2. Fetch validator data (performance, APY, location)       │
│  3. Run allocation algorithm                                │
│  4. Submit execute_stake/execute_unstake transactions       │
│  5. Log decisions for transparency                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATORS                               │
│  Stake accounts owned by vault PDA                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contract | Anchor (Rust) |
| Frontend | Next.js 16 + React 19 |
| Styling | Tailwind CSS |
| Wallet | @solana/wallet-adapter |
| SDK | TypeScript |
| Agent | Node.js cron + SDK |
| Data | validators.app API + Solana RPC |

---

## 📊 Strategy Parameters

| Parameter | Options | Description |
|-----------|---------|-------------|
| Risk Tolerance | Low / Medium / High | How much variance you accept |
| Target APY | 6-12% | Your yield goal |
| Max Validators | 1-10 | Diversification level |
| Decentralization | On / Off | Prefer validators that help network health |

---

## ✅ What's Built

- [x] **Smart Contract** — Full Anchor program with all instructions
- [x] **TypeScript SDK** — Client library for interacting with vaults
- [x] **Frontend** — Complete UI for vault management
  - Landing page explaining Agent Vault
  - Vault creation & management (`/vault`)
  - Dashboard with positions & agent activity (`/dashboard`)
  - Validator discovery (`/discover`)
  - Documentation (`/docs`)
- [x] **API Endpoints** — Agent-first design
  - `/api/vault/status` — Get vault state
  - `/api/agent/recommend` — AI staking recommendations
- [x] **Algorithm** — Working staking decision logic

---

## 🚀 What's Next

- [ ] Deploy smart contract to devnet
- [ ] Run agent cron job (hourly checks)
- [ ] Production deployment
- [ ] Auto-compounding rewards
- [ ] Multi-vault support

---

## 🔗 Links

- **Live Demo:** https://stakepilot-olig.vercel.app
- **GitHub:** https://github.com/ilhanu/stakepilot
- **Program ID:** `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b`

---

## 👤 Team

**Staker Space** — Building staking infrastructure for Solana

- Twitter: [@StakerSpace](https://twitter.com/StakerSpace)
- Website: [staker.space](https://staker.space)

---

## 💡 Why This Matters

**Staking is broken:**
- 80% of stake goes to top 20 validators (centralization)
- Users stake once and forget (no optimization)
- Comparing validators is confusing (APY, commission, MEV, uptime...)

**Agent Vault fixes this:**
- Set your preferences once, agent optimizes continuously
- Agent can support decentralization while maximizing your returns
- You stay in control — withdraw anytime, change agent anytime
- All decisions transparent (on-chain events)

**The agent paradigm:**
Instead of trusting a protocol to manage your funds, you trust a constrained agent that can only execute within your defined parameters. It's the best of both worlds — automation without custody risk.

---

*StakePilot: Your SOL. Your strategy. Agent execution.*
