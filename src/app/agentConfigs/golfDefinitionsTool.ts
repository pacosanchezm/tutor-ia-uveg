import { tool } from '@openai/agents/realtime';
import rawDefinitions from '@/app/data/golfDefinitions.json';

interface GolfDefinitionRecord {
  term: string;
  aliases: string[];
  shortDefinition: string;
  fullDefinition: string;
}

interface DefinitionEntry extends GolfDefinitionRecord {
  termId: string;
  termNormalized: string;
  aliasesNormalized: string[];
  shortNormalized: string;
  fullNormalized: string;
  termTokens: Set<string>;
}

interface ResolveResultFound {
  kind: 'found';
  entry: DefinitionEntry;
}

interface ResolveResultNotFound {
  kind: 'not_found';
  suggestions: Array<{ termId: string; term: string }>;
}

interface ResolveResultAmbiguous {
  kind: 'ambiguous';
  candidates: Array<{ termId: string; term: string }>;
}

type ResolveResult = ResolveResultFound | ResolveResultNotFound | ResolveResultAmbiguous;

const spanishStopwords = new Set([
  'de',
  'del',
  'la',
  'las',
  'el',
  'los',
  'y',
  'o',
  'u',
  'en',
  'con',
  'sin',
  'para',
  'por',
  'como',
  'que',
  'se',
  'su',
  'sus',
  'al',
  'lo',
  'un',
  'una',
  'unos',
  'unas',
  'es',
  'son',
  'ser',
  'esta',
  'este',
  'estas',
  'estos',
  'si',
  'no',
  'ya',
  'mas',
  'menos',
  'cuando',
  'donde',
  'desde',
  'hasta',
  'sobre',
  'entre',
  'tambien',
  'puede',
  'pueden',
  'jugador',
  'jugadores',
  'bola',
  'campo',
  'regla',
  'reglas',
]);

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3).trim()}...`;
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items)];
}

function slugify(text: string): string {
  const normalized = normalizeText(text);
  if (!normalized) return '';
  return normalized
    .split(' ')
    .filter((token) => token.length > 0)
    .slice(0, 8)
    .join('-');
}

function buildKeywords(entry: DefinitionEntry, max = 10): string[] {
  const tokens = tokenize(`${entry.term} ${entry.shortDefinition}`)
    .filter((token) => token.length >= 4)
    .filter((token) => !spanishStopwords.has(token));
  return uniqueStrings(tokens).slice(0, max);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const definitions = rawDefinitions as GolfDefinitionRecord[];
const idCounter = new Map<string, number>();

const indexedDefinitions: DefinitionEntry[] = definitions.map((record, index) => {
  const baseSlug = slugify(record.term) || `termino-${index + 1}`;
  const seen = idCounter.get(baseSlug) ?? 0;
  idCounter.set(baseSlug, seen + 1);
  const termId = seen === 0 ? baseSlug : `${baseSlug}-${seen + 1}`;

  return {
    ...record,
    termId,
    termNormalized: normalizeText(record.term),
    aliasesNormalized: (record.aliases ?? [])
      .map((alias) => normalizeText(alias))
      .filter((alias) => Boolean(alias)),
    shortNormalized: normalizeText(record.shortDefinition),
    fullNormalized: normalizeText(record.fullDefinition),
    termTokens: new Set(tokenize(record.term)),
  };
});

const byId = new Map<string, DefinitionEntry>();
const byExactKey = new Map<string, string[]>();

function addExactKey(key: string, termId: string) {
  if (!key) return;
  const list = byExactKey.get(key) ?? [];
  if (!list.includes(termId)) {
    list.push(termId);
    byExactKey.set(key, list);
  }
}

for (const entry of indexedDefinitions) {
  byId.set(entry.termId, entry);
  addExactKey(entry.termNormalized, entry.termId);
  for (const alias of entry.aliasesNormalized) {
    addExactKey(alias, entry.termId);
  }
}

const catalog = [...indexedDefinitions]
  .sort((a, b) => a.term.localeCompare(b.term, 'es'))
  .map((entry) => ({
    termId: entry.termId,
    term: entry.term,
  }));

function getSuggestions(query: string, limit = 5): Array<{ termId: string; term: string }> {
  const queryNormalized = normalizeText(query);
  if (!queryNormalized) return catalog.slice(0, limit);
  const queryTokens = tokenize(query).filter((token) => !spanishStopwords.has(token));

  const scored = indexedDefinitions
    .map((entry) => {
      let score = 0;
      if (entry.termNormalized.includes(queryNormalized)) score += 30;
      if (entry.aliasesNormalized.some((alias) => alias.includes(queryNormalized))) score += 24;
      for (const token of queryTokens) {
        if (entry.termTokens.has(token)) score += 10;
        if (entry.shortNormalized.includes(token)) score += 4;
      }
      return {
        entry,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((item) => ({
    termId: item.entry.termId,
    term: item.entry.term,
  }));
}

function resolveDefinition(termId?: string, term?: string): ResolveResult {
  if (termId) {
    const byExactId = byId.get(termId);
    if (byExactId) {
      return { kind: 'found', entry: byExactId };
    }
    return {
      kind: 'not_found',
      suggestions: getSuggestions(termId, 5),
    };
  }

  const normalizedTerm = normalizeText(term ?? '');
  if (!normalizedTerm) {
    return {
      kind: 'not_found',
      suggestions: catalog.slice(0, 5),
    };
  }

  const ids = byExactKey.get(normalizedTerm) ?? [];
  if (ids.length === 1) {
    const entry = byId.get(ids[0]);
    if (entry) {
      return { kind: 'found', entry };
    }
  }
  if (ids.length > 1) {
    return {
      kind: 'ambiguous',
      candidates: ids
        .map((id) => byId.get(id))
        .filter((entry): entry is DefinitionEntry => Boolean(entry))
        .map((entry) => ({
          termId: entry.termId,
          term: entry.term,
        })),
    };
  }

  return {
    kind: 'not_found',
    suggestions: getSuggestions(normalizedTerm, 5),
  };
}

function resolveByTerms(terms: string[]): DefinitionEntry[] {
  const resolved = terms
    .map((term) => resolveDefinition(undefined, term))
    .filter((result): result is ResolveResultFound => result.kind === 'found')
    .map((result) => result.entry);
  return uniqueStrings(resolved.map((item) => item.termId))
    .map((termId) => resolved.find((item) => item.termId === termId))
    .filter((item): item is DefinitionEntry => Boolean(item));
}

function resolveByIds(termIds: string[]): DefinitionEntry[] {
  const resolved = termIds
    .map((termId) => resolveDefinition(termId))
    .filter((result): result is ResolveResultFound => result.kind === 'found')
    .map((result) => result.entry);
  return uniqueStrings(resolved.map((item) => item.termId))
    .map((termId) => resolved.find((item) => item.termId === termId))
    .filter((item): item is DefinitionEntry => Boolean(item));
}

export const golfDefinitionsCatalogTool = tool({
  name: 'golf_definitions_catalog',
  description:
    'Devuelve el catalogo completo de terminos disponibles con su term_id para consulta exacta.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Limita la cantidad de resultados iniciales (1 a 200).',
      },
      starts_with: {
        type: 'string',
        description: 'Opcional: filtrar por prefijo del termino.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { limit, starts_with } = input as { limit?: number; starts_with?: string };
    const normalizedPrefix = normalizeText(starts_with ?? '');
    let terms = catalog;
    if (normalizedPrefix) {
      terms = terms.filter((item) =>
        normalizeText(item.term).startsWith(normalizedPrefix),
      );
    }
    const maxItems = Math.max(1, Math.min(200, Math.floor(limit ?? terms.length)));
    return {
      totalDefinitions: catalog.length,
      returned: Math.min(maxItems, terms.length),
      terms: terms.slice(0, maxItems).map((item) => ({
        term_id: item.termId,
        term: item.term,
      })),
    };
  },
});

export const golfDefinitionSearchTool = tool({
  name: 'golf_definition_search',
  description:
    'Busca terminos del glosario para ayudar a elegir el term_id correcto.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Texto para buscar un termino (ejemplo: bunker, green, fuera de limites).',
      },
      limit: {
        type: 'number',
        description: 'Cantidad maxima de resultados (1 a 10).',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { query, limit } = input as { query: string; limit?: number };
    const maxItems = Math.max(1, Math.min(10, Math.floor(limit ?? 5)));
    const suggestions = getSuggestions(query, maxItems);
    return {
      query,
      totalDefinitions: catalog.length,
      matches: suggestions.map((item) => ({
        term_id: item.termId,
        term: item.term,
      })),
    };
  },
});

export const golfDefinitionLookupTool = tool({
  name: 'golf_definition_lookup',
  description:
    'Obtiene una definicion por term_id exacto o termino exacto del catalogo.',
  parameters: {
    type: 'object',
    properties: {
      term_id: {
        type: 'string',
        description: 'Identificador exacto del termino en el catalogo.',
      },
      termino: {
        type: 'string',
        description: 'Termino exacto del catalogo (sinonimos tambien aplican).',
      },
      detalle: {
        type: 'string',
        enum: ['breve', 'completo'],
        description: 'Nivel de detalle de la respuesta.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { term_id, termino, detalle } = input as {
      term_id?: string;
      termino?: string;
      detalle?: 'breve' | 'completo';
    };

    if (!term_id && !termino) {
      return {
        found: false,
        reason: 'missing_input',
        message: 'Debes enviar term_id o termino.',
      };
    }

    const resolved = resolveDefinition(term_id, termino);
    if (resolved.kind === 'ambiguous') {
      return {
        found: false,
        reason: 'ambiguous',
        message:
          'El termino coincide con multiples entradas. Elige una opcion usando term_id.',
        candidates: resolved.candidates.map((candidate) => ({
          term_id: candidate.termId,
          term: candidate.term,
        })),
      };
    }

    if (resolved.kind === 'not_found') {
      return {
        found: false,
        reason: 'not_found',
        message:
          'No existe coincidencia exacta. Usa uno de los siguientes terminos sugeridos.',
        suggestions: resolved.suggestions.map((suggestion) => ({
          term_id: suggestion.termId,
          term: suggestion.term,
        })),
      };
    }

    const entry = resolved.entry;
    return {
      found: true,
      term_id: entry.termId,
      term: entry.term,
      shortDefinition: truncate(entry.shortDefinition, 260),
      sourceExcerpt:
        detalle === 'completo'
          ? truncate(entry.fullDefinition, 1800)
          : truncate(entry.fullDefinition, 520),
    };
  },
});

export const golfFlashcardsTool = tool({
  name: 'golf_flashcards',
  description:
    'Genera flashcards de definiciones de golf para practicar terminos en modo rapido.',
  parameters: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['aleatorio', 'por_terminos', 'por_ids'],
        description: 'Modo de seleccion de tarjetas.',
      },
      terminos: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista de terminos exactos para practicar cuando mode=por_terminos.',
      },
      term_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista de term_id exactos cuando mode=por_ids.',
      },
      cantidad: {
        type: 'number',
        description: 'Cantidad de flashcards (1 a 10).',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { mode, terminos, term_ids, cantidad } = input as {
      mode?: 'aleatorio' | 'por_terminos' | 'por_ids';
      terminos?: string[];
      term_ids?: string[];
      cantidad?: number;
    };

    const count = Math.max(1, Math.min(10, Math.floor(cantidad ?? 5)));
    let selected: DefinitionEntry[] = [];

    if (mode === 'por_ids' && Array.isArray(term_ids) && term_ids.length > 0) {
      selected = resolveByIds(term_ids).slice(0, count);
    } else if (
      mode === 'por_terminos' &&
      Array.isArray(terminos) &&
      terminos.length > 0
    ) {
      selected = resolveByTerms(terminos).slice(0, count);
    }

    if (selected.length === 0) {
      selected = shuffle(indexedDefinitions).slice(0, count);
    }

    return {
      modeUsed: mode ?? 'aleatorio',
      totalCards: selected.length,
      cards: selected.map((entry, index) => {
        return {
          id: `card_${index + 1}`,
          term_id: entry.termId,
          termino: entry.term,
          pregunta: `Define brevemente: ${entry.term}.`,
          respuestaEsperada: truncate(entry.shortDefinition, 220),
        };
      }),
    };
  },
});

export const golfQuickEvaluateTool = tool({
  name: 'golf_quick_evaluate',
  description:
    'Evalua de forma rapida una respuesta del alumno sobre una definicion de golf y devuelve puntaje corto.',
  parameters: {
    type: 'object',
    properties: {
      term_id: {
        type: 'string',
        description: 'term_id exacto del termino que se esta evaluando.',
      },
      termino: {
        type: 'string',
        description: 'Termino exacto cuando no se proporciona term_id.',
      },
      respuesta_alumno: {
        type: 'string',
        description: 'Respuesta escrita por el alumno.',
      },
      rigor: {
        type: 'string',
        enum: ['bajo', 'medio', 'alto'],
        description: 'Nivel de exigencia al calificar.',
      },
    },
    required: ['respuesta_alumno'],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { term_id, termino, respuesta_alumno, rigor } = input as {
      term_id?: string;
      termino?: string;
      respuesta_alumno: string;
      rigor?: 'bajo' | 'medio' | 'alto';
    };

    if (!term_id && !termino) {
      return {
        found: false,
        verdict: 'sin_referencia',
        score: 0,
        feedback: 'Debes indicar term_id o termino para evaluar.',
      };
    }

    const resolved = resolveDefinition(term_id, termino);
    if (resolved.kind !== 'found') {
      return {
        found: false,
        verdict: 'sin_referencia',
        score: 0,
        feedback:
          resolved.kind === 'ambiguous'
            ? 'Termino ambiguo. Usa term_id exacto del catalogo.'
            : 'No encontre ese termino exacto. Revisa el catalogo.',
        candidates:
          resolved.kind === 'ambiguous'
            ? resolved.candidates.map((candidate) => ({
                term_id: candidate.termId,
                term: candidate.term,
              }))
            : resolved.suggestions.map((suggestion) => ({
                term_id: suggestion.termId,
                term: suggestion.term,
              })),
      };
    }

    const entry = resolved.entry;
    const keywords = buildKeywords(entry, 8);
    const responseTokens = new Set(tokenize(respuesta_alumno));
    const matched = keywords.filter((keyword) => responseTokens.has(keyword));
    const denominator = Math.max(1, Math.min(6, keywords.length));
    const coverage = matched.length / denominator;

    const thresholds =
      rigor === 'alto'
        ? { correct: 0.7, partial: 0.4 }
        : rigor === 'bajo'
          ? { correct: 0.45, partial: 0.22 }
          : { correct: 0.58, partial: 0.3 };

    let verdict: 'correcta' | 'parcial' | 'incorrecta' = 'incorrecta';
    if (coverage >= thresholds.correct) {
      verdict = 'correcta';
    } else if (coverage >= thresholds.partial) {
      verdict = 'parcial';
    }

    const score = Math.max(1, Math.min(10, Math.round(coverage * 10)));
    const missing = keywords
      .filter((keyword) => !responseTokens.has(keyword))
      .slice(0, 4);

    return {
      found: true,
      term_id: entry.termId,
      terminoDetectado: entry.term,
      rigorUsado: rigor ?? 'medio',
      score,
      verdict,
      coverage: Number(coverage.toFixed(2)),
      matchedKeywords: matched,
      missingKeywords: missing,
      referenciaBreve: truncate(entry.shortDefinition, 220),
      feedback:
        verdict === 'correcta'
          ? 'Respuesta solida. Captaste la idea central del termino.'
          : verdict === 'parcial'
            ? `Vas bien, pero te falto mencionar: ${missing.join(', ')}.`
            : `Necesita mejora. Incluye conceptos clave como: ${keywords
                .slice(0, 4)
                .join(', ')}.`,
    };
  },
});
