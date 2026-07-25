import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

test("installable app metadata targets standalone desktop and Android use", async () => {
  const manifest = await readFile("apps/web/app/manifest.ts", "utf8");
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /start_url: "\/"/);
  assert.match(manifest, /pf1e-192\.png/);
  assert.match(manifest, /pf1e-512\.png/);
  assert.match(manifest, /purpose: "maskable"/);
});

test("service worker provides a versioned offline application shell", async () => {
  const worker = await readFile("apps/web/public/sw.js", "utf8");
  assert.match(worker, /CACHE_VERSION/);
  assert.match(worker, /offline\.html/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /caches\.delete/);
});

test("application updates require an explicit safe-refresh decision", async () => {
  const worker = await readFile("apps/web/public/sw.js", "utf8");
  const registration = await readFile(
    "apps/web/app/pwa-registration.tsx",
    "utf8",
  );

  assert.doesNotMatch(
    worker.match(/self\.addEventListener\("install"[\s\S]*?\n}\);/)?.[0] ?? "",
    /skipWaiting/,
  );
  assert.match(worker, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(registration, /registration\.waiting/);
  assert.match(registration, /Save or export your character/);
  assert.match(registration, /Update now/);
  assert.match(registration, /controllerchange/);
});

test("all declared application icons exist", async () => {
  await Promise.all([
    access("apps/web/public/icons/pf1e-192.png"),
    access("apps/web/public/icons/pf1e-512.png"),
    access("apps/web/public/icons/pf1e-maskable-512.png"),
  ]);
});
