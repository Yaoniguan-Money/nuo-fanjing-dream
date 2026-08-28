import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const cardsDirectory = path.join(projectDirectory, "content", "dream-cards");
const assetsDirectory = path.join(projectDirectory, "public", "dream-assets");
const manifestPath = path.join(projectDirectory, "content", "assets.manifest.json");
const schemaPath = path.join(projectDirectory, "docs", "dream-card", "dream-card.schema.json");
const templatePath = path.join(projectDirectory, "docs", "dream-card", "dream-card.template.json");

const errors = [];

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${path.relative(projectDirectory, filePath)}: ${message}`);
    return null;
  }
}

function relativeFile(filePath) {
  return path.relative(projectDirectory, filePath);
}

function addSchemaErrors(filePath, validationErrors) {
  for (const issue of validationErrors ?? []) {
    const location = issue.instancePath || "/";
    errors.push(`${relativeFile(filePath)}${location}: ${issue.message}`);
  }
}

function isInside(parentDirectory, candidatePath) {
  const relativePath = path.relative(parentDirectory, candidatePath);
  return relativePath !== "" && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

const schema = await readJson(schemaPath);
const manifest = await readJson(manifestPath);
let cardNames = [];
try {
  cardNames = (await readdir(cardsDirectory)).filter((name) => name.endsWith(".json")).sort();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  errors.push(`${relativeFile(cardsDirectory)}: ${message}`);
}
const cardPaths = cardNames.map((name) => path.join(cardsDirectory, name));
const contentPaths = [...cardPaths, templatePath];
const cards = [];

if (schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);

  for (const filePath of contentPaths) {
    const content = await readJson(filePath);
    if (!content) continue;

    const isValid = validate(content);
    if (!isValid) addSchemaErrors(filePath, validate.errors);

    const referencedSchema = typeof content.$schema === "string"
      ? path.resolve(path.dirname(filePath), content.$schema)
      : null;
    if (referencedSchema !== schemaPath) {
      errors.push(`${relativeFile(filePath)}: $schema must resolve to docs/dream-card/dream-card.schema.json`);
    }

    if (cardPaths.includes(filePath) && isValid) cards.push({ filePath, content });
  }
}

const assetById = new Map();
if (manifest?.schemaVersion !== "0.1.0") {
  errors.push("content/assets.manifest.json: schemaVersion must be 0.1.0");
}
if (!manifest || !Array.isArray(manifest.assets)) {
  errors.push("content/assets.manifest.json: assets must be an array");
} else {
  for (const [index, asset] of manifest.assets.entries()) {
    const label = `content/assets.manifest.json/assets/${index}`;
    if (!asset || typeof asset.assetId !== "string" || typeof asset.file !== "string") {
      errors.push(`${label}: assetId and file are required strings`);
      continue;
    }
    if (assetById.has(asset.assetId)) {
      errors.push(`${label}: duplicate assetId ${asset.assetId}`);
      continue;
    }
    assetById.set(asset.assetId, asset);

    const assetPath = path.resolve(assetsDirectory, asset.file);
    if (!isInside(assetsDirectory, assetPath) || assetPath.startsWith(`${path.join(assetsDirectory, "source")}${path.sep}`)) {
      errors.push(`${label}: file must stay inside public/dream-assets and outside public/dream-assets/source`);
      continue;
    }
    try {
      const assetStat = await stat(assetPath);
      if (!assetStat.isFile()) errors.push(`${label}: ${asset.file} is not a file`);
      if (!Number.isInteger(asset.bytes)) {
        errors.push(`${label}: bytes must be an integer`);
      } else if (asset.bytes !== assetStat.size) {
        errors.push(`${label}: bytes is ${asset.bytes}, actual size is ${assetStat.size}`);
      }
    } catch {
      errors.push(`${label}: missing file ${asset.file}`);
    }
  }
}

const cardIdToFile = new Map();
for (const { filePath, content } of cards) {
  const previousFile = cardIdToFile.get(content.meta.id);
  if (previousFile) {
    errors.push(`${relativeFile(filePath)}: duplicate meta.id ${content.meta.id} also used by ${previousFile}`);
  } else {
    cardIdToFile.set(content.meta.id, relativeFile(filePath));
  }

  for (const [actIndex, act] of content.data.acts.entries()) {
    const references = [act.backgroundAssetId, ...act.characters.map((character) => character.assetId)];
    for (const assetId of references) {
      if (!assetById.has(assetId)) {
        errors.push(`${relativeFile(filePath)}/data/acts/${actIndex}: unknown assetId ${assetId}`);
      }
    }

    const instanceIds = new Set();
    const positions = new Set();
    for (const character of act.characters) {
      if (instanceIds.has(character.instanceId)) {
        errors.push(`${relativeFile(filePath)}/data/acts/${actIndex}: duplicate instanceId ${character.instanceId}`);
      }
      if (positions.has(character.position)) {
        errors.push(`${relativeFile(filePath)}/data/acts/${actIndex}: duplicate character position ${character.position}`);
      }
      instanceIds.add(character.instanceId);
      positions.add(character.position);
    }
  }
}

if (errors.length > 0) {
  console.error(`Dream Card validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${cards.length} dream card(s), ${assetById.size} asset(s), and the template.`);
}
