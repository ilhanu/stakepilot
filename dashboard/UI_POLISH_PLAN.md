# StakePilot UI Polish Plan

**Goal:** Make every page production-ready for hackathon demo

## 1. Header (PRIORITY: HIGH)
- [ ] Change "Devnet" badge to "Testnet"
- [ ] Update badge color to match testnet
- [ ] Ensure mobile menu works properly
- [ ] Add testnet faucet link

## 2. Landing Page `/` (PRIORITY: HIGH)
- [ ] Fix stats fetch (use /api/agent/vault, not /api/agent/execute)
- [ ] Show real testnet data:
  - Total SOL deposited
  - Total SOL staked
  - Number of stake positions
  - Current APY estimate
- [ ] Update "StakeWiz" reference to "validators.app"
- [ ] Show Staker Space validator testnet info
- [ ] Add testnet disclaimer banner

## 3. Vault Page `/vault` (PRIORITY: HIGH)
- [ ] Show current stake positions with validator names
- [ ] Display real-time vault balance
- [ ] Show staking activity/history
- [ ] Fix deposit/withdraw for testnet
- [ ] Add position status badges (activating/active/deactivating)
- [ ] Show Staker Space validator prominently
- [ ] Add epoch countdown

## 4. Discover Page `/discover` (PRIORITY: MEDIUM)
- [ ] Use validators.app data (testnet)
- [ ] Show validator scores from validators.app
- [ ] Filter by StakePilot criteria
- [ ] Highlight Staker Space validator
- [ ] Add "Stake with StakePilot" CTA

## 5. Agent Docs Page `/agent-docs` (PRIORITY: MEDIUM)
- [ ] Update API examples for testnet
- [ ] Show current vault address
- [ ] Document all available endpoints
- [ ] Add live API response examples

## 6. Docs Page `/docs` (PRIORITY: MEDIUM)
- [ ] Update for testnet deployment
- [ ] Add smart contract addresses
- [ ] Explain agent selection criteria
- [ ] Add FAQ section

## 7. Global Components

### StakePositions Component
- [ ] Fetch from /api/agent/positions
- [ ] Show validator name (from validators.app)
- [ ] Show status with color coding
- [ ] Link to explorer

### AgentActivity Component
- [ ] Show recent staking actions
- [ ] Display transaction links
- [ ] Show validator targets

## 8. Styling Consistency
- [ ] Ensure all pages use Staker Space colors
- [ ] Consistent card styling
- [ ] Mobile responsive on all pages
- [ ] Loading states for all data fetches
- [ ] Error states with retry buttons

## 9. Testnet-Specific
- [ ] Add testnet banner on all pages
- [ ] Link to testnet faucet
- [ ] Show testnet explorer links
- [ ] Warn about testnet SOL

## 10. Remove/Hide Unused Pages
- [ ] Hide `/compare` (mainnet LST data)
- [ ] Hide `/alerts` (not relevant for demo)
- [ ] Hide `/autopilot` (duplicate of vault)
- [ ] Hide `/route` (not needed)
- [ ] Hide `/my-stakes` (replaced by vault)

## Implementation Order

1. **Phase 1 - Critical** (30 min)
   - Header: Testnet badge
   - Landing page: Fix stats, testnet banner
   - Vault page: Show positions

2. **Phase 2 - Important** (30 min)
   - Discover page: validators.app data
   - Docs: Update for testnet
   - Agent docs: Live examples

3. **Phase 3 - Polish** (30 min)
   - Remove unused nav items
   - Mobile testing
   - Loading/error states

## Key Data Sources

| Data | Endpoint | Notes |
|------|----------|-------|
| Vault balance | `/api/agent/vault` | Real-time |
| Stake positions | `/api/agent/positions` | Vault-owned stakes |
| Validators | `/api/validators` | From validators.app |
| Recommendations | `/api/agent/recommend` | Scoring algorithm |
