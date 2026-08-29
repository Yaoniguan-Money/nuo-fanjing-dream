import sharp from "sharp";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/extract-gold-alpha.mjs <input.png> <output.png>");
}

const { data, info } = await sharp(inputPath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const rgba = Buffer.alloc(info.width * info.height * 4);

for (let source = 0, target = 0; source < data.length; source += 3, target += 4) {
  const red = data[source];
  const green = data[source + 1];
  const blue = data[source + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max - min;
  const brightness = (red + green + blue) / 3;
  const colorAlpha = Math.max(0, Math.min(1, (saturation - 4) / 32));
  const darkAlpha = Math.max(0, Math.min(1, (226 - brightness) / 70));
  const alpha = Math.round(Math.max(colorAlpha, darkAlpha * colorAlpha) * 255);

  rgba[target] = red;
  rgba[target + 1] = green;
  rgba[target + 2] = blue;
  rgba[target + 3] = alpha;
}

await sharp(rgba, {
  raw: { width: info.width, height: info.height, channels: 4 }
}).png().toFile(outputPath);
