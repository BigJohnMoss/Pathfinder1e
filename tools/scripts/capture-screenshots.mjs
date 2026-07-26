#!/usr/bin/env node
import { chromium } from "@playwright/test";
import fs from "fs";
const url = process.env.URL || "http://127.0.0.1:3000";
const outDir = "tests/baseline-screenshots";
const viewports = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-412", width: 412, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "desktop-1440", width: 1440, height: 900 }
];
await fs.promises.mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(url, { waitUntil: "networkidle" });
    // give the app a moment to render dynamic content
    await page.waitForTimeout(500);
    const path = `${outDir}/${vp.name}.png`;
    await page.screenshot({ path, fullPage: true });
    console.log(`Saved ${path}`);
  }
} finally {
  await browser.close();
}
