"use client";

import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark";
import { useHabitVault } from "~~/hooks/scaffold-stark/useHabitVault";
import { useAccount } from "@starknet-react/core";

/**
 * Component for viewing staking stats and syncing rewards
 * Note: Staking only happens automatically when users successfully complete habits
 */
export const StakingControls = () => {
  const { address } = useAccount();

  const { totalStaked, stakingRewards, totalAssets } = useHabitVault(address);

  const { sendAsync: syncRewards, isPending: isSyncing } =
    useScaffoldWriteContract({
      contractName: "HabitTracker",
      functionName: "sync_staking_rewards",
      args: [],
    });

  const formatSTRK = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(4);
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
        <span className="text-2xl">🏦</span> Staking Overview
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
          <span>Connect your wallet to view staking stats</span>
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
          <div className="text-xs text-gray-500 mt-1">
            Auto-staked from successful habits
          </div>
        </div>

        <div className="bg-success/10 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Rewards Earned
          </div>
          <div className="text-2xl font-bold text-success">
            {formatSTRK(stakingRewards || 0n)} STRK
          </div>
          <div className="text-xs text-gray-500 mt-1">
            From staking protocol
          </div>
        </div>

        <div className="bg-info/10 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Total Assets
          </div>
          <div className="text-2xl font-bold text-info">
            {formatSTRK(totalAssets || 0n)} STRK
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Liquid + Staked + Rewards
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Sync Rewards Section */}
        <div className="flex-1">
          <div className="bg-success/10 rounded-lg p-4 mb-3">
            <div className="text-sm font-semibold mb-2">Sync Rewards</div>
            <div className="text-xs text-gray-600 mb-3">
              Claim and accumulate rewards from the staking protocol. Staking
              happens automatically when you successfully complete habits.
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
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-info/10 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-info text-xl">ℹ️</span>
          <div className="text-sm">
            <p className="font-semibold mb-1">How Auto-Staking Works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
              <li>
                <strong>Complete Habits:</strong> When you successfully complete
                a habit and settle it, your earned rewards are automatically
                staked
              </li>
              <li>
                <strong>No Manual Staking:</strong> You cannot manually stake or
                unstake - staking only happens through successful habit
                completion
              </li>
              <li>
                <strong>Sync Rewards:</strong> Periodically sync to claim
                accumulated staking rewards from the protocol
              </li>
              <li>
                <strong>Earn More:</strong> Staked tokens earn additional yield
                from the protocol, increasing your total assets
              </li>
              <li>
                Your staked balance grows organically as you build good habits
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
