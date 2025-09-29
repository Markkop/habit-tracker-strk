import { useAccount } from "@starknet-react/core";
import { useScaffoldReadContract, useScaffoldWriteContract, useDeployedContractInfo } from "~~/hooks/scaffold-stark";
import { useTransactor } from "~~/hooks/scaffold-stark/useTransactor";

export interface Habit {
  id: number;
  owner: string;
  text: string;
  created_at_epoch: number;
  archived: boolean;
}

export interface DailyStatus {
  funded: boolean;
  checked: boolean;
  settled: boolean;
}

export interface UserState {
  deposit_balance: bigint;
  blocked_balance: bigint;
  claimable_balance: bigint;
  active_habit_count: number;
}

export const useHabitTracker = () => {
  const { address: connectedAddress } = useAccount();
  const writeTx = useTransactor();

  // Get HabitTracker contract address dynamically
  const { data: habitTrackerContract } = useDeployedContractInfo("HabitTracker");
  const habitTrackerAddress = habitTrackerContract?.address;

  // Read functions
  const { data: userState, refetch: refetchUserState } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "get_user_state",
    args: connectedAddress ? [connectedAddress] : undefined,
    watch: true,
  });

  const { data: habits, refetch: refetchHabits } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "get_habits",
    args: connectedAddress ? [connectedAddress] : undefined,
    watch: true,
  });

  const { data: epochNow } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "epoch_now",
  });

  const { data: stakePerDay } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "stake_per_day",
  });

  // STRK token contract interactions
  const { data: strkAllowance, refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: "STRK",
    functionName: "allowance",
    args: connectedAddress && habitTrackerAddress ? [connectedAddress, habitTrackerAddress] : undefined,
    watch: true,
  });

  const { data: strkBalance } = useScaffoldReadContract({
    contractName: "STRK",
    functionName: "balance_of",
    args: connectedAddress ? [connectedAddress] : undefined,
    watch: true,
  });

  // Write functions
  const { sendAsync: depositAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "deposit",
  });

  const { sendAsync: withdrawAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "withdraw_from_deposit",
  });

  const { sendAsync: createHabitAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "create_habit",
  });

  const { sendAsync: archiveHabitAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "archive_habit",
  });

  const { sendAsync: checkInAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "check_in",
  });

  const { sendAsync: prepareDayAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "prepare_day",
  });

  const { sendAsync: settleAllAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "settle_all",
  });

  const { sendAsync: forceSettleAllAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "force_settle_all",
  });

  const { sendAsync: claimAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "claim",
  });

  const { sendAsync: redepositAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "redeposit_from_claimable",
  });

  // STRK approve function
  const { sendAsync: approveAsync } = useScaffoldWriteContract({
    contractName: "STRK",
    functionName: "approve",
  });

  // Helper functions
  const approveSTRK = async (amount: bigint) => {
    if (!amount || amount <= 0 || !habitTrackerAddress) return;
    try {
      await approveAsync({ args: [habitTrackerAddress, amount] });
      refetchAllowance();
    } catch (error) {
      console.error("STRK approval failed:", error);
      throw error;
    }
  };

  const deposit = async (amount: bigint) => {
    if (!amount || amount <= 0) return;
    try {
      await depositAsync({ args: [amount] });
      refetchUserState();
    } catch (error) {
      console.error("Deposit failed:", error);
      throw error;
    }
  };

  const withdraw = async (amount: bigint) => {
    if (!amount || amount <= 0) return;
    try {
      await withdrawAsync({ args: [amount] });
      refetchUserState();
    } catch (error) {
      console.error("Withdraw failed:", error);
      throw error;
    }
  };

  const createHabit = async (text: string) => {
    if (!text.trim()) return;
    try {
      await createHabitAsync({ args: [text] });
      refetchHabits();
      refetchUserState();
    } catch (error) {
      console.error("Create habit failed:", error);
      throw error;
    }
  };

  const archiveHabit = async (habitId: number) => {
    try {
      await archiveHabitAsync({ args: [habitId] });
      refetchHabits();
      refetchUserState();
    } catch (error) {
      console.error("Archive habit failed:", error);
      throw error;
    }
  };

  const checkIn = async (habitId: number) => {
    if (!epochNow) return;
    try {
      await checkInAsync({ args: [habitId, epochNow] });
      refetchHabits();
    } catch (error) {
      console.error("Check-in failed:", error);
      throw error;
    }
  };

  const prepareDay = async () => {
    if (!epochNow) return;
    try {
      await prepareDayAsync({ args: [epochNow] });
      refetchUserState();
    } catch (error) {
      console.error("Prepare day failed:", error);
      throw error;
    }
  };

  const settleDay = async () => {
    if (!connectedAddress || !epochNow) return;
    try {
      // Settle all habits for yesterday
      const yesterdayEpoch = BigInt(epochNow) - 1n;
      await settleAllAsync({
        args: [connectedAddress, yesterdayEpoch, 50] // max 50 habits
      });
      refetchUserState();
    } catch (error) {
      console.error("Settle day failed:", error);
      throw error;
    }
  };

  const forceSettleAll = async () => {
    if (!connectedAddress || !epochNow) return;
    try {
      // Force settle all habits for current day (for testing)
      await forceSettleAllAsync({
        args: [connectedAddress, epochNow, 50] // max 50 habits, current epoch
      });
      refetchUserState();
    } catch (error) {
      console.error("Force settle failed:", error);
      throw error;
    }
  };

  const claim = async (amount: bigint) => {
    if (!amount || amount <= 0) return;
    try {
      await claimAsync({ args: [amount] });
      refetchUserState();
    } catch (error) {
      console.error("Claim failed:", error);
      throw error;
    }
  };

  const redeposit = async (amount: bigint) => {
    if (!amount || amount <= 0) return;
    try {
      await redepositAsync({ args: [amount] });
      refetchUserState();
    } catch (error) {
      console.error("Redeposit failed:", error);
      throw error;
    }
  };

  // Get daily status for a specific habit - removed to fix hooks order violation
  // This functionality should be implemented at the component level
  const getDailyStatus = (habitId: number) => {
    // Return undefined for now - components should use useScaffoldReadContract directly
    return undefined;
  };

  return {
    // State
    userState: userState as UserState | undefined,
    habits: habits as Habit[] | undefined,
    epochNow: epochNow as number | undefined,
    stakePerDay: stakePerDay as bigint | undefined,
    strkBalance: strkBalance as bigint | undefined,
    strkAllowance: strkAllowance as bigint | undefined,

    // Actions
    approveSTRK,
    deposit,
    withdraw,
    createHabit,
    archiveHabit,
    checkIn,
    prepareDay,
    settleDay,
    forceSettleAll,
    claim,
    redeposit,

    // Helpers
    getDailyStatus,
    refetchUserState,
    refetchHabits,
  };
};
