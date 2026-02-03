# 🚀 StakePilot

**Discover Hidden Validators. Predict MEV. Decentralize Solana.**

> *80% of stake goes to the top 20 validators. We fix this.*

StakePilot uses AI-powered MEV prediction to discover high-performing small validators before the crowd. Champion the underdogs. Decentralize the network.

🌐 **Live:** [stakepilot-olig.vercel.app](https://stakepilot-olig.vercel.app)

## 🌟 Why StakePilot?

| The Problem | Our Solution |
|-------------|--------------|
| Top 20 validators get 80% of stake | Discover hidden gems with rising MEV |
| Users miss better yields | Predict next epoch's top performers |
| Centralization threatens network | Reward small validators with good performance |
| Boring dashboards | Engaging, real-time visualizations |

## ✨ Features

### 🔮 MEV Prediction Engine
Our AI analyzes 15 epochs of historical data to predict which validators will earn the most MEV next epoch:
- Trend analysis with linear regression
- Momentum and volatility scoring
- Confidence levels for every prediction
- Backtested accuracy tracking

### 🌟 Rising Stars
Small validators with explosive MEV growth:
- Below median stake + rising trends
- Above-average performance despite size
- Decentralization score bonus
- One-click staking support

### ⚡ Live MEV Feed
Watch MEV flow through the network in real-time:
- Matrix-style falling numbers
- Rising Stars highlighted in gold
- Educational tooltips
- Cyberpunk aesthetic

### 🌐 Decentralization-Aware Routing
Smart stake routing that maximizes yield AND network health:
- Penalizes over-concentrated validators (>1% of network)
- Bonus for small validators
- Risk tolerance customization
- Visual Jupiter-style output

### 📊 Validator Profiles
Deep dive into any validator:
- MEV history charts
- Next epoch predictions
- Decentralization score
- "I support small validators" badges

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Data:** Jito Kobe API (MEV & validator data)
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

### GET `/api/predictions`
Get MEV predictions for all validators.
- `?type=rising-stars` - Only rising stars
- `?type=backtest` - Prediction accuracy
- `?limit=50` - Number of results

### POST `/api/route-stake`
Get optimal stake allocation.
```json
{
  "amountSol": 100,
  "riskTolerance": "medium",
  "decentralizationPreference": "strong",
  "maxValidators": 5
}
```

### GET `/api/mev`
Current epoch MEV stats and top validators.

## 🎯 The Vision

We're not just another yield dashboard. We're a movement for decentralization.

**The goal:** Make it easy to discover and support small validators that deserve more stake.

**The method:** Use data and prediction to find hidden gems before the crowd.

**The spirit:** Champion the underdogs. Strengthen Solana.

## 🏆 Hackathon

Built for the **Colosseum Agent Hackathon**.

## 📜 License

MIT

---

*StakePilot: Discover. Predict. Decentralize.* 🌟
