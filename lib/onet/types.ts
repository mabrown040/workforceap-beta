export type ExperienceBandUi = 'beginner' | 'some_experience' | 'experienced';

export type CareerMatchResult = {
  topOccupations: {
    onetCode: string;
    title: string;
    description: string;
    confidence: number;
    whyFit: string[];
    commonTasks: string[];
    skills: string[];
    relatedRoles: string[];
  }[];
  recommendedPrograms: {
    programSlug: string;
    priority: number;
    recommendationType: 'primary' | 'bridge' | 'stretch';
    whyRecommended: string;
  }[];
  experienceBand: ExperienceBandUi;
  supportFlags: {
    needsComputerSupport: boolean;
  };
};
