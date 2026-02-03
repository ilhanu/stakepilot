# StakePilot Dashboard

The web dashboard for StakePilot - MEV-Aware Staking Autopilot for Solana.

## Features

- 🏆 **MEV Leaderboard** - Real-time ranking of validators by MEV earnings
- 📊 **Validator Detail Pages** - Historical MEV performance with charts
- 🔄 **LST Comparison** - Compare jitoSOL, mSOL, bSOL yields
- 👛 **Wallet Connect** - View your stake positions with Phantom, Solflare, Coinbase
- 🌙 **Dark Mode UI** - Beautiful, modern interface

## Data Sources

- **Jito Kobe API** - MEV rewards, BAM validators, stake pool stats
- **Solana RPC** - Epoch info, stake accounts, token balances
- **Marinade API** - mSOL TVL and APY

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

For better performance, use a dedicated RPC endpoint (Helius, QuickNode, etc).

## API Routes

- `GET /api/validators` - Scored validators with MEV metrics
- `GET /api/mev?epoch=N` - MEV stats and history
- `GET /api/lst` - Liquid staking token comparison

## Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ilhanu/stakepilot/tree/main/dashboard)

Or via CLI:
```bash
npm i -g vercel
vercel --prod
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=.next
```

## Architecture

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── validators/
│   │   ├── mev/
│   │   └── lst/
│   ├── validator/     # Validator detail pages
│   └── page.tsx       # Main dashboard
├── components/
│   ├── Header.tsx
│   ├── MevLeaderboard.tsx
│   ├── LstComparison.tsx
│   ├── StakePositions.tsx
│   ├── WalletProvider.tsx
│   └── ui/            # Reusable UI components
└── lib/
    ├── jito.ts        # Jito Kobe API client
    ├── lst.ts         # LST comparison logic
    ├── solana.ts      # Solana RPC utilities
    └── utils.ts       # Helper functions
```

## Built For

🏆 [Colosseum Agent Hackathon](https://agents.colosseum.com)

## License

MIT
