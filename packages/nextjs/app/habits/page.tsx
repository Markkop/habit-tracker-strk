"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useHabitTracker } from "~~/hooks/scaffold-stark";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark";
import { Balance, Address } from "~~/components/scaffold-stark";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";

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
    <div
      className={`bg-base-100 rounded-lg p-6 border-2 ${
        habit.archived
          ? "border-gray-300 opacity-60"
          : status?.funded
            ? "border-success"
            : "border-warning"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold text-primary">#{habit.id}</span>
            <span
              className={`text-xl ${habit.archived ? "text-gray-500 line-through" : "font-semibold"}`}
            >
              {habit.text}
            </span>
            {habit.archived && (
              <span className="badge badge-neutral badge-lg">Archived</span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Created:{" "}
            {new Date(
              Number(habit.created_at_epoch) * 86400 * 1000,
            ).toLocaleDateString()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!habit.archived && status?.funded && !status?.checked && (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => onCheckIn(habit.id)}
            >
              ✓ Check In
            </button>
          )}
          {!habit.archived && (
            <button
              className="btn btn-outline btn-error"
              onClick={() => onArchive(habit.id)}
            >
              Archive
            </button>
          )}
        </div>
      </div>

      {/* Status Grid */}
      {!habit.archived && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          {/* Today's Status */}
          <div
            className={`p-3 rounded ${status?.funded ? "bg-success/20" : "bg-warning/20"}`}
          >
            <div className="text-xs font-semibold mb-1 text-gray-600">
              TODAY - Funded
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {status?.funded ? "✓" : "✗"}
              </span>
              <span className="text-sm font-semibold">
                {status?.funded
                  ? `${formatSTRK(stakePerDay || 0n)} STRK`
                  : "Not Funded"}
              </span>
            </div>
          </div>

          <div
            className={`p-3 rounded ${status?.checked ? "bg-success/20" : "bg-base-200"}`}
          >
            <div className="text-xs font-semibold mb-1 text-gray-600">
              TODAY - Checked In
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {status?.checked ? "✓" : "○"}
              </span>
              <span className="text-sm font-semibold">
                {status?.checked ? "Completed" : "Pending"}
              </span>
            </div>
          </div>

          {/* Yesterday's Status */}
          <div
            className={`p-3 rounded ${prevStatus?.funded ? "bg-info/20" : "bg-base-200"}`}
          >
            <div className="text-xs font-semibold mb-1 text-gray-600">
              YESTERDAY - Funded
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {prevStatus?.funded ? "✓" : "✗"}
              </span>
              <span className="text-xs">
                {prevStatus?.funded ? "Was Funded" : "Not Funded"}
              </span>
            </div>
          </div>

          <div
            className={`p-3 rounded ${
              prevStatus?.settled
                ? prevStatus?.checked
                  ? "bg-success/20"
                  : "bg-error/20"
                : "bg-base-200"
            }`}
          >
            <div className="text-xs font-semibold mb-1 text-gray-600">
              YESTERDAY - Settled
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {prevStatus?.settled
                  ? prevStatus?.checked
                    ? "✓"
                    : "✗"
                  : "○"}
              </span>
              <span className="text-xs font-semibold">
                {prevStatus?.settled
                  ? prevStatus?.checked
                    ? "Success"
                    : "Slashed"
                  : "Pending"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Archived message */}
      {habit.archived && (
        <div className="text-center py-4 text-gray-500 italic">
          This habit has been archived and is no longer tracked
        </div>
      )}
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
      ? (firstHabitStatus as unknown as { funded: boolean; checked: boolean; settled: boolean }).funded
      : false;

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [redepositAmount, setRedepositAmount] = useState("");
  const [newHabitText, setNewHabitText] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [timerKey, setTimerKey] = useState(0);

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

  // Calculate statistics
  const totalFundedValue =
    userState && stakePerDay
      ? BigInt(userState.active_habit_count) * stakePerDay
      : 0n;
  const availableBalance = userState
    ? userState.deposit_balance - userState.blocked_balance
    : 0n;

  if (!connectedAddress) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">Habit Tracker</span>
            <span className="block text-2xl mb-2">Starknet Edition</span>
          </h1>
          <p className="text-center text-lg">
            Connect your wallet to start tracking habits with STRK stakes
          </p>
        </div>
        <div className="flex justify-center mt-8">
          <CustomConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-8">
          🎯 Habit Tracker
        </h1>

        {/* Treasury Info Banner */}
        {treasuryAddress &&
          typeof treasuryAddress === "string" &&
          treasuryAddress.startsWith("0x") && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 mb-8 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    🏦 Treasury (Slashing Rewards)
                  </h2>
                  <div className="text-sm opacity-90">
                    <Address address={treasuryAddress as `0x${string}`} format="long" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90">Total Collected</div>
                  <div className="text-4xl font-bold">
                    {treasuryBalance ? formatSTRK(treasuryBalance) : "0.00"} STRK
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
            <div className="text-sm opacity-90 mb-1">Total Deposit</div>
            <div className="text-3xl font-bold mb-2">
              {userState ? formatSTRK(userState.deposit_balance) : "0.00"}
            </div>
            <div className="text-xs">STRK</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
            <div className="text-sm opacity-90 mb-1">Available Balance</div>
            <div className="text-3xl font-bold mb-2">
              {formatSTRK(availableBalance)}
            </div>
            <div className="text-xs">STRK (unlocked)</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-lg p-6 shadow-lg">
            <div className="text-sm opacity-90 mb-1">Blocked (Staked)</div>
            <div className="text-3xl font-bold mb-2">
              {userState ? formatSTRK(userState.blocked_balance) : "0.00"}
            </div>
            <div className="text-xs">STRK (locked)</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
            <div className="text-sm opacity-90 mb-1">Claimable Rewards</div>
            <div className="text-3xl font-bold mb-2">
              {userState ? formatSTRK(userState.claimable_balance) : "0.00"}
            </div>
            <div className="text-xs">STRK</div>
          </div>
        </div>

        {/* Daily Cycle Section */}
        <div className="bg-base-200 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">📅 Daily Cycle</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-gray-600">Current Day</div>
                  <div className="text-2xl font-bold text-primary">
                    {epochNow || "..."}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-600">
                    Active Habits
                  </div>
                  <div className="text-2xl font-bold text-success">
                    {userState?.active_habit_count || 0}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-600">
                    Stake per Habit
                  </div>
                  <div className="text-2xl font-bold">
                    {stakePerDay ? formatSTRK(stakePerDay) : "10.00"}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-600">
                    Total at Risk
                  </div>
                  <div className="text-2xl font-bold text-warning">
                    {formatSTRK(totalFundedValue)}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold mb-1 text-gray-600">
                Next Reset
              </div>
              <div
                className="text-4xl font-mono font-bold text-primary"
                key={timerKey}
              >
                {getTimeUntilMidnight() || "--:--:--"}
              </div>
              <div className="text-xs text-gray-600 mt-1">00:00 UTC</div>
            </div>
          </div>

          {/* Day Prepared Status */}
          <div
            className={`p-4 rounded-lg mb-4 ${
              dayPrepared
                ? "bg-success text-success-content"
                : "bg-warning text-warning-content"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{dayPrepared ? "✓" : "⚠"}</span>
                <div>
                  <div className="font-bold text-lg">
                    {dayPrepared
                      ? "Day Prepared - All habits funded!"
                      : "Day Not Prepared - Click to fund your habits"}
                  </div>
                  <div className="text-sm opacity-90">
                    {dayPrepared
                      ? "Your active habits are funded and ready for check-ins"
                      : "You need to prepare the day to fund your active habits"}
                  </div>
                </div>
              </div>
              <button
                className={`btn btn-lg ${dayPrepared ? "btn-success" : "btn-warning"}`}
                onClick={prepareDay}
              >
                {dayPrepared ? "✓ Prepared" : "Prepare Day"}
              </button>
            </div>
          </div>

          {/* Settlement Actions */}
          <div className="flex gap-4">
            <button
              className="btn btn-outline btn-info flex-1"
              onClick={settleDay}
              disabled={!canSettle()}
            >
              Settle Yesterday
            </button>
            <button
              className="btn btn-outline btn-error"
              onClick={forceSettleAll}
            >
              ⚡ Force Settle (Testing)
            </button>
          </div>
        </div>

        {/* Wallet Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Approve & Deposit */}
          <div className="bg-base-200 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">💰 Manage Deposit</h3>

            {/* Approval */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-4">
              <div className="text-sm font-semibold mb-2 text-yellow-800">
                STRK Allowance:{" "}
                {strkAllowance ? formatSTRK(strkAllowance) : "0.00"} STRK
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount to approve"
                  className="input input-bordered flex-1"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                />
                <button
                  className="btn btn-warning"
                  onClick={() =>
                    approveSTRK(BigInt(parseFloat(approveAmount || "0") * 1e18))
                  }
                  disabled={!approveAmount || parseFloat(approveAmount) <= 0}
                >
                  Approve
                </button>
              </div>
            </div>

            {/* Deposit */}
            <div className="mb-4">
              <label className="text-sm font-semibold mb-2 block">
                Deposit STRK
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  className="input input-bordered flex-1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    deposit(BigInt(parseFloat(depositAmount || "0") * 1e18))
                  }
                  disabled={!depositAmount}
                >
                  Deposit
                </button>
              </div>
            </div>

          {/* Withdraw */}
          <div>
            <label className="text-sm font-semibold mb-2 block">
              Withdraw Available Balance
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="Amount"
                  className="input input-bordered w-full pr-16"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <button
                  className="btn btn-xs btn-ghost absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setWithdrawAmount(formatSTRK(availableBalance))}
                  disabled={availableBalance <= 0n}
                >
                  Max
                </button>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  withdraw(BigInt(parseFloat(withdrawAmount || "0") * 1e18))
                }
                disabled={!withdrawAmount}
              >
                Withdraw
              </button>
            </div>
          </div>
          </div>

          {/* Claim & Redeposit */}
          <div className="bg-base-200 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">🎁 Claim Rewards</h3>

          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block">
              Claim to Wallet
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="Amount"
                  className="input input-bordered w-full pr-16"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                />
                <button
                  className="btn btn-xs btn-ghost absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setClaimAmount(formatSTRK(userState?.claimable_balance || 0n))}
                  disabled={!userState || userState.claimable_balance <= 0n}
                >
                  Max
                </button>
              </div>
              <button
                className="btn btn-success"
                onClick={() => claim(BigInt(parseFloat(claimAmount || "0") * 1e18))}
                disabled={!claimAmount}
              >
                Claim
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">
              Redeposit to Stake
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="Amount"
                  className="input input-bordered w-full pr-16"
                  value={redepositAmount}
                  onChange={(e) => setRedepositAmount(e.target.value)}
                />
                <button
                  className="btn btn-xs btn-ghost absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setRedepositAmount(formatSTRK(userState?.claimable_balance || 0n))}
                  disabled={!userState || userState.claimable_balance <= 0n}
                >
                  Max
                </button>
              </div>
              <button
                className="btn btn-info"
                onClick={() =>
                  redeposit(BigInt(parseFloat(redepositAmount || "0") * 1e18))
                }
                disabled={!redepositAmount}
              >
                Redeposit
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* Habits Section */}
        <div className="bg-base-200 rounded-lg p-6 mb-8">
          <h2 className="text-3xl font-bold mb-6">📋 Your Habits</h2>

          {/* Create Habit */}
          <div className="mb-6 p-4 bg-success/10 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">➕ Create New Habit</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter habit description... (e.g., Exercise for 30 minutes)"
                className="input input-bordered flex-1"
                value={newHabitText}
                onChange={(e) => setNewHabitText(e.target.value)}
                maxLength={100}
              />
              <button
                className="btn btn-success"
                onClick={() => {
                  createHabit(newHabitText);
                  setNewHabitText("");
                }}
                disabled={!newHabitText.trim()}
              >
                Create Habit
              </button>
            </div>
          </div>

          {/* Habits List */}
          <div className="space-y-4">
            {habits?.map((habit) => (
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
            {(!habits || habits.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🎯</div>
                <div className="text-xl font-semibold mb-2">
                  No habits yet!
                </div>
                <div>Create your first habit above to get started</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}