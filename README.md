# StakePilot 🚀

**The MEV-Aware Staking Autopilot for Solana**

StakePilot uses real-time Jito MEV data, validator earnings, and on-chain analytics to help you optimize your staking yield.

## Live Demo

🌐 **Dashboard**: Coming soon (deployment in progress)

📦 **GitHub**: https://github.com/ilhanu/stakepilot

## Features

### 🏆 MEV Leaderboard
Real-time ranking of validators by actual MEV earnings from Jito Kobe API. See who's really earning MEV, not just what they claim.

### 📊 Validator Detail Pages
Click any validator to see:
- Historical MEV earnings (last 10 epochs)
- Visual bar charts of revenue over time
- MEV score based on performance trends
- Epoch-by-epoch breakdown

### 💧 LST Comparison
Compare liquid staking tokens with real data:
- jitoSOL (8% APY, full MEV share)
- mSOL (7% APY, no MEV)
- bSOL (7.4% APY, partial MEV)
- INF (7.5% APY, partial MEV)

### 👛 Wallet Connect
Connect your Solana wallet to see:
- SOL balance
- Native stake accounts with validator info
- LST balances (jitoSOL, mSOL, bSOL) with SOL equivalent

## Data Sources

| Source | Data | Status |
|--------|------|--------|
| [Jito Kobe API](https://kobe.mainnet.jito.network) | MEV rewards, BAM validators, stake pool stats | ✅ Live |
| [Marinade API](https://api.marinade.finance) | TVL and APY data | ✅ Live |
| Solana RPC | Epoch info, stake accounts | ✅ Live |

## Architecture

```
stakepilot/
├── dashboard/              # Next.js 16 web app
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/       # API routes
│   │   │   │   ├── validators/  # Scored validators
│   │   │   │   ├── mev/        # MEV stats & history
│   │   │   │   └── lst/        # LST comparison
│   │   │   ├── validator/[address]/  # Detail pages
│   │   │   └── page.tsx    # Main dashboard
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── MevLeaderboard.tsx
│   │   │   ├── LstComparison.tsx
│   │   │   ├── StakePositions.tsx
│   │   │   └── WalletProvider.tsx
│   │   └── lib/
│   │       ├── jito.ts     # Jito Kobe API client
│   │       ├── lst.ts      # LST comparison logic
│   │       └── solana.ts   # Solana RPC utilities
├── src/                    # Core TypeScript library
├── api/                    # REST API (future)
└── RESEARCH.md             # JIP-31/BAM research notes
```

## Getting Started

```bash
# Clone
git clone https://github.com/ilhanu/stakepilot
cd stakepilot

# Run dashboard
cd dashboard
npm install
npm run dev
```

Open http://localhost:3000 to see the dashboard.

## API Endpoints

The dashboard exposes REST API endpoints:

```bash
# Get scored validators with MEV metrics
GET /api/validators

# Get MEV stats for an epoch
GET /api/mev?epoch=919

# Get LST comparison data
GET /api/lst
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS (dark mode)
- **Charts**: Recharts
- **Wallet**: @solana/wallet-adapter (Phantom, Solflare, Coinbase, Ledger)
- **Language**: TypeScript

## Roadmap

- [x] Jito Kobe API integration
- [x] MEV leaderboard with real data
- [x] Validator detail pages with history
- [x] LST comparison (jitoSOL, mSOL, bSOL, INF)
- [x] Wallet connect with stake position display
- [x] Dark mode UI
- [ ] Deploy to Vercel
- [ ] Historical charts with Recharts
- [ ] Auto-rebalancing recommendations
- [ ] Jupiter swap integration

## Built For

🏆 [Colosseum Agent Hackathon](https://agents.colosseum.com) — Feb 2026

## Research

See [RESEARCH.md](./RESEARCH.md) for detailed notes on:
- JIP-31 and BAM (Bonus Allocation Model)
- How MEV rewards flow to stakers
- Jito Kobe API documentation
- Liquid staking token mechanics

## License

MIT

---

*StakePilot: Because your SOL deserves the best yield.*
