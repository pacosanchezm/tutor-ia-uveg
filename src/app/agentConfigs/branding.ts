export interface AgentBranding {
  title: string;
  logoSrc: string;
  logoAlt?: string;
}

export const agentBranding: Record<string, AgentBranding> = {
  universityTutor: {
    title: "Tutor-ia",
    logoSrc: "/tutor-ia-uveg-logo.jpg",
    logoAlt: "Tutor-ia",
  },
  universityTutorEvaluation: {
    title: "Tutor-ia Evaluación",
    logoSrc: "/tutor-ia-uveg-logo.jpg",
    logoAlt: "Tutor-ia Evaluación",
  },
  golfTutor: {
    title: "Golf Tutor",
    logoSrc: "/tarcys.jpeg",
    logoAlt: "Golf Tutor",
  },
};
