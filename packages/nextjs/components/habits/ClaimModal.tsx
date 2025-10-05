"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import {
  useScaffoldWriteContract,
  useHabitTracker,
} from "~~/hooks/scaffold-stark";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClaimModal = ({ isOpen, onClose }: ClaimModalProps) => {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"claim" | "redeposit">("claim");

  // Use the hook to get user state
  const { userState } = useHabitTracker();

  const claimableBalance = userState?.claimable_balance || 0n;

  // Contract write hooks
  const { sendAsync: claim, isPending: isClaiming } = useScaffoldWriteContract({
    contractName: "HabitTracker",
    functionName: "claim",
    args: [amount ? BigInt(Math.floor(parseFloat(amount) * 1e18)) : 0n],
  });

  const { sendAsync: redeposit, isPending: isRedepositing } =
    useScaffoldWriteContract({
      contractName: "HabitTracker",
      functionName: "redeposit_from_claimable",
      args: [amount ? BigInt(Math.floor(parseFloat(amount) * 1e18)) : 0n],
    });

  const formatSTRK = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(4);
  };

  const handleClaim = async () => {
    try {
      await claim();
      setAmount("");
    } catch (error) {
      console.error("Error claiming:", error);
    }
  };

  const handleRedeposit = async () => {
    try {
      await redeposit();
      setAmount("");
    } catch (error) {
      console.error("Error redepositing:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Manage Rewards</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <button
            className={`tab ${activeTab === "claim" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("claim")}
          >
            Claim to Wallet
          </button>
          <button
            className={`tab ${activeTab === "redeposit" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("redeposit")}
          >
            Redeposit
          </button>
        </div>

        {/* Balance Info */}
        <div className="bg-base-200 rounded-lg p-3 mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="opacity-70">Claimable Rewards:</span>
            <span className="font-semibold">
              {formatSTRK(claimableBalance)} STRK
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Amount (STRK)</span>
          </label>
          <input
            type="number"
            placeholder="0.0000"
            className="input input-bordered w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.0001"
            min="0"
          />
          <label className="label">
            <span className="label-text-alt opacity-70">
              Max: {formatSTRK(claimableBalance)} STRK
            </span>
            <button
              className="label-text-alt link link-primary"
              onClick={() => setAmount(formatSTRK(claimableBalance))}
            >
              Use Max
            </button>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {activeTab === "claim" ? (
            <button
              className="btn btn-success w-full"
              onClick={handleClaim}
              disabled={!address || !amount || isClaiming}
            >
              {isClaiming ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Claiming...
                </>
              ) : (
                `Claim ${amount || "0"} STRK`
              )}
            </button>
          ) : (
            <button
              className="btn btn-primary w-full"
              onClick={handleRedeposit}
              disabled={!address || !amount || isRedepositing}
            >
              {isRedepositing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Redepositing...
                </>
              ) : (
                `Redeposit ${amount || "0"} STRK`
              )}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="alert alert-info mt-4 text-xs">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {activeTab === "claim"
              ? "Claim your earned rewards to your wallet."
              : "Redeposit rewards back into your deposit balance to fund more habits."}
          </span>
        </div>
      </div>
    </div>
  );
};
