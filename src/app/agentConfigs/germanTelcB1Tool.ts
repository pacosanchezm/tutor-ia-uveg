import { tool } from '@openai/agents/realtime';

type RoleplayDifficulty = 'B1-basico' | 'B1-estandar' | 'B1-alto';

interface TelcB1Roleplay {
  roleplayId: string;
  title: string;
  examPart: 'Kontaktaufnahme' | 'Gemeinsam etwas planen' | 'Meinung sagen' | 'Alltagssituation';
  difficulty: RoleplayDifficulty;
  situation: string;
  assistantRole: string;
  learnerTask: string;
  usefulPhrases: string[];
  targetSkills: string[];
  expectedElements: string[];
}

const roleplays: TelcB1Roleplay[] = [
  {
    roleplayId: 'wohnung_besichtigung',
    title: 'Wohnungsbesichtigung vereinbaren',
    examPart: 'Alltagssituation',
    difficulty: 'B1-estandar',
    situation:
      'Du suchst eine Wohnung und rufst bei einer Vermieterin an, um Fragen zu stellen und einen Besichtigungstermin zu vereinbaren.',
    assistantRole: 'Ich bin die Vermieterin. Ich frage nach deinem Zeitplan, Budget und deinen wichtigsten Anforderungen.',
    learnerTask:
      'Stelle dich kurz vor, frage nach Miete, Lage, Nebenkosten und vereinbare einen Termin.',
    usefulPhrases: [
      'Ich interessiere mich fuer die Wohnung.',
      'Wie hoch sind die Nebenkosten?',
      'Wann koennte ich die Wohnung besichtigen?',
      'Passt Ihnen Dienstag um 17 Uhr?',
    ],
    targetSkills: ['Fragen stellen', 'Termin vereinbaren', 'Hoeflichkeit', 'Wohnungsvokabular'],
    expectedElements: ['Vorstellung', 'mindestens zwei Sachfragen', 'Terminvorschlag', 'freundlicher Abschluss'],
  },
  {
    roleplayId: 'arzttermin',
    title: 'Einen Arzttermin machen',
    examPart: 'Alltagssituation',
    difficulty: 'B1-basico',
    situation:
      'Du hast seit einigen Tagen Beschwerden und rufst in einer Arztpraxis an, um einen Termin zu bekommen.',
    assistantRole: 'Ich arbeite an der Rezeption der Arztpraxis und frage nach Beschwerden, Dringlichkeit und Zeiten.',
    learnerTask:
      'Erklaere kurz deine Beschwerden, frage nach einem Termin und reagiere auf einen Terminvorschlag.',
    usefulPhrases: [
      'Ich habe seit drei Tagen Kopfschmerzen.',
      'Haetten Sie diese Woche einen Termin frei?',
      'Es ist ziemlich dringend.',
      'Vielen Dank, das passt mir gut.',
    ],
    targetSkills: ['Symptome beschreiben', 'Termin anfragen', 'Dringlichkeit ausdruecken'],
    expectedElements: ['Beschwerden', 'Dauer', 'Terminfrage', 'Bestaetigung oder Alternative'],
  },
  {
    roleplayId: 'reise_problem',
    title: 'Problem im Hotel melden',
    examPart: 'Alltagssituation',
    difficulty: 'B1-estandar',
    situation:
      'Du bist im Hotel. In deinem Zimmer funktioniert die Heizung nicht und es ist sehr laut.',
    assistantRole: 'Ich bin die Person an der Rezeption. Ich frage nach Zimmernummer und moeglichen Loesungen.',
    learnerTask:
      'Beschreibe das Problem, bitte um Hilfe und schlage eine faire Loesung vor.',
    usefulPhrases: [
      'In meinem Zimmer gibt es ein Problem.',
      'Die Heizung funktioniert nicht.',
      'Koennten Sie bitte jemanden schicken?',
      'Waere ein anderes Zimmer moeglich?',
    ],
    targetSkills: ['Beschwerde formulieren', 'Loesung vorschlagen', 'hoeflich bleiben'],
    expectedElements: ['Problem klar beschreiben', 'Bitte um Hilfe', 'Loesungsvorschlag', 'hoeflicher Ton'],
  },
  {
    roleplayId: 'party_planen',
    title: 'Eine Geburtstagsfeier planen',
    examPart: 'Gemeinsam etwas planen',
    difficulty: 'B1-basico',
    situation:
      'Du und dein Partner/deine Partnerin planen eine Geburtstagsfeier fuer einen gemeinsamen Freund.',
    assistantRole: 'Ich bin dein Gespraechspartner. Wir muessen Ort, Essen, Musik und Einladung planen.',
    learnerTask:
      'Mache Vorschlaege, reagiere auf meine Ideen und trefft zusammen eine Entscheidung.',
    usefulPhrases: [
      'Ich schlage vor, dass wir ...',
      'Das ist eine gute Idee, aber ...',
      'Wir koennten auch ...',
      'Dann entscheiden wir uns fuer ...',
    ],
    targetSkills: ['Vorschlaege machen', 'zustimmen/ablehnen', 'gemeinsam entscheiden'],
    expectedElements: ['mindestens zwei Vorschlaege', 'Reaktion auf Partner', 'Entscheidung', 'Begruendung'],
  },
  {
    roleplayId: 'sprachkurs_planen',
    title: 'Einen Deutschlernplan organisieren',
    examPart: 'Gemeinsam etwas planen',
    difficulty: 'B1-estandar',
    situation:
      'Du und eine andere Person wollen zusammen Deutsch lernen und muessen einen Lernplan fuer vier Wochen machen.',
    assistantRole: 'Ich bin dein Lernpartner. Ich habe wenig Zeit und brauche praktische Uebungen.',
    learnerTask:
      'Plane mit mir Tage, Uhrzeiten, Themen und Lernmethoden. Begruende deine Vorschlaege.',
    usefulPhrases: [
      'Wir sollten zuerst ... ueben.',
      'Ich kann montags und mittwochs.',
      'Meiner Meinung nach ist Sprechen am wichtigsten.',
      'Lass uns am Ende einen kleinen Test machen.',
    ],
    targetSkills: ['Planung', 'Begruendung', 'Zeitangaben', 'Prioritaeten'],
    expectedElements: ['Zeitplan', 'Themen', 'Methoden', 'Begruendung'],
  },
  {
    roleplayId: 'arbeit_homeoffice',
    title: 'Meinung zu Homeoffice',
    examPart: 'Meinung sagen',
    difficulty: 'B1-alto',
    situation:
      'Im Deutschkurs diskutiert ihr das Thema Homeoffice. Du sollst deine Meinung sagen und auf eine Gegenposition reagieren.',
    assistantRole: 'Ich vertrete eine andere Meinung und stelle Rueckfragen.',
    learnerTask:
      'Sage deine Meinung, nenne mindestens zwei Gruende und reagiere auf meine Rueckfrage.',
    usefulPhrases: [
      'Meiner Meinung nach ...',
      'Ein Vorteil ist, dass ...',
      'Andererseits muss man sagen, dass ...',
      'Ich verstehe Ihren Punkt, aber ...',
    ],
    targetSkills: ['Meinung ausdruecken', 'Argumente nennen', 'Gegenargument reagieren'],
    expectedElements: ['klare Meinung', 'zwei Gruende', 'Beispiel', 'Reaktion auf Gegenposition'],
  },
  {
    roleplayId: 'umwelt_alltag',
    title: 'Umweltschutz im Alltag',
    examPart: 'Meinung sagen',
    difficulty: 'B1-estandar',
    situation:
      'Du sprichst im Kurs ueber Umweltschutz im Alltag und sollst erklaeren, was man persoenlich tun kann.',
    assistantRole: 'Ich bin Kursleiter und frage nach Beispielen und deiner Meinung.',
    learnerTask:
      'Erklaere deine Meinung, nenne Beispiele und sage, was fuer dich realistisch ist.',
    usefulPhrases: [
      'Ich finde es wichtig, dass ...',
      'Zum Beispiel kann man ...',
      'Fuer mich ist es realistisch, ...',
      'Das ist nicht immer einfach, weil ...',
    ],
    targetSkills: ['Meinung', 'Beispiele', 'Alltagswortschatz', 'Nebensaetze'],
    expectedElements: ['Meinung', 'zwei Beispiele', 'persoenliche Bewertung', 'Begruendung'],
  },
  {
    roleplayId: 'nachbar_laerm',
    title: 'Mit einem Nachbarn ueber Laerm sprechen',
    examPart: 'Alltagssituation',
    difficulty: 'B1-alto',
    situation:
      'Dein Nachbar hoert spaet abends laute Musik. Du moechtest hoeflich mit ihm sprechen und eine Loesung finden.',
    assistantRole: 'Ich bin dein Nachbar und reagiere zuerst etwas defensiv.',
    learnerTask:
      'Sprich das Problem hoeflich an, erklaere deine Situation und schlage eine Loesung vor.',
    usefulPhrases: [
      'Entschuldigung, koennte ich kurz mit Ihnen sprechen?',
      'Die Musik ist abends leider sehr laut.',
      'Ich muss frueh aufstehen.',
      'Koennten wir vielleicht vereinbaren, dass ...?',
    ],
    targetSkills: ['Konfliktgespraech', 'Hoeflichkeit', 'Loesung verhandeln'],
    expectedElements: ['Problem', 'eigene Situation', 'konkreter Vorschlag', 'deeskalierender Ton'],
  },
  {
    roleplayId: 'job_interview_minijob',
    title: 'Bewerbungsgespraech fuer einen Minijob',
    examPart: 'Alltagssituation',
    difficulty: 'B1-alto',
    situation:
      'Du hast dich fuer einen Minijob in einem Cafe beworben und fuehrst ein kurzes Bewerbungsgespraech.',
    assistantRole:
      'Ich bin die Filialleitung. Ich frage nach Erfahrung, Arbeitszeiten, Staerken und Motivation.',
    learnerTask:
      'Stelle dich vor, erklaere deine Motivation, nenne passende Arbeitszeiten und frage nach den naechsten Schritten.',
    usefulPhrases: [
      'Ich interessiere mich fuer diese Stelle, weil ...',
      'Ich habe schon Erfahrung mit ...',
      'Ich koennte am Wochenende arbeiten.',
      'Wie geht es nach dem Gespraech weiter?',
    ],
    targetSkills: ['Selbstvorstellung', 'Motivation', 'Berufswortschatz', 'Rueckfragen'],
    expectedElements: ['Vorstellung', 'Motivation', 'Arbeitszeiten', 'Frage nach naechsten Schritten'],
  },
  {
    roleplayId: 'verkehr_verspaetung',
    title: 'Verspaetung im oeffentlichen Verkehr klaeren',
    examPart: 'Alltagssituation',
    difficulty: 'B1-estandar',
    situation:
      'Dein Zug oder Bus hat starke Verspaetung. Du sprichst mit dem Kundenservice und brauchst eine Loesung.',
    assistantRole:
      'Ich arbeite beim Kundenservice. Ich frage nach Ticket, Ziel, Anschluss und gewuenschter Hilfe.',
    learnerTask:
      'Erklaere das Problem, frage nach Alternativen und bitte um eine konkrete Information oder Hilfe.',
    usefulPhrases: [
      'Mein Zug hat leider Verspaetung.',
      'Ich verpasse wahrscheinlich meinen Anschluss.',
      'Welche Alternative gibt es?',
      'Koennten Sie mir bitte eine Verbindung empfehlen?',
    ],
    targetSkills: ['Problem erklaeren', 'Information erfragen', 'Alternative verhandeln'],
    expectedElements: ['Problem', 'Ziel oder Anschluss', 'Frage nach Alternative', 'Bitte um Hilfe'],
  },
];

export const germanTelcB1RoleplayOptions = roleplays.map((roleplay) => ({
  roleplayId: roleplay.roleplayId,
  title: roleplay.title,
  examPart: roleplay.examPart,
  difficulty: roleplay.difficulty,
}));

function clampScore(score: number): number {
  return Math.max(1, Math.min(10, Math.round(score)));
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function findRoleplay(roleplayId?: string): TelcB1Roleplay | undefined {
  if (!roleplayId) return undefined;
  return roleplays.find((roleplay) => roleplay.roleplayId === roleplayId);
}

function keywordCoverage(response: string, expectedElements: string[]): number {
  const responseTokens = new Set(tokenize(response));
  const matched = expectedElements.filter((element) =>
    tokenize(element).some((token) => responseTokens.has(token)),
  );
  return expectedElements.length > 0 ? matched.length / expectedElements.length : 0;
}

export const germanTelcB1RoleplayCatalogTool = tool({
  name: 'telc_b1_roleplay_catalog',
  description:
    'Devuelve roleplays disponibles para practicar telc Deutsch B1 con escenario, tarea y habilidades objetivo.',
  parameters: {
    type: 'object',
    properties: {
      difficulty: {
        type: 'string',
        enum: ['B1-basico', 'B1-estandar', 'B1-alto'],
        description: 'Filtra por dificultad.',
      },
      exam_part: {
        type: 'string',
        enum: ['Kontaktaufnahme', 'Gemeinsam etwas planen', 'Meinung sagen', 'Alltagssituation'],
        description: 'Filtra por tipo de tarea oral.',
      },
      limit: {
        type: 'number',
        description: 'Cantidad maxima de roleplays a devolver.',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { difficulty, exam_part, limit } = input as {
      difficulty?: RoleplayDifficulty;
      exam_part?: TelcB1Roleplay['examPart'];
      limit?: number;
    };

    let results = roleplays;
    if (difficulty) results = results.filter((roleplay) => roleplay.difficulty === difficulty);
    if (exam_part) results = results.filter((roleplay) => roleplay.examPart === exam_part);

    const maxItems = Math.max(1, Math.min(20, Math.floor(limit ?? results.length)));
    return {
      totalRoleplays: roleplays.length,
      returned: Math.min(maxItems, results.length),
      roleplays: results.slice(0, maxItems).map((roleplay) => ({
        roleplay_id: roleplay.roleplayId,
        title: roleplay.title,
        exam_part: roleplay.examPart,
        difficulty: roleplay.difficulty,
        situation: roleplay.situation,
        learner_task: roleplay.learnerTask,
        target_skills: roleplay.targetSkills,
      })),
    };
  },
});

export const germanTelcB1RoleplayStartTool = tool({
  name: 'telc_b1_roleplay_start',
  description:
    'Prepara un roleplay telc Deutsch B1 y devuelve instrucciones claras para iniciar la simulacion oral.',
  parameters: {
    type: 'object',
    properties: {
      roleplay_id: {
        type: 'string',
        description: 'Identificador del roleplay elegido.',
      },
      include_phrases: {
        type: 'boolean',
        description: 'Si true, incluye frases utiles antes de iniciar.',
      },
    },
    required: ['roleplay_id'],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { roleplay_id, include_phrases } = input as {
      roleplay_id: string;
      include_phrases?: boolean;
    };
    const roleplay = findRoleplay(roleplay_id);
    if (!roleplay) {
      return {
        found: false,
        message: 'Roleplay no encontrado. Usa telc_b1_roleplay_catalog para elegir uno valido.',
      };
    }

    return {
      found: true,
      roleplay_id: roleplay.roleplayId,
      title: roleplay.title,
      exam_part: roleplay.examPart,
      difficulty: roleplay.difficulty,
      situation: roleplay.situation,
      assistant_role: roleplay.assistantRole,
      learner_task: roleplay.learnerTask,
      target_skills: roleplay.targetSkills,
      expected_elements: roleplay.expectedElements,
      useful_phrases: include_phrases ? roleplay.usefulPhrases : [],
      first_prompt:
        'Beginne jetzt auf Deutsch. Starte mit einer natuerlichen ersten Antwort passend zur Situation.',
    };
  },
});

export const germanTelcB1EvaluateRoleplayTool = tool({
  name: 'telc_b1_roleplay_evaluate',
  description:
    'Evalua una respuesta o mini-roleplay del alumno con rubrica telc Deutsch B1 y devuelve calificacion accionable.',
  parameters: {
    type: 'object',
    properties: {
      roleplay_id: {
        type: 'string',
        description: 'Identificador del roleplay practicado.',
      },
      learner_response: {
        type: 'string',
        description: 'Respuesta o resumen de respuestas del alumno en aleman.',
      },
      evaluation_mode: {
        type: 'string',
        enum: ['turno', 'final'],
        description: 'Evalua un turno individual o el roleplay completo.',
      },
    },
    required: ['roleplay_id', 'learner_response'],
    additionalProperties: false,
  },
  execute: async (input: unknown) => {
    const { roleplay_id, learner_response, evaluation_mode } = input as {
      roleplay_id: string;
      learner_response: string;
      evaluation_mode?: 'turno' | 'final';
    };
    const roleplay = findRoleplay(roleplay_id);
    if (!roleplay) {
      return {
        found: false,
        message: 'Roleplay no encontrado. No se puede evaluar sin roleplay_id valido.',
      };
    }

    const responseLength = tokenize(learner_response).length;
    const coverage = keywordCoverage(learner_response, roleplay.expectedElements);
    const hasConnectors = /\b(weil|dass|aber|deshalb|trotzdem|wenn|obwohl|denn|zuerst|danach)\b/i.test(
      learner_response,
    );
    const hasPoliteness = /\b(bitte|danke|entschuldigung|koennten|könnten|wuerde|würde|gern)\b/i.test(
      learner_response,
    );

    const taskFulfillment = clampScore(4 + coverage * 6);
    const fluency = clampScore(responseLength < 12 ? 4 : responseLength < 25 ? 6 : 8);
    const vocabulary = clampScore(5 + Math.min(3, roleplay.targetSkills.length) + (coverage >= 0.5 ? 1 : 0));
    const grammar = clampScore(5 + (hasConnectors ? 2 : 0) + (responseLength >= 20 ? 1 : 0));
    const interaction = clampScore(5 + (hasPoliteness ? 2 : 0) + (evaluation_mode === 'final' ? 1 : 0));
    const average = clampScore(
      (taskFulfillment + fluency + vocabulary + grammar + interaction) / 5,
    );

    const missingElements = roleplay.expectedElements.filter((element) =>
      !tokenize(element).some((token) => new Set(tokenize(learner_response)).has(token)),
    );

    return {
      found: true,
      roleplay_id: roleplay.roleplayId,
      title: roleplay.title,
      mode: evaluation_mode ?? 'turno',
      score: average,
      level_estimate:
        average >= 8 ? 'B1 solide' : average >= 6 ? 'B1 teilweise erreicht' : 'unter B1 fuer diese Aufgabe',
      rubric: {
        task_fulfillment: taskFulfillment,
        fluency,
        vocabulary,
        grammar,
        interaction,
      },
      strengths: [
        coverage >= 0.5 ? 'Die Aufgabe wurde inhaltlich teilweise oder gut erfuellt.' : 'Du hast auf die Situation reagiert.',
        hasConnectors ? 'Du hast passende Konnektoren verwendet.' : 'Die Antwort ist verstaendlich.',
        hasPoliteness ? 'Der Ton war hoeflich und passend.' : 'Die Hauptaussage war erkennbar.',
      ],
      improvement_points: [
        ...missingElements.slice(0, 3).map((element) => `Ergaenze: ${element}.`),
        !hasConnectors ? 'Nutze mehr B1-Konnektoren wie weil, dass, deshalb oder trotzdem.' : '',
        responseLength < 25 ? 'Antworte etwas ausfuehrlicher mit Grund oder Beispiel.' : '',
      ].filter(Boolean),
      corrected_example:
        'Beispiel auf B1-Niveau: Ich verstehe das Problem. Meiner Meinung nach sollten wir zuerst eine passende Loesung suchen, weil die Situation fuer beide Seiten angenehm sein muss.',
      next_prompt:
        average >= 8
          ? 'Weiter mit einer Rueckfrage oder einem schwierigeren Rollenspiel.'
          : 'Wiederhole die Antwort mit einem Grund, einem Beispiel und einem hoeflichen Abschluss.',
    };
  },
});
