import React from "react";
import TransactionDetailsClient from "./TransactionDetailsClient";

interface TransactionDetailsProps {
  params: Promise<{
    hash: string;
  }>;
}

// Required for static export - returns empty array for client-side routing
export async function generateStaticParams() {
  return [];
}

export default async function TransactionDetails({ params }: TransactionDetailsProps) {
  const resolvedParams = await params;
  return <TransactionDetailsClient hash={resolvedParams.hash} />;
}
