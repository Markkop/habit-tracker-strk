"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useHabitTracker,
} from "~~/hooks/scaffold-stark";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal = ({ isOpen, onClose }: DepositModalProps) => {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Get HabitTracker contract address
  const { data: habitTrackerInfo } = useDeployedContractInfo("HabitTracker");
  const habitTrackerAddress = habitTrackerInfo?.address;

  // Use the hook to get user state and STRK balance
  const { userState, strkBalance } = useHabitTracker();

  const depositBalance = userState?.deposit_balance || 0n;
  const blockedBalance = userState?.blocked_balance || 0n;
  const availableToWithdraw = depositBalance - blockedBalance;

  // Read current allowance from STRK token
  const { data: allowanceData, refetch: refetchAllowance } =
    useScaffoldReadContract({
      contractName: "STRK",
      functionName: "allowance",
      args: [address, habitTrackerAddress],
      watch: true,
    });

  const currentAllowance = (allowanceData as bigint | undefined) || 0n;

  // Contract write hooks
  const { sendAsync: approve, isPending: isApproving } =
    useScaffoldWriteContract({
      contractName: "STRK",
      functionName: "approve",
      args: [
        habitTrackerAddress,
        amount ? BigInt(Math.floor(parseFloat(amount) * 1e18)) : 0n,
      ],
    });

  const { sendAsync: deposit, isPending: isDepositing } =
    useScaffoldWriteContract({
      contractName: "HabitTracker",
      functionName: "deposit",
      args: [amount ? BigInt(Math.floor(parseFloat(amount) * 1e18)) : 0n],
    });

  const { sendAsync: withdraw, isPending: isWithdrawing } =
    useScaffoldWriteContract({
      contractName: "HabitTracker",
      functionName: "withdraw_from_deposit",
      args: [amount ? BigInt(Math.floor(parseFloat(amount) * 1e18)) : 0n],
    });

  const formatSTRK = (amount: bigint) => {
    return (Number(amount) / 1e18).toFixed(4);
  };

  const handleApprove = async () => {
    try {
      await approve();
      await refetchAllowance();
      // Don't clear amount - user will need it for deposit
    } catch (error) {
      console.error("Error approving:", error);
    }
  };

  const handleDeposit = async () => {
    try {
      await deposit();
      setAmount("");
    } catch (error) {
      console.error("Error depositing:", error);
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdraw();
      setAmount("");
    } catch (error) {
      console.error("Error withdrawing:", error);
    }
  };

  const amountInWei = amount
    ? BigInt(Math.floor(parseFloat(amount) * 1e18))
    : 0n;
  const needsApproval = amountInWei > currentAllowance;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Manage Deposit</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <button
            className={`tab ${activeTab === "deposit" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("deposit")}
          >
            Deposit
          </button>
          <button
            className={`tab ${activeTab === "withdraw" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("withdraw")}
          >
            Withdraw
          </button>
        </div>

        {/* Balance Info */}
        <div className="bg-base-200 rounded-lg p-3 mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="opacity-70">Wallet Balance:</span>
            <span className="font-semibold">
              {formatSTRK(strkBalance || 0n)} STRK
            </span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">Deposit Balance:</span>
            <span className="font-semibold">
              {formatSTRK(depositBalance)} STRK
            </span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">Available to Withdraw:</span>
            <span className="font-semibold">
              {formatSTRK(availableToWithdraw)} STRK
            </span>
          </div>
          {activeTab === "deposit" && (
            <div className="flex justify-between border-t border-base-300 pt-1 mt-1">
              <span className="opacity-70">Current Allowance:</span>
              <span className="font-semibold">
                {formatSTRK(currentAllowance)} STRK
              </span>
            </div>
          )}
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
              {activeTab === "deposit"
                ? `Max: ${formatSTRK(strkBalance || 0n)} STRK`
                : `Max: ${formatSTRK(availableToWithdraw)} STRK`}
            </span>
            <button
              className="label-text-alt link link-primary"
              onClick={() =>
                setAmount(
                  activeTab === "deposit"
                    ? formatSTRK(strkBalance || 0n)
                    : formatSTRK(availableToWithdraw)
                )
              }
            >
              Use Max
            </button>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {activeTab === "deposit" ? (
            <>
              {needsApproval && (
                <button
                  className="btn btn-primary w-full"
                  onClick={handleApprove}
                  disabled={!address || !amount || isApproving}
                >
                  {isApproving ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Approving...
                    </>
                  ) : (
                    `Approve ${amount || "0"} STRK`
                  )}
                </button>
              )}
              <button
                className="btn btn-success w-full"
                onClick={handleDeposit}
                disabled={!address || !amount || needsApproval || isDepositing}
              >
                {isDepositing ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Depositing...
                  </>
                ) : (
                  `Deposit ${amount || "0"} STRK`
                )}
              </button>
            </>
          ) : (
            <button
              className="btn btn-warning w-full"
              onClick={handleWithdraw}
              disabled={!address || !amount || isWithdrawing}
            >
              {isWithdrawing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Withdrawing...
                </>
              ) : (
                `Withdraw ${amount || "0"} STRK`
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
            {activeTab === "deposit"
              ? needsApproval
                ? "First approve the STRK token, then deposit to fund your habits."
                : "Deposit STRK to fund your habits. The contract will handle token transfers."
              : "You can only withdraw funds that aren't currently at stake in active habits."}
          </span>
        </div>
      </div>
    </div>
  );
};
