// Shared types for all scope pages

export type Risk = {
  id: string;
  title: string;
  section: string;
  page: number;
  preview: string;
  priority: 'high' | 'medium' | 'low';
  problem: string;
  whyItMatters: string[];
  suggestedFix: string;
  farCitation?: string;
  impact: {
    complianceRisk: 'high' | 'medium' | 'low';
    effortToFix: string;
    protestLikelihood: string;
  };
};

export type Question = {
  id: string;
  title: string;
  section: string;
  page: number;
  preview: string;
  priority: 'high' | 'medium' | 'low';
  question: string;
  context: string;
  whyAsking: string[];
  suggestedApproach: string;
  impact: {
    clarityImprovement: 'high' | 'medium' | 'low';
    vendorConfusion: string;
    responseQuality: string;
  };
};

export type Opportunity = {
  id: string;
  title: string;
  section: string;
  page: number;
  preview: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  benefits: string[];
  suggestedLanguage: string;
  naicsCode?: string;
  impact: {
    smallBusinessAccess: 'high' | 'medium' | 'low';
    competitionIncrease: string;
    costSavings: string;
  };
};

export type AccessibilityScore = {
  overallScore: number;
  maxScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    name: string;
    score: number;
    maxScore: number;
    issues: string[];
    recommendations: string[];
  }[];
  summary: string;
  criticalIssues: string[];
};