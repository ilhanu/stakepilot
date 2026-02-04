# StakePilot — Agent Vault

**Autonomous staking vault controlled by AI agents**

---

## What Is This?

StakePilot lets you deposit SOL into a smart contract vault. You set your staking strategy (risk tolerance, target APY, preferences), and an AI agent executes optimal staking operations on your behalf.

**Key guarantee:** The agent can stake your funds to validators, but can NEVER withdraw to itself. Only you can withdraw.

---

## How It Works

1. **Create Vault** — Connect wallet, create your personal vault
2. **Set Strategy** — Choose risk level, target APY, preferences
3. **Deposit SOL** — Add funds to your vault
4. **Agent Works** — AI analyzes validators, executes optimal staking
5. **Withdraw Anytime** — Full control, exit whenever you want

---

## Strategy Options

| Parameter | Options | Description |
|-----------|---------|-------------|
| Risk Tolerance | Low / Medium / High | How much variance you accept |
| Target APY | 6-12% | Your yield goal |
| Max Validators | 1-10 | Diversification level |
| Decentralization | On / Off | Prefer validators that help network health |

### Risk Levels

- **Low**: Only established validators (>1M SOL stake)
- **Medium**: Mix of established and growing validators
- **High**: Maximize APY, accept more variance

---

## Security

✅ **You always control your funds**
- Only you can withdraw
- Agent can only stake TO validators
- You can change agent anytime
- All operations are transparent (on-chain events)

❌ **What the agent CANNOT do**
- Withdraw your funds
- Change your strategy
- Lock your funds

---

## Architecture

```
User → Agent Vault (Smart Contract) → Validators
              ↑
         AI Agent
```

The AI agent reads your strategy from the chain, fetches validator performance data, and submits staking transactions that align with your preferences.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Frontend
```bash
cd dashboard
npm run dev
```

### 3. Build Smart Contract
```bash
anchor build
```

### 4. Deploy (Devnet)
```bash
anchor deploy --provider.cluster devnet
```

---

## Project Structure

```
stakepilot/
├── programs/
│   └── agent-vault/          # Anchor smart contract
│       └── src/
│           └── lib.rs        # Main program logic
├── src/
│   └── lib/
│       └── agent-vault-sdk.ts # TypeScript SDK
├── dashboard/                 # Next.js frontend
├── Anchor.toml               # Anchor config
└── README.md
```

---

## Smart Contract

### Program ID (Devnet)
```
66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b
```

### Instructions

| Instruction | Caller | Description |
|-------------|--------|-------------|
| `initialize_vault` | User | Create vault |
| `deposit` | User | Add SOL |
| `withdraw` | User | Remove SOL |
| `update_strategy` | User | Change preferences |
| `execute_stake` | Agent | Stake to validator |
| `execute_unstake` | Agent | Unstake |
| `change_agent` | User | Replace agent |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vault/status` | GET | Get vault status |
| `/api/agent/recommend` | GET | Get staking recommendation |
| `/api/agent/execute` | POST | Execute staking decision |

---

## Hackathon

**Colosseum Agent Hackathon**  
**Deadline:** Feb 12, 2026

### What Makes This Different

1. **Real smart contract** — Not just an API, actual on-chain program
2. **User control** — You set strategy, agent executes
3. **Security-first** — Agent can't steal funds
4. **Transparent** — All operations visible on-chain

---

## License

MIT

---

## Contact

Built by Staker Space  
Website: [staker.space](https://staker.space)  
Twitter: [@StakerSpace](https://twitter.com/StakerSpace)
