# StakePilot Roadmap — Agent Vault

**Deadline:** Feb 12, 2026
**Goal:** Build an autonomous staking vault controlled by AI agents

---

## What Is This?

**StakePilot Agent Vault** = A smart contract that:
1. Holds user deposits (SOL)
2. Lets users define staking strategy parameters
3. Allows an AI agent to execute staking operations based on strategy
4. Keeps users in full control (withdraw anytime)

**Key constraint:** The agent can stake funds TO validators but can NEVER withdraw to itself. Only the user can withdraw.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      USER                               │
│  • Deposits SOL                                        │
│  • Sets strategy (risk, APY target, preferences)       │
│  • Withdraws anytime                                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               AGENT VAULT (On-chain Program)            │
│                                                         │
│  Vault Account          Strategy Account                │
│  ├─ owner              ├─ risk_tolerance               │
│  ├─ agent              ├─ target_apy                   │
│  ├─ balance            ├─ max_validators               │
│  └─ total_staked       └─ prefer_decentralization      │
│                                                         │
│  Instructions:                                          │
│  • initialize_vault    • execute_stake (agent only)    │
│  • deposit             • execute_unstake (agent only)  │
│  • withdraw (owner)    • change_agent (owner only)     │
│  • update_strategy                                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    AI AGENT                             │
│                                                         │
│  1. Reads user's strategy from chain                   │
│  2. Fetches validator data (performance, APY, etc.)    │
│  3. Computes optimal allocation using algorithm        │
│  4. Submits execute_stake/execute_unstake txs          │
│                                                         │
│  Algorithm considers:                                   │
│  • Risk tolerance (low/medium/high)                    │
│  • Target APY                                          │
│  • Decentralization preferences                        │
│  • Validator performance history                       │
│  • Commission rates                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Smart Contract

### Location
`programs/agent-vault/src/lib.rs`

### Accounts

| Account | Description |
|---------|-------------|
| `Vault` | Stores owner, agent, balance, total_staked |
| `Strategy` | Stores user preferences: risk, APY target, max validators |
| `VaultSol` | PDA that holds the actual SOL |

### Instructions

| Instruction | Caller | Description |
|-------------|--------|-------------|
| `initialize_vault` | User | Create vault + strategy accounts |
| `deposit` | User | Add SOL to vault |
| `withdraw` | User only | Remove SOL from vault |
| `update_strategy` | User | Change strategy parameters |
| `execute_stake` | Agent only | Stake vault funds to validator |
| `execute_unstake` | Agent only | Unstake from validator |
| `change_agent` | User only | Replace agent wallet |

### Security

- Agent can move funds TO validators, never to itself
- Only user can withdraw
- User can change agent at any time
- All operations emit events for transparency

---

## Strategy Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `risk_tolerance` | enum | Low (conservative), Medium (balanced), High (aggressive) |
| `target_apy` | u16 | Target APY in basis points (800 = 8.00%) |
| `max_validators` | u8 | Max validators to spread stake across |
| `prefer_decentralization` | bool | Prefer validators that help decentralization |

### Risk Tolerance Effects

| Level | Validator Filter | Behavior |
|-------|------------------|----------|
| Low | >1M SOL stake | Only established validators |
| Medium | >100K SOL stake | Mix of established and growing |
| High | No filter | Maximize APY, accept variance |

---

## Agent Algorithm

```typescript
function generateStakingDecision(strategy, balance, validators):
  1. Filter out delinquent validators
  2. Apply risk tolerance filter
  3. If prefer_decentralization: filter by datacenter concentration
  4. Sort by net APY (commission-adjusted)
  5. Filter by target APY (allow 10% tolerance)
  6. Select top N (max_validators)
  7. Distribute stake evenly across selected
  8. Return recommendations
```

---

## Sprint (8 Days)

### Phase 1: Smart Contract (Days 1-2) ✅
- [x] Vault account structure
- [x] Strategy account structure
- [x] Initialize vault instruction
- [x] Deposit/Withdraw instructions
- [x] Update strategy instruction
- [x] Execute stake instruction (agent)
- [x] Execute unstake instruction (agent)
- [x] Change agent instruction
- [x] Events for all operations
- [x] TypeScript SDK
- [x] **BUILT SUCCESSFULLY** - `agent_vault.so` (314KB)
- [x] Program ID: `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b`

### Phase 2: Deploy & Test (Days 3-4)
- [x] Smart contract compiled
- [ ] Deploy to devnet (waiting for SOL airdrop)
- [ ] Generate IDL
- [ ] Test all instructions
- [ ] Verify security constraints

### Phase 3: Frontend (Days 5-6) ✅
- [x] Vault creation UI (`/vault`)
- [x] Deposit/Withdraw UI
- [x] Strategy configuration UI
- [x] Dashboard: show vault balance, stakes, history (`/dashboard`)
- [x] Agent status display
- [x] Landing page with demo algorithm
- [x] Validators browser (`/discover`)
- [x] Documentation page (`/docs`)

### Phase 4: Agent Implementation (Day 7)
- [ ] Agent wallet setup
- [ ] Cron job: check vaults every hour
- [ ] Validator data fetching
- [ ] Staking decision algorithm
- [ ] Execute transactions

### Phase 5: Polish & Demo (Day 8)
- [ ] Demo video (3-5 min)
- [ ] README with clear value prop
- [ ] Documentation
- [ ] Submission

---

## Website Pages

| Page | Purpose |
|------|---------|
| `/` | Landing: explain Agent Vault concept |
| `/vault` | Create vault, deposit, configure strategy |
| `/dashboard` | View vault status, stakes, history |
| `/agent` | Agent status, recent decisions, logs |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Smart contract deployed | ✅ Devnet |
| All instructions working | ✅ |
| Frontend functional | ✅ |
| Agent making decisions | ✅ |
| Demo video | 3-5 min |

---

## What We Promise

- ✅ User always in control (withdraw anytime)
- ✅ Agent can only stake, never withdraw
- ✅ Strategy-based autonomous staking
- ✅ Transparent operations (all events logged)
- ✅ Real validator data (not predictions)

## What We DON'T Promise

- ❌ Guaranteed returns
- ❌ MEV predictions
- ❌ Auto-compounding (future feature)
- ❌ Multi-chain support

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contract | Anchor (Rust) |
| Frontend | Next.js + React |
| Styling | Tailwind CSS |
| Wallet | @solana/wallet-adapter |
| SDK | TypeScript |
| Agent | Node.js cron + SDK |
