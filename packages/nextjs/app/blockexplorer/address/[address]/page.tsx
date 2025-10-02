import React from "react";
import AddressDetailsClient from "./AddressDetailsClient";

interface AddressDetailsProps {
  params: Promise<{
    address: string;
  }>;
}

// Required for static export - returns empty array for client-side routing
export async function generateStaticParams() {
  return [];
}

export default async function AddressDetails({ params }: AddressDetailsProps) {
  const resolvedParams = await params;
  return <AddressDetailsClient address={resolvedParams.address} />;
}

