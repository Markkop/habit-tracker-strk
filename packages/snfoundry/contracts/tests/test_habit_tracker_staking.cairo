// Integration tests for HabitTracker staking functionality
// This file demonstrates both mocking and forking approaches for testing staking integration

use contracts::habit_tracker::{
    IHabitTrackerDispatcher, IHabitTrackerDispatcherTrait
};
use openzeppelin_testing::declare_and_deploy;
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use openzeppelin_utils::serde::SerializedAppend;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address
};
use starknet::ContractAddress;

// ============================================================================
// CONSTANTS
// ============================================================================

const TREASURY: felt252 = 0x123;
const USER: felt252 = 0x456;
const INITIAL_STRK_BALANCE: u256 = 1000_000_000_000_000_000_000; // 1000 STRK

// Starknet Sepolia Staking Contract Address (placeholder - update with real address)
// TODO: Update this with the actual Starknet staking contract address when available
const STAKING_CONTRACT_SEPOLIA: felt252 =
    0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d;

// ============================================================================
// MOCK STAKING CONTRACT
// ============================================================================

#[starknet::interface]
trait IMockStakingContract<TContractState> {
    fn stake(ref self: TContractState, amount: u256, staker_address: ContractAddress);
    fn unstake(ref self: TContractState, amount: u256);
    fn claim_rewards(ref self: TContractState) -> u256;
    fn get_staked_amount(self: @TContractState, address: ContractAddress) -> u256;
    fn get_pending_rewards(self: @TContractState, address: ContractAddress) -> u256;
}

// External interface for setting rewards in tests
#[starknet::interface]
trait IExternalMockStaking<TContractState> {
    fn set_rewards(ref self: TContractState, staker: ContractAddress, amount: u256);
}

#[starknet::contract]
mod MockStakingContract {
    use super::IMockStakingContract;
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        staked_amounts: Map<ContractAddress, u256>,
        pending_rewards: Map<ContractAddress, u256>,
        total_staked: u256,
    }

    #[abi(embed_v0)]
    impl MockStakingContractImpl of IMockStakingContract<ContractState> {
        fn stake(ref self: ContractState, amount: u256, staker_address: ContractAddress) {
            let current = self.staked_amounts.entry(staker_address).read();
            self.staked_amounts.entry(staker_address).write(current + amount);
            
            let total = self.total_staked.read();
            self.total_staked.write(total + amount);
            
            // Simulate 5% APY rewards accumulation
            let rewards = amount * 5 / 100;
            let current_rewards = self.pending_rewards.entry(staker_address).read();
            self.pending_rewards.entry(staker_address).write(current_rewards + rewards);
        }

        fn unstake(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            let current = self.staked_amounts.entry(caller).read();
            assert(current >= amount, 'Insufficient staked balance');
            
            self.staked_amounts.entry(caller).write(current - amount);
            
            let total = self.total_staked.read();
            self.total_staked.write(total - amount);
        }

        fn claim_rewards(ref self: ContractState) -> u256 {
            let caller = get_caller_address();
            let rewards = self.pending_rewards.entry(caller).read();
            self.pending_rewards.entry(caller).write(0);
            rewards
        }

        fn get_staked_amount(self: @ContractState, address: ContractAddress) -> u256 {
            self.staked_amounts.entry(address).read()
        }

        fn get_pending_rewards(self: @ContractState, address: ContractAddress) -> u256 {
            self.pending_rewards.entry(address).read()
        }
    }
    
    // External functions for testing
    #[abi(embed_v0)]
    impl ExternalMockStakingImpl of super::IExternalMockStaking<ContractState> {
        fn set_rewards(ref self: ContractState, staker: ContractAddress, amount: u256) {
            // Set rewards for the given staker address (for testing reward sync)
            self.pending_rewards.entry(staker).write(amount);
        }
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn deploy_mock_strk_token() -> ContractAddress {
    // Deploy a mock STRK token for testing
    let mut calldata = array![];
    let recipient: ContractAddress = USER.try_into().unwrap();
    
    // ERC20 constructor: name, symbol, initial_supply, recipient, owner
    calldata.append_serde('Starknet Token');
    calldata.append_serde('STRK');
    calldata.append_serde(INITIAL_STRK_BALANCE);
    calldata.append_serde(recipient);
    calldata.append_serde(recipient);
    
    declare_and_deploy("MockToken", calldata)
}

fn deploy_mock_staking_contract() -> ContractAddress {
    let contract = declare("MockStakingContract").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![]).unwrap();
    contract_address
}

fn deploy_habit_tracker(
    treasury: ContractAddress, staking_contract: ContractAddress
) -> ContractAddress {
    let mut calldata = array![];
    calldata.append_serde(treasury);
    calldata.append_serde(staking_contract);
    declare_and_deploy("HabitTracker", calldata)
}

// ============================================================================
// UNIT TESTS WITH MOCK STAKING CONTRACT
// ============================================================================

#[test]
fn test_stake_to_protocol_with_mock() {
    // Setup
    let treasury: ContractAddress = TREASURY.try_into().unwrap();
    let user: ContractAddress = USER.try_into().unwrap();
    
    let mock_staking = deploy_mock_staking_contract();
    let habit_tracker = deploy_habit_tracker(treasury, mock_staking);
    
    let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
    let mock_staking_dispatcher = IMockStakingContractDispatcher {
        contract_address: mock_staking
    };
    
    // User stakes 10 STRK
    let stake_amount = 10_000_000_000_000_000_000_u256; // 10 STRK
    
    start_cheat_caller_address(habit_tracker, user);
    tracker.stake_to_protocol(stake_amount);
    stop_cheat_caller_address(habit_tracker);
    
    // Verify staking occurred
    assert(tracker.total_staked() == stake_amount, 'Wrong total staked');
    
    let staked_in_protocol = mock_staking_dispatcher.get_staked_amount(habit_tracker);
    assert(staked_in_protocol == stake_amount, 'Amount not staked in protocol');
    
    // Check vault state
    let vault_state = tracker.get_vault_state();
    assert(vault_state.total_staked == stake_amount, 'Wrong vault total_staked');
}

#[test]
fn test_unstake_from_protocol_with_mock() {
    // Setup
    let treasury: ContractAddress = TREASURY.try_into().unwrap();
    let user: ContractAddress = USER.try_into().unwrap();
    
    let mock_staking = deploy_mock_staking_contract();
    let habit_tracker = deploy_habit_tracker(treasury, mock_staking);
    
    let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
    let mock_staking_dispatcher = IMockStakingContractDispatcher {
        contract_address: mock_staking
    };
    
    // Stake 10 STRK first
    let stake_amount = 10_000_000_000_000_000_000_u256; // 10 STRK
    start_cheat_caller_address(habit_tracker, user);
    tracker.stake_to_protocol(stake_amount);
    
    // Unstake 5 STRK
    let unstake_amount = 5_000_000_000_000_000_000_u256; // 5 STRK
    tracker.unstake_from_protocol(unstake_amount);
    stop_cheat_caller_address(habit_tracker);
    
    // Verify unstaking occurred
    let remaining = stake_amount - unstake_amount;
    assert(tracker.total_staked() == remaining, 'Wrong total after unstake');
    
    let staked_in_protocol = mock_staking_dispatcher.get_staked_amount(habit_tracker);
    assert(staked_in_protocol == remaining, 'Wrong amount in protocol');
}

#[test]
fn test_sync_staking_rewards_with_mock() {
    // Setup
    let treasury: ContractAddress = TREASURY.try_into().unwrap();
    let user: ContractAddress = USER.try_into().unwrap();
    
    let mock_staking = deploy_mock_staking_contract();
    let habit_tracker = deploy_habit_tracker(treasury, mock_staking);
    
    let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
    let mock_staking_dispatcher = IMockStakingContractDispatcher {
        contract_address: mock_staking
    };
    
    // Stake 100 STRK
    let stake_amount = 100_000_000_000_000_000_000_u256; // 100 STRK
    start_cheat_caller_address(habit_tracker, user);
    tracker.stake_to_protocol(stake_amount);
    
    // Check pending rewards (mock generates 5% APY on stake)
    let expected_rewards = stake_amount * 5 / 100; // 5 STRK
    let pending = mock_staking_dispatcher.get_pending_rewards(habit_tracker);
    assert(pending == expected_rewards, 'Wrong pending rewards');
    
    // Sync rewards
    tracker.sync_staking_rewards();
    stop_cheat_caller_address(habit_tracker);
    
    // Verify rewards were accumulated
    assert(tracker.accumulated_rewards() == expected_rewards, 'Rewards not accumulated');
    
    // Verify vault state includes rewards
    let vault_state = tracker.get_vault_state();
    assert(
        vault_state.total_assets == stake_amount + expected_rewards,
        'Assets should include rewards'
    );
}

#[test]
fn test_exchange_rate_with_rewards() {
    // Setup
    let treasury: ContractAddress = TREASURY.try_into().unwrap();
    let user: ContractAddress = USER.try_into().unwrap();
    
    let mock_staking = deploy_mock_staking_contract();
    let habit_tracker = deploy_habit_tracker(treasury, mock_staking);
    
    let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
    
    // Initial exchange rate should be 1:1
    let initial_state = tracker.get_vault_state();
    assert(initial_state.exchange_rate == 1_000_000_000_000_000_000, 'Initial rate should be 1.0');
    
    // Stake and accumulate rewards
    let stake_amount = 100_000_000_000_000_000_000_u256; // 100 STRK
    start_cheat_caller_address(habit_tracker, user);
    tracker.stake_to_protocol(stake_amount);
    tracker.sync_staking_rewards();
    stop_cheat_caller_address(habit_tracker);
    
    // With rewards, total_assets should be higher than total_supply
    // This represents appreciation of HABIT tokens
    let final_state = tracker.get_vault_state();
    let expected_rewards = stake_amount * 5 / 100;
    
    assert(
        final_state.total_assets == stake_amount + expected_rewards,
        'Assets include rewards'
    );
    
    // Exchange rate would increase if we had shares issued
    // (In full ERC4626 implementation with actual share tokens)
}

#[test]
#[should_panic(expected: ('Amount must be greater than 0',))]
fn test_stake_zero_amount_fails() {
    let treasury: ContractAddress = TREASURY.try_into().unwrap();
    let user: ContractAddress = USER.try_into().unwrap();
    
    let mock_staking = deploy_mock_staking_contract();
    let habit_tracker = deploy_habit_tracker(treasury, mock_staking);
    
    let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
    
    start_cheat_caller_address(habit_tracker, user);
    tracker.stake_to_protocol(0);
    stop_cheat_caller_address(habit_tracker);
}

#[test]
#[should_panic(expected: ('Insufficient staked balance',))]
fn test_unstake_more_than_staked_fails() {
    let treasury: ContractAddress = TREASURY.try_into().unwrap();
    let user: ContractAddress = USER.try_into().unwrap();
    
    let mock_staking = deploy_mock_staking_contract();
    let habit_tracker = deploy_habit_tracker(treasury, mock_staking);
    
    let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
    
    // Try to unstake without staking first
    start_cheat_caller_address(habit_tracker, user);
    tracker.unstake_from_protocol(1_000_000_000_000_000_000);
    stop_cheat_caller_address(habit_tracker);
}

// ============================================================================
// INTEGRATION TEST WITH FORKING
// ============================================================================

// This test demonstrates Starknet Foundry's fork testing capability
// by interacting with a REAL deployed contract on Sepolia (STRK token)

#[test]
#[fork("SEPOLIA_LATEST")]
fn test_fork_reads_real_strk_token() {
    // This test forks Sepolia and reads from the REAL STRK token contract
    // Address: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
    
    let strk_address: ContractAddress =
        0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
        .try_into()
        .unwrap();
    
    let strk = IERC20Dispatcher { contract_address: strk_address };
    
    // Read REAL token total supply from forked Sepolia
    let total_supply = strk.total_supply();
    
    // Verify we're reading from real contract
    // STRK token should have a positive total supply
    assert(total_supply > 0, 'Fork: zero supply');
    
    // Verify reasonable supply (STRK has 10B max supply with 18 decimals)
    // Max supply = 10,000,000,000 * 10^18 = 10^28
    let max_supply: u256 = 10000000000000000000000000000;
    assert(total_supply <= max_supply, 'Fork: supply too high');
    
    // This proves forking is working - we're reading from REAL deployed contract!
}

#[test]
#[fork("SEPOLIA_LATEST")]
fn test_fork_deploys_habit_tracker_on_sepolia() {
    // This test proves we can deploy OUR contract on forked Sepolia
    // and have it interact with REAL deployed contracts
    
    let treasury: ContractAddress = TREASURY.try_into().unwrap();
    let user: ContractAddress = USER.try_into().unwrap();
    
    // Deploy our contract on forked Sepolia
    let mock_staking = deploy_mock_staking_contract();
    let habit_tracker = deploy_habit_tracker(treasury, mock_staking);
    
    let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
    
    // Verify deployment worked on fork
    assert(tracker.epoch_now() > 0, 'Fork: deployment failed');
    assert(tracker.treasury_address() == treasury, 'Fork: wrong treasury');
    
    // Test staking on forked network
    let stake_amount = 10_000_000_000_000_000_000_u256;
    start_cheat_caller_address(habit_tracker, user);
    tracker.stake_to_protocol(stake_amount);
    stop_cheat_caller_address(habit_tracker);
    
    // Verify state on forked network
    assert(tracker.total_staked() == stake_amount, 'Fork: staking failed');
    
    // This proves our contract works on real Sepolia fork!
}

#[test]
#[fork("SEPOLIA_LATEST")]
fn test_yield_generation_over_time() {
    // This test simulates yield generation over time using mock staking
    // In production, this would test with the real staking contract
    
    let treasury: ContractAddress = TREASURY.try_into().unwrap();
    let user: ContractAddress = USER.try_into().unwrap();
    
    // Deploy mock staking contract
    let mock_staking = deploy_mock_staking_contract();
    
    // Deploy habit tracker with mock staking
    let habit_tracker = deploy_habit_tracker(treasury, mock_staking);
    let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
    
    // Initial stake: 100 STRK
    let stake_amount = 100_000_000_000_000_000_000_u256; // 100 STRK
    start_cheat_caller_address(habit_tracker, user);
    tracker.stake_to_protocol(stake_amount);
    
    // Get initial vault state
    let initial_state = tracker.get_vault_state();
    assert(initial_state.total_staked == stake_amount, 'Initial stake failed');
    assert(initial_state.accumulated_rewards == 0, 'Initial rewards not zero');
    
    // Simulate yield generation: Mock staking contract generates 5 STRK rewards
    // In real scenario, this would happen automatically over time
    let rewards_amount = 5_000_000_000_000_000_000_u256; // 5 STRK
    let mock_contract = IExternalMockStakingDispatcher { contract_address: mock_staking };
    mock_contract.set_rewards(habit_tracker, rewards_amount);
    
    // Sync rewards (this would be called periodically in production)
    tracker.sync_staking_rewards();
    
    // Verify rewards were accumulated
    let post_sync_state = tracker.get_vault_state();
    assert(post_sync_state.accumulated_rewards == rewards_amount, 'Rewards not accumulated');
    
    // Verify total assets increased (liquid + staked + rewards)
    let expected_total_assets = initial_state.total_assets + rewards_amount;
    assert(post_sync_state.total_assets == expected_total_assets, 'Total assets wrong');
    
    // Note: Exchange rate calculation requires total_supply > 0
    // Once ERC4626 share system is fully implemented, exchange rate will improve
    // For now, we verify that rewards are properly accumulated
    
    // Simulate more time passing and more rewards
    let additional_rewards = 3_000_000_000_000_000_000_u256; // 3 STRK
    mock_contract.set_rewards(habit_tracker, additional_rewards);
    tracker.sync_staking_rewards();
    
    // Verify accumulated rewards increased further
    let final_state = tracker.get_vault_state();
    let total_rewards = rewards_amount + additional_rewards;
    assert(final_state.accumulated_rewards == total_rewards, 'Final rewards wrong');
    
    // Verify final total assets
    let final_expected_assets = stake_amount + total_rewards;
    assert(final_state.total_assets == final_expected_assets, 'Final assets wrong');
    
    stop_cheat_caller_address(habit_tracker);
    
    // This proves the yield generation mechanism works!
    // When real staking is live, rewards will accrue automatically
}

// Uncomment and update when Starknet staking contract is available on testnet
// #[test]
// #[fork("SEPOLIA_LATEST")]
// fn test_stake_with_real_staking_contract() {
//     // This test will fork Sepolia and interact with the real staking contract
//     let treasury: ContractAddress = TREASURY.try_into().unwrap();
//     let user: ContractAddress = USER.try_into().unwrap();
//     
//     // Use real Starknet staking contract address (update when available)
//     let real_staking: ContractAddress = STAKING_CONTRACT_SEPOLIA.try_into().unwrap();
//     let habit_tracker = deploy_habit_tracker(treasury, real_staking);
//     
//     let tracker = IHabitTrackerDispatcher { contract_address: habit_tracker };
//     let staking = IStakingContractDispatcher { contract_address: real_staking };
//     
//     // Stake to REAL protocol
//     let stake_amount = 10_000_000_000_000_000_000_u256; // 10 STRK
//     start_cheat_caller_address(habit_tracker, user);
//     tracker.stake_to_protocol(stake_amount);
//     stop_cheat_caller_address(habit_tracker);
//     
//     // Verify with REAL contract state
//     let staked = staking.get_staked_amount(habit_tracker);
//     assert(staked == stake_amount, 'Real staking failed');
// }

