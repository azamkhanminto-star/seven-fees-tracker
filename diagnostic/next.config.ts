import type { NextConfig } from "next";

const config: NextConfig = {
  // Chromium for PDF export must not be bundled by webpack.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "exceljs"],
  // Fonts and logos are read from disk when PDFs are rendered; make sure they ship with the functions.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@fontsource/*/files/*-normal.woff2", "./node_modules/@fontsource/*/*.css", "./public/brand/*.svg"],
  },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default config;
