"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import {
  useDeployedContractInfo,
  useHabitTracker,
} from "~~/hooks/scaffold-stark";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark";
import { DepositModal } from "./DepositModal";
import { ClaimModal } from "./ClaimModal";

/**
 * Balance cards showing:
 * - Wallet: STRK in your wallet
 * - Deposit: STRK ready to fund habits
 * - At Stake: Tokens at risk (blocked during habit period)
 * - Rewards: Check-in rewards + real-time staking yield displayed as "X.XXXX + Y.YYYY"
 */
export const BalanceCards = () => {
  const { address } = useAccount();
  const { userState, strkBalance } = useHabitTracker();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Read staking contract address from HabitTracker
  const { data: stakingContractData } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "staking_contract",
    args: [],
    watch: true,
  });

  // Extract the actual contract address from the response and convert to string
  const stakingContractAddressRaw = stakingContractData as any;
  let stakingContractAddress: string | undefined;

  if (stakingContractAddressRaw) {
    if (typeof stakingContractAddressRaw === "string") {
      stakingContractAddress = stakingContractAddressRaw;
    } else {
      // Convert BigInt or number to hex string
      stakingContractAddress = `0x${BigInt(stakingContractAddressRaw).toString(16).padStart(64, "0")}`;
    }
  }

  // Get the HabitTracker contract address (the staker)
  const { data: habitTrackerInfo } = useDeployedContractInfo("HabitTracker");
  const habitTrackerAddress = habitTrackerInfo?.address;

  // Read pending rewards from MockStaking contract for the HabitTracker contract
  // This gives us real-time accumulated yield
  const { data: pendingRewardsData } = useScaffoldReadContract({
    contractName: "MockStaking",
    functionName: "get_pending_rewards",
    args: [habitTrackerAddress], // Pass HabitTracker address, not MockStaking address
    watch: true,
  });

  // Read staked amount to help debug
  const { data: stakedAmountData } = useScaffoldReadContract({
    contractName: "MockStaking",
    functionName: "get_staked_amount",
    args: [habitTrackerAddress], // Pass HabitTracker address, not MockStaking address
    watch: true,
  });

  // Read total_staked from HabitTracker (what contract thinks is staked)
  const { data: contractTotalStakedData } = useScaffoldReadContract({
    contractName: "HabitTracker",
    functionName: "total_staked",
    args: [],
    watch: true,
  });

  // Read HabitTracker's actual STRK balance
  const { data: habitTrackerStrkBalanceData } = useScaffoldReadContract({
    contractName: "MockStaking",
    functionName: "get_reward_pool",
    args: [],
    watch: true,
  });

  const pendingRewards = (pendingRewardsData as any) || 0n;
  const stakedAmount = (stakedAmountData as any) || 0n;
  const contractTotalStaked = (contractTotalStakedData as any) || 0n;

  const formatSTRK = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(4);
  };

  // Calculate available deposit (not blocked)
  const availableDeposit = userState
    ? userState.deposit_balance - userState.blocked_balance
    : 0n;

  // Separate claimable rewards (earned from check-ins)
  const claimableRewards = userState ? userState.claimable_balance : 0n;

  // Calculate total rewards (claimable + real-time staking yield)
  const totalRewards = claimableRewards + pendingRewards;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Wallet */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-lg relative">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs opacity-90">Wallet</div>
        </div>
        <div className="text-3xl font-bold mb-1">
          {address ? formatSTRK(strkBalance || 0n) : "0.0000"}
        </div>
        <div className="text-xs opacity-75">STRK</div>
      </div>

      {/* Deposit */}
      <div
        className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg relative cursor-pointer hover:shadow-xl transition-all hover:scale-105"
        onClick={() => setIsDepositModalOpen(true)}
        title="Click to manage deposit"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs opacity-90">Deposit</div>
        </div>
        <div className="text-3xl font-bold mb-1">
          {address ? formatSTRK(availableDeposit) : "0.0000"}
        </div>
        <div className="text-xs opacity-75">STRK (Available)</div>
      </div>

      {/* At Stake (Tokens at Risk) */}
      <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-lg p-4 shadow-lg relative group">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs opacity-90">At Stake</div>
          <div className="relative">
            <span className="text-sm cursor-help">ℹ️</span>
            <div className="hidden group-hover:block absolute right-0 top-6 bg-gray-900 text-white text-xs rounded py-1 px-2 w-48 z-10 shadow-xl">
              Earn them back on successful checkin
              <br />
              Or have them slashed on fail
            </div>
          </div>
        </div>
        <div className="text-3xl font-bold mb-1">
          {address && userState
            ? formatSTRK(userState.blocked_balance)
            : "0.0000"}
        </div>
        <div className="text-xs opacity-75">STRK (At Risk)</div>
      </div>

      {/* Rewards - Combined */}
      <div
        className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-lg p-4 shadow-lg relative cursor-pointer hover:shadow-xl transition-all hover:scale-105"
        onClick={() => setIsClaimModalOpen(true)}
        title="Click to manage rewards"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs opacity-90">Rewards</div>
        </div>
        <div className="text-3xl font-bold mb-1">
          {address ? (
            claimableRewards > 0n || pendingRewards > 0n ? (
              <span>
                {formatSTRK(claimableRewards)}
                {pendingRewards > 0n && (
                  <span className="text-yellow-300">
                    {" "}
                    + {formatSTRK(pendingRewards)}
                  </span>
                )}
              </span>
            ) : (
              "0.0000"
            )
          ) : (
            "0.0000"
          )}
        </div>
        <div className="text-xs opacity-75">
          STRK
          {claimableRewards > 0n &&
            pendingRewards > 0n &&
            " (Check-ins + Yield)"}
        </div>
      </div>

      {/* Deposit Management Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />

      {/* Claim Rewards Modal */}
      <ClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
      />
    </div>
  );
};
