import { universityTutorScenario } from './universityTutor';
import { universityTutorEvaluationScenario } from './universityTutorEvaluation';
import { golfTutorScenario } from './golfTutor';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  universityTutor: universityTutorScenario,
  universityTutorEvaluation: universityTutorEvaluationScenario,
  golfTutor: golfTutorScenario,
};

export const defaultAgentSetKey = 'universityTutor';
