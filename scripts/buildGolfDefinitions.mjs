import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'public', 'definiciones.md');
const outputPath = path.join(root, 'src', 'app', 'data', 'golfDefinitions.json');

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\b\d{2,4}\s*Definiciones\b/gi, ' ')
    .replace(/\bDefiniciones\b/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeForSearch(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildShortDefinition(content) {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  const firstSentence = compact.split(/(?<=[\.!?])\s+/)[0] || compact;
  if (firstSentence.length <= 220) return firstSentence;
  return `${firstSentence.slice(0, 217).trim()}...`;
}

function cleanHeading(raw) {
  return raw
    .replace(/^#+\s*/, '')
    .replace(/^\d+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const skipHeadings = new Set([
  'definiciones',
  'casos especiales',
]);

const raw = fs.readFileSync(inputPath, 'utf8');
const lines = raw.replace(/\r\n/g, '\n').split('\n');

const sections = [];
let currentTerm = '';
let currentContent = [];

function pushCurrent() {
  if (!currentTerm) return;
  const cleanTerm = cleanHeading(currentTerm);
  const normalizedTerm = normalizeForSearch(cleanTerm);
  if (!cleanTerm || skipHeadings.has(normalizedTerm)) {
    currentTerm = '';
    currentContent = [];
    return;
  }

  const merged = normalizeWhitespace(currentContent.join('\n'));
  if (!merged) {
    currentTerm = '';
    currentContent = [];
    return;
  }

  const compact = merged.replace(/\s+/g, ' ').trim();
  if (compact.length < 40) {
    currentTerm = '';
    currentContent = [];
    return;
  }

  sections.push({
    term: cleanTerm,
    aliases: [normalizedTerm],
    shortDefinition: buildShortDefinition(compact),
    fullDefinition: compact,
  });

  currentTerm = '';
  currentContent = [];
}

for (const line of lines) {
  const m = line.match(/^##\s+(.+)$/);
  if (m) {
    pushCurrent();
    currentTerm = m[1];
    continue;
  }
  currentContent.push(line);
}
pushCurrent();

const seen = new Set();
const deduped = [];
for (const entry of sections) {
  const key = normalizeForSearch(entry.term);
  if (!key || seen.has(key)) continue;
  seen.add(key);
  deduped.push(entry);
}

fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));

console.log(`Generated ${deduped.length} definitions at ${path.relative(root, outputPath)}`);
