"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Address, Balance } from "~~/components/scaffold-stark";
import {
  useFetchAddressDetails,
  useFetchAllTxns,
  useFetchEvents,
} from "~~/hooks/blockexplorer";
import { useScaffoldStarkProfile } from "~~/hooks/scaffold-stark/useScaffoldStarkProfile";
import useScaffoldStrkBalance from "~~/hooks/scaffold-stark/useScaffoldStrkBalance";

interface AddressDetailsClientProps {
  address: string;
}

export default function AddressDetailsClient({ address }: AddressDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showRawEventData, setShowRawEventData] = useState(false);

  // Fetch address details using scaffold hooks
  const {
    addressDetails,
    isLoading: isAddressLoading,
    error: addressError,
  } = useFetchAddressDetails(address as `0x${string}`);
  const { data: profileData, isLoading: isProfileLoading } =
    useScaffoldStarkProfile(address as `0x${string}`);
  const { formatted: strkBalance, isLoading: isBalanceLoading } =
    useScaffoldStrkBalance({
      address: address as `0x${string}`,
    });

  // Fetch all transactions for this address
  const {
    txns,
    isLoading: isTxnsLoading,
    error: txnsError,
  } = useFetchAllTxns({
    bySenderAddress: address as `0x${string}`,
  });

  // Fetch events for this address using the enhanced hook
  const { events: eventsData, isLoading: isEventsLoading } = useFetchEvents({
    address: address as `0x${string}`,
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleEventExpansion = (eventKey: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventKey)) {
        newSet.delete(eventKey);
      } else {
        newSet.add(eventKey);
      }
      return newSet;
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Balance Section */}
            <div className="bg-base-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>💰</span>
                Balance
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">STRK Balance:</span>
                  {isBalanceLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <span className="font-mono font-semibold">
                      {strkBalance || "0"} STRK
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Info Section */}
            {profileData && (
              <div className="bg-base-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>👤</span>
                  Profile
                </h3>
                <div className="space-y-2">
                  {profileData.name && (
                    <div className="flex justify-between items-center">
                      <span className="text-base-content/70">Name:</span>
                      <span className="font-semibold">{profileData.name}</span>
                    </div>
                  )}
                  {profileData.profilePicture && (
                    <div className="flex justify-center mt-4">
                      <Image
                        src={profileData.profilePicture}
                        alt="Profile"
                        width={80}
                        height={80}
                        className="rounded-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contract Info Section */}
            {addressDetails && (
              <div className="bg-base-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📋</span>
                  Contract Information
                </h3>
                <div className="space-y-3">
                  {addressDetails.classHash && (
                    <div>
                      <div className="text-sm text-base-content/70 mb-1">
                        Class Hash:
                      </div>
                      <div className="flex items-center gap-2 bg-base-300 rounded p-2">
                        <code className="text-xs flex-1 break-all">
                          {addressDetails.classHash}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              addressDetails.classHash || "",
                              "classHash",
                            )
                          }
                          className="btn btn-ghost btn-xs"
                        >
                          {copiedField === "classHash" ? (
                            <CheckIcon className="h-4 w-4" />
                          ) : (
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="bg-base-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📊</span>
                Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-base-300 rounded p-4">
                  <div className="text-sm text-base-content/70 mb-1">
                    Transactions
                  </div>
                  <div className="text-2xl font-bold">
                    {isTxnsLoading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      txns?.length || 0
                    )}
                  </div>
                </div>
                <div className="bg-base-300 rounded p-4">
                  <div className="text-sm text-base-content/70 mb-1">
                    Events
                  </div>
                  <div className="text-2xl font-bold">
                    {isEventsLoading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      eventsData?.length || 0
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "transactions":
        return (
          <div className="bg-base-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Transactions</h3>
            {isTxnsLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : txnsError ? (
              <div className="alert alert-error">
                <span>Error loading transactions: {String(txnsError)}</span>
              </div>
            ) : txns && txns.length > 0 ? (
              <div className="space-y-3">
                {txns.map((tx, index) => (
                  <div
                    key={index}
                    className="bg-base-300 rounded-lg p-4 hover:bg-base-content/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/blockexplorer/tx/${tx.transactionHash}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-base-content/70 mb-1">
                          Transaction Hash
                        </div>
                        <code className="text-sm break-all">{tx.transactionHash}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-primary badge-sm">
                          View
                        </span>
                        <ChevronRightIcon className="h-5 w-5" />
                      </div>
                    </div>
                    {tx.timestamp && (
                      <div className="text-xs text-base-content/50 mt-2">
                        {new Date(tx.timestamp * 1000).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                No transactions found
              </div>
            )}
          </div>
        );

      case "events":
        return (
          <div className="bg-base-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Events</h3>
              <button
                onClick={() => setShowRawEventData(!showRawEventData)}
                className="btn btn-sm btn-ghost"
              >
                {showRawEventData ? "Show Parsed" : "Show Raw"}
              </button>
            </div>
            {isEventsLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : eventsData && eventsData.length > 0 ? (
              <div className="space-y-3">
                {eventsData.map((event, index) => {
                  const eventKey = `${event.transactionHash}-${index}`;
                  const isExpanded = expandedEvents.has(eventKey);

                  return (
                    <div key={eventKey} className="bg-base-300 rounded-lg p-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleEventExpansion(eventKey)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDownIcon className="h-5 w-5" />
                            ) : (
                              <ChevronRightIcon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                {event.eventName || "Unknown Event"}
                              </span>
                            </div>
                            <code className="text-xs text-base-content/70 break-all block">
                              {event.transactionHash}
                            </code>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-base-content/10">
                          <div className="space-y-2">
                            {event.parsedArgs &&
                            Object.keys(event.parsedArgs).length > 0 ? (
                              Object.entries(event.parsedArgs).map(
                                ([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="text-sm font-semibold text-base-content/70 min-w-[120px]">
                                      {key}:
                                    </span>
                                    <span className="text-sm font-mono break-all flex-1">
                                      {String(value)}
                                    </span>
                                  </div>
                                ),
                              )
                            ) : event.args && Object.keys(event.args).length > 0 ? (
                              Object.entries(event.args).map(
                                ([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="text-sm font-semibold text-base-content/70 min-w-[120px]">
                                      {key}:
                                    </span>
                                    <span className="text-sm font-mono break-all flex-1">
                                      {String(value)}
                                    </span>
                                  </div>
                                ),
                              )
                            ) : (
                              <div className="text-sm text-base-content/50">
                                No event data available
                              </div>
                            )}
                          </div>

                          {event.blockNumber && (
                            <div className="mt-3 pt-3 border-t border-base-content/10">
                              <div className="text-xs text-base-content/50">
                                Block: {event.blockNumber}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                No events found
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (isAddressLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (addressError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Error loading address details: {String(addressError)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-sm mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </button>

        <div className="bg-base-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>📍</span>
            Address Details
          </h1>

          <div className="flex items-center gap-2 bg-base-300 rounded p-3">
            <code className="text-sm flex-1 break-all">{address}</code>
            <button
              onClick={() => copyToClipboard(address, "address")}
              className="btn btn-ghost btn-sm"
            >
              {copiedField === "address" ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <DocumentDuplicateIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {profileData?.name && (
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-primary">
                {profileData.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="tabs tabs-boxed bg-base-200">
          <button
            className={`tab ${activeTab === "overview" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === "transactions" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions
            {!isTxnsLoading && txns && (
              <span className="badge badge-sm ml-2">{txns.length}</span>
            )}
          </button>
          <button
            className={`tab ${activeTab === "events" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            Events
            {!isEventsLoading && eventsData && (
              <span className="badge badge-sm ml-2">{eventsData.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}

