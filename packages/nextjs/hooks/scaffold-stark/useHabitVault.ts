import { useAccount } from "@starknet-react/core";
import { useScaffoldReadContract } from "./useScaffoldReadContract";
import type { Address } from "@starknet-react/chains";

export interface VaultState {
  habitBalance: bigint;
  strkValue: bigint;
  totalAssets: bigint;
  totalSupply: bigint;
  totalStaked: bigint;
  stakingRewards: bigint;
  exchangeRate: number;
}

/**
 * Custom hook to interact with the Habit Tracker Vault
 * Provides read-only access to vault state and staking information
 */
export const useHabitVault = (userAddress?: Address) => {
  const { address } = useAccount();
  const targetAddress = userAddress || address;

  // Read user's deposit balance (acts as HABIT balance in this simplified version)
  // Only fetch if we have a target address
  const { data: depositBalanceData, isLoading: isLoadingDeposit } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "get_user_state",
    args: targetAddress ? [targetAddress] : [undefined as unknown as `0x${string}`],
    watch: true,
  });

  // Read vault state
  const { data: vaultStateData, isLoading: isLoadingVault } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "get_vault_state",
    watch: true,
  });

  // Read accumulated rewards
  const { data: stakingRewardsData, isLoading: isLoadingRewards } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "accumulated_rewards",
    watch: true,
  });

  // Read total staked
  const { data: totalStakedData, isLoading: isLoadingStaked } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "total_staked",
    watch: true,
  });

  // Unwrap contract return values (they come as arrays)
  const depositBalance = depositBalanceData as any;
  const vaultState = vaultStateData as any;
  const stakingRewardsValue = (stakingRewardsData as any) || 0n;
  const totalStakedValue = (totalStakedData as any) || 0n;

  // Extract values from vault state
  const totalAssets = vaultState?.total_assets || 0n;
  const totalSupply = vaultState?.total_supply || 0n;
  const exchangeRateRaw = vaultState?.exchange_rate || 1_000_000_000_000_000_000n;

  // Convert exchange rate from u256 (scaled by 1e18) to number
  const exchangeRate = Number(exchangeRateRaw) / 1e18;

  // User's HABIT balance is their deposit balance
  const habitBalance = depositBalance?.deposit_balance || 0n;

  // User's STRK value is deposit_balance (simplified - in full ERC4626 would use convertToAssets)
  const strkValue = habitBalance;

  return {
    habitBalance,
    strkValue,
    totalAssets,
    totalSupply,
    totalStaked: totalStakedValue,
    stakingRewards: stakingRewardsValue,
    exchangeRate,
    isLoading: isLoadingVault || isLoadingRewards || isLoadingStaked,
  };
};

