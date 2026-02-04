# StakePilot Architecture — Agent Vault

**Core Pillar: Autonomous Staking Vault Controlled by AI Agents**

This document defines the architecture of StakePilot's Agent Vault system. All development decisions should align with this design.

---

## Philosophy

Traditional staking requires manual validator selection, monitoring, and rebalancing. **Agent Vault automates this** while keeping users in full control:

1. **User owns the vault** — deposit, withdraw, set strategy anytime
2. **Agent executes strategy** — reads preferences, stakes optimally
3. **Agent CANNOT withdraw** — security constraint enforced on-chain
4. **Transparency** — all operations emit on-chain events

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                              USER                                   │
│                                                                     │
│  Actions:                                                           │
│  • Connect wallet → Create vault                                    │
│  • Configure strategy (risk, APY target, preferences)               │
│  • Deposit/Withdraw SOL                                             │
│  • Monitor vault status, stakes, and agent activity                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                           │
│                                                                     │
│  /             → Landing page (explain Agent Vault)                 │
│  /vault        → Create vault, deposit, configure strategy          │
│  /dashboard    → View vault status, stakes, history                 │
│  /discover     → Browse validators, see recommendations             │
│  /docs         → Documentation                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API LAYER (Next.js API)                      │
│                                                                     │
│  /api/vault/status      → Get vault state from chain                │
│  /api/agent/recommend   → Get AI staking recommendation             │
│  /api/agent/execute     → Agent submits staking tx (future)         │
│  /api/validators        → Fetch validator data                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 AGENT VAULT — ON-CHAIN PROGRAM (Anchor)             │
│                                                                     │
│  Program ID: 66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b          │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │    Vault Account    │  │  Strategy Account   │                   │
│  ├─────────────────────┤  ├─────────────────────┤                   │
│  │ owner: Pubkey       │  │ vault: Pubkey       │                   │
│  │ agent: Pubkey       │  │ risk_tolerance: u8  │                   │
│  │ balance: u64        │  │ target_apy: u16     │                   │
│  │ total_staked: u64   │  │ max_validators: u8  │                   │
│  │ bump: u8            │  │ prefer_decentral... │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
│                                                                     │
│  Instructions:                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ User Only           │ Agent Only        │ Either           │     │
│  │ ─────────────────── │ ───────────────── │ ──────────────── │     │
│  │ • initialize_vault  │ • execute_stake   │ (none)           │     │
│  │ • deposit           │ • execute_unstake │                  │     │
│  │ • withdraw          │                   │                  │     │
│  │ • update_strategy   │                   │                  │     │
│  │ • change_agent      │                   │                  │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  Security Invariant:                                                │
│  ─────────────────────────────────────────────────────────────────  │
│  Agent can transfer funds TO validators (stake), but NEVER back     │
│  to itself or any external account. Only owner can withdraw.        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AI AGENT (Off-chain)                        │
│                                                                     │
│  Agent Wallet: Authorized signer for execute_stake/execute_unstake  │
│                                                                     │
│  Loop (runs hourly):                                                │
│  1. Scan all vaults where this agent is authorized                  │
│  2. For each vault:                                                 │
│     a. Read strategy parameters from chain                          │
│     b. Fetch validator data (StakePilot API, validators.app)        │
│     c. Run allocation algorithm                                     │
│     d. If rebalance needed, submit execute_stake/unstake txs        │
│  3. Log all decisions for transparency                              │
│                                                                     │
│  Algorithm:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 1. Filter out delinquent validators                         │    │
│  │ 2. Apply risk tolerance filter (stake size minimums)        │    │
│  │ 3. If prefer_decentralization: filter by concentration      │    │
│  │ 4. Sort by NET APY (after commission)                       │    │
│  │ 5. Filter by target_apy (10% tolerance)                     │    │
│  │ 6. Select top N (max_validators)                            │    │
│  │ 7. Distribute stake evenly                                  │    │
│  │ 8. Return recommendations                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         VALIDATORS (Solana)                         │
│                                                                     │
│  Agent stakes vault funds to selected validators via native         │
│  Solana stake program. Stake accounts are owned by vault PDA.       │
│                                                                     │
│  Validator Data Sources:                                            │
│  • validators.app API (uptime, scores, location)                    │
│  • Solana RPC (on-chain state, stake, commission)                   │
│  • StakePilot analytics (computed APY, MEV, history)                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Strategy Parameters

Users configure their vault with these parameters:

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `risk_tolerance` | enum | 0-2 | 0=Low, 1=Medium, 2=High |
| `target_apy` | u16 | 600-1200 | Target APY in basis points (800 = 8.00%) |
| `max_validators` | u8 | 1-10 | Maximum validators to distribute stake |
| `prefer_decentralization` | bool | true/false | Favor validators that help decentralization |

### Risk Tolerance Mapping

| Level | Name | Validator Filter | Behavior |
|-------|------|------------------|----------|
| 0 | Low | >1M SOL stake | Only large, established validators |
| 1 | Medium | >100K SOL stake | Mix of established and growing |
| 2 | High | No minimum | Maximize APY, accept variance |

---

## Data Flow: Staking Decision

```
┌────────────────────────────────────────────────────────────────────┐
│ TRIGGER: Hourly cron or manual                                     │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 1. FETCH: Read vault.strategy from chain                           │
│    → risk_tolerance, target_apy, max_validators, prefer_decentral  │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 2. FETCH: Get all active validators                                │
│    → validators.app API + Solana RPC                               │
│    → ~1,500 validators with uptime, commission, stake, APY         │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 3. FILTER: Apply strategy filters                                  │
│    → Remove delinquent (score < 50)                                │
│    → Apply risk tolerance (stake minimums)                         │
│    → Apply decentralization filter (if enabled)                    │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 4. RANK: Sort by NET APY (gross APY * (1 - commission/100))        │
│    → Filter by target_apy ± 10%                                    │
│    → Select top N (max_validators)                                 │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 5. ALLOCATE: Distribute vault balance                              │
│    → Even distribution across selected validators                  │
│    → (Future: weighted by score or APY)                            │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 6. EXECUTE: Submit execute_stake transactions                      │
│    → Agent signs with authorized wallet                            │
│    → Creates stake accounts owned by vault PDA                     │
│    → Emits StakeExecuted events                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Security Model

### Trust Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│ FULL TRUST: User's Wallet                                     │
│ • Can do anything with their vault                           │
│ • Only signer for withdraw, update_strategy, change_agent    │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ LIMITED TRUST: Agent Wallet                                   │
│ • Can call execute_stake (move funds TO validators)          │
│ • Can call execute_unstake (move stake back to vault)        │
│ • CANNOT withdraw (transfer out of vault system)             │
│ • User can revoke at any time via change_agent               │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ NO TRUST: Anyone                                              │
│ • Can read vault state (public)                              │
│ • Cannot modify anything                                     │
└──────────────────────────────────────────────────────────────┘
```

### Key Security Constraints (enforced in smart contract)

1. **Withdraw requires owner signature** — Agent cannot call withdraw
2. **change_agent requires owner signature** — Agent cannot replace itself
3. **execute_stake can only transfer to stake program** — Cannot send to arbitrary addresses
4. **Stake accounts are PDA-owned** — Vault maintains custody

### What If Agent Goes Rogue?

Worst case: Agent stakes to bad validators (high commission, poor uptime).

**User remedies:**
1. Call `change_agent(new_agent)` to revoke agent
2. Call `execute_unstake` themselves (or with new agent)
3. Withdraw funds

Agent can never steal funds — only make suboptimal staking decisions.

---

## File Structure

```
stakepilot/
├── programs/
│   └── agent-vault/
│       ├── Cargo.toml           # Anchor dependencies
│       └── src/
│           └── lib.rs           # Main program (all instructions)
├── src/
│   └── lib/
│       ├── agent-vault-sdk.ts   # TypeScript SDK
│       └── agent-algorithm.ts   # Staking decision algorithm
├── dashboard/                    # Next.js frontend
│   ├── src/app/
│   │   ├── page.tsx             # Landing
│   │   ├── vault/page.tsx       # Create/manage vault
│   │   ├── dashboard/page.tsx   # View status
│   │   ├── discover/page.tsx    # Browse validators
│   │   └── api/
│   │       ├── vault/status/    # Vault state
│   │       └── agent/recommend/ # AI recommendations
│   └── src/components/
├── tests/                        # Integration tests
├── Anchor.toml                   # Anchor config
├── Cargo.toml                    # Workspace Cargo
├── README.md                     # Quick start
├── ARCHITECTURE.md               # This file
├── ROADMAP.md                    # Sprint plan
└── VISION.md                     # Why we're building this
```

---

## API Design (Agent-First)

All features are API endpoints first. UI wraps the API.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/vault/status?owner=<pubkey>` | Read vault state |
| `GET /api/agent/recommend?strategy=<params>` | Get AI recommendation |
| `POST /api/agent/execute` | Execute staking (agent only) |
| `GET /api/validators` | List validators with metrics |
| `GET /api/validators/[id]` | Single validator details |

This enables:
- CLI tools that call API directly
- Other agents integrating with StakePilot
- Testing without frontend

---

## Event Log

All smart contract operations emit events for transparency:

| Event | Fields | Description |
|-------|--------|-------------|
| `VaultCreated` | owner, agent, vault | New vault initialized |
| `Deposited` | vault, amount, new_balance | SOL deposited |
| `Withdrawn` | vault, amount, new_balance | SOL withdrawn |
| `StrategyUpdated` | vault, old_params, new_params | Strategy changed |
| `StakeExecuted` | vault, validator, amount | Agent staked |
| `UnstakeExecuted` | vault, stake_account | Agent unstaked |
| `AgentChanged` | vault, old_agent, new_agent | Agent replaced |

---

## Future Extensions

Once core is stable:

1. **Auto-compounding** — Reinvest staking rewards
2. **Multi-vault** — One user, multiple strategies
3. **Social vaults** — Copy other users' strategies
4. **MEV-aware staking** — Factor in Jito tips
5. **Liquid staking integration** — Use JitoSOL for some allocation

---

## This Is Our Core Pillar

Everything else (analytics, recommendations, UI) supports the vault.

**Measure success by:**
1. Vaults created
2. SOL deposited
3. Successful agent executions
4. User satisfaction (withdrawals vs deposits ratio)

If we nail the vault + agent loop, we have a product. Everything else is polish.

---

*Last updated: 2026-02-04*
*Status: Smart contract built, awaiting devnet deploy*
