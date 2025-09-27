# Habit (StarkNet) — MVP Simple v1.0 Blueprint

## 🎯 Overview

A StarkNet-based habit tracking dApp where users deposit STRK tokens to create daily stakes. Each active habit consumes 10 STRK/day as a "daily bet". If the user checks in before 00:00 UTC, they win 10 STRK to their claimable balance. If they fail to check in, the 10 STRK is lost to the protocol treasury.

## 🏗️ Architecture

### Smart Contract (Cairo 2)
- **Location**: `packages/snfoundry/contracts/src/habit_tracker.cairo`
- **Features**: Deposit/withdraw, habit management, daily check-ins, settlement logic
- **Key Mechanism**: Balance blocking system to prevent double-spending during daily cycles

### Frontend (NextJS + Scaffold-Stark)
- **Location**: `packages/nextjs/app/habit-tracker/`
- **Components**: Deposit UI, Habit management, Check-in interface, Settlement dashboard
- **Key Features**: UTC timer, real-time balance updates, transaction feedback

## 📋 Business Rules

- **Currency**: STRK (native Starknet token)
- **Daily Stake**: 10 STRK per habit per day
- **Day Boundary**: 00:00:00 UTC (civil day UTC)
- **Settlement**: Permissionless, can be called by anyone after cutoff
- **Failure Penalty**: 10 STRK → Treasury address
- **Success Reward**: 10 STRK → User's claimable balance
- **Balance Blocking**: Prevents spending deposited funds during active daily cycles

## 💾 Data Model

### User State
```cairo
struct UserState {
    deposit_balance: u256,    // Available STRK for staking
    blocked_balance: u256,    // Locked STRK for today's habits
    claimable_balance: u256,  // Won STRK ready for withdrawal
    active_habit_count: u32,  // Number of active habits
}
```

### Habit Structure
```cairo
struct Habit {
    id: u32,
    owner: ContractAddress,
    text: ByteArray,          // Short description (1 line)
    created_at_epoch: u64,
    archived: bool,
}
```

### Daily Status (per habit per epoch)
```cairo
struct DailyStatus {
    funded: bool,      // Had sufficient balance at day start
    checked: bool,     // User checked in during the day
    settled: bool,     // Day has been settled
}
```

## 🔄 Daily Flow

### Day D (00:00:00 - 23:59:59 UTC)
1. **prepare_day(epoch_id)**: Determines which habits get funded, blocks 10 STRK each
2. **check_in(habitId, epoch_id)**: User marks habit as completed

### After Cutoff (00:00 UTC Day D+1)
3. **settle(user, epoch_id, habitId)**: Processes one habit's outcome
4. **settle_all(user, epoch_id, max_count)**: Processes multiple habits

## ⚙️ Contract Functions

### Mutable Functions
- `deposit(amount: u256)` - Add STRK to deposit balance
- `withdraw_from_deposit(amount: u256)` - Remove from unlocked deposit
- `create_habit(text: ByteArray) -> u32` - Create new habit
- `archive_habit(habit_id: u32)` - Deactivate habit
- `check_in(habit_id: u32, epoch_id: u64)` - Mark habit complete for day
- `prepare_day(epoch_id: u64)` - Fund and lock balances for active habits
- `settle(user: ContractAddress, epoch_id: u64, habit_id: u32)` - Settle single habit
- `settle_all(user: ContractAddress, epoch_id: u64, max_count: u32)` - Settle multiple habits
- `claim(amount: u256)` - Withdraw won STRK to wallet
- `redeposit_from_claimable(amount: u256)` - Move won STRK back to deposit

### View Functions
- `get_user_state(user: ContractAddress) -> UserState`
- `get_habits(user: ContractAddress) -> Array<Habit>`
- `get_daily_status(user: ContractAddress, epoch_id: u64, habit_id: u32) -> DailyStatus`
- `epoch_now() -> u64`

## 🎨 UI Components

### 1. Wallet & Deposit Dashboard
- Connect wallet (ArgentX/Braavos)
- Display: Deposit, Blocked, Claimable balances
- Actions: Deposit STRK, Withdraw unlocked funds

### 2. Habits Management
- List active habits with creation form
- Per-habit card showing today's stake status
- UTC day timer and check-in button

### 3. Settlement Interface
- Post-cutoff settlement trigger
- Daily results: won vs lost amounts

### 4. Claim/Redeploy Dashboard
- Claim won STRK to wallet
- Redeploy won STRK back to deposit pool

## 🔐 Security Considerations

- **No Reentrancy**: External calls last in functions
- **Balance Blocking**: Prevents spending during daily cycles
- **Idempotent Operations**: check_in and settle are safe to call multiple times
- **Time Validation**: check_in only for current epoch, settle only for past epochs
- **Loop Limits**: settle_all has max_count parameter

## 🧪 Testing Scenarios

### Success Case
1. Deposit 100 STRK
2. Create habit
3. prepare_day → funded=true (blocks 10 STRK)
4. check_in → checked=true
5. settle → claimable += 10, blocked -= 10

### Failure Case
1. Deposit 100 STRK
2. Create habit
3. prepare_day → funded=true (blocks 10 STRK)
4. No check_in
5. settle → deposit -= 10 → treasury, blocked -= 10

### Insufficient Balance Case
1. Deposit 5 STRK
2. Create 2 habits
3. prepare_day → only 1 funded (blocks 10), 1 insufficient

## 🚀 Implementation Plan

### Phase 1: Core Contract
- [ ] Basic storage structures
- [ ] Deposit/withdraw functions
- [ ] Habit CRUD operations
- [ ] Basic check_in logic

### Phase 2: Daily Cycle Logic
- [ ] prepare_day with balance blocking
- [ ] settle/settle_all functions
- [ ] Treasury transfers

### Phase 3: UI Development
- [ ] Wallet connection and balance display
- [ ] Habit management interface
- [ ] Check-in system with UTC timer
- [ ] Settlement dashboard

### Phase 4: Testing & Deployment
- [ ] Unit tests for all functions
- [ ] Integration tests with UI
- [ ] Devnet deployment and testing

## 📊 Success Metrics

- Contract deploys without errors
- All CRUD operations work
- Daily cycle (prepare → check → settle) functions correctly
- UI displays real-time balances and timers
- Multiple habits can be managed simultaneously
- Treasury receives failed stakes appropriately
