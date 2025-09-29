"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useHabitTracker } from "~~/hooks/scaffold-stark";
import { Balance } from "~~/components/scaffold-stark";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";

export default function HabitTrackerPage() {
  const { address: connectedAddress } = useAccount();
  const {
    userState,
    habits,
    epochNow,
    stakePerDay,
    strkBalance,
    strkAllowance,
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
      setTimerKey(prev => prev + 1);
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
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isDayPrepared = () => {
    // This would need to be checked from contract, for now assume not prepared
    return false;
  };

  const canSettle = () => {
    if (!epochNow) return false;
    // Can settle if it's past midnight UTC
    const now = new Date();
    const hours = now.getUTCHours();
    return hours >= 0 && epochNow > 0; // Basic check - in real app would check if yesterday was prepared
  };

  if (!connectedAddress) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">Habit Tracker</span>
            <span className="block text-2xl mb-2">StarkNet Edition</span>
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Habit Tracker</h1>

        {/* Wallet & Balances Section */}
        <div className="bg-base-200 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Wallet</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-base-100 p-4 rounded">
              <div className="text-sm text-gray-500">STRK Balance</div>
              <Balance address={connectedAddress} />
            </div>
            <div className="bg-base-100 p-4 rounded">
              <div className="text-sm text-gray-500">Deposit Balance</div>
              <div className="text-2xl font-bold">
                {userState ? formatSTRK(userState.deposit_balance) : "0.00"} STRK
              </div>
            </div>
            <div className="bg-base-100 p-4 rounded">
              <div className="text-sm text-gray-500">Claimable Balance</div>
              <div className="text-2xl font-bold">
                {userState ? formatSTRK(userState.claimable_balance) : "0.00"} STRK
              </div>
            </div>
          </div>

          {/* STRK Approval */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
            <h3 className="text-lg font-semibold mb-3 text-yellow-800">STRK Token Approval</h3>
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">
                Current Allowance: {strkAllowance ? formatSTRK(strkAllowance) : "0.00"} STRK
              </div>
              <div className="text-sm text-gray-600">
                You need to approve the HabitTracker contract to spend your STRK tokens before depositing.
              </div>
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
                onClick={() => approveSTRK(BigInt(parseFloat(approveAmount || "0") * 1e18))}
                disabled={!approveAmount || parseFloat(approveAmount) <= 0}
              >
                Approve STRK
              </button>
            </div>
          </div>

          {/* Deposit/Withdraw */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Deposit STRK</h3>
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
                  onClick={() => deposit(BigInt(depositAmount) * BigInt(10**18))}
                  disabled={!depositAmount}
                >
                  Deposit
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Withdraw from Deposit</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  className="input input-bordered flex-1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => withdraw(BigInt(withdrawAmount) * BigInt(10**18))}
                  disabled={!withdrawAmount}
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Info */}
        <div className="bg-info rounded-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Daily Cycle</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold">Current UTC Day</div>
                  <div className="text-lg">{epochNow || "Loading..."}</div>
                </div>
                <div>
                  <div className="font-semibold">Stake per Habit</div>
                  <div className="text-lg">{stakePerDay ? formatSTRK(stakePerDay) : "10.00"} STRK</div>
                </div>
                <div>
                  <div className="font-semibold">Active Habits</div>
                  <div className="text-lg">{userState?.active_habit_count || 0}</div>
                </div>
                <div>
                  <div className="font-semibold">Blocked Balance</div>
                  <div className="text-lg">{userState ? formatSTRK(userState.blocked_balance) : "0.00"} STRK</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold mb-1">Time until Midnight UTC</div>
              <div className="text-2xl font-mono font-bold text-primary" key={timerKey}>
                {getTimeUntilMidnight() || "--:--:--"}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Daily reset at 00:00 UTC
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <div className="font-semibold">Daily Actions</div>
                <div className="text-xs text-gray-600">
                  Prepare day to fund habits • Settle after midnight to claim rewards
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className={`btn btn-outline ${isDayPrepared() ? 'btn-success' : ''}`}
                  onClick={prepareDay}
                  disabled={isDayPrepared()}
                >
                  {isDayPrepared() ? 'Day Prepared ✓' : 'Prepare Day'}
                </button>
                <button
                  className="btn btn-warning"
                  onClick={settleDay}
                  disabled={!canSettle()}
                >
                  Settle Yesterday
                </button>
              </div>
            </div>
          </div>

          {/* Testing Actions */}
          <div className="border-t pt-4 mt-4 bg-error/10 p-4 rounded">
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <div className="font-semibold text-error">🧪 Testing Tools</div>
                <div className="text-xs text-gray-600">
                  Force settle immediately without waiting for midnight UTC
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-error btn-outline"
                  onClick={forceSettleAll}
                >
                  ⚡ Force Settle All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Habits Section */}
        <div className="bg-base-200 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Habits</h2>

          {/* Create Habit */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Create New Habit</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter habit description..."
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
                Create
              </button>
            </div>
          </div>

          {/* Habits List */}
          <div className="space-y-4">
            {habits?.map((habit) => {
              return (
                <div key={habit.id} className="bg-base-100 p-4 rounded flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{habit.id}</span>
                      <span className={habit.archived ? "text-gray-500 line-through" : ""}>
                        {habit.text}
                      </span>
                      {habit.archived && <span className="badge badge-neutral">Archived</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Created: {new Date(Number(habit.created_at_epoch) * 86400 * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!habit.archived && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => checkIn(habit.id)}
                      >
                        Check In
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => archiveHabit(habit.id)}
                      disabled={habit.archived}
                    >
                      {habit.archived ? 'Archived' : 'Archive'}
                    </button>
                  </div>
                </div>
              );
            })}
            {(!habits || habits.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No habits yet. Create your first habit above!
              </div>
            )}
          </div>
        </div>

        {/* Claim Section */}
        {userState && userState.claimable_balance > 0 && (
          <div className="bg-success rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Claim Your Rewards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Claim to Wallet</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    className="input input-bordered flex-1"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                  />
                  <button
                    className="btn btn-success"
                    onClick={() => claim(BigInt(claimAmount) * BigInt(10**18))}
                    disabled={!claimAmount}
                  >
                    Claim
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Redeposit to Stake</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    className="input input-bordered flex-1"
                    value={redepositAmount}
                    onChange={(e) => setRedepositAmount(e.target.value)}
                  />
                  <button
                    className="btn btn-info"
                    onClick={() => redeposit(BigInt(redepositAmount) * BigInt(10**18))}
                    disabled={!redepositAmount}
                  >
                    Redeposit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
