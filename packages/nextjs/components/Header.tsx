"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bars3Icon,
  BugAntIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  useOutsideClick,
  useDeployedContractInfo,
} from "~~/hooks/scaffold-stark";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";
import { useTheme } from "next-themes";
import { useTargetNetwork } from "~~/hooks/scaffold-stark/useTargetNetwork";
import { devnet } from "@starknet-react/chains";
import { SwitchTheme } from "./SwitchTheme";
import { useAccount, useNetwork, useProvider } from "@starknet-react/core";
import { BlockIdentifier } from "starknet";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-stark";
import CopyToClipboard from "react-copy-to-clipboard";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Habit Tracker",
    href: "/habits",
  },
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(theme === "dark");
  }, [theme]);
  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive
                  ? "bg-gradient-nav text-white! active:bg-gradient-nav shadow-md"
                  : ""
              } py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col hover:bg-gradient-nav hover:text-white`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), [])
  );

  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.network === devnet.network;
  const { data: habitTrackerContract } =
    useDeployedContractInfo("HabitTracker");

  const { provider } = useProvider();
  const { address, status, chainId } = useAccount();
  const { chain } = useNetwork();
  const [isDeployed, setIsDeployed] = useState(true);

  useEffect(() => {
    if (
      status === "connected" &&
      address &&
      chainId === targetNetwork.id &&
      chain.network === targetNetwork.network
    ) {
      provider
        .getClassHashAt(address)
        .then((classHash) => {
          if (classHash) setIsDeployed(true);
          else setIsDeployed(false);
        })
        .catch((e) => {
          console.error("contract check", e);
          if (e.toString().includes("Contract not found")) {
            setIsDeployed(false);
          }
        });
    }
  }, [
    status,
    address,
    provider,
    chainId,
    targetNetwork.id,
    targetNetwork.network,
    chain.network,
  ]);

  return (
    <div className=" lg:static top-0 navbar min-h-0 shrink-0 justify-between z-20 px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2 -mr-2">
        <div className="lg:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost 
              [@media(max-width:379px)]:px-3! [@media(max-width:379px)]:py-1! 
              [@media(max-width:379px)]:h-9! [@media(max-width:379px)]:min-h-0!
              [@media(max-width:379px)]:w-10!
              ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
            onClick={() => {
              setIsDrawerOpen((prevIsOpenState) => !prevIsOpenState);
            }}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm rounded-box w-52 bg-base-100"
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              <HeaderMenuLinks />
            </ul>
          )}
        </div>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2 ml-4">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-center hidden lg:flex">
        {habitTrackerContract && (
          <div className="flex items-center gap-2 text-sm px-4 py-2 bg-base-200 rounded-full">
            <span className="font-semibold">HabitTracker:</span>
            <span className="font-mono">
              {habitTrackerContract.address.slice(0, 6)}...
              {habitTrackerContract.address.slice(-4)}
            </span>
            {addressCopied ? (
              <CheckCircleIcon
                className="h-4 w-4 text-sky-600 cursor-pointer"
                aria-hidden="true"
              />
            ) : (
              <CopyToClipboard
                text={habitTrackerContract.address}
                onCopy={() => {
                  setAddressCopied(true);
                  setTimeout(() => {
                    setAddressCopied(false);
                  }, 800);
                }}
              >
                <DocumentDuplicateIcon
                  className="h-4 w-4 text-sky-600 cursor-pointer hover:text-sky-700"
                  aria-hidden="true"
                />
              </CopyToClipboard>
            )}
            <a
              href={getBlockExplorerAddressLink(
                targetNetwork,
                habitTrackerContract.address
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-700"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
      <div className="navbar-end grow mr-2 gap-4">
        {status === "connected" && !isDeployed ? (
          <span className="bg-[#8a45fc] text-[9px] p-1 text-white">
            Wallet Not Deployed
          </span>
        ) : null}
        <CustomConnectButton />
        {/* <FaucetButton /> */}
        <SwitchTheme
          className={`pointer-events-auto ${
            isLocalNetwork ? "mb-1 lg:mb-0" : ""
          }`}
        />
      </div>
    </div>
  );
};
