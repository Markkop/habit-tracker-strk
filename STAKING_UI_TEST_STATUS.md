# Staking UI Test Status

## Current Status

### ✅ Implemented
1. **StakingControls Component** - Created and integrated into `/habits` page
   - Stake to Protocol input and button
   - Unstake from Protocol input and button with "Max" functionality  
   - Sync Rewards button
   - Real-time display of:
     - Total Staked
     - Rewards Earned
     - Total Assets
   - Informational section explaining how staking works

2. **Contract Integration**
   - Using `useHabitVault` hook for vault stats
   - Using `useScaffoldWriteContract` hooks for staking operations
   - Proper args handling with BigInt conversions

3. **UI/UX Features**
   - Loading states for all buttons
   - Disabled states when no input or pending
   - Input validation
   - Error handling with notification

### ⚠️ Current Issue

**Problem**: "Contract address not found" error when testing

**Root Cause Analysis**:
- The `useHabitTracker` hook uses `useDeployedContractInfo("HabitTracker")` to get the contract address
- This hook looks up contracts using `contracts?.[targetNetwork.network]?.[contractName]`
- For devnet, this resolves to `contracts?.["devnet"]?.["HabitTracker"]`
- Configuration appears correct:
  - `supportedChains.ts`: devnet has `network: "devnet"`
  - `deployedContracts.ts`: has key "devnet" with HabitTracker at correct address
  - Contract was just deployed: `0x3342d15b06f2fb7c2b6390b7344327fff8c4e4f344cf736009c4353eb7b0387`

**Attempted Fixes**:
1. ✅ Redeployed contracts with `yarn deploy:clear`
2. ✅ Hard refreshed browser page
3. ⚠️ Still experiencing intermittent issues after page reload

**Hypothesis**:
- The issue might be a timing problem where the hooks are initializing before the contracts are fully loaded
- Or there's a caching issue with Next.js dev server
- Or the `useDeployedContractInfo` hook has a race condition

### 🔍 Testing Plan

#### Local Devnet Testing
1. **Setup**
   - Start fresh devnet: `yarn chain`
   - Deploy contracts: `yarn deploy:clear`
   - Start Next.js: `yarn start`
   - Hard refresh browser

2. **Test Sequence**
   - Approve STRK tokens
   - Deposit STRK into vault
   - Stake STRK to protocol
   - Sync rewards
   - Unstake STRK from protocol

#### Sepolia Testing
1. **Prerequisites**
   - Sepolia account with test STRK
   - Mock staking protocol contract deployed on Sepolia
   - Update `deployedContracts.ts` with Sepolia addresses

2. **Test Sequence**
   - Same as local devnet but on live testnet

### 📋 Next Steps

1. **Immediate**
   - [ ] Investigate `useDeployedContractInfo` loading state
   - [ ] Add loading/error states to StakingControls for when contract isn't found
   - [ ] Test full flow after fresh deployment

2. **Short-term**
   - [ ] Deploy mock staking protocol to Sepolia
   - [ ] Test on Sepolia testnet
   - [ ] Add better error messages and recovery flows

3. **Future Enhancements**
   - [ ] Add APY display
   - [ ] Add staking history
   - [ ] Add unstaking cooldown timer
   - [ ] Add rewards chart

### 🐛 Known Issues

1. **Contract Address Not Found**
   - Occurs when `habitTrackerAddress` from `useDeployedContractInfo` is undefined
   - Happens intermittently after page reload
   - Workaround: Hard refresh browser

2. **Vault Stats Loading**
   - Sometimes shows "Loading..." indefinitely
   - Related to contract lookup issue

### 💡 Recommendations

1. **Add Defensive Checks**
   - Disable all staking controls until contracts are confirmed loaded
   - Show clear "Connecting to contracts..." state
   - Add retry logic for failed contract lookups

2. **Improve Error Handling**
   - Better error messages for different failure modes
   - Recovery options (e.g., "Reload Contracts" button)
   - Link to deployment instructions if contracts not found

3. **Testing Infrastructure**
   - Add integration tests for staking flow
   - Mock contract responses for unit tests
   - E2E tests with actual devnet

## Contract Functions Reference

### Staking Operations (HabitTracker)

```cairo
// Stake STRK to the native protocol
fn stake_to_protocol(ref self: ContractState, amount: u256)

// Unstake STRK from the protocol  
fn unstake_from_protocol(ref self: ContractState, amount: u256)

// Sync rewards from the staking protocol
fn sync_staking_rewards(ref self: ContractState) -> u256

// View functions
fn total_staked(self: @ContractState) -> u256
fn staking_rewards(self: @ContractState) -> u256
fn total_assets(self: @ContractState) -> u256
```

### Mock Protocol Interface

The contract is designed to work with Starknet's native staking protocol. For local testing, we're using mock functions that simulate staking behavior without actual protocol interaction.

## Files Modified

1. `/packages/nextjs/components/habits/StakingControls.tsx` - Main staking UI component
2. `/packages/nextjs/components/habits/index.tsx` - Barrel export
3. `/packages/nextjs/app/habits/page.tsx` - Integrated StakingControls
4. `/packages/nextjs/hooks/scaffold-stark/useHabitVault.ts` - Vault stats hook (existing)

## Screenshots Needed

- [ ] Staking Controls with 0 balances
- [ ] Staking Controls with deposited funds
- [ ] Stake transaction in progress
- [ ] Successful stake confirmation
- [ ] Unstake flow
- [ ] Rewards sync

## Performance Considerations

- All contract reads use `watch: true` for real-time updates
- Polling interval set in `scaffold.config.ts` (default: 30s)
- BigInt conversions handled properly to avoid precision loss
- Input validation prevents invalid transactions

---

**Last Updated**: 2025-01-29
**Status**: In Progress - Debugging contract lookup issue

