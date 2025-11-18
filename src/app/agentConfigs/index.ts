import { universityTutorScenario } from './universityTutor';
import { universityTutorEvaluationScenario } from './universityTutorEvaluation';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  universityTutor: universityTutorScenario,
  universityTutorEvaluation: universityTutorEvaluationScenario,
};

export const defaultAgentSetKey = 'universityTutor';
