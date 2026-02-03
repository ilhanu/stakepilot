# 🚀 StakePilot

**Complete Staking Intelligence for Solana.**

> *See real yields, not marketing numbers. Compare fairly. Stake smartly.*

StakePilot is the complete staking brain — **Yield Truth**, **Validator Discovery**, and **Smart Routing** in one platform.

🌐 **Live:** [stakepilot-olig.vercel.app](https://stakepilot-olig.vercel.app)

## 📊 The Three Pillars

### 1. Yield Truth
**Real APY from real APIs. No guessing.**

We fetch directly from Marinade, BlazeStake, and Jito APIs:
- **Base APY** — The guaranteed staking yield (~6-7%)
- **MEV Bonus** — The variable upside (0-2%+ for jitoSOL)
- **Net Yield** — What you actually get after fees

| Protocol | Token | Base APY | MEV Bonus | Total APY | Source |
|----------|-------|----------|-----------|-----------|--------|
| Jito | jitoSOL | ~6% | +0.9%+ | ~6.9%+ | kobe.mainnet.jito.network |
| Marinade | mSOL | ~6.1% | — | ~6.1% | api.marinade.finance |
| BlazeStake | bSOL | ~6.1% | +BLZE | ~6.1%+ | stake.solblaze.org |

### 2. Validator Discovery
**Find rising stars before everyone else.**

80% of stake goes to the top 20 validators. We fix this:
- **Rising Stars** — Small validators with explosive MEV growth
- **MEV Prediction** — AI predicts next epoch's top performers
- **Decentralization Score** — Bonus for supporting network health

### 3. Smart Routing
**Know where to stake. Clear reasoning.**

Input your amount, priorities, and risk tolerance:
- Optimal allocation across LSTs and validators
- Balance yield + decentralization + liquidity
- Clear reasoning for every recommendation

## 💡 Key Insight

**Base staking yield (~6-7%)** is what you can rely on.
**MEV bonus (+0-2%)** is the variable upside for jitoSOL holders.

We make this distinction **crystal clear**.

## ✨ Features

### 📊 LST Comparison
- Real APY from real APIs (not made-up numbers)
- Base vs MEV breakdown
- Fees, liquidity, DeFi integrations
- Historical 30-day performance

### 🌟 Rising Stars
- Small validators with rising MEV trends
- Momentum and performance scoring
- Easy native staking support
- Champion decentralization!

### 🛤️ Smart Routing
- Multi-factor optimization engine
- Risk tolerance adjustment
- Decentralization weighting
- Visual output with reasoning

### ⚡ Live MEV Feed
- Real-time MEV data from Jito
- Matrix-style visualization
- Educational tooltips
- Rising Stars highlighted

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Data:** Jito Kobe API, Marinade API, BlazeStake API
- **Blockchain:** Solana Web3.js
- **Deployment:** Vercel

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/ilhanu/stakepilot
cd stakepilot/dashboard

# Install
npm install

# Run
npm run dev
```

Visit [localhost:3000](http://localhost:3000)

## 📡 API Endpoints

### GET `/api/lst`
Get LST comparison with real data.
```json
{
  "protocols": [...],
  "bestForYield": "jito",
  "recommendation": "...",
  "yieldBreakdown": "Base: 6.1% | jitoSOL MEV: +0.9%"
}
```

### GET `/api/lst-compare`
Enhanced comparison with smart routing support.

### POST `/api/lst-compare`
Get smart stake routing.
```json
{
  "amount": 100,
  "riskTolerance": "medium",
  "decentralizationPriority": "high",
  "liquidityNeed": "medium"
}
```

### GET `/api/predictions?type=rising-stars`
Get rising star validators.

## 🎯 The Vision

**Staking shouldn't be guesswork.**

- See real yields, not marketing numbers
- Discover validators before everyone else
- Support decentralization while maximizing returns
- One platform, complete intelligence

## 🏆 Hackathon

Built for the **Colosseum Agent Hackathon**.

## 📜 License

MIT

---

*StakePilot: Yield Truth. Validator Discovery. Smart Routing.* 🚀
