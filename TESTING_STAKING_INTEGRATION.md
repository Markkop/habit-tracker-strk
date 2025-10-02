# Testing Staking Integration with Starknet

This guide explains how to test the integration between the HabitTracker contract and Starknet's native staking protocol.

## Overview

We provide **two testing approaches**:

1. **Unit Tests with Mock Staking Contract** - Fast, isolated tests
2. **Integration Tests with Forking** - Test against real staking contracts

## Approach 1: Mock Staking Contract (Recommended for Development)

### ✅ Advantages
- **Fast**: No network calls
- **Reliable**: No RPC dependencies
- **Flexible**: Simulate any scenario (rewards, failures, etc.)
- **Cost-free**: No testnet tokens needed

### Usage

Run the tests:
```bash
cd packages/snfoundry
yarn test
```

Or run specific staking tests:
```bash
cd packages/snfoundry/contracts
snforge test test_stake
```

### What's Tested

✅ Staking STRK to protocol  
✅ Unstaking from protocol  
✅ Reward syncing and accumulation  
✅ Exchange rate calculations  
✅ Vault state updates  
✅ Error conditions (zero amounts, insufficient balance)

### Mock Contract Behavior

Our `MockStakingContract` simulates:
- Staking/unstaking operations
- **5% APY rewards** (instant for testing)
- Balance tracking
- Reward claiming

## Approach 2: Forking for Integration Tests

### ✅ Advantages
- **Real behavior**: Test against actual staking contract
- **Complete integration**: Verify all edge cases
- **Production confidence**: Ensure compatibility

### Setup

1. **Configure Fork in `Scarb.toml`**:
```toml
[[tool.snforge.fork]]
name = "SEPOLIA_LATEST"
url = "https://starknet-sepolia.public.blastapi.io/rpc/v0_9"
block_id.tag = "latest"
```

2. **Get Starknet Staking Contract Address**:
```bash
# Check Starknet documentation for official staking contract
# Sepolia: TBD (update when available)
# Mainnet: TBD (update when available)
```

3. **Update Test File**:
```cairo
// In test_habit_tracker_staking.cairo
const STAKING_CONTRACT_SEPOLIA: felt252 = 0x...; // Real address

#[test]
#[fork("SEPOLIA_LATEST")]
fn test_stake_with_real_staking_contract() {
    // Test implementation
}
```

4. **Run Fork Tests**:
```bash
cd packages/snfoundry/contracts
snforge test --fork-url https://starknet-sepolia.public.blastapi.io/rpc/v0_9
```

## Starknet Foundry Fork Features

Similar to Ethereum Foundry, Starknet Foundry provides:

### 🔧 Fork Configuration

```toml
[[tool.snforge.fork]]
name = "MAINNET_BLOCK_500000"
url = "https://starknet-mainnet.public.blastapi.io/rpc/v0_9"
block_id.number = 500000

[[tool.snforge.fork]]
name = "SEPOLIA_LATEST"
url = "https://starknet-sepolia.public.blastapi.io/rpc/v0_9"
block_id.tag = "latest"
```

### 📝 Fork Attributes

Use `#[fork("FORK_NAME")]` attribute on tests:

```cairo
#[test]
#[fork("SEPOLIA_LATEST")]
fn test_with_real_contracts() {
    // This test runs against forked Sepolia
}
```

### 🎯 Fork Benefits

1. **Read real contract state**: Access deployed contract storage
2. **Call real contracts**: Interact with live staking protocol
3. **Test with real tokens**: Use actual STRK tokens
4. **Verify compatibility**: Ensure your contract works with real infrastructure

## Finding Starknet Staking Contract Address

### Official Resources

1. **Starknet Documentation**:
   - https://docs.starknet.io/documentation/architecture_and_concepts/Network_Architecture/staking/

2. **Starknet Block Explorers**:
   - Voyager: https://voyager.online/
   - Starkscan: https://starkscan.co/

3. **Community Resources**:
   - Starknet Discord
   - Starknet GitHub repos

### Example Query

```bash
# Using starknet CLI to find deployed contracts
starknet get_class_hash_at --address 0x... --network sepolia
```

## Current Test Coverage

### ✅ Unit Tests (Working Now)

- ✅ `test_stake_to_protocol_with_mock`
- ✅ `test_unstake_from_protocol_with_mock`
- ✅ `test_sync_staking_rewards_with_mock`
- ✅ `test_exchange_rate_with_rewards`
- ✅ `test_stake_zero_amount_fails`
- ✅ `test_unstake_more_than_staked_fails`

### 🔄 Integration Tests (Pending Real Contract)

- ⏳ `test_stake_with_real_staking_contract` - Commented out until real address available
- ⏳ More integration tests can be added once staking contract is deployed

## Best Practices

### During Development
1. Use **mock tests** for rapid iteration
2. Test edge cases with mocks (easier to simulate)
3. Test error conditions

### Before Deployment
1. Run **fork tests** against Sepolia testnet
2. Verify reward calculations match real protocol
3. Test with various amounts and timing
4. Verify gas costs

### Production Validation
1. Deploy to testnet first
2. Test with small amounts
3. Monitor for several epochs
4. Verify rewards accumulation
5. Test unstaking process

## Troubleshooting

### Fork Tests Fail

**Issue**: `fork url not responding`  
**Solution**: Check RPC URL, try alternative:
- https://free-rpc.nethermind.io/sepolia-juno/
- https://starknet-sepolia.g.alchemy.com/v2/YOUR_KEY

**Issue**: `contract not found at address`  
**Solution**: Verify staking contract is deployed on this network

### Mock Tests vs Real Behavior

**Mocks simulate behavior but may differ from real contracts:**
- Reward calculation precision
- Gas costs
- Timing/epoch mechanics
- Error messages

Always validate with fork tests before mainnet deployment!

## Next Steps

1. ✅ **Run mock tests now**: `yarn test`
2. 🔍 **Find staking contract address** on Sepolia
3. 🔧 **Update fork tests** with real address
4. ✅ **Run integration tests** before deployment
5. 🚀 **Deploy to testnet** for end-to-end testing

## Resources

- [Starknet Foundry Documentation](https://foundry-rs.github.io/starknet-foundry/)
- [Starknet Testing Guide](https://book.cairo-lang.org/ch104-02-testing-smart-contracts.html)
- [Starknet Staking Documentation](https://docs.starknet.io/)
- [Scaffold-Stark Testing Examples](https://github.com/Scaffold-Stark/scaffold-stark-2)

## Questions?

If you need help:
1. Check Starknet Discord #testing channel
2. Review Starknet Foundry examples
3. Consult Scaffold-Stark documentation

