export interface AgentBranding {
  title: string;
  logoSrc: string;
  logoAlt?: string;
}

export const agentBranding: Record<string, AgentBranding> = {
  universityTutor: {
    title: "Tutor-ia",
    logoSrc: "",
    logoAlt: "",
  },
  universityTutorEvaluation: {
    title: "Tutor-ia Evaluación",
    logoSrc: "",
    logoAlt: "",
  },
  golfTutor: {
    title: "Golf Tutor",
    logoSrc: "/tarcys3.webp",
    logoAlt: "Golf Tutor",
  },
  golfTutorDefs: {
    title: "Golf Tutor Defs",
    logoSrc: "/tarcys3.webp",
    logoAlt: "Golf Tutor Defs",
  },
  golfRulesOfficial: {
    title: "Golf Rules Official",
    logoSrc: "",
    logoAlt: "",
  },
};
