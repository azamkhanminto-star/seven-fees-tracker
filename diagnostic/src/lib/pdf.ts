/**
 * HTML → PDF with headless Chromium. On Vercel the browser comes from @sparticuz/chromium;
 * locally set CHROME_PATH to any Chrome/Chromium binary.
 */
import type { Browser } from "puppeteer-core";

let browserPromise: Promise<Browser> | null = null;

async function browser(): Promise<Browser> {
  if (browserPromise) return browserPromise;
  browserPromise = (async () => {
    const puppeteer = (await import("puppeteer-core")).default;
    if (process.env.CHROME_PATH) {
      return puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox", "--font-render-hinting=none"], headless: true });
    }
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  })();
  browserPromise.catch(() => { browserPromise = null; });
  return browserPromise;
}

export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const b = await browser();
  const page = await b.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    return pdf;
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
}
