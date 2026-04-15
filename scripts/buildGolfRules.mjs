import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const inputPath = path.join(repoRoot, 'public', 'golf-rules-official.txt');
const outputPath = path.join(repoRoot, 'src', 'app', 'data', 'golfRulesOfficial.json');

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripDotLeaders(text) {
  return text.replace(/(?:\s*\.\s*){2,}/g, ' ');
}

function truncate(text, maxChars) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3).trim()}...`;
}

function parsePages(rawText) {
  const pageRegex = /\[\[PAGE (\d+)\]\]\n?/g;
  const pages = new Map();
  let lastIndex = 0;
  let currentPage = null;
  let match;

  while ((match = pageRegex.exec(rawText)) !== null) {
    if (currentPage !== null) {
      pages.set(currentPage, rawText.slice(lastIndex, match.index));
    }
    currentPage = Number(match[1]);
    lastIndex = pageRegex.lastIndex;
  }

  if (currentPage !== null) {
    pages.set(currentPage, rawText.slice(lastIndex));
  }

  return pages;
}

function parseTocEntries(pages) {
  const rules = new Map();
  const tocPages = [];
  for (let page = 23; page <= 42; page += 1) {
    const content = pages.get(page);
    if (content) tocPages.push(content);
  }

  const lines = tocPages
    .join('\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''));

  let buffer = [];

  function maybeFinalizeBuffer() {
    if (buffer.length === 0) return;
    const combined = stripDotLeaders(buffer.join(' ')).replace(/\s+/g, ' ').trim();
    const match = combined.match(/^(.*?)(\d+)\s*$/);
    if (!match) return;

    buffer = [];
    const content = normalizeWhitespace(match[1]);
    const page = Number(match[2]);
    if (!content || content === 'Aclaraciones') return;

    const ruleMatch = content.match(/^Regla\s+(\d+)\s*[-–]\s*(.+)$/u);
    if (ruleMatch) {
      const ruleId = ruleMatch[1];
      const title = normalizeWhitespace(ruleMatch[2]);
      const existing = rules.get(ruleId) ?? {
        ruleId,
        title,
        page,
        sections: [],
        clarifications: [],
      };
      existing.title = title;
      existing.page = page;
      rules.set(ruleId, existing);
      return;
    }

    const itemMatch = content.match(
      /^(\d+(?:\.\d+)?[a-z]?(?:\(\d+\))?(?:\/\d+)?)\s*[–-]?\s*(.+)$/u,
    );
    if (!itemMatch) return;

    const itemId = itemMatch[1];
    const title = normalizeWhitespace(itemMatch[2]);
    const parentRuleIdMatch = itemId.match(/^(\d+)/);
    if (!parentRuleIdMatch) return;
    const parentRuleId = parentRuleIdMatch[1];
    const parentRule = rules.get(parentRuleId) ?? {
      ruleId: parentRuleId,
      title: `Regla ${parentRuleId}`,
      page: page,
      sections: [],
      clarifications: [],
    };

    const targetCollection = itemId.includes('/') ? parentRule.clarifications : parentRule.sections;
    if (!targetCollection.some((item) => item.itemId === itemId)) {
      targetCollection.push({ itemId, title, page });
    }
    rules.set(parentRuleId, parentRule);
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      line === '' ||
      line === 'Contenidos' ||
      /^\d+$/.test(line) ||
      /^[IVXLCDM]+$/i.test(line) ||
      /^Reglas \d+/u.test(line) ||
      /^[IVXLCDM]+\s/.test(line) ||
      /^X\./.test(line) ||
      /^Definiciones\b/u.test(line) ||
      /^Procedimientos\b/u.test(line) ||
      /^Modelo de Reglas\b/u.test(line)
    ) {
      continue;
    }

    buffer.push(line);
    if (/\d+\s*$/.test(line)) {
      maybeFinalizeBuffer();
    }
  }

  maybeFinalizeBuffer();

  return [...rules.values()].sort((a, b) => Number(a.ruleId) - Number(b.ruleId));
}

function buildParagraphs(text) {
  const lines = text
    .replace(/\[\[PAGE \d+\]\]/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim());

  const paragraphs = [];
  let current = [];

  function flushCurrent() {
    if (current.length > 0) {
      paragraphs.push(current.join(' ').trim());
      current = [];
    }
  }

  for (const line of lines) {
    if (
      !line ||
      /^Regla \d+$/u.test(line) ||
      /^Reglas \d+/u.test(line) ||
      /^\d+$/.test(line) ||
      /^[IVXLCDM]+$/i.test(line) ||
      line === 'REGLA'
    ) {
      flushCurrent();
      continue;
    }

    if (line.startsWith('•') || line.startsWith('»')) {
      flushCurrent();
      paragraphs.push(line);
      continue;
    }

    current.push(line);
  }

  flushCurrent();
  return paragraphs;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractPurpose(ruleId, rawSegment, fullText) {
  const cleanedSegment = rawSegment
    .replace(/\[\[PAGE \d+\]\]/g, '\n')
    .replace(/^\s*Regla \d+\s*$/gmu, '')
    .replace(/^\s*Reglas \d+[–-]\d+\s*$/gmu, '')
    .replace(/^\s*REGLA\s*$/gmu, '')
    .replace(/^\s*\d+\s*$/gmu, '');

  const firstSectionId = `${ruleId}.1`;
  const purposeRegex = new RegExp(
    `Propósito de la Regla:\\s*([\\s\\S]*?)(?=\\n\\s*${escapeRegExp(firstSectionId)}\\b)`,
    'u',
  );
  const directMatch = cleanedSegment.match(purposeRegex);
  if (directMatch) {
    return normalizeWhitespace(directMatch[1].replace(/\n+/g, ' '));
  }

  const fallbackRegex = /Propósito de la Regla:\s*([\s\S]*?)(?=\n\n\d+\.\d\b)/u;
  const fallbackMatch = fullText.match(fallbackRegex);
  if (fallbackMatch) {
    return normalizeWhitespace(fallbackMatch[1].replace(/\n+/g, ' '));
  }

  return '';
}

function parseRuleBodies(pages) {
  const bodyText = [];
  for (let page = 44; page <= 390; page += 1) {
    const content = pages.get(page);
    if (content) {
      bodyText.push(`[[PAGE ${page}]]\n${content}`);
    }
  }

  const raw = bodyText.join('\n');
  const startRegex = /(?:^|\n)REGLA\s*\n\s*(\d+)\b/g;
  const matches = [...raw.matchAll(startRegex)];
  const bodies = new Map();

  matches.forEach((match, index) => {
    const ruleId = match[1];
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? raw.length : raw.length;
    const segment = raw.slice(start, end);
    const paragraphs = buildParagraphs(segment);
    const fullText = paragraphs.join('\n\n').trim();
    bodies.set(ruleId, {
      fullText,
      purpose: extractPurpose(ruleId, segment, fullText),
      excerpt: truncate(fullText, 1600),
    });
  });

  return bodies;
}

const rawText = readFileSync(inputPath, 'utf8');
const pages = parsePages(rawText);
const tocRules = parseTocEntries(pages);
const bodies = parseRuleBodies(pages);

const structuredRules = tocRules.map((rule) => {
  const body = bodies.get(rule.ruleId) ?? { fullText: '', purpose: '', excerpt: '' };
  let purpose = body.purpose;
  const firstSection = rule.sections[0];
  if (firstSection && body.fullText) {
    const exactSectionHeading = `${firstSection.itemId} ${firstSection.title}`;
    const sectionIndex =
      body.fullText.indexOf(exactSectionHeading) >= 0
        ? body.fullText.indexOf(exactSectionHeading)
        : body.fullText.indexOf(firstSection.itemId);
    if (sectionIndex > 0) {
      const purposeBlock = body.fullText.slice(0, sectionIndex);
      const purposeOnly = purposeBlock.replace(/^Propósito de la Regla:\s*/u, '').trim();
      if (purposeOnly) {
        purpose = normalizeWhitespace(purposeOnly);
      }
    }
  }

  return {
    ruleId: rule.ruleId,
    title: rule.title,
    page: rule.page,
    purpose,
    excerpt: body.excerpt,
    sections: rule.sections,
    clarifications: rule.clarifications,
    fullText: body.fullText,
  };
});

writeFileSync(outputPath, `${JSON.stringify(structuredRules, null, 2)}\n`, 'utf8');

console.log(
  `Generated ${structuredRules.length} golf rules in ${path.relative(repoRoot, outputPath)}`,
);
