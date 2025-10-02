# Habit Tracker ERC4626 Vault + Native Staking Integration Plan

## Overview
Transform the `habit_tracker` smart contract into an ERC4626-compliant vault that accepts STRK tokens, mints HABIT share tokens (1:1 initially), and generates yield through Starknet's native staking protocol.

---

## Phase 1: Core ERC4626 Vault Implementation

### 1.1 Dependencies & OpenZeppelin Integration
- **Add to `Scarb.toml`**:
  ```toml
  openzeppelin = { git = "https://github.com/OpenZeppelin/cairo-contracts.git", tag = "v2.0.0" }
  ```

- **Key Components to Use**:
  - `ERC4626Component` from OpenZeppelin
  - `ERC20Component` for the HABIT token
  - STRK ERC20 interface for the underlying asset

### 1.2 Contract Architecture

```cairo
#[starknet::contract]
pub mod HabitTrackerVault {
    use openzeppelin_token::erc20::ERC20Component;
    use openzeppelin_token::erc20::extensions::erc4626::ERC4626Component;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    
    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: ERC4626Component, storage: erc4626, event: ERC4626Event);
    
    // Embed ERC4626 and ERC20 implementations
    #[abi(embed_v0)]
    impl ERC4626Impl = ERC4626Component::ERC4626Impl<ContractState>;
    
    #[abi(embed_v0)]
    impl ERC20Impl = ERC20Component::ERC20Impl<ContractState>;
}
```

### 1.3 Core Vault Functions (from ERC4626)
- **`deposit(assets, receiver)`**: User deposits STRK → mints HABIT shares
- **`mint(shares, receiver)`**: User specifies desired HABIT shares → calculates required STRK
- **`withdraw(assets, receiver, owner)`**: Burns HABIT → returns STRK
- **`redeem(shares, receiver, owner)`**: Burns specific HABIT amount → returns proportional STRK
- **`totalAssets()`**: Total STRK held (deposited + staked + rewards)
- **`convertToShares(assets)`**: Calculate HABIT for given STRK amount
- **`convertToAssets(shares)`**: Calculate STRK value for given HABIT amount

### 1.4 Storage Extensions
Add to existing storage:
```cairo
#[storage]
struct Storage {
    // ... existing habit tracker storage ...
    
    // Vault storage (via components)
    #[substorage(v0)]
    erc20: ERC20Component::Storage,
    
    #[substorage(v0)]
    erc4626: ERC4626Component::Storage,
    
    // Staking integration
    total_staked: u256,                    // Total STRK currently staked
    accumulated_rewards: u256,              // Rewards not yet distributed
    last_reward_sync: u64,                 // Last epoch rewards were synced
    staking_contract: ContractAddress,      // Native staking contract address
}
```

### 1.5 Events
```cairo
#[event]
#[derive(Drop, starknet::Event)]
pub enum Event {
    // ... existing events ...
    
    // ERC4626 events (from components)
    #[flat]
    ERC20Event: ERC20Component::Event,
    #[flat]
    ERC4626Event: ERC4626Component::Event,
    
    // Custom staking events
    StakedToProtocol: StakedToProtocol,
    UnstakedFromProtocol: UnstakedFromProtocol,
    RewardsClaimed: RewardsClaimed,
    RewardsAccrued: RewardsAccrued,
}

#[derive(Drop, starknet::Event)]
pub struct StakedToProtocol {
    pub amount: u256,
    pub epoch: u64,
}

#[derive(Drop, starknet::Event)]
pub struct RewardsAccrued {
    pub amount: u256,
    pub new_total_assets: u256,
    pub epoch: u64,
}
```

---

## Phase 2: Starknet Native Staking Integration

### 2.1 Staking Contract Interface
Define interface for Starknet's native staking:

```cairo
// Interface for native staking protocol
#[starknet::interface]
pub trait IStakingContract<TContractState> {
    fn stake(ref self: TContractState, amount: u256, staker_address: ContractAddress);
    fn unstake(ref self: TContractState, amount: u256);
    fn claim_rewards(ref self: TContractState) -> u256;
    fn get_staked_amount(self: @TContractState, address: ContractAddress) -> u256;
    fn get_pending_rewards(self: @TContractState, address: ContractAddress) -> u256;
}
```

**Contract Addresses** (to be added to `externalContracts.ts`):
- **Sepolia Testnet**: `0x...` (lookup from Starknet docs)
- **Mainnet**: `0x...` (lookup from Starknet docs)

### 2.2 Staking Logic

```cairo
#[generate_trait]
impl StakingImpl of StakingTrait {
    // Called when users deposit STRK to vault
    fn stake_to_protocol(ref self: ContractState, amount: u256) {
        let staking_dispatcher = IStakingContractDispatcher {
            contract_address: self.staking_contract.read()
        };
        
        // Approve and stake
        let strk = IERC20Dispatcher {
            contract_address: self.asset() // STRK address
        };
        strk.approve(self.staking_contract.read(), amount);
        
        staking_dispatcher.stake(amount, get_contract_address());
        
        let mut total_staked = self.total_staked.read();
        self.total_staked.write(total_staked + amount);
        
        self.emit(StakedToProtocol { 
            amount, 
            epoch: get_block_timestamp() / SECONDS_PER_DAY 
        });
    }
    
    // Sync rewards from native staking
    fn sync_staking_rewards(ref self: ContractState) {
        let staking_dispatcher = IStakingContractDispatcher {
            contract_address: self.staking_contract.read()
        };
        
        let rewards = staking_dispatcher.claim_rewards();
        
        if rewards > 0 {
            let mut accumulated = self.accumulated_rewards.read();
            self.accumulated_rewards.write(accumulated + rewards);
            
            self.emit(RewardsAccrued {
                amount: rewards,
                new_total_assets: self.totalAssets(),
                epoch: get_block_timestamp() / SECONDS_PER_DAY
            });
        }
        
        self.last_reward_sync.write(get_block_timestamp() / SECONDS_PER_DAY);
    }
}
```

### 2.3 Override `totalAssets()` for Accurate Accounting

```cairo
impl ERC4626HooksImpl of ERC4626Component::ERC4626HooksTrait<ContractState> {
    fn total_assets(self: @ERC4626Component::ComponentState<ContractState>) -> u256 {
        let contract_state = self.get_contract();
        
        // Total = Liquid STRK + Staked STRK + Accumulated Rewards
        let liquid_strk = contract_state.get_liquid_balance();
        let staked_strk = contract_state.total_staked.read();
        let rewards = contract_state.accumulated_rewards.read();
        
        liquid_strk + staked_strk + rewards
    }
    
    fn after_deposit(
        ref self: ERC4626Component::ComponentState<ContractState>,
        assets: u256,
        shares: u256,
    ) {
        // Automatically stake deposited STRK
        let mut contract_state = self.get_contract_mut();
        contract_state.stake_to_protocol(assets);
    }
    
    fn before_withdraw(
        ref self: ERC4626Component::ComponentState<ContractState>,
        assets: u256,
        shares: u256,
    ) {
        // Sync rewards before withdrawal to ensure accurate exchange rate
        let mut contract_state = self.get_contract_mut();
        contract_state.sync_staking_rewards();
        
        // If needed, unstake from protocol to cover withdrawal
        let liquid = contract_state.get_liquid_balance();
        if liquid < assets {
            let to_unstake = assets - liquid;
            contract_state.unstake_from_protocol(to_unstake);
        }
    }
}
```

---

## Phase 3: Hybrid Architecture (Vault + Habits)

### 3.1 Integration Strategy
Keep existing habit tracking features but modify deposit/withdraw to work through vault:

```cairo
// Modified deposit - now issues HABIT tokens
fn deposit(ref self: ContractState, amount: u256) {
    assert(amount > 0, 'Amount must be > 0');
    
    let caller = get_caller_address();
    
    // Use ERC4626 deposit (mints HABIT tokens)
    let shares = self.erc4626.deposit(amount, caller);
    
    // Track in habit system's deposit balance for backward compatibility
    let current_balance = self.user_deposit_balance.read(caller);
    self.user_deposit_balance.write(caller, current_balance + amount);
    
    self.emit(Deposited { user: caller, amount });
}

// Modified withdraw
fn withdraw_from_deposit(ref self: ContractState, amount: u256) {
    assert(amount > 0, 'Amount must be > 0');
    
    let caller = get_caller_address();
    
    // Calculate shares to redeem based on current exchange rate
    let shares_to_burn = self.erc4626.convert_to_shares(amount);
    
    // Use ERC4626 redeem (burns HABIT, returns STRK)
    let assets_received = self.erc4626.redeem(shares_to_burn, caller, caller);
    
    // Update habit system balances
    let deposit_balance = self.user_deposit_balance.read(caller);
    let blocked_balance = self.user_blocked_balance.read(caller);
    
    let available_balance = deposit_balance - blocked_balance;
    assert(available_balance >= amount, 'Insufficient unlocked balance');
    
    self.user_deposit_balance.write(caller, deposit_balance - amount);
    
    self.emit(Withdrew { user: caller, amount: assets_received });
}
```

### 3.2 Habit Funding Accounting
When habits are funded daily via `prepare_day()`:
- Funds remain accounted in `user_deposit_balance` and `user_blocked_balance`
- HABIT tokens stay in user's wallet (not burned during funding)
- Only when user withdraws or loses stake do HABIT tokens potentially change

---

## Phase 4: UI Integration

### 4.1 New React Hooks

**`useHabitVault.ts`**:
```typescript
export const useHabitVault = (userAddress?: Address) => {
  // ERC4626 read functions
  const { data: habitBalance } = useScaffoldReadContract({
    contractName: "HabitTrackerVault",
    functionName: "balanceOf",
    args: [userAddress],
  });

  const { data: totalAssets } = useScaffoldReadContract({
    contractName: "HabitTrackerVault",
    functionName: "totalAssets",
  });
  
  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "HabitTrackerVault",
    functionName: "totalSupply",
  });
  
  const { data: strkBalance } = useScaffoldReadContract({
    contractName: "HabitTrackerVault",
    functionName: "convertToAssets",
    args: [habitBalance || 0n],
  });

  const { data: stakingRewards } = useScaffoldReadContract({
    contractName: "HabitTrackerVault",
    functionName: "accumulated_rewards",
  });
  
  const exchangeRate = totalSupply && totalSupply > 0n 
    ? Number(totalAssets) / Number(totalSupply) 
    : 1;
  
  return {
    habitBalance,
    strkValue: strkBalance,
    totalAssets,
    stakingRewards,
    exchangeRate,
  };
};
```

### 4.2 Dashboard Components

**`VaultStats.tsx`**:
```tsx
export const VaultStats = () => {
  const { address } = useAccount();
  const { habitBalance, strkValue, exchangeRate, stakingRewards } = useHabitVault(address);

  return (
    <div className="stats shadow">
      <div className="stat">
        <div className="stat-title">HABIT Balance</div>
        <div className="stat-value">{formatUnits(habitBalance || 0n, 18)}</div>
      </div>
      
      <div className="stat">
        <div className="stat-title">STRK Value</div>
        <div className="stat-value">{formatUnits(strkValue || 0n, 18)}</div>
      </div>
      
      <div className="stat">
        <div className="stat-title">Exchange Rate</div>
        <div className="stat-value">{exchangeRate.toFixed(6)}</div>
        <div className="stat-desc">STRK per HABIT</div>
      </div>
      
      <div className="stat">
        <div className="stat-title">Staking Rewards Accrued</div>
        <div className="stat-value text-success">{formatUnits(stakingRewards || 0n, 18)}</div>
        <div className="stat-desc">↗︎ From Native Staking</div>
      </div>
    </div>
  );
};
```

**`RewardsChart.tsx`**:
```tsx
export const RewardsChart = () => {
  const { address } = useAccount();
  
  // Watch RewardsAccrued events
  const { data: rewardEvents } = useScaffoldEventHistory({
    contractName: "HabitTrackerVault",
    eventName: "RewardsAccrued",
    fromBlock: 0n,
    watch: true,
  });

  // Chart data: rewards over time
  const chartData = rewardEvents?.map(event => ({
    epoch: event.args.epoch,
    amount: Number(formatUnits(event.args.amount, 18)),
    totalAssets: Number(formatUnits(event.args.new_total_assets, 18)),
  })) || [];

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Rewards Timeline</h2>
        {/* Integrate with recharts or similar */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="epoch" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Rewards" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

### 4.3 Page Layout (`app/habits/page.tsx`)

```tsx
export default function HabitsPage() {
  return (
    <div className="container mx-auto py-8">
      {/* Vault Statistics Dashboard */}
      <VaultStats />
      
      <div className="divider">Your Habits</div>
      
      {/* Existing habit tracker UI */}
      <HabitList />
      <CreateHabitForm />
      
      <div className="divider">Rewards</div>
      
      {/* Rewards visualization */}
      <RewardsChart />
    </div>
  );
}
```

---

## Phase 5: Migration & Deployment Strategy

### 5.1 Testing Plan
1. **Unit Tests** (Cairo tests):
   - Test ERC4626 deposit/mint/withdraw/redeem
   - Test staking integration (mock staking contract)
   - Test habit funding with new architecture
   - Test reward accrual and exchange rate updates

2. **Integration Tests**:
   - Deploy to Sepolia testnet
   - Test with actual Sepolia staking contract
   - Verify reward distribution over multiple epochs
   - Test edge cases (large withdrawals, zero liquidity, etc.)

### 5.2 Deployment Steps
1. **Deploy to Sepolia**:
   ```bash
   yarn deploy --network sepolia
   ```
   
2. **Configure Staking Contract**:
   - Add staking contract address to constructor
   - Add staking contract ABI to `externalContracts.ts`

3. **Initialize Vault**:
   - Set STRK as underlying asset
   - Set "Habit Token" / "HABIT" as share token name/symbol
   - Transfer initial funds to avoid inflation attack

4. **Frontend Deployment**:
   - Update `deployedContracts.ts` with new vault ABI
   - Deploy Next.js app to Vercel
   - Test on Sepolia

5. **Mainnet Deployment** (after thorough testing):
   - Audit contract code
   - Deploy to mainnet
   - Monitor initial operations

### 5.3 Migration from Current Contract
- If existing users have balances:
  - Deploy new vault contract
  - Implement migration function to transfer balances
  - Issue equivalent HABIT tokens based on old deposits
  - Announce migration period
  - Disable old contract after migration

---

## Phase 6: Security Considerations

### 6.1 ERC4626 Inflation Attack Prevention
**Mitigation**: Seed vault with initial deposit in constructor:
```cairo
#[constructor]
fn constructor(
    ref self: ContractState,
    treasury_addr: ContractAddress,
    staking_contract_addr: ContractAddress,
) {
    // ... existing init ...
    
    // Initialize vault with 1 STRK to prevent inflation attack
    let initial_deposit = 1_000_000_000_000_000_000_u256; // 1 STRK
    let strk = IERC20Dispatcher { contract_address: STRK_CONTRACT.try_into().unwrap() };
    
    // Contract must receive 1 STRK during deployment
    self.erc4626.initializer(STRK_CONTRACT.try_into().unwrap());
    self.erc20.initializer("Habit Token", "HABIT");
}
```

### 6.2 Staking Risks
- **Lockup Periods**: Starknet staking has 7-day withdrawal lockup on mainnet (5 min on Sepolia)
  - **Mitigation**: Maintain liquidity buffer (e.g., 10-20% unstaked) for withdrawals
  - Show users estimated withdrawal times in UI
  
- **Slashing**: Validators can lose stake if they misbehave
  - **Mitigation**: Diversify across multiple validators (if protocol supports)
  - Monitor validator performance

### 6.3 Access Controls
- Only allow treasury or admin to modify staking parameters
- Implement emergency pause functionality
- Use OpenZeppelin's `Ownable` or `AccessControl` components

---

## Phase 7: Advanced Features (Future)

### 7.1 Yield Optimization
- Auto-compound rewards
- Dynamic liquidity buffer based on withdrawal patterns
- Multi-validator staking for risk diversification

### 7.2 HABIT Token Utility
- Governance rights (vote on habit tracker parameters)
- Boosted rewards for long-term holders
- Transferable HABIT tokens (create secondary market)

### 7.3 Gamification
- Leaderboard for highest HABIT holders
- NFT badges for milestones (e.g., "1 Year Staker")
- Social features (friend challenges, group habits)

---

## Implementation Checklist

### Smart Contract
- [ ] Add OpenZeppelin dependencies to `Scarb.toml`
- [ ] Create `IStakingContract` interface
- [ ] Integrate `ERC4626Component` and `ERC20Component`
- [ ] Implement `stake_to_protocol()` and `sync_staking_rewards()`
- [ ] Override `totalAssets()` to include staked amounts
- [ ] Add ERC4626 hooks for deposit/withdraw
- [ ] Update existing deposit/withdraw functions
- [ ] Write comprehensive unit tests
- [ ] Deploy and test on Sepolia

### Frontend
- [ ] Create `useHabitVault` hook
- [ ] Build `VaultStats` component
- [ ] Build `RewardsChart` component
- [ ] Add staking contract to `externalContracts.ts`
- [ ] Update habits page layout
- [ ] Add HABIT token display throughout UI
- [ ] Implement rewards history view
- [ ] Test on Sepolia deployment

### Documentation
- [ ] Update README with vault features
- [ ] Document HABIT token economics
- [ ] Create user guide for deposit/withdraw
- [ ] Document staking rewards calculation
- [ ] Add FAQ section

### Deployment
- [ ] Complete security audit
- [ ] Deploy to mainnet
- [ ] Verify contracts on block explorer
- [ ] Monitor initial operations
- [ ] Announce launch

---

## Key Technical Decisions

1. **ERC4626 vs Custom Vault**: Use ERC4626 for standardization and composability
2. **Staking Strategy**: Stake 100% of deposits initially, adjust buffer based on withdrawal patterns
3. **Reward Distribution**: Accrue rewards to `totalAssets`, increasing HABIT value (no direct distribution)
4. **Habit System Integration**: Keep existing habits logic, use vault as underlying balance system
5. **HABIT Token**: Non-transferable initially to prevent speculation, make transferable later if desired

---

## Estimated Timeline

- **Phase 1 (ERC4626 Core)**: 1-2 weeks
- **Phase 2 (Staking Integration)**: 1-2 weeks
- **Phase 3 (Hybrid Architecture)**: 1 week
- **Phase 4 (UI)**: 1-2 weeks
- **Phase 5 (Testing & Deployment)**: 2-3 weeks
- **Total**: 6-10 weeks

---

## Resources

- [OpenZeppelin Cairo Contracts - ERC4626](https://docs.openzeppelin.com/contracts-cairo/2.0.0/erc4626)
- [Starknet Staking Protocol Docs](https://docs.starknet.io/documentation/architecture_and_concepts/Network_Architecture/staking/)
- [ERC4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [Starknet Native Staking Addresses](https://docs.starknet.io/documentation/staking/)

---

## Notes

- This plan prioritizes composability (ERC4626) and security (OpenZeppelin libraries)
- The vault acts as a liquidity layer between users and native staking
- HABIT tokens represent shares in the vault, appreciating as staking rewards accrue
- The habit tracking system becomes a compelling use case for the vault (gamified staking)

