# StakePilot Dashboard — Agent Stake Vaults

The web interface for StakePilot Agent Vaults — autonomous staking controlled by AI agents.

## What Is This?

StakePilot lets you create a **vault** that holds your SOL. You set your staking strategy, and an **AI agent** executes optimal staking decisions on your behalf.

**Key guarantee:** The agent can stake your funds to validators, but can **NEVER** withdraw to itself. Only you can withdraw.

## Features

- 🏦 **Vault Management** — Create vault, deposit, withdraw, configure strategy
- 🤖 **Agent Dashboard** — View agent status, decisions, activity log
- 📊 **Stake Positions** — Track your active stakes with APY and performance
- 🔍 **Validator Discovery** — Browse 1,500+ validators with scores and metrics
- 📈 **Projected Earnings** — See estimated yields based on your positions

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — explains Agent Vault concept |
| `/vault` | Create vault, deposit SOL, configure strategy |
| `/dashboard` | View vault status, positions, agent activity |
| `/discover` | Browse and filter validators |
| `/docs` | Documentation |

## API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/vault/status?owner=<pubkey>` | Get vault state from chain |
| `GET /api/agent/recommend?strategy=<params>` | AI staking recommendation |
| `GET /api/validators` | List validators with metrics |

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
HELIUS_API_KEY=your-key  # Optional, for better RPC
```

## Smart Contract

The Agent Vault smart contract is in `/programs/agent-vault/`.

**Program ID (Devnet):** `66VGaTF2qqogyAC6jczwepjk3C6i5QAe8YQ4mFHveC4b`

## Deploy

### Vercel (Recommended)

```bash
vercel --prod
```

### Or push to GitHub

Connected to Vercel? Just push to `main` and it auto-deploys.

## Architecture

```
dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing
│   │   ├── vault/             # Vault management
│   │   ├── dashboard/         # User dashboard
│   │   ├── discover/          # Validator browser
│   │   ├── docs/              # Documentation
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── WalletProvider.tsx
│   │   └── ...
│   └── lib/
│       ├── agent-vault-sdk.ts # SDK for smart contract
│       └── ...
└── ...
```

## Built For

🏆 **Colosseum Agent Hackathon**

---

*StakePilot: Your SOL. Your strategy. Agent execution.*
