"use client";

import { useAccount } from "@starknet-react/core";
import { useHabitVault } from "~~/hooks/scaffold-stark/useHabitVault";
import { CustomConnectButton } from "./scaffold-stark/CustomConnectButton";

/**
 * Component to display Habit Tracker Vault statistics
 * Shows HABIT balance, STRK value, exchange rate, and staking rewards
 */
export const VaultStats = () => {
  const { address } = useAccount();
  const { habitBalance, strkValue, exchangeRate, stakingRewards, totalAssets, totalStaked, isLoading } =
    useHabitVault(address);

  const formatAmount = (amount: bigint, decimals = 18, maxDecimals = 4) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const remainder = amount % divisor;
    const fractional = Number(remainder) / Number(divisor);
    return (Number(whole) + fractional).toFixed(maxDecimals);
  };

  if (isLoading) {
    return (
      <div className="stats shadow w-full">
        <div className="stat">
          <div className="stat-title">Loading...</div>
          <div className="stat-value">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
      {address && (
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </div>
          <div className="stat-title">Your Balance</div>
          <div className="stat-value text-primary">{formatAmount(habitBalance)} STRK</div>
          <div className="stat-desc">Deposited in vault</div>
        </div>
      )}

      <div className="stat">
        <div className="stat-figure text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <div className="stat-title">Total Vault Assets</div>
        <div className="stat-value text-secondary">{formatAmount(totalAssets)}</div>
        <div className="stat-desc">STRK in vault</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-accent">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
        </div>
        <div className="stat-title">Staked Amount</div>
        <div className="stat-value text-accent">{formatAmount(totalStaked)}</div>
        <div className="stat-desc">STRK staked in protocol</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <div className="stat-title">Staking Rewards</div>
        <div className="stat-value text-success">{formatAmount(stakingRewards)}</div>
        <div className="stat-desc">↗︎ Earned from staking</div>
      </div>
    </div>
  );
};

