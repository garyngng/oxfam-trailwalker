import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";
const repo = "oxfam-trailwalker";

const nextConfig: NextConfig = githubPages
  ? {
      output: "export",
      basePath: `/${repo}`,
      assetPrefix: `/${repo}/`,
    }
  : {};

export default nextConfig;
