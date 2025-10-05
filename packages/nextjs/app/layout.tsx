import type { Metadata } from "next";
import { ScaffoldStarkAppWithProviders } from "~~/components/ScaffoldStarkAppWithProviders";
import "~~/styles/globals.css";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { RedirectHandler } from "./redirect-handler";

export const metadata: Metadata = {
  title: "Habit Tracker STRK - Build Habits with Staking",
  description:
    "A StarkNet-based habit tracking dApp where users stake STRK tokens on daily habits. Check in daily to win your stake back, or lose it to the treasury.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/android-chrome-512x512.png" },
    ],
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_PATH
      ? `https://marcelokopmann1.github.io${process.env.NEXT_PUBLIC_BASE_PATH}`
      : "http://localhost:3000"
  ),
  openGraph: {
    title: "Habit Tracker STRK - Build Habits with Staking",
    description:
      "Stake STRK tokens on daily habits. Check in before midnight UTC to win your stake back!",
    type: "website",
    siteName: "Habit Tracker STRK",
    images: [
      {
        url: "/habitchain-logo.png",
        width: 1200,
        height: 630,
        alt: "Habit Tracker STRK",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Habit Tracker STRK - Build Habits with Staking",
    description:
      "Stake STRK tokens on daily habits. Check in before midnight UTC to win your stake back!",
    images: ["/habitchain-logo.png"],
  },
  keywords: [
    "starknet",
    "habit tracker",
    "crypto",
    "staking",
    "web3",
    "dapp",
    "accountability",
    "habits",
    "STRK",
  ],
  authors: [{ name: "Habit Tracker STRK" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#8a45fc" },
  ],
};

const ScaffoldStarkApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider enableSystem>
          <ScaffoldStarkAppWithProviders>
            <RedirectHandler />
            {children}
          </ScaffoldStarkAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldStarkApp;
