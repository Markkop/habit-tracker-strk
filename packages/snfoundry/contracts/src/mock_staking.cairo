use starknet::ContractAddress;

#[starknet::interface]
pub trait IMockStaking<TContractState> {
    fn stake(ref self: TContractState, amount: u256, staker_address: ContractAddress);
    fn unstake(ref self: TContractState, amount: u256);
    fn claim_rewards(ref self: TContractState) -> u256;
    fn get_staked_amount(self: @TContractState, address: ContractAddress) -> u256;
    fn get_pending_rewards(self: @TContractState, address: ContractAddress) -> u256;
    fn get_reward_pool(self: @TContractState) -> u256;
}

#[starknet::contract]
pub mod MockStaking {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::storage::{Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess};
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    // STRK token contract address on Starknet
    pub const STRK_CONTRACT: felt252 =
        0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d;

    // Yield rate: 0.0001 STRK per 5 seconds per staked token
    const REWARD_PER_5_SECONDS: u256 = 100_000_000_000_000; // 0.0001 STRK
    const REWARD_INTERVAL: u64 = 5; // seconds

    #[storage]
    struct Storage {
        staked_amounts: Map<ContractAddress, u256>,
        stake_timestamp: Map<ContractAddress, u64>,
        claimed_rewards: Map<ContractAddress, u256>,
        total_staked: u256,
    }

    #[abi(embed_v0)]
    impl MockStakingImpl of super::IMockStaking<ContractState> {
        fn stake(ref self: ContractState, amount: u256, staker_address: ContractAddress) {
            // Transfer STRK from caller to this contract
            let strk = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap()
            };
            let caller = get_caller_address();
            let success = strk.transfer_from(caller, get_contract_address(), amount);
            assert(success, 'STRK transfer failed');

            // Claim any pending rewards before updating stake
            let pending = self._calculate_pending_rewards(staker_address);
            if pending > 0 {
                let claimed = self.claimed_rewards.entry(staker_address).read();
                self.claimed_rewards.entry(staker_address).write(claimed + pending);
            }

            // Update staked amount
            let current = self.staked_amounts.entry(staker_address).read();
            self.staked_amounts.entry(staker_address).write(current + amount);
            
            // Update timestamp to now (restart reward calculation)
            self.stake_timestamp.entry(staker_address).write(get_block_timestamp());
            
            let total = self.total_staked.read();
            self.total_staked.write(total + amount);
        }

        fn unstake(ref self: ContractState, amount: u256) {
            let caller = get_caller_address();
            let current = self.staked_amounts.entry(caller).read();
            assert(current >= amount, 'Insufficient staked balance');
            
            // Claim any pending rewards before unstaking
            let pending = self._calculate_pending_rewards(caller);
            if pending > 0 {
                let claimed = self.claimed_rewards.entry(caller).read();
                self.claimed_rewards.entry(caller).write(claimed + pending);
            }
            
            // Update staked amount
            self.staked_amounts.entry(caller).write(current - amount);
            
            // Update timestamp to now
            self.stake_timestamp.entry(caller).write(get_block_timestamp());
            
            let total = self.total_staked.read();
            self.total_staked.write(total - amount);

            // Transfer STRK back to caller
            let strk = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap()
            };
            let success = strk.transfer(caller, amount);
            assert(success, 'STRK transfer failed');
        }

        fn claim_rewards(ref self: ContractState) -> u256 {
            let caller = get_caller_address();
            
            // Calculate pending rewards
            let pending = self._calculate_pending_rewards(caller);
            
            // Add to claimed rewards
            let claimed = self.claimed_rewards.entry(caller).read();
            let total_rewards = claimed + pending;
            
            // Reset claimed rewards and update timestamp
            self.claimed_rewards.entry(caller).write(0);
            self.stake_timestamp.entry(caller).write(get_block_timestamp());
            
            // Check available reward pool
            let strk = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap()
            };
            let contract_balance = strk.balance_of(get_contract_address());
            let staked_total = self.total_staked.read();
            let available_pool = if contract_balance > staked_total {
                contract_balance - staked_total
            } else {
                0
            };
            
            let rewards_to_pay = if total_rewards > available_pool {
                // Pay what's available if pool is insufficient
                available_pool
            } else {
                total_rewards
            };

            // Transfer rewards if any
            if rewards_to_pay > 0 {
                let success = strk.transfer(caller, rewards_to_pay);
                assert(success, 'Reward transfer failed');
            }
            
            rewards_to_pay
        }

        fn get_staked_amount(self: @ContractState, address: ContractAddress) -> u256 {
            self.staked_amounts.entry(address).read()
        }

        fn get_pending_rewards(self: @ContractState, address: ContractAddress) -> u256 {
            // Return total pending (claimed + calculated)
            let claimed = self.claimed_rewards.entry(address).read();
            let pending = self._calculate_pending_rewards(address);
            claimed + pending
        }

        fn get_reward_pool(self: @ContractState) -> u256 {
            // Check actual STRK balance to calculate reward pool dynamically
            let strk = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap()
            };
            let contract_balance = strk.balance_of(get_contract_address());
            let staked_total = self.total_staked.read();
            
            // Reward pool = contract balance - staked tokens
            if contract_balance > staked_total {
                contract_balance - staked_total
            } else {
                0
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _calculate_pending_rewards(self: @ContractState, staker: ContractAddress) -> u256 {
            let staked = self.staked_amounts.entry(staker).read();
            if staked == 0 {
                return 0;
            }

            let stake_time = self.stake_timestamp.entry(staker).read();
            if stake_time == 0 {
                return 0;
            }

            let current_time = get_block_timestamp();
            let time_staked = current_time - stake_time;
            
            // Calculate rewards: (time_staked / 5) * 0.0001 STRK per staked token
            let intervals = time_staked / REWARD_INTERVAL;
            let rewards = (staked * REWARD_PER_5_SECONDS * intervals.into()) / 1_000_000_000_000_000_000; // Normalize
            
            rewards
        }
    }
}

