"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Handles GitHub Pages SPA routing redirect
 * This script checks for redirected paths from 404.html and restores the original URL
 * See: https://github.com/rafgraph/spa-github-pages
 */
export function RedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const query = window.location.search;
    if (query && query.startsWith("?/")) {
      const route = query.slice(2).split("&")[0].replace(/~/g, "&");
      
      // Remove the query string and navigate to the intended route
      window.history.replaceState(
        null,
        "",
        window.location.pathname.slice(0, -1) + route +
          (query.split("&").slice(1).join("&") || "") +
          window.location.hash
      );
      
      // Use Next.js router to navigate
      router.replace(route);
    }
  }, [router]);

  return null;
}

