# Habit Tracker (Starknet)

A gamified habit tracking dApp built on Starknet where users stake STRK tokens to build daily habits. Success earns tokens back, failure means lost stakes go to the treasury.

## 🎯 Core Concept

- **Daily Stakes**: 10 STRK per habit per day
- **Success**: Check in before UTC midnight → win 10 STRK
- **Failure**: Miss check-in → lose 10 STRK to treasury
- **Balance Blocking**: Prevents spending staked funds during active cycles

## 🏗️ Tech Stack

- **Frontend**: Next.js + Scaffold-Stark 2 + TypeScript + Tailwind + daisyUI
- **Smart Contracts**: Cairo 2.0 + Starknet Foundry
- **Blockchain**: Starknet (Devnet/Sepolia/Mainnet)
- **Wallet Support**: ArgentX, Braavos

## 📦 Project Structure

```
├── packages/nextjs/          # Frontend (Next.js + React)
│   ├── app/habits/          # Main habit tracking UI
│   └── hooks/useHabitTracker.ts  # React hooks for contract interaction
└── packages/snfoundry/       # Smart contracts & deployment
    └── contracts/src/habit_tracker.cairo  # Core contract
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22
- Yarn package manager

### Installation & Setup

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Start local Starknet network**
   ```bash
   yarn chain
   ```

3. **Deploy smart contracts**
   ```bash
   yarn deploy
   ```

4. **Launch frontend**
   ```bash
   yarn start
   ```

Visit `http://localhost:3000` to access the app.

## 🎮 How It Works

### 1. Deposit STRK
- Connect wallet and deposit STRK tokens
- Funds are available for staking

### 2. Create Habits
- Add daily habits (e.g., "Exercise 30 minutes")
- Each habit requires 10 STRK daily stake

### 3. Daily Cycle
- **Prepare Day**: Lock 10 STRK for each active habit (00:00 UTC)
- **Check In**: Mark habit complete during the day
- **Settlement**: Process outcomes after UTC midnight
  - ✅ Success: 10 STRK → claimable balance
  - ❌ Failure: 10 STRK → treasury
- **Testing Only**: force_settle_all function allows testing of settle_all function without waiting for midnight UTC

### 4. Claim Rewards
- Withdraw successfully earned STRK
- Redeploy winnings for more stakes

## 🌐 Deployment

### GitHub Pages
This project is configured for deployment to GitHub Pages. See [GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md) for detailed instructions.

Quick steps:
1. Enable GitHub Pages in repository settings (Settings > Pages > Source: GitHub Actions)
2. Push to main branch
3. GitHub Actions will automatically build and deploy

Your site will be available at: `https://<username>.github.io/<repository-name>/`

### Vercel
Alternatively, you can deploy to Vercel:
```bash
yarn vercel
```

## 🔮 Roadmap

- [ ] Integrate yield to blocked/claimable balances
- [ ] Add Sponsor feature, where organizations can add extra rewards on habit completion
- [ ] Add Party feature, where slashed STRK is redistributed to users who completed habits in a party
- [ ] Add trophy NFTs for successive days of habit completion