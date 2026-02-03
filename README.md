# StakePilot 🚀

**Discover Hidden Validators. Predict MEV. Decentralize Solana.**

StakePilot is an AI-powered stake router that finds high-performing small validators before the crowd — maximizing your yield while supporting network decentralization.

## The Problem

80% of Solana stake goes to the top 20 validators. Small independents can't get visibility. Users miss better yields. The network centralizes.

**StakePilot fixes this.**

## What Makes Us Different

| Traditional Dashboards | StakePilot |
|----------------------|------------|
| Show current APY | **Predict future MEV** |
| List the same top validators | **Discover hidden gems** |
| Optimize for yield only | **Optimize for yield + decentralization** |
| Boring data tables | **Engaging visualizations** |

## Features

### 🔮 MEV Prediction Engine
ML model that predicts which validators will earn the most MEV next epoch. Trained on historical Jito data, backtested for accuracy.

### 🌟 Rising Stars
Small validators with improving MEV trends. Discover them before everyone else.

### 🛤️ Smart Stake Routing
Input your SOL amount → get optimal split across validators that maximizes yield AND supports decentralization.

### 📡 Live MEV Feed
Real-time visualization of MEV flowing through the network. Educational and mesmerizing.

### 🏆 Validator Discovery
Hidden gems, community profiles, one-click stake support for independent validators.

## Live Demo

**Dashboard:** https://stakepilot-olig.vercel.app

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Data:** Jito Kobe API, Solana RPC
- **ML:** TensorFlow.js for MEV prediction
- **Wallet:** Solana Wallet Adapter

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      STAKEPILOT                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │    Jito    │  │  Validator │  │   Solana   │        │
│  │  Kobe API  │  │   Stats    │  │    RPC     │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        │               │               │                │
│        └───────────────┼───────────────┘                │
│                        ▼                                 │
│              ┌─────────────────┐                        │
│              │  MEV Prediction │                        │
│              │     Engine      │                        │
│              └────────┬────────┘                        │
│                       ▼                                  │
│              ┌─────────────────┐                        │
│              │  Stake Router   │                        │
│              │ (Yield + Decen) │                        │
│              └────────┬────────┘                        │
│                       ▼                                  │
│              ┌─────────────────┐                        │
│              │   Dashboard     │                        │
│              │  (Next.js UI)   │                        │
│              └─────────────────┘                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/validators` | All validators with MEV stats |
| `/api/mev` | Current epoch MEV data |
| `/api/predictions` | MEV predictions for next epoch |
| `/api/rising-stars` | Small validators trending up |
| `/api/route` | Optimal stake routing |
| `/api/lst` | Liquid staking comparison |

## Roadmap

- [x] Jito MEV data integration
- [x] Validator scoring algorithm  
- [x] Dashboard with live data
- [x] Wallet connect
- [ ] **MEV Prediction Engine** ← Current focus
- [ ] Rising Stars algorithm
- [ ] Smart Stake Routing
- [ ] Live MEV visualization
- [ ] Validator profiles

## The Mission

Support independent validators. Fight centralization. Discover alpha.

**Staking should be decentralized. Help the little guys win.**

## Built For

[Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon) — Feb 2026

$100,000 prize pool. Building to win.

## License

MIT

---

*StakePilot: Discover. Predict. Decentralize.* 🚀
