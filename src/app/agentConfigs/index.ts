import { universityTutorScenario } from './universityTutor';
import { universityTutorEvaluationScenario } from './universityTutorEvaluation';
import { golfTutorScenario } from './golfTutor';
import { golfTutorDefsScenario } from './golfTutorDefs';
import { golfRulesOfficialScenario } from './golfRulesOfficial';
import { germanTelcB1TutorScenario } from './germanTelcB1Tutor';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  universityTutor: universityTutorScenario,
  universityTutorEvaluation: universityTutorEvaluationScenario,
  golfTutor: golfTutorScenario,
  golfTutorDefs: golfTutorDefsScenario,
  golfRulesOfficial: golfRulesOfficialScenario,
  germanTelcB1Tutor: germanTelcB1TutorScenario,
};

export const defaultAgentSetKey = 'universityTutor';
