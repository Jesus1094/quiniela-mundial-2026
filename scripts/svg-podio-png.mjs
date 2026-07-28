import sharp from "sharp";
import { readFileSync } from "node:fs";
const svg = readFileSync(new URL("../flyer-podio.svg", import.meta.url));
await sharp(svg, { density: 300 })
  .resize(1080)
  .png()
  .toFile(new URL("../flyer-podio-whatsapp.png", import.meta.url).pathname.replace(/^\//, ""));
console.log("OK: flyer-podio-whatsapp.png");
