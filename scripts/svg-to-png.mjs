// Rasteriza flyer.svg a PNG de alta resolución para compartir (WhatsApp).
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync(new URL("../flyer.svg", import.meta.url));

await sharp(svg, { density: 300 })
  .resize(1080) // ancho 1080px (alto proporcional ~1271px), ideal para WhatsApp
  .png()
  .toFile(new URL("../flyer-whatsapp.png", import.meta.url).pathname.replace(/^\//, ""));

console.log("OK: flyer-whatsapp.png generado.");
