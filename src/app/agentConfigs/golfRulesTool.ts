import { tool } from '@openai/agents/realtime';
import rawRules from '@/app/data/golfRulesOfficial.json';

interface GolfRuleItemRecord {
  itemId: string;
  title: string;
  page: number;
}

interface GolfRuleRecord {
  ruleId: string;
  title: string;
  page: number;
  purpose: string;
  excerpt: string;
  sections: GolfRuleItemRecord[];
  clarifications: GolfRuleItemRecord[];
  fullText: string;
}

interface IndexedGolfRuleRecord extends GolfRuleRecord {
  titleNormalized: string;
  purposeNormalized: string;
  fullTextNormalized: string;
}

interface GolfRuleItemIndex extends GolfRuleItemRecord {
  ruleId: string;
  matchType: 'section' | 'clarification';
  itemIdNormalized: string;
  titleNormalized: string;
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s./()-]/g, ' ')
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

const rules = (rawRules as GolfRuleRecord[]).map((rule) => ({
  ...rule,
  titleNormalized: normalizeText(rule.title),
  purposeNormalized: normalizeText(rule.purpose),
  fullTextNormalized: normalizeText(rule.fullText),
})) as IndexedGolfRuleRecord[];
const rulesById = new Map(rules.map((rule) => [rule.ruleId, rule]));
const catalog = rules.map((rule) => ({
  rule_id: rule.ruleId,
  title: rule.title,
  page: rule.page,
  sections_count: rule.sections.length,
  clarifications_count: rule.clarifications.length,
}));

const items: GolfRuleItemIndex[] = rules.flatMap((rule) => [
  ...rule.sections.map((item) => ({
    ...item,
    ruleId: rule.ruleId,
    matchType: 'section' as const,
    itemIdNormalized: normalizeText(item.itemId),
    titleNormalized: normalizeText(item.title),
  })),
  ...rule.clarifications.map((item) => ({
    ...item,
    ruleId: rule.ruleId,
    matchType: 'clarification' as const,
    itemIdNormalized: normalizeText(item.itemId),
    titleNormalized: normalizeText(item.title),
  })),
]);

const itemsById = new Map(items.map((item) => [item.itemId, item]));

const formatHints = [
  'match play',
  'stroke play',
  'four-ball',
  'foursomes',
  'stableford',
  'score maximo',
  'par bogey',
  'competencia',
  'ronda',
];

const areaHints = [
  'bunker',
  'green',
  'area de penalidad',
  'área de penalidad',
  'fuera de limites',
  'fuera de límites',
  'area general',
  'área general',
  'area de salida',
  'tee',
];

const ballStateHints = [
  'bola provisional',
  'bola perdida',
  'fuera de limites',
  'fuera de límites',
  'injugable',
  'movio la bola',
  'movió la bola',
  'dropear',
  'recolocar',
  'levantar',
];

const actorHints = [
  'jugador',
  'caddie',
  'oponente',
  'companero',
  'compañero',
  'arbitro',
  'árbitro',
  'comite',
  'comité',
  'animal',
  'espectador',
];

function containsAny(text: string, hints: string[]): boolean {
  return hints.some((hint) => text.includes(normalizeText(hint)));
}

function detectFacts(caseDescription: string) {
  const normalizedCase = normalizeText(caseDescription);
  const facts: string[] = [];

  const formatFact = formatHints.find((hint) => normalizedCase.includes(normalizeText(hint)));
  if (formatFact) {
    facts.push(`Modalidad detectada: ${formatFact}.`);
  }

  const areaFact = areaHints.find((hint) => normalizedCase.includes(normalizeText(hint)));
  if (areaFact) {
    facts.push(`Area relevante detectada: ${areaFact}.`);
  }

  const ballFact = ballStateHints.find((hint) => normalizedCase.includes(normalizeText(hint)));
  if (ballFact) {
    facts.push(`Estado o procedimiento de bola detectado: ${ballFact}.`);
  }

  const actorFact = actorHints.find((hint) => normalizedCase.includes(normalizeText(hint)));
  if (actorFact) {
    facts.push(`Actor detectado: ${actorFact}.`);
  }

  return facts;
}

function detectMissingFacts(caseDescription: string) {
  const normalizedCase = normalizeText(caseDescription);
  const missingFacts: string[] = [];

  if (!containsAny(normalizedCase, formatHints)) {
    missingFacts.push('No queda clara la modalidad de juego o competencia.');
  }
  if (!containsAny(normalizedCase, areaHints)) {
    missingFacts.push('No se identifica con claridad el area del campo involucrada.');
  }
  if (!containsAny(normalizedCase, actorHints)) {
    missingFacts.push('Falta precisar quien realizo la accion relevante.');
  }
  if (!containsAny(normalizedCase, ballStateHints)) {
    missingFacts.push('Falta describir el estado de la bola o el procedimiento aplicado.');
  }

  return missingFacts;
}

function buildExcerptFromRule(rule: IndexedGolfRuleRecord, item?: GolfRuleItemIndex): string {
  if (!item) {
    return truncate(rule.fullText || rule.excerpt || rule.purpose, 1400);
  }

  const directIdIndex = rule.fullText.indexOf(item.itemId);
  if (directIdIndex >= 0) {
    return truncate(rule.fullText.slice(directIdIndex, directIdIndex + 1400), 1400);
  }

  const shortTitle = item.title.slice(0, 80);
  const titleIndex = rule.fullText
    .toLowerCase()
    .indexOf(shortTitle.toLowerCase());
  if (titleIndex >= 0) {
    return truncate(rule.fullText.slice(titleIndex, titleIndex + 1400), 1400);
  }

  return truncate(rule.fullText || rule.excerpt || rule.purpose, 1400);
}

function scoreRule(rule: IndexedGolfRuleRecord, query: string, queryTokens: string[]): number {
  const normalizedQuery = normalizeText(query);
  let score = 0;
  if (rule.ruleId === normalizedQuery || `regla ${rule.ruleId}` === normalizedQuery) score += 100;
  if (rule.titleNormalized.includes(normalizedQuery)) score += 45;
  if (rule.purposeNormalized.includes(normalizedQuery)) score += 18;
  if (rule.fullTextNormalized.includes(normalizedQuery)) score += 12;
  for (const token of queryTokens) {
    if (rule.titleNormalized.includes(token)) score += 10;
    if (rule.purposeNormalized.includes(token)) score += 4;
  }
  return score;
}

function scoreItem(
  item: GolfRuleItemIndex,
  rule: IndexedGolfRuleRecord,
  query: string,
  queryTokens: string[],
): number {
  const normalizedQuery = normalizeText(query);
  let score = 0;
  if (item.itemId === query.trim()) score += 120;
  if (item.titleNormalized.includes(normalizedQuery)) score += 50;
  if (item.itemIdNormalized.includes(normalizedQuery)) score += 40;
  if (rule.titleNormalized.includes(normalizedQuery)) score += 10;
  for (const token of queryTokens) {
    if (item.titleNormalized.includes(token)) score += 10;
  }
  return score;
}

function buildSearchMatches(query: string, limit: number) {
  const queryTokens = tokenize(query);

  const scoredRules = rules
    .map((rule) => ({
      type: 'rule' as const,
      rule,
      score: scoreRule(rule, query, queryTokens),
    }))
    .filter((item) => item.score > 0);

  const scoredItems = items
    .map((item) => {
      const rule = rulesById.get(item.ruleId);
      if (!rule) return null;
      return {
        type: item.matchType,
        item,
        rule,
        score: scoreItem(item, rule, query, queryTokens),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.score > 0);

  return [
    ...scoredRules.map((item) => ({
      match_type: item.type,
      rule_id: item.rule.ruleId,
      title: item.rule.title,
      score: item.score,
      excerpt: truncate(item.rule.excerpt || item.rule.purpose, 280),
    })),
    ...scoredItems.map((item) => ({
      match_type: item.type,
      rule_id: item.rule.ruleId,
      item_id: item.item.itemId,
      title: item.item.title,
      score: item.score,
      excerpt: truncate(buildExcerptFromRule(item.rule, item.item), 280),
    })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function resolveExactReference(ruleId?: string, itemId?: string) {
  if (itemId) {
    const item = itemsById.get(itemId);
    if (!item) return null;
    const rule = rulesById.get(item.ruleId);
    if (!rule) return null;
    return {
      match_type: item.matchType,
      rule_id: rule.ruleId,
      item_id: item.itemId,
      title: item.title,
      page: item.page,
      excerpt: buildExcerptFromRule(rule, item),
      purpose: truncate(rule.purpose, 420),
    };
  }

  if (ruleId) {
    const rule = rulesById.get(ruleId);
    if (!rule) return null;
    return {
      match_type: 'rule' as const,
      rule_id: rule.ruleId,
      title: rule.title,
      page: rule.page,
      excerpt: truncate(rule.fullText || rule.excerpt, 1400),
      purpose: truncate(rule.purpose, 420),
    };
  }

  return null;
}

export const golfRulesCatalogTool = tool({
  name: 'golf_rules_catalog',
  description:
    'Devuelve el catalogo de reglas oficiales de golf disponibles, con conteo de secciones y aclaraciones.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Cantidad maxima de reglas a devolver (1 a 25).',
      },
      include_items: {
        type: 'boolean',
        description: 'Si es true, incluye secciones y aclaraciones de cada regla listada.',
      },
      rule_id: {
        type: 'string',
        description: 'Opcional: filtra por una regla exacta, por ejemplo 14 o 20.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { limit, include_items, rule_id } = input as {
      limit?: number;
      include_items?: boolean;
      rule_id?: string;
    };

    let selectedRules = rules;
    if (rule_id) {
      const exact = rulesById.get(rule_id);
      selectedRules = exact ? [exact] : [];
    }

    const maxItems = Math.max(1, Math.min(25, Math.floor(limit ?? selectedRules.length)));
    const result = selectedRules.slice(0, maxItems).map((rule) => ({
      rule_id: rule.ruleId,
      title: rule.title,
      page: rule.page,
      sections_count: rule.sections.length,
      clarifications_count: rule.clarifications.length,
      ...(include_items
        ? {
            sections: rule.sections.map((item) => ({
              item_id: item.itemId,
              title: item.title,
              page: item.page,
            })),
            clarifications: rule.clarifications.map((item) => ({
              item_id: item.itemId,
              title: item.title,
              page: item.page,
            })),
          }
        : {}),
    }));

    return {
      totalRules: catalog.length,
      returned: result.length,
      rules: result,
    };
  },
});

export const golfRulesSearchTool = tool({
  name: 'golf_rules_search',
  description:
    'Busca reglas, secciones o aclaraciones relevantes dentro del reglamento oficial de golf.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Consulta libre o referencia de regla, por ejemplo bola provisional o 14.3.',
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
    const results = buildSearchMatches(query, maxItems);
    return {
      query,
      totalRules: catalog.length,
      totalIndexedItems: items.length,
      matches: results,
    };
  },
});

export const golfRulesRulingTool = tool({
  name: 'golf_rules_ruling',
  description:
    'Analiza un caso narrado de reglas de golf, identifica datos faltantes y propone referencias exactas para emitir un dictamen.',
  parameters: {
    type: 'object',
    properties: {
      case_description: {
        type: 'string',
        description:
          'Descripcion del caso o situacion que debe resolverse bajo las reglas de golf.',
      },
      limit: {
        type: 'number',
        description: 'Cantidad maxima de referencias sugeridas (1 a 8).',
      },
    },
    required: ['case_description'],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { case_description, limit } = input as {
      case_description: string;
      limit?: number;
    };

    const maxItems = Math.max(1, Math.min(8, Math.floor(limit ?? 5)));
    const matches = buildSearchMatches(case_description, maxItems);
    const topMatches = matches.slice(0, Math.min(3, matches.length));
    const missingFacts = detectMissingFacts(case_description);

    const exactReferences = topMatches.map((match) =>
      'item_id' in match
        ? `${match.item_id} (${match.title})`
        : `Regla ${match.rule_id} (${match.title})`,
    );

    const summary =
      topMatches.length > 0
        ? `Referencias probablemente aplicables: ${exactReferences.join('; ')}.`
        : 'No se localizaron referencias suficientemente solidas con el texto actual.';

    return {
      status:
        topMatches.length === 0
          ? 'sin_base_suficiente'
          : missingFacts.length > 0
            ? 'requiere_aclaraciones'
            : 'preliminarmente_resoluble',
      caseSummary: truncate(case_description, 420),
      likelyReferences: topMatches.map((match) => ({
        rule_id: match.rule_id,
        item_id: 'item_id' in match ? match.item_id : undefined,
        match_type: match.match_type,
        title: match.title,
        score: match.score,
      })),
      missingFacts,
      nextStep:
        topMatches.length > 0
          ? 'Confirma las referencias con golf_rules_lookup antes de emitir el criterio final.'
          : 'Solicita mas hechos o una descripcion mas precisa del caso antes de resolver.',
      preliminarySummary: summary,
    };
  },
});

export const golfRulesDecisionTool = tool({
  name: 'golf_rules_decision',
  description:
    'Construye un dictamen estructurado de reglas de golf a partir de un caso y una referencia exacta o sugerida.',
  parameters: {
    type: 'object',
    properties: {
      case_description: {
        type: 'string',
        description: 'Descripcion del caso que se quiere resolver.',
      },
      rule_id: {
        type: 'string',
        description: 'Regla exacta a usar, por ejemplo 14 o 20.',
      },
      item_id: {
        type: 'string',
        description: 'Seccion o aclaracion exacta a usar, por ejemplo 14.3 o 20.1c(3)/2.',
      },
    },
    required: ['case_description'],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { case_description, rule_id, item_id } = input as {
      case_description: string;
      rule_id?: string;
      item_id?: string;
    };

    const missingFacts = detectMissingFacts(case_description);
    const factsIdentified = detectFacts(case_description);
    const exactReference = resolveExactReference(rule_id, item_id);
    const suggestedMatches = buildSearchMatches(case_description, 3);
    const suggestedReference =
      suggestedMatches.length > 0
        ? resolveExactReference(
            suggestedMatches[0].rule_id,
            'item_id' in suggestedMatches[0] ? suggestedMatches[0].item_id : undefined,
          )
        : null;
    const selectedReference = exactReference ?? suggestedReference;

    if (!selectedReference) {
      return {
        status: 'sin_base_suficiente',
        factsIdentified,
        missingFacts,
        confidence: 'baja',
        decision:
          'No hay una referencia suficientemente clara para emitir un dictamen. Primero debe ubicarse la regla o aclaracion exacta.',
        nextStep: 'Usa golf_rules_search o amplia los hechos del caso antes de decidir.',
      };
    }

    const requiresClarifications = missingFacts.length > 0;
    const confidence =
      exactReference && !requiresClarifications
        ? 'alta'
        : exactReference || suggestedMatches.length > 0
          ? 'media'
          : 'baja';

    const referenceLabel =
      'item_id' in selectedReference && selectedReference.item_id
        ? `${selectedReference.item_id} (${selectedReference.title})`
        : `Regla ${selectedReference.rule_id} (${selectedReference.title})`;

    const decision =
      requiresClarifications
        ? `La referencia mas util es ${referenceLabel}, pero todavia faltan hechos materiales para emitir un fallo cerrado.`
        : `Con base en ${referenceLabel}, ya hay base suficiente para emitir un criterio reglamentario preliminar y redactar la decision final.`;

    return {
      status: requiresClarifications ? 'requiere_aclaraciones' : 'listo_para_dictamen',
      factsIdentified,
      missingFacts,
      confidence,
      reference: {
        rule_id: selectedReference.rule_id,
        item_id: 'item_id' in selectedReference ? selectedReference.item_id : undefined,
        match_type: selectedReference.match_type,
        title: selectedReference.title,
        page: selectedReference.page,
      },
      applicableRuleSummary: selectedReference.purpose,
      sourceExcerpt: truncate(selectedReference.excerpt, 900),
      decision,
      penaltyNote:
        'La penalidad exacta solo debe afirmarse en la respuesta final despues de confirmar la referencia con golf_rules_lookup.',
      nextStep: requiresClarifications
        ? 'Solicita solo los datos faltantes y luego confirma la referencia exacta con golf_rules_lookup.'
        : 'Confirma la referencia exacta con golf_rules_lookup y redacta el dictamen final en formato arbitral.',
    };
  },
});

export const golfRulesLookupTool = tool({
  name: 'golf_rules_lookup',
  description:
    'Obtiene el contenido oficial de una regla exacta o de una seccion/aclaracion exacta del reglamento de golf.',
  parameters: {
    type: 'object',
    properties: {
      rule_id: {
        type: 'string',
        description: 'Identificador exacto de regla, por ejemplo 14 o 20.',
      },
      item_id: {
        type: 'string',
        description: 'Identificador exacto de seccion o aclaracion, por ejemplo 14.3 o 20.1c(3)/2.',
      },
      detalle: {
        type: 'string',
        enum: ['breve', 'completo'],
        description: 'Nivel de detalle a devolver.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { rule_id, item_id, detalle } = input as {
      rule_id?: string;
      item_id?: string;
      detalle?: 'breve' | 'completo';
    };

    if (!rule_id && !item_id) {
      return {
        found: false,
        reason: 'missing_input',
        message: 'Debes enviar rule_id o item_id.',
      };
    }

    if (item_id) {
      const item = itemsById.get(item_id);
      if (!item) {
        return {
          found: false,
          reason: 'not_found',
          message: 'No existe ese item_id exacto en el reglamento cargado.',
        };
      }

      const rule = rulesById.get(item.ruleId);
      if (!rule) {
        return {
          found: false,
          reason: 'not_found',
          message: 'No encontre la regla asociada a ese item_id.',
        };
      }

      return {
        found: true,
        lookup_type: item.matchType,
        rule_id: rule.ruleId,
        rule_title: rule.title,
        item_id: item.itemId,
        item_title: item.title,
        page: item.page,
        purpose: truncate(rule.purpose, 420),
        sourceExcerpt:
          detalle === 'completo'
            ? buildExcerptFromRule(rule, item)
            : truncate(buildExcerptFromRule(rule, item), 520),
      };
    }

    const rule = rulesById.get(rule_id!);
    if (!rule) {
      return {
        found: false,
        reason: 'not_found',
        message: 'No existe ese rule_id exacto en el reglamento cargado.',
      };
    }

    return {
      found: true,
      lookup_type: 'rule',
      rule_id: rule.ruleId,
      title: rule.title,
      page: rule.page,
      purpose: truncate(rule.purpose, 520),
      sections: rule.sections.map((item) => ({
        item_id: item.itemId,
        title: item.title,
        page: item.page,
      })),
      clarifications: rule.clarifications.map((item) => ({
        item_id: item.itemId,
        title: item.title,
        page: item.page,
      })),
      sourceExcerpt:
        detalle === 'completo'
          ? truncate(rule.fullText, 2400)
          : truncate(rule.excerpt || rule.fullText, 700),
    };
  },
});

export const golfRulesFullTextTool = tool({
  name: 'golf_rules_fulltext',
  description:
    'Devuelve el texto completo de una regla oficial de golf o el bloque amplio de una seccion/aclaracion exacta cuando se requiere revision extensa.',
  parameters: {
    type: 'object',
    properties: {
      rule_id: {
        type: 'string',
        description: 'Identificador exacto de regla, por ejemplo 23.',
      },
      item_id: {
        type: 'string',
        description: 'Identificador exacto de seccion o aclaracion, por ejemplo 23.6 o 23.9a(2)/1.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { rule_id, item_id } = input as {
      rule_id?: string;
      item_id?: string;
    };

    if (!rule_id && !item_id) {
      return {
        found: false,
        reason: 'missing_input',
        message: 'Debes enviar rule_id o item_id.',
      };
    }

    if (item_id) {
      const reference = resolveExactReference(undefined, item_id);
      if (!reference) {
        return {
          found: false,
          reason: 'not_found',
          message: 'No existe ese item_id exacto en el reglamento cargado.',
        };
      }

      return {
        found: true,
        lookup_type: reference.match_type,
        rule_id: reference.rule_id,
        item_id: 'item_id' in reference ? reference.item_id : undefined,
        title: reference.title,
        page: reference.page,
        purpose: reference.purpose,
        fullText: reference.excerpt,
      };
    }

    const rule = rulesById.get(rule_id!);
    if (!rule) {
      return {
        found: false,
        reason: 'not_found',
        message: 'No existe ese rule_id exacto en el reglamento cargado.',
      };
    }

    return {
      found: true,
      lookup_type: 'rule',
      rule_id: rule.ruleId,
      title: rule.title,
      page: rule.page,
      purpose: rule.purpose,
      sections: rule.sections.map((item) => ({
        item_id: item.itemId,
        title: item.title,
        page: item.page,
      })),
      clarifications: rule.clarifications.map((item) => ({
        item_id: item.itemId,
        title: item.title,
        page: item.page,
      })),
      fullText: rule.fullText,
    };
  },
});
