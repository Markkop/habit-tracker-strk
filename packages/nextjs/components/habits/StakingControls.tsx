"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark";
import { useHabitVault } from "~~/hooks/scaffold-stark/useHabitVault";
import { useAccount } from "@starknet-react/core";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark";

/**
 * Component for staking controls
 * Allows users to stake, unstake, and sync rewards
 */
export const StakingControls = () => {
  const { address } = useAccount();
  
  // Check if contracts are deployed
  const { data: habitTrackerContract, isLoading: isContractLoading } =
    useDeployedContractInfo("HabitTracker");
  
  const { totalStaked, stakingRewards, totalAssets } = useHabitVault(address);
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  // Write hooks for staking operations
  const { sendAsync: stakeToProtocol, isPending: isStaking } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "stake_to_protocol",
    args: [0n], // placeholder, will be overridden
  });

  const { sendAsync: unstakeFromProtocol, isPending: isUnstaking } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "unstake_from_protocol",
    args: [0n], // placeholder, will be overridden
  });

  const { sendAsync: syncRewards, isPending: isSyncing } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "sync_staking_rewards",
  });

  const formatSTRK = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(4);
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    try {
      await stakeToProtocol({
        args: [BigInt(parseFloat(stakeAmount) * 1e18)],
      });
      setStakeAmount("");
    } catch (error) {
      console.error("Error staking:", error);
    }
  };

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    try {
      await unstakeFromProtocol({
        args: [BigInt(parseFloat(unstakeAmount) * 1e18)],
      });
      setUnstakeAmount("");
    } catch (error) {
      console.error("Error unstaking:", error);
    }
  };

  const handleSyncRewards = async () => {
    try {
      await syncRewards();
    } catch (error) {
      console.error("Error syncing rewards:", error);
    }
  };

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">🏦</span> Staking Controls
      </h3>

      {!address && (
        <div className="alert alert-warning mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>Connect your wallet to use staking controls</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Current Staking Stats */}
        <div className="bg-accent/10 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Total Staked
          </div>
          <div className="text-2xl font-bold text-accent">
            {formatSTRK(totalStaked || 0n)} STRK
          </div>
        </div>

        <div className="bg-success/10 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Rewards Earned
          </div>
          <div className="text-2xl font-bold text-success">
            {formatSTRK(stakingRewards || 0n)} STRK
          </div>
        </div>

        <div className="bg-info/10 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Total Assets
          </div>
          <div className="text-2xl font-bold text-info">
            {formatSTRK(totalAssets || 0n)} STRK
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stake */}
        <div>
          <label className="text-sm font-semibold mb-2 block">
            Stake to Protocol
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              className="input input-bordered flex-1"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              disabled={!address || isStaking}
            />
          </div>
          <button
            className="btn btn-accent w-full mt-2"
            onClick={handleStake}
            disabled={!address || !stakeAmount || isStaking || parseFloat(stakeAmount) <= 0}
          >
            {isStaking ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Staking...
              </>
            ) : (
              "Stake"
            )}
          </button>
        </div>

        {/* Unstake */}
        <div>
          <label className="text-sm font-semibold mb-2 block">
            Unstake from Protocol
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                placeholder="Amount"
                className="input input-bordered w-full pr-16"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                disabled={!address || isUnstaking}
              />
              <button
                className="btn btn-xs btn-ghost absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setUnstakeAmount(formatSTRK(totalStaked || 0n))}
                disabled={!address || !totalStaked || totalStaked <= 0n}
              >
                Max
              </button>
            </div>
          </div>
          <button
            className="btn btn-warning w-full mt-2"
            onClick={handleUnstake}
            disabled={!address || !unstakeAmount || isUnstaking || parseFloat(unstakeAmount) <= 0}
          >
            {isUnstaking ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Unstaking...
              </>
            ) : (
              "Unstake"
            )}
          </button>
        </div>

        {/* Sync Rewards */}
        <div>
          <label className="text-sm font-semibold mb-2 block">
            Sync Rewards
          </label>
          <div className="bg-info/10 rounded-lg p-3 mb-2">
            <div className="text-xs text-gray-600 mb-1">
              Claim and accumulate rewards from the staking protocol
            </div>
          </div>
          <button
            className="btn btn-success w-full"
            onClick={handleSyncRewards}
            disabled={!address || isSyncing}
          >
            {isSyncing ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Syncing...
              </>
            ) : (
              <>
                <span className="text-lg">↻</span> Sync Rewards
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-info/10 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-info text-xl">ℹ️</span>
          <div className="text-sm">
            <p className="font-semibold mb-1">How Staking Works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
              <li>
                <strong>Stake:</strong> Lock your STRK in the native staking protocol to earn rewards
              </li>
              <li>
                <strong>Unstake:</strong> Withdraw your staked STRK back to the vault
              </li>
              <li>
                <strong>Sync:</strong> Claim accumulated rewards from the protocol
              </li>
              <li>Staking rewards are automatically added to the total vault assets</li>
              <li>Your share value increases as rewards accumulate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

