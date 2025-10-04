/** @type {import('next').NextConfig} */
import webpack from "webpack";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  // NOTE: Static export enabled with client-side routing fallback
  // Uses 404.html to handle dynamic routes client-side via spa-github-pages approach
  // All unknown routes fall back to 404.html which preserves the path and redirects
  output: "export", // Enable static exports for GitHub Pages
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "", // Support GitHub Pages repo path
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "", // Ensure assets load correctly
  trailingSlash: true, // Required for proper routing on static hosts
  reactStrictMode: true,
  logging: {
    incomingRequests: false,
  },
  images: {
    unoptimized: true, // Required for static export
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "identicon.starknet.id",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.starkurabu.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "github.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.cryptolar.com.br",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:(.*)$/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );

    if (dev && !isServer) {
      config.infrastructureLogging = {
        level: "error",
      };
    }

    return config;
  },
};

export default withPWA(nextConfig);
