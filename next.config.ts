import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The dev-only extension download zips the checked-in extension/ folder at
  // request time, so the folder has to ship with that function.
  outputFileTracingIncludes: {
    "/api/extension/download": ["./extension/**/*.{js,json,html,css,png}"],
  },
  redirects() {
    // "Lists" was renamed to "Problem Sets"; keep old bookmarks working.
    return [{ source: "/lists", destination: "/problem-sets", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
