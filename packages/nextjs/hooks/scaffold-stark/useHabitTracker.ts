import { useAccount } from "@starknet-react/core";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useDeployedContractInfo,
} from "~~/hooks/scaffold-stark";
import { useTransactor } from "~~/hooks/scaffold-stark/useTransactor";

// Helper function to convert felt252 to string
const felt252ToString = (felt: bigint | number | string): string => {
  try {
    // If it's already a reasonable string, return it
    if (typeof felt === "string" && felt.length < 32 && !felt.startsWith("0x")) {
      return felt;
    }
    
    const feltBigInt = typeof felt === "bigint" ? felt : BigInt(felt);
    const hex = feltBigInt.toString(16);
    
    // Ensure even length
    const paddedHex = hex.length % 2 === 0 ? hex : "0" + hex;
    
    let str = "";
    for (let i = 0; i < paddedHex.length; i += 2) {
      const byte = parseInt(paddedHex.substring(i, i + 2), 16);
      // Only include printable ASCII characters (32-126) and common whitespace
      if (byte >= 32 && byte <= 126) {
        str += String.fromCharCode(byte);
      }
    }
    return str || felt.toString();
  } catch {
    return String(felt);
  }
};

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
  const { data: habitTrackerContract } =
    useDeployedContractInfo("HabitTracker");
  const habitTrackerAddress = habitTrackerContract?.address;

  // Read functions
  const { data: userState, refetch: refetchUserState } =
    useScaffoldReadContract({
      contractName: "HabitTracker",
      functionName: "get_user_state",
      args: [connectedAddress] as const,
      watch: true,
    });

  const { data: habits, refetch: refetchHabits } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "get_habits",
    args: [connectedAddress] as const,
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

  const { data: treasuryAddressRaw } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "treasury_address",
  });

  // Convert treasury address to string
  const treasuryAddress =
    treasuryAddressRaw && typeof treasuryAddressRaw === "object" && "toString" in treasuryAddressRaw
      ? (treasuryAddressRaw as any).toString()
      : treasuryAddressRaw
        ? String(treasuryAddressRaw)
        : undefined;

  // STRK token contract interactions
  const { data: strkAllowance, refetch: refetchAllowance } =
    useScaffoldReadContract({
      contractName: "Strk",
      functionName: "allowance",
      args: [connectedAddress, habitTrackerAddress] as const,
      watch: true,
    });

  const { data: strkBalance } = useScaffoldReadContract({
    contractName: "Strk",
    functionName: "balance_of",
    args: [connectedAddress] as const,
    watch: true,
  });

  const { data: treasuryBalance } = useScaffoldReadContract({
    contractName: "Strk",
    functionName: "balance_of",
    args: [treasuryAddress] as const,
    watch: true,
  });

  // Write functions
  const { sendAsync: depositAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "deposit",
    args: [undefined],
  });

  const { sendAsync: withdrawAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "withdraw_from_deposit",
    args: [undefined],
  });

  const { sendAsync: createHabitAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "create_habit",
    args: [undefined],
  });

  const { sendAsync: archiveHabitAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "archive_habit",
    args: [undefined],
  });

  const { sendAsync: checkInAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "check_in",
    args: [undefined, undefined],
  });

  const { sendAsync: prepareDayAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "prepare_day",
    args: [undefined],
  });

  const { sendAsync: settleAllAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "settle_all",
    args: [undefined, undefined, undefined],
  });

  const { sendAsync: forceSettleAllAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "force_settle_all",
    args: [undefined, undefined, undefined],
  });

  const { sendAsync: claimAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "claim",
    args: [undefined],
  });

  const { sendAsync: redepositAsync } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "redeposit_from_claimable",
    args: [undefined],
  });

  // STRK approve function
  const { sendAsync: approveAsync } = useScaffoldWriteContract({
    contractName: "Strk",
    functionName: "approve",
    args: [undefined, undefined],
  });

  // Helper functions
  const approveSTRK = async (amount: bigint) => {
    if (!amount || amount <= 0 || !habitTrackerAddress) return;
    try {
      const args: [typeof habitTrackerAddress, bigint] = [
        habitTrackerAddress,
        amount,
      ];
      await approveAsync({ args });
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

  const archiveHabit = async (habitId: number | bigint) => {
    try {
      await archiveHabitAsync({ args: [habitId] });
      refetchHabits();
      refetchUserState();
    } catch (error) {
      console.error("Archive habit failed:", error);
      throw error;
    }
  };

  const checkIn = async (habitId: number | bigint) => {
    if (!epochNow) return;
    try {
      await checkInAsync({ args: [habitId, Number(epochNow)] });
      refetchHabits();
    } catch (error) {
      console.error("Check-in failed:", error);
      throw error;
    }
  };

  const prepareDay = async () => {
    if (!epochNow) return;
    try {
      await prepareDayAsync({ args: [Number(epochNow)] });
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
      const yesterdayEpoch = Number(epochNow) - 1;
      await settleAllAsync({
        args: [connectedAddress, yesterdayEpoch, 50], // max 50 habits
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
        args: [connectedAddress, Number(epochNow), 50], // max 50 habits, current epoch
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
  const getDailyStatus = (habitId: number | bigint) => {
    // Return undefined for now - components should use useScaffoldReadContract directly
    return undefined;
  };

  // Transform habits to convert felt252 text to readable string
  const transformedHabits = habits
    ? (habits as unknown as any[]).map((habit) => ({
        ...habit,
        text: felt252ToString(habit.text),
      }))
    : undefined;

  return {
    // State
    userState: userState as UserState | undefined,
    habits: transformedHabits as Habit[] | undefined,
    epochNow: epochNow as number | undefined,
    stakePerDay: stakePerDay as bigint | undefined,
    strkBalance: strkBalance as bigint | undefined,
    strkAllowance: strkAllowance as bigint | undefined,
    treasuryAddress: treasuryAddress as string | undefined,
    treasuryBalance: treasuryBalance as bigint | undefined,

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
