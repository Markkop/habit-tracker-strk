import React from "react";
import TransactionDetailsClient from "./TransactionDetailsClient";

interface TransactionDetailsProps {
  params: Promise<{
    hash: string;
  }>;
}

// Generate at least one sample path so Next.js builds the page structure
// The 404.html fallback will handle all other transaction hashes client-side
export async function generateStaticParams() {
  return [
    { hash: "0x0" }, // Placeholder - all real hashes handled by 404 fallback
  ];
}

export default async function TransactionDetails({ params }: TransactionDetailsProps) {
  const resolvedParams = await params;
  return <TransactionDetailsClient hash={resolvedParams.hash} />;
}
