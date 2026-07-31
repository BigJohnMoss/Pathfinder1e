import { readdir, stat } from "node:fs/promises";

const chunkDirectory = new URL("../../apps/web/.next/static/chunks/", import.meta.url);
const files = (await readdir(chunkDirectory)).filter(file => file.endsWith(".js"));
const chunks = await Promise.all(files.map(async file => ({ file, bytes: (await stat(new URL(file, chunkDirectory))).size })));
const largest = chunks.sort((left, right) => right.bytes - left.bytes)[0];
const maximumLazyChunkBytes = 5_500_000;
if (largest.bytes > maximumLazyChunkBytes) {
  console.error(`Largest client chunk ${largest.file} is ${largest.bytes} bytes; budget is ${maximumLazyChunkBytes}.`);
  process.exitCode = 1;
} else console.log(`Client chunk budget passed: ${largest.file} is ${largest.bytes}/${maximumLazyChunkBytes} bytes.`);
