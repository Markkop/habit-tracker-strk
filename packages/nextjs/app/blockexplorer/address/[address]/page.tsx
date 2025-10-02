import React from "react";
import AddressDetailsClient from "./AddressDetailsClient";

interface AddressDetailsProps {
  params: Promise<{
    address: string;
  }>;
}

// Generate at least one sample path so Next.js builds the page structure
// The 404.html fallback will handle all other addresses client-side
export async function generateStaticParams() {
  return [
    { address: "0x0" }, // Placeholder - all real addresses handled by 404 fallback
  ];
}

export default async function AddressDetails({ params }: AddressDetailsProps) {
  const resolvedParams = await params;
  return <AddressDetailsClient address={resolvedParams.address} />;
}
