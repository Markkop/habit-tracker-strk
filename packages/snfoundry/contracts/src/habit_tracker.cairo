use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
pub struct Habit {
    pub id: u32,
    pub owner: ContractAddress,
    pub text: felt252,
    pub created_at_epoch: u64,
    pub archived: bool,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct DailyStatus {
    pub funded: bool,
    pub checked: bool,
    pub settled: bool,
}

#[derive(Drop, Serde)]
pub struct UserState {
    pub deposit_balance: u256,
    pub blocked_balance: u256,
    pub claimable_balance: u256,
    pub active_habit_count: u32,
}

#[derive(Drop, Serde)]
pub struct VaultState {
    pub total_assets: u256,
    pub total_supply: u256,
    pub total_staked: u256,
    pub accumulated_rewards: u256,
    pub exchange_rate: u256, // scaled by 1e18
}

#[derive(Drop, Serde)]
pub struct PrepareResult {
    pub funded_count: u32,
    pub insufficient_count: u32,
}

// Interface for Starknet's native staking protocol
#[starknet::interface]
pub trait IStakingContract<TContractState> {
    fn stake(ref self: TContractState, amount: u256, staker_address: ContractAddress);
    fn unstake(ref self: TContractState, amount: u256);
    fn claim_rewards(ref self: TContractState) -> u256;
    fn get_staked_amount(self: @TContractState, address: ContractAddress) -> u256;
    fn get_pending_rewards(self: @TContractState, address: ContractAddress) -> u256;
}

#[starknet::interface]
pub trait IHabitTracker<TContractState> {
    // Mutable functions
    fn deposit(ref self: TContractState, amount: u256);
    fn withdraw_from_deposit(ref self: TContractState, amount: u256);
    fn create_habit(ref self: TContractState, text: felt252) -> u32;
    fn archive_habit(ref self: TContractState, habit_id: u32);
    fn check_in(ref self: TContractState, habit_id: u32, epoch_id: u64);
    fn prepare_day(ref self: TContractState, epoch_id: u64);
    fn settle(ref self: TContractState, user: ContractAddress, epoch_id: u64, habit_id: u32);
    fn settle_all(ref self: TContractState, user: ContractAddress, epoch_id: u64, max_count: u32);
    fn force_settle_all(
        ref self: TContractState, user: ContractAddress, epoch_id: u64, max_count: u32,
    );
    fn claim(ref self: TContractState, amount: u256);
    fn redeposit_from_claimable(ref self: TContractState, amount: u256);
    
    // Staking rewards sync (only for claiming rewards from protocol)
    fn sync_staking_rewards(ref self: TContractState);

    // View functions
    fn get_user_state(self: @TContractState, user: ContractAddress) -> UserState;
    fn get_habits(self: @TContractState, user: ContractAddress) -> Array<Habit>;
    fn get_daily_status(
        self: @TContractState, user: ContractAddress, epoch_id: u64, habit_id: u32,
    ) -> DailyStatus;
    fn epoch_now(self: @TContractState) -> u64;
    fn treasury_address(self: @TContractState) -> ContractAddress;
    fn stake_per_day(self: @TContractState) -> u256;
    fn get_vault_state(self: @TContractState) -> VaultState;
    fn accumulated_rewards(self: @TContractState) -> u256;
    fn total_staked(self: @TContractState) -> u256;
    fn staking_contract(self: @TContractState) -> ContractAddress;
}

#[starknet::contract]
pub mod HabitTracker {
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess,
        StoragePointerReadAccess, StoragePointerWriteAccess
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address, get_contract_address};
    use super::{DailyStatus, Habit, IHabitTracker, UserState, VaultState, IStakingContractDispatcher, IStakingContractDispatcherTrait};

    // Constants
    pub const STAKE_PER_DAY: u256 = 10_000_000_000_000_000_000; // 10 STRK with 18 decimals
    pub const SECONDS_PER_DAY: u64 = 86400;

    // STRK token contract address on Starknet
    pub const STRK_CONTRACT: felt252 =
        0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d;

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Deposited: Deposited,
        Withdrew: Withdrew,
        HabitCreated: HabitCreated,
        HabitArchived: HabitArchived,
        Checked: Checked,
        Prepared: Prepared,
        SettledSuccess: SettledSuccess,
        SettledFail: SettledFail,
        Claimed: Claimed,
        ReDeposited: ReDeposited,
        StakedToProtocol: StakedToProtocol,
        UnstakedFromProtocol: UnstakedFromProtocol,
        RewardsAccrued: RewardsAccrued,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Deposited {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Withdrew {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct HabitCreated {
        #[key]
        pub user: ContractAddress,
        pub habit_id: u32,
        pub text: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct HabitArchived {
        #[key]
        pub user: ContractAddress,
        pub habit_id: u32,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Checked {
        #[key]
        pub user: ContractAddress,
        pub habit_id: u32,
        pub epoch_id: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Prepared {
        #[key]
        pub user: ContractAddress,
        pub epoch_id: u64,
        pub funded_count: u32,
        pub insufficient_count: u32,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SettledSuccess {
        #[key]
        pub user: ContractAddress,
        pub habit_id: u32,
        pub epoch_id: u64,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SettledFail {
        #[key]
        pub user: ContractAddress,
        pub habit_id: u32,
        pub epoch_id: u64,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Claimed {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ReDeposited {
        #[key]
        pub user: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct StakedToProtocol {
        pub amount: u256,
        pub epoch: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct UnstakedFromProtocol {
        pub amount: u256,
        pub epoch: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RewardsAccrued {
        pub amount: u256,
        pub new_total_assets: u256,
        pub epoch: u64,
    }

    #[storage]
    struct Storage {
        treasury_address: Map<(), ContractAddress>,
        user_deposit_balance: Map<ContractAddress, u256>,
        user_blocked_balance: Map<ContractAddress, u256>,
        user_claimable_balance: Map<ContractAddress, u256>,
        habits: Map<(ContractAddress, u32), Habit>,
        user_habit_counter: Map<ContractAddress, u32>,
        user_active_habit_count: Map<ContractAddress, u32>,
        daily_status: Map<(ContractAddress, u64, u32), DailyStatus>,
        day_prepared: Map<(ContractAddress, u64), bool>,
        // Staking integration storage
        total_staked: u256,
        accumulated_rewards: u256,
        last_reward_sync: u64,
        staking_contract: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, treasury_addr: ContractAddress, staking_contract_addr: ContractAddress) {
        assert(treasury_addr != 0.try_into().unwrap(), 'Treasury address cannot be zero');
        self.treasury_address.write((), treasury_addr);
        
        // Initialize staking storage
        self.staking_contract.write(staking_contract_addr);
        self.total_staked.write(0);
        self.accumulated_rewards.write(0);
        self.last_reward_sync.write(0);
    }

    #[abi(embed_v0)]
    impl HabitTrackerImpl of IHabitTracker<ContractState> {
        fn deposit(ref self: ContractState, amount: u256) {
            assert(amount > 0, 'Amount must be greater than 0');

            let caller = get_caller_address();
            let strk_dispatcher = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap(),
            };

            let success = strk_dispatcher.transfer_from(caller, get_contract_address(), amount);
            assert(success, 'STRK transfer failed');

            let current_balance = self.user_deposit_balance.read(caller);
            self.user_deposit_balance.write(caller, current_balance + amount);

            self.emit(Deposited { user: caller, amount });
        }

        fn withdraw_from_deposit(ref self: ContractState, amount: u256) {
            assert(amount > 0, 'Amount must be greater than 0');

            let caller = get_caller_address();
            let deposit_balance = self.user_deposit_balance.read(caller);
            let blocked_balance = self.user_blocked_balance.read(caller);

            // Can only withdraw from deposit balance that's not at stake
            let available_to_withdraw = deposit_balance - blocked_balance;
            assert(available_to_withdraw >= amount, 'Insufficient deposit balance');

            self.user_deposit_balance.write(caller, deposit_balance - amount);

            let strk_dispatcher = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap(),
            };
            let success = strk_dispatcher.transfer(caller, amount);
            assert(success, 'STRK transfer failed');

            self.emit(Withdrew { user: caller, amount });
        }

        fn create_habit(ref self: ContractState, text: felt252) -> u32 {
            assert(text != 0, 'Habit text cannot be empty');

            let caller = get_caller_address();
            let current_epoch = self.epoch_now();

            let habit_id = self.user_habit_counter.read(caller);
            let next_id = habit_id + 1;
            self.user_habit_counter.write(caller, next_id);

            let habit = Habit {
                id: next_id, owner: caller, text, created_at_epoch: current_epoch, archived: false,
            };

            self.habits.write((caller, next_id), habit);

            let active_count = self.user_active_habit_count.read(caller);
            self.user_active_habit_count.write(caller, active_count + 1);

            self.emit(HabitCreated { user: caller, habit_id: next_id, text });

            next_id
        }

        fn archive_habit(ref self: ContractState, habit_id: u32) {
            let caller = get_caller_address();

            let habit = self.habits.read((caller, habit_id));
            assert(habit.id == habit_id, 'Habit not found');
            assert(habit.owner == caller, 'Not habit owner');
            assert(!habit.archived, 'Habit already archived');

            let new_habit = Habit {
                id: habit.id,
                owner: habit.owner,
                text: habit.text,
                created_at_epoch: habit.created_at_epoch,
                archived: true,
            };
            self.habits.write((caller, habit_id), new_habit);

            let active_count = self.user_active_habit_count.read(caller);
            if active_count > 0 {
                self.user_active_habit_count.write(caller, active_count - 1);
            }

            self.emit(HabitArchived { user: caller, habit_id });
        }

        fn check_in(ref self: ContractState, habit_id: u32, epoch_id: u64) {
            let caller = get_caller_address();
            let current_epoch = self.epoch_now();

            assert(epoch_id == current_epoch, 'Wrong day');

            let habit = self.habits.read((caller, habit_id));
            assert(habit.id == habit_id, 'Habit not found');
            assert(habit.owner == caller, 'Not habit owner');
            assert(!habit.archived, 'Habit is archived');

            let mut status = self.daily_status.read((caller, epoch_id, habit_id));
            assert(status.funded, 'Habit not funded for this day');

            if !status.checked {
                let mut new_status = DailyStatus {
                    funded: status.funded, checked: true, settled: status.settled,
                };
                self.daily_status.write((caller, epoch_id, habit_id), new_status);
                self.emit(Checked { user: caller, habit_id, epoch_id });
            }
        }

        fn prepare_day(ref self: ContractState, epoch_id: u64) {
            let caller = get_caller_address();
            let current_epoch = self.epoch_now();

            assert(epoch_id == current_epoch, 'Can only prepare current day');

            // Allow re-preparation for debugging - remove this check temporarily
            // let already_prepared = self.day_prepared.read((caller, epoch_id));
            // if already_prepared {
            //     return;
            // }

            let mut deposit_balance = self.user_deposit_balance.read(caller);
            let mut blocked_balance = self.user_blocked_balance.read(caller);

            let mut funded_count = 0;
            let mut insufficient_count = 0;

            let mut habit_id = 1;
            let max_habit_id = self.user_habit_counter.read(caller);

            while habit_id <= max_habit_id {
                let habit = self.habits.read((caller, habit_id));

                // Check if this is a valid, non-archived habit
                if habit.id == habit_id && !habit.archived {
                    let status = self.daily_status.read((caller, epoch_id, habit_id));

                    // Only fund if not already funded for this day
                    if !status.funded {
                        let available_balance = deposit_balance - blocked_balance;

                        if available_balance >= STAKE_PER_DAY {
                            // Fund this habit by putting tokens at stake (risk)
                            blocked_balance += STAKE_PER_DAY;

                            let new_status = DailyStatus {
                                funded: true, checked: status.checked, settled: status.settled,
                            };
                            self.daily_status.write((caller, epoch_id, habit_id), new_status);

                            funded_count += 1;
                        } else {
                            insufficient_count += 1;
                        }
                    }
                }
                habit_id += 1;
            }

            self.user_blocked_balance.write(caller, blocked_balance);
            self.day_prepared.write((caller, epoch_id), true);

            self.emit(Prepared { user: caller, epoch_id, funded_count, insufficient_count });
        }

        fn settle(ref self: ContractState, user: ContractAddress, epoch_id: u64, habit_id: u32) {
            let current_epoch = self.epoch_now();
            assert(epoch_id < current_epoch, 'Can only settle past days');

            let habit = self.habits.read((user, habit_id));
            assert(habit.id == habit_id, 'Habit not found');
            assert(habit.owner == user, 'Invalid habit owner');

            let mut status = self.daily_status.read((user, epoch_id, habit_id));

            if status.funded && !status.settled {
                let new_status = DailyStatus {
                    funded: status.funded, checked: status.checked, settled: true,
                };
                self.daily_status.write((user, epoch_id, habit_id), new_status);

                // Release tokens from "at stake" status
                let mut blocked_balance = self.user_blocked_balance.read(user);
                blocked_balance -= STAKE_PER_DAY;
                self.user_blocked_balance.write(user, blocked_balance);

                // Remove from deposit pool (either going to rewards or slashed)
                let mut deposit_balance = self.user_deposit_balance.read(user);
                deposit_balance -= STAKE_PER_DAY;
                self.user_deposit_balance.write(user, deposit_balance);

                if status.checked {
                    // Success: Earn tokens back as rewards (claimable + auto-stake for yield)
                    let mut claimable_balance = self.user_claimable_balance.read(user);
                    claimable_balance += STAKE_PER_DAY;
                    self.user_claimable_balance.write(user, claimable_balance);

                    // Automatically stake the earned tokens to generate yield
                    self._auto_stake_rewards(STAKE_PER_DAY);

                    self.emit(SettledSuccess { user, habit_id, epoch_id, amount: STAKE_PER_DAY });
                } else {
                    // Failure: Tokens are slashed and sent to treasury
                    let strk_dispatcher = IERC20Dispatcher {
                        contract_address: STRK_CONTRACT.try_into().unwrap(),
                    };
                    let success = strk_dispatcher
                        .transfer(self.treasury_address.read(()), STAKE_PER_DAY);
                    assert(success, 'Treasury transfer failed');

                    self.emit(SettledFail { user, habit_id, epoch_id, amount: STAKE_PER_DAY });
                }
            }
        }

        fn settle_all(
            ref self: ContractState, user: ContractAddress, epoch_id: u64, max_count: u32,
        ) {
            let current_epoch = self.epoch_now();
            assert(epoch_id < current_epoch, 'Can only settle past days');
            assert(max_count > 0 && max_count <= 50, 'Invalid max_count');

            let mut processed = 0;
            let mut habit_id = 1;

            while processed < max_count && habit_id <= self.user_habit_counter.read(user) {
                let habit = self.habits.read((user, habit_id));
                if habit.id == habit_id && !habit.archived {
                    let status = self.daily_status.read((user, epoch_id, habit_id));
                    if status.funded && !status.settled {
                        self.settle(user, epoch_id, habit_id);
                        processed += 1;
                    }
                }
                habit_id += 1;
            };
        }

        fn force_settle_all(
            ref self: ContractState, user: ContractAddress, epoch_id: u64, max_count: u32,
        ) {
            // WARNING: This function bypasses the time check for testing purposes
            // It allows settling habits for the current day without waiting for midnight UTC
            // After settling, it automatically resets all daily statuses to allow repeated testing
            assert(max_count > 0 && max_count <= 50, 'Invalid max_count');

            let mut processed = 0;
            let mut habit_id = 1;
            let mut total_successful_rewards: u256 = 0;

            while processed < max_count && habit_id <= self.user_habit_counter.read(user) {
                let habit = self.habits.read((user, habit_id));
                if habit.id == habit_id && !habit.archived {
                    let mut status = self.daily_status.read((user, epoch_id, habit_id));

                    if status.funded && !status.settled {
                        // Mark as settled
                        let new_status = DailyStatus {
                            funded: status.funded, checked: status.checked, settled: true,
                        };
                        self.daily_status.write((user, epoch_id, habit_id), new_status);

                        // Release tokens from "at stake" status
                        let mut blocked_balance = self.user_blocked_balance.read(user);
                        blocked_balance -= STAKE_PER_DAY;
                        self.user_blocked_balance.write(user, blocked_balance);

                        // Remove from deposit pool (either going to rewards or slashed)
                        let mut deposit_balance = self.user_deposit_balance.read(user);
                        deposit_balance -= STAKE_PER_DAY;
                        self.user_deposit_balance.write(user, deposit_balance);

                        // Process outcome
                        if status.checked {
                            // Success: Earn tokens back as rewards (claimable + auto-stake for yield)
                            let mut claimable_balance = self.user_claimable_balance.read(user);
                            claimable_balance += STAKE_PER_DAY;
                            self.user_claimable_balance.write(user, claimable_balance);

                            // Track successful rewards for batch staking (to generate yield)
                            total_successful_rewards += STAKE_PER_DAY;

                            self
                                .emit(
                                    SettledSuccess {
                                        user, habit_id, epoch_id, amount: STAKE_PER_DAY,
                                    },
                                );
                        } else {
                            // Failure: Tokens are slashed and sent to treasury
                            let strk_dispatcher = IERC20Dispatcher {
                                contract_address: STRK_CONTRACT.try_into().unwrap(),
                            };
                            let success = strk_dispatcher
                                .transfer(self.treasury_address.read(()), STAKE_PER_DAY);
                            assert(success, 'Treasury transfer failed');

                            self
                                .emit(
                                    SettledFail { user, habit_id, epoch_id, amount: STAKE_PER_DAY },
                                );
                        }
                        processed += 1;
                    }
                }
                habit_id += 1;
            }

            // Automatically stake all earned rewards from this batch to generate yield
            if total_successful_rewards > 0 {
                self._auto_stake_rewards(total_successful_rewards);
            }

            // Auto-reset: Clear all daily statuses for this epoch to allow repeated testing
            habit_id = 1;
            while habit_id <= self.user_habit_counter.read(user) {
                let empty_status = DailyStatus { funded: false, checked: false, settled: false };
                self.daily_status.write((user, epoch_id, habit_id), empty_status);
                habit_id += 1;
            }

            // Clear the day_prepared flag for this epoch
            self.day_prepared.write((user, epoch_id), false);
        }

        fn claim(ref self: ContractState, amount: u256) {
            assert(amount > 0, 'Amount must be greater than 0');

            let caller = get_caller_address();
            let claimable_balance = self.user_claimable_balance.read(caller);
            assert(claimable_balance >= amount, 'Insufficient claimable balance');

            self.user_claimable_balance.write(caller, claimable_balance - amount);

            let strk_dispatcher = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap(),
            };
            let success = strk_dispatcher.transfer(caller, amount);
            assert(success, 'STRK transfer failed');

            self.emit(Claimed { user: caller, amount });
        }

        fn redeposit_from_claimable(ref self: ContractState, amount: u256) {
            assert(amount > 0, 'Amount must be greater than 0');

            let caller = get_caller_address();
            let claimable_balance = self.user_claimable_balance.read(caller);
            assert(claimable_balance >= amount, 'Insufficient claimable balance');

            self.user_claimable_balance.write(caller, claimable_balance - amount);
            let deposit_balance = self.user_deposit_balance.read(caller);
            self.user_deposit_balance.write(caller, deposit_balance + amount);

            self.emit(ReDeposited { user: caller, amount });
        }

        fn sync_staking_rewards(ref self: ContractState) {
            let staking_address = self.staking_contract.read();
            
            // Skip if staking contract not set (for testing without staking)
            // Check for both zero address and dummy address (0x1)
            let zero_addr: ContractAddress = 0.try_into().unwrap();
            let dummy_addr: ContractAddress = 1.try_into().unwrap();
            
            if staking_address == zero_addr || staking_address == dummy_addr {
                // Just update last sync timestamp, no actual rewards
                self.last_reward_sync.write(get_block_timestamp() / SECONDS_PER_DAY);
                return;
            }

            let staking_dispatcher = IStakingContractDispatcher {
                contract_address: staking_address
            };
            
            let rewards = staking_dispatcher.claim_rewards();
            
            if rewards > 0 {
                let accumulated = self.accumulated_rewards.read();
                self.accumulated_rewards.write(accumulated + rewards);
                
                let current_epoch = get_block_timestamp() / SECONDS_PER_DAY;
                
                self.emit(RewardsAccrued {
                    amount: rewards,
                    new_total_assets: self.get_total_assets(),
                    epoch: current_epoch
                });
            }
            
            self.last_reward_sync.write(get_block_timestamp() / SECONDS_PER_DAY);
        }

        fn get_user_state(self: @ContractState, user: ContractAddress) -> UserState {
            UserState {
                deposit_balance: self.user_deposit_balance.read(user),
                blocked_balance: self.user_blocked_balance.read(user),
                claimable_balance: self.user_claimable_balance.read(user),
                active_habit_count: self.user_active_habit_count.read(user),
            }
        }

        fn get_habits(self: @ContractState, user: ContractAddress) -> Array<Habit> {
            let mut habits = ArrayTrait::new();
            let habit_count = self.user_habit_counter.read(user);
            let mut habit_id = 1;

            while habit_id <= habit_count {
                let habit = self.habits.read((user, habit_id));
                if habit.id == habit_id {
                    habits.append(habit);
                }
                habit_id += 1;
            }

            habits
        }

        fn get_daily_status(
            self: @ContractState, user: ContractAddress, epoch_id: u64, habit_id: u32,
        ) -> DailyStatus {
            self.daily_status.read((user, epoch_id, habit_id))
        }

        fn epoch_now(self: @ContractState) -> u64 {
            get_block_timestamp() / SECONDS_PER_DAY
        }

        fn treasury_address(self: @ContractState) -> ContractAddress {
            self.treasury_address.read(())
        }

        fn stake_per_day(self: @ContractState) -> u256 {
            STAKE_PER_DAY
        }

        fn get_vault_state(self: @ContractState) -> VaultState {
            let total_assets = self.get_total_assets();
            let total_supply = self.get_total_supply();
            let exchange_rate = if total_supply > 0 {
                // Scale by 1e18 for precision
                (total_assets * 1_000_000_000_000_000_000) / total_supply
            } else {
                1_000_000_000_000_000_000 // 1:1 ratio when no supply
            };

            VaultState {
                total_assets,
                total_supply,
                total_staked: self.total_staked.read(),
                accumulated_rewards: self.accumulated_rewards.read(),
                exchange_rate,
            }
        }

        fn accumulated_rewards(self: @ContractState) -> u256 {
            self.accumulated_rewards.read()
        }

        fn total_staked(self: @ContractState) -> u256 {
            self.total_staked.read()
        }

        fn staking_contract(self: @ContractState) -> ContractAddress {
            self.staking_contract.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn get_total_assets(self: @ContractState) -> u256 {
            // Total assets = liquid STRK + staked STRK + accumulated rewards
            let strk = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap()
            };
            let liquid_balance = strk.balance_of(get_contract_address());
            let staked = self.total_staked.read();
            let rewards = self.accumulated_rewards.read();
            
            liquid_balance + staked + rewards
        }

        fn get_total_supply(self: @ContractState) -> u256 {
            // For now, total supply equals sum of all user deposit balances
            // In full ERC4626 implementation, this would come from ERC20Component
            // This is a simplified version for phase 1
            0 // Placeholder - would need to track or calculate from all users
        }

        fn _auto_stake_rewards(ref self: ContractState, amount: u256) {
            // Internal function to automatically stake earned rewards for yield generation
            // This is the ONLY way tokens get staked (on yield) - users cannot manually stake
            // Terminology: "stake" here means putting tokens on a yield-generating protocol
            
            let staking_address = self.staking_contract.read();
            
            // Skip if staking contract not set (for testing without staking)
            let zero_addr: ContractAddress = 0.try_into().unwrap();
            let dummy_addr: ContractAddress = 1.try_into().unwrap();
            
            if staking_address == zero_addr || staking_address == dummy_addr {
                // Simulate successful stake by updating total_staked
                let total_staked = self.total_staked.read();
                self.total_staked.write(total_staked + amount);
                
                self.emit(StakedToProtocol { 
                    amount, 
                    epoch: get_block_timestamp() / SECONDS_PER_DAY 
                });
                return;
            }

            let staking_dispatcher = IStakingContractDispatcher {
                contract_address: staking_address
            };
            
            // Approve and stake
            let strk = IERC20Dispatcher {
                contract_address: STRK_CONTRACT.try_into().unwrap()
            };
            strk.approve(staking_address, amount);
            
            staking_dispatcher.stake(amount, get_contract_address());
            
            let total_staked = self.total_staked.read();
            self.total_staked.write(total_staked + amount);
            
            self.emit(StakedToProtocol { 
                amount, 
                epoch: get_block_timestamp() / SECONDS_PER_DAY 
            });
        }
    }
}

