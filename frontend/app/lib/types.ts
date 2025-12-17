/**
 * TypeScript types for RFP Analysis Results
 * Matches backend Pydantic models from workers/models/
 */

// ============================================================================
// CATEGORY 1: IDENTIFIED RISKS
// ============================================================================

export type RiskType =
  | 'Ambiguous Language'
  | 'Over-Specification'
  | 'Evaluation Criteria'
  | 'Compliance'
  | 'Timeline Conflict';

export type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskLocation {
  section: string;
  page: string;
  paragraph?: string;
}

export interface Risk {
  id: string; // Pattern: RISK-\d{3}
  type: RiskType;
  severity: RiskSeverity;
  location: RiskLocation;
  exact_quote: string;
  issue_description: string;
  reasoning: string;
  impact_if_unresolved: string;
  suggested_fix: string;
  confidence: number; // 0-100
  evidence?: string;
}

export interface AnalysisSummary {
  total_risks_found: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  overall_risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SelfCritique {
  review_performed: boolean;
  findings_validated: boolean;
  concerns?: string;
}

export interface SectionAnalyzed {
  name: string;
  page_range: string;
}

export interface RisksAnalysis {
  section_analyzed: SectionAnalyzed;
  analysis_summary: AnalysisSummary;
  risks: Risk[];
  self_critique: SelfCritique;
}

// ============================================================================
// CATEGORY 2: SMALL BUSINESS ACCESSIBILITY
// ============================================================================

export type BarrierType =
  | 'Insurance'
  | 'Employee Count'
  | 'Revenue'
  | 'Experience'
  | 'References'
  | 'Bonding'
  | 'Policy';

export type BarrierSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface BarrierLocation {
  section: string;
  page: string;
}

export interface RequirementAnalysis {
  what_is_required: string;
  industry_standard?: string;
  comparison?: string;
  is_justified: boolean;
  justification_reasoning: string;
}

export interface AccessibilityBarrier {
  id: string; // Pattern: ACCESS-\d{3}
  type: BarrierType;
  severity: BarrierSeverity;
  location: BarrierLocation;
  exact_quote: string;
  requirement_analysis: RequirementAnalysis;
  impact: string;
  deduction: number; // 0-10
  suggestion: string;
  confidence: number; // 0-100
}

export interface AccessibilityScore {
  final_score: number; // 0-10
  rating: 'Excellent' | 'Good' | 'Significant Barriers' | 'Maximum Barriers';
  total_deductions: number;
  barriers_found: number;
}

export interface AccessibilitySelfCritique {
  standards_applied_correctly: boolean;
  deductions_calculated_accurately: boolean;
  concerns?: string;
}

export interface AccessibilityAnalysis {
  accessibility_analysis: AccessibilityScore;
  barriers: AccessibilityBarrier[];
  positive_factors: string[];
  recommendations: string[];
  self_critique: AccessibilitySelfCritique;
}

// ============================================================================
// CATEGORY 3: CLARIFYING QUESTIONS
// ============================================================================

export type QuestionUrgency = 'HIGH' | 'MEDIUM' | 'LOW';

export interface QuestionTriggeredBy {
  exact_quote: string;
  location: string;
}

export interface ConfusionAnalysis {
  why_confusing: string;
  possible_interpretations: string[];
  vendor_cannot_determine: string;
}

export interface PredictedQuestion {
  id: string; // Pattern: Q-\d{3}
  urgency: QuestionUrgency;
  priority: number;
  predicted_question: string;
  triggered_by: QuestionTriggeredBy;
  confusion_analysis: ConfusionAnalysis;
  urgency_justification: string;
  impact_if_unresolved: string;
  recommendation: 'FIX NOW' | 'CLARIFY IN Q&A';
  suggested_fix: string;
  confidence: number; // 0-100
}

export interface UrgencyBreakdown {
  high: number;
  medium: number;
  low: number;
}

export interface QuestionsSelfCritique {
  questions_are_realistic: boolean;
  urgency_levels_justified: boolean;
  concerns?: string;
}

export interface QuestionsAnalysis {
  section_analyzed: string;
  questions_predicted: number;
  urgency_breakdown: UrgencyBreakdown;
  timeline_impact: 'HIGH' | 'MEDIUM' | 'LOW';
  questions: PredictedQuestion[];
  self_critique: QuestionsSelfCritique;
}

// ============================================================================
// CATEGORY 4: SUBCONTRACTING OPPORTUNITIES
// ============================================================================

export type SubcontractingRequirement = 'mandatory' | 'encouraged' | 'none';

export interface SubcontractingOpportunity {
  id: string; // Pattern: SUB-\d{3}
  area: string;
  rfp_text: string;
  location: string;
  estimated_percentage: string; // e.g., "10-20%"
  estimated_value: string; // e.g., "$50,000 - $100,000"
  characteristics: string[];
  suitable_business_types: string[];
  naics_code: string;
  naics_description: string;
  size_standard?: string;
  reasoning: string;
  confidence: number; // 0-100
}

export interface SubcontractingAnalysisSummary {
  rfp_requirement: SubcontractingRequirement;
  goals_specified: boolean;
  goal_percentage?: number; // 0-100
  opportunities_found: number;
  total_estimated_value: string; // e.g., "$150,000 - $300,000"
}

export interface SubcontractingSelfCritique {
  opportunities_are_realistic: boolean;
  estimates_are_justified: boolean;
  concerns?: string;
}

export interface SubcontractingAnalysis {
  subcontracting_analysis: SubcontractingAnalysisSummary;
  opportunities: SubcontractingOpportunity[];
  recommendations: string[];
  note: string;
  self_critique: SubcontractingSelfCritique;
}

// ============================================================================
// TOP-LEVEL ANALYSIS RESULTS
// ============================================================================

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

export interface CategoryCost {
  risks?: TokenUsage;
  accessibility?: TokenUsage;
  questions?: TokenUsage;
  subcontracting?: TokenUsage;
}

export interface AnalysisResults {
  // Analysis results
  risks: RisksAnalysis | null;
  accessibility: AccessibilityAnalysis | null;
  questions: QuestionsAnalysis | null;
  subcontracting: SubcontractingAnalysis | null;

  // Metadata
  document_id: string;
  analyzed_at: string; // ISO timestamp
  processing_time_seconds: number;

  // Cost tracking
  cost_breakdown: CategoryCost;
  total_cost_usd: number;
  total_tokens: number;

  // Error tracking
  errors: string[];
  partial_results: boolean;
}

// ============================================================================
// LLM USAGE METADATA
// ============================================================================

export interface LLMUsage {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  processing_time_seconds: number;
  model: string;
  categories_completed: number; // Percentage
  partial_results: boolean;
}

// ============================================================================
// DOCUMENT WITH ANALYSIS
// ============================================================================

export interface DocumentWithAnalysis {
  id: string;
  filename: string;
  storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  error_message?: string;

  // Analysis data
  analysis_results: AnalysisResults | null;
  llm_usage: LLMUsage | null;

  // Denormalized metrics (for fast queries)
  small_business_score?: number;
  risk_count?: number;
  high_risk_count?: number;
  question_count?: number;
  high_urgency_question_count?: number;
  subcontracting_opportunity_count?: number;
}

// ============================================================================
// UI HELPER TYPES
// ============================================================================

// Normalized priority type for UI (lowercase)
export type UIPriority = 'high' | 'medium' | 'low';

// Dashboard summary extracted from analysis
export interface DashboardSummary {
  totalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;

  totalQuestions: number;
  highUrgencyQuestions: number;
  mediumUrgencyQuestions: number;
  lowUrgencyQuestions: number;

  totalOpportunities: number;
  accessibilityScore: number;
  accessibilityRating: string;

  actionItemsCount: number; // Total HIGH priority items
}