import type { NextConfig } from "next";

const config: NextConfig = {
  // Chromium for PDF export must not be bundled by webpack.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "exceljs"],
  experimental: { serverActions: { bodySizeLimit: "40mb" } },
};

export default config;
