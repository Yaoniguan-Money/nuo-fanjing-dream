import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error("Dream asset validation requires the sharp package to inspect image metadata.");
  process.exit(1);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const assetsDirectory = path.join(projectDirectory, "public", "dream-assets");
const manifestPath = path.join(projectDirectory, "content", "assets.manifest.json");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

function rel(filePath) {
  return path.relative(projectDirectory, filePath);
}

function isInside(parentDirectory, candidatePath) {
  const relativePath = path.relative(parentDirectory, candidatePath);
  return relativePath !== "" && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

async function inspectAlpha(filePath) {
  const image = sharp(filePath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let transparent = 0;
  let edge = 0;
  let edgeOpaque = 0;
  const edgeSize = 24;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha < 16) transparent += 1;

      const inLeft = x < edgeSize;
      const inRight = x >= info.width - edgeSize;
      const inTop = y < edgeSize;
      const inBottom = y >= info.height - edgeSize;
      if (inLeft || inRight || inTop || inBottom) {
        edge += 1;
        if (alpha > 240) edgeOpaque += 1;
      }

    }
  }

  return {
    transparentRatio: transparent / total,
    edgeOpaqueRatio: edgeOpaque / edge
  };
}

for (const [index, asset] of manifest.assets.entries()) {
  const label = `content/assets.manifest.json/assets/${index} ${asset.assetId ?? "(missing assetId)"}`;
  if (!asset?.file || !asset?.type) continue;

  if (asset.status === "placeholder" || asset.file.includes("placeholder.")) {
    errors.push(`${label}: placeholder asset is still referenced (${asset.file})`);
  }

  const assetPath = path.resolve(assetsDirectory, asset.file);
  if (!isInside(assetsDirectory, assetPath)) {
    errors.push(`${label}: file must stay inside public/dream-assets`);
    continue;
  }

  let assetStat;
  try {
    assetStat = await stat(assetPath);
  } catch {
    errors.push(`${label}: missing file ${asset.file}`);
    continue;
  }

  if (asset.bytes !== assetStat.size) {
    errors.push(`${label}: bytes is ${asset.bytes}, actual size is ${assetStat.size}`);
  }

  let metadata;
  try {
    metadata = await sharp(assetPath).metadata();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${label}: cannot read image metadata for ${asset.file}: ${message}`);
    continue;
  }

  if (metadata.width !== asset.width || metadata.height !== asset.height) {
    errors.push(`${label}: manifest size ${asset.width}x${asset.height}, actual size ${metadata.width}x${metadata.height}`);
  }

  if (asset.type === "background") {
    if (metadata.width !== 1920 || metadata.height !== 1080) {
      errors.push(`${label}: background must be 1920x1080`);
    }
    if (path.extname(asset.file) !== ".webp" || asset.mimeType !== "image/webp") {
      errors.push(`${label}: background must be WebP`);
    }
    if (metadata.hasAlpha || asset.hasAlpha !== false) {
      errors.push(`${label}: background must not have alpha`);
    }
    if (assetStat.size > 1_200_000) {
      errors.push(`${label}: background exceeds 1.2 MB hard limit`);
    }
  }

  if (asset.type === "character") {
    if (metadata.width !== 1024 || metadata.height !== 1536) {
      errors.push(`${label}: character must be 1024x1536`);
    }
    if (path.extname(asset.file) !== ".png" || asset.mimeType !== "image/png") {
      errors.push(`${label}: character must be PNG`);
    }
    if (!metadata.hasAlpha || asset.hasAlpha !== true) {
      errors.push(`${label}: character must have alpha`);
      continue;
    }
    if (assetStat.size > 2_000_000) {
      errors.push(`${label}: character exceeds 2 MB hard limit`);
    }

    const alpha = await inspectAlpha(assetPath);
    if (alpha.transparentRatio < 0.4) {
      errors.push(`${label}: transparent ratio ${alpha.transparentRatio.toFixed(3)} is too low for a sprite cutout`);
    }
    if (alpha.edgeOpaqueRatio > 0.08) {
      errors.push(`${label}: edge opaque ratio ${alpha.edgeOpaqueRatio.toFixed(3)} suggests the sprite touches the canvas edge`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Dream asset validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${manifest.assets.length} dream asset(s).`);
