"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useHabitTracker } from "~~/hooks/scaffold-stark";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark";
import { Balance, Address } from "~~/components/scaffold-stark";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";
import { BalanceCards } from "~~/components/habits/BalanceCards";

// Individual Habit Card Component with full status
const HabitCard = ({
  habit,
  epochNow,
  stakePerDay,
  onCheckIn,
  onArchive,
  connectedAddress,
}: any) => {
  // Fetch daily status for current day
  const { data: currentDayStatus } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "get_daily_status",
    args: [connectedAddress, Number(epochNow || 0), Number(habit.id)] as const,
    watch: true,
  });

  // Fetch daily status for yesterday
  const yesterdayEpoch = epochNow ? Number(epochNow) - 1 : 0;
  const { data: yesterdayStatus } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "get_daily_status",
    args: [connectedAddress, yesterdayEpoch, Number(habit.id)] as const,
    watch: true,
  });

  const formatSTRK = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(2);
  };

  const status = currentDayStatus as
    | { funded: boolean; checked: boolean; settled: boolean }
    | undefined;
  const prevStatus = yesterdayStatus as
    | { funded: boolean; checked: boolean; settled: boolean }
    | undefined;

  return (
    <div className="bg-base-300 rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl font-bold">{habit.text}</span>
            {status?.funded && (
              <span className="badge badge-success gap-1">
                <span>✓</span> Funded
              </span>
            )}
            {status?.checked && (
              <span className="badge badge-success gap-1">
                <span>✓</span> Checked In
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Created: Epoch {habit.created_at_epoch}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!habit.archived && (
            <button
              className="btn btn-outline"
              onClick={() => onArchive(habit.id)}
            >
              Archive
            </button>
          )}
          {!habit.archived && status?.funded && !status?.checked && (
            <button
              className="btn btn-success"
              onClick={() => onCheckIn(habit.id)}
            >
              Check In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function HabitTrackerPage() {
  const { address: connectedAddress } = useAccount();
  const {
    userState,
    habits,
    epochNow,
    stakePerDay,
    strkBalance,
    strkAllowance,
    treasuryAddress,
    treasuryBalance,
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
  } = useHabitTracker();

  // Check if first active habit is funded to determine if day is prepared
  const firstActiveHabit = habits?.find((h) => !h.archived);
  const { data: firstHabitStatus } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "get_daily_status",
    args: [
      connectedAddress,
      Number(epochNow || 0),
      Number(firstActiveHabit?.id || 0),
    ] as const,
    watch: true,
  });

  const dayPrepared =
    firstActiveHabit && firstHabitStatus
      ? (
          firstHabitStatus as unknown as {
            funded: boolean;
            checked: boolean;
            settled: boolean;
          }
        ).funded
      : false;

  const [newHabitText, setNewHabitText] = useState("");
  const [timerKey, setTimerKey] = useState(0);
  const [isTestingHappyPath, setIsTestingHappyPath] = useState(false);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerKey((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatSTRK = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(2);
  };

  const getTimeUntilMidnight = () => {
    if (!epochNow) return "";
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const canSettle = () => {
    if (!epochNow) return false;
    const now = new Date();
    const hours = now.getUTCHours();
    return hours >= 0 && epochNow > 0;
  };

  // Test Happy Path - automates the full flow
  const runTestHappyPath = async () => {
    if (!connectedAddress || !epochNow) return;

    setIsTestingHappyPath(true);
    try {
      const testAmount = BigInt(10) * BigInt(10 ** 18); // 10 STRK

      // Step 1: Approve 10 STRK
      console.log("Step 1: Approving 10 STRK...");
      await approveSTRK(testAmount);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Step 2: Deposit 10 STRK
      console.log("Step 2: Depositing 10 STRK...");
      await deposit(testAmount);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Step 3: Create habit "Drink water"
      console.log("Step 3: Creating habit 'Drink water'...");
      // Get current habit count before creating
      const habitCountBefore = habits?.filter((h) => !h.archived).length || 0;
      await createHabit("Drink water");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // The new habit ID will be the total count + 1 (IDs don't reset when habits are archived)
      const totalHabitsCreated = habits?.length || 0;
      const newHabitId = totalHabitsCreated + 1;
      console.log(`New habit ID should be: ${newHabitId}`);

      // Step 4: Prepare day (fund the habit)
      console.log("Step 4: Preparing day...");
      await prepareDay();
      // Wait longer for prepare_day to confirm
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Step 5: Check in the habit
      console.log(`Step 5: Checking in habit #${newHabitId}...`);
      await checkIn(newHabitId);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Step 6: Force settle
      console.log("Step 6: Force settling...");
      await forceSettleAll();

      console.log("✅ Test Happy Path completed successfully!");
    } catch (error) {
      console.error("Error during Test Happy Path:", error);
    } finally {
      setIsTestingHappyPath(false);
    }
  };

  // Calculate statistics
  const totalFundedValue =
    userState && stakePerDay
      ? BigInt(userState.active_habit_count) * stakePerDay
      : 0n;
  const availableBalance = userState
    ? userState.deposit_balance - userState.blocked_balance
    : 0n;

  const isConnected = !!connectedAddress;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-8">
          🎯 Habit Tracker
        </h1>

        {/* Connection Banner */}
        {!isConnected && (
          <div className="alert alert-info mb-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div className="flex-1">
              <h3 className="font-bold">Welcome to Habit Tracker!</h3>
              <div className="text-sm">
                You&apos;re viewing the app in read-only mode. Connect your
                wallet to create habits, check-in daily, and manage your stakes.
              </div>
            </div>
            <div>
              <CustomConnectButton />
            </div>
          </div>
        )}

        {/* Balance Cards */}
        <BalanceCards />

        {/* Treasury Info Banner */}
        {isConnected &&
          treasuryAddress &&
          typeof treasuryAddress === "string" &&
          treasuryAddress.startsWith("0x") && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 mb-8 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    🏦 Treasury (Slashing Rewards)
                  </h2>
                  <div className="text-sm opacity-90">
                    <Address
                      address={treasuryAddress as `0x${string}`}
                      format="long"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90">Total Collected</div>
                  <div className="text-4xl font-bold">
                    {treasuryBalance ? formatSTRK(treasuryBalance) : "0.00"}{" "}
                    STRK
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Daily Cycle Section */}
        <div className="bg-base-200 rounded-lg p-6 mb-8">
          {/* Compact Info Row */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-2xl">📅</span>
              <span className="font-bold text-lg">Daily Cycle</span>
              <span className="text-gray-600">-</span>
              <span className="font-semibold">Current Day:</span>
              <span className="font-bold text-primary">
                {epochNow || "..."}
              </span>
              <span className="text-gray-600">-</span>
              <span className="font-semibold">Active Habits:</span>
              <span className="font-bold text-success">
                {isConnected ? userState?.active_habit_count || 0 : "0"}
              </span>
              <span className="text-gray-600">-</span>
              <span className="font-semibold">Stake Per Habit:</span>
              <span className="font-bold">
                {stakePerDay ? formatSTRK(stakePerDay) : "10.00"} STRK
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-gray-600">Next Reset:</span>
              <span
                className="font-mono font-bold text-primary text-lg"
                key={timerKey}
              >
                {getTimeUntilMidnight() || "--:--:--"}
              </span>
              <span className="text-xs text-gray-600">(00:00 UTC)</span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className={`flex gap-3 ${!isConnected ? "opacity-60" : ""}`}>
            <div
              className="tooltip tooltip-bottom"
              data-tip={
                !isConnected
                  ? "Connect wallet first"
                  : !userState || userState.active_habit_count === 0
                    ? "Create a habit first"
                    : dayPrepared
                      ? "Day already prepared"
                      : "Fund all active habits for today"
              }
            >
              <button
                className={`btn ${isConnected && dayPrepared ? "btn-success" : "btn-warning"}`}
                onClick={prepareDay}
                disabled={
                  !isConnected ||
                  !userState ||
                  userState.active_habit_count === 0
                }
              >
                {isConnected && dayPrepared ? "✓ Day Prepared" : "Prepare Day"}
              </button>
            </div>
            <div className="border-l border-gray-400 mx-1"></div>
            <button
              className="btn btn-outline btn-info"
              onClick={settleDay}
              disabled={!isConnected || !canSettle()}
            >
              Settle Yesterday
            </button>
            <div className="border-l border-gray-400 mx-1"></div>
            <div
              className="tooltip tooltip-bottom"
              data-tip="Settle rewards immediately for testing"
            >
              <button
                className="btn btn-outline btn-error"
                onClick={forceSettleAll}
                disabled={!isConnected}
              >
                ⚡ Force Settle Today
              </button>
            </div>
            <div className="border-l border-gray-400 mx-1"></div>
            <div
              className="tooltip tooltip-bottom"
              data-tip="Approve → Deposit 10 STRK → Create 'Drink water' → Fund → Check In → Force Settle"
            >
              <button
                className="btn btn-success"
                onClick={runTestHappyPath}
                disabled={!isConnected || isTestingHappyPath}
              >
                {isTestingHappyPath ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Testing...
                  </>
                ) : (
                  <>🎯 Test Happy Path</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Habits Section */}
        <div className="bg-base-200 rounded-lg p-6 mb-8">
          <h2 className="text-3xl font-bold mb-6">Your Habits</h2>

          {/* Create Habit */}
          <div className="mb-6 bg-base-300 rounded-lg p-6">
            <div className="flex gap-4 items-start">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Habit description (max 32 chars)"
                  className="input input-bordered w-full bg-base-100"
                  value={newHabitText}
                  onChange={(e) => setNewHabitText(e.target.value)}
                  maxLength={32}
                  disabled={!isConnected}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {newHabitText.length}/32
                </div>
              </div>
              <button
                className="btn btn-success"
                onClick={() => {
                  createHabit(newHabitText);
                  setNewHabitText("");
                }}
                disabled={!isConnected || !newHabitText.trim()}
              >
                Create
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm">
              <span>💡</span>
              <span>Each habit costs 10 STRK per day</span>
            </div>
          </div>

          {/* Habits List */}
          {isConnected && (
            <div className="space-y-4">
              {habits
                ?.filter((habit) => !habit.archived)
                .map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    epochNow={epochNow}
                    stakePerDay={stakePerDay}
                    onCheckIn={checkIn}
                    onArchive={archiveHabit}
                    connectedAddress={connectedAddress}
                  />
                ))}
              {(!habits ||
                habits.filter((habit) => !habit.archived).length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🎯</div>
                  <div className="text-xl font-semibold mb-2">
                    No habits yet!
                  </div>
                  <div>Create your first habit above to get started</div>
                </div>
              )}
            </div>
          )}

          {/* Demo/Example view for non-connected users */}
          {!isConnected && (
            <div className="space-y-4 opacity-60">
              {/* Example Habit Card */}
              <div className="bg-base-100 rounded-lg p-6 border-2 border-success">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-primary">
                        #1
                      </span>
                      <span className="text-xl font-semibold">
                        Exercise for 30 minutes
                      </span>
                      <span className="badge badge-success badge-lg">
                        Active
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Example habit - Connect wallet to create your own
                    </div>
                  </div>

                  {/* Action Buttons - Disabled */}
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-lg" disabled>
                      ✓ Check In
                    </button>
                    <button className="btn btn-outline btn-error" disabled>
                      Archive
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div className="p-3 rounded bg-success/20">
                    <div className="text-xs font-semibold mb-1 text-gray-600">
                      TODAY - Funded
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✓</span>
                      <span className="text-sm font-semibold">10.00 STRK</span>
                    </div>
                  </div>

                  <div className="p-3 rounded bg-base-200">
                    <div className="text-xs font-semibold mb-1 text-gray-600">
                      TODAY - Checked In
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">○</span>
                      <span className="text-sm font-semibold">Pending</span>
                    </div>
                  </div>

                  <div className="p-3 rounded bg-info/20">
                    <div className="text-xs font-semibold mb-1 text-gray-600">
                      YESTERDAY - Funded
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✓</span>
                      <span className="text-xs">Was Funded</span>
                    </div>
                  </div>

                  <div className="p-3 rounded bg-success/20">
                    <div className="text-xs font-semibold mb-1 text-gray-600">
                      YESTERDAY - Settled
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✓</span>
                      <span className="text-xs font-semibold">Success</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">🔐</div>
                <div className="text-xl font-semibold mb-2">
                  Connect your wallet to view and manage your habits
                </div>
                <div className="mt-4">
                  <CustomConnectButton />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
