import sharp from "sharp";

const [source, output] = process.argv.slice(2);

if (!source || !output) {
  throw new Error("Usage: node scripts/strip-checkerboard-background.mjs <source.png> <output.png>");
}

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const isCheckerboardPixel = (offset) => {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return Math.min(red, green, blue) >= 230 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 18;
};

const visited = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let head = 0;
let tail = 0;
const enqueue = (pixel) => {
  if (visited[pixel]) return;
  const offset = pixel * 4;
  if (!isCheckerboardPixel(offset)) return;
  visited[pixel] = 1;
  queue[tail++] = pixel;
};

for (let x = 0; x < width; x += 1) {
  enqueue(x);
  enqueue((height - 1) * width + x);
}
for (let y = 1; y < height - 1; y += 1) {
  enqueue(y * width);
  enqueue(y * width + width - 1);
}

while (head < tail) {
  const pixel = queue[head++];
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  data[pixel * 4 + 3] = 0;
  if (x > 0) enqueue(pixel - 1);
  if (x < width - 1) enqueue(pixel + 1);
  if (y > 0) enqueue(pixel - width);
  if (y < height - 1) enqueue(pixel + width);
}

await sharp(data, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(output);
