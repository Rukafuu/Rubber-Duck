export type DebugMode = 'rubber-duck' | 'debugger' | 'mentor' | 'incident';

export type SessionStatus = 'investigating' | 'testing' | 'solved' | 'unresolved' | 'archived';

export type HypothesisStatus = 'proposed' | 'testing' | 'rejected' | 'confirmed';

export type ConfidenceScore = 'low' | 'medium' | 'high' | 'confirmed';

export type ConfidenceTier = 'experimental' | 'tested' | 'reproduced' | 'high';

export type TestVerdict = 'supports' | 'contradicts' | 'inconclusive';

export interface EnvironmentInfo {
  language: string;
  framework: string;
  runtime: string;
  version: string;
  os: string;
  targetEnv: 'build' | 'runtime' | 'ci' | 'production' | 'local';
  nodeVersion?: string;
  relevantDeps?: string[];
  extraNotes?: string;
}

export interface SecretFinding {
  type: string;
  match: string;
  maskedPreview: string;
  line?: number;
  recommendation: string;
}

export interface Hypothesis {
  id: string;
  title: string;
  rationale: string;
  supportingEvidence: string[];
  counterEvidence: string[];
  confidence: ConfidenceScore;
  status: HypothesisStatus;
  suggestedTests: string[];
  createdAt: string;
  eliminationReason?: string;
}

export interface DebugTest {
  id: string;
  hypothesisId?: string;
  title: string;
  command: string;
  purpose: string;
  expectedOutput: string;
  actualOutput?: string;
  status: 'pending' | 'running' | 'completed' | 'skipped';
  verdict?: TestVerdict;
  notes?: string;
  aiAnalysis?: string;
  executedAt?: string;
}

export interface DebugMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mode: DebugMode;
  investigationType?: 'question' | 'fact_check' | 'hypothesis' | 'test_proposal' | 'solution' | 'incident_action';
  suggestedHypotheses?: Partial<Hypothesis>[];
  suggestedTests?: Partial<DebugTest>[];
  suggestedActions?: string[];
  quickReplies?: string[];
  isThinking?: boolean;
}

export interface ValidatedSolution {
  rootCause: string;
  solutionSteps: string[];
  codeFix?: string;
  preventativeAction: string;
  affectedVersions: string[];
  confirmedVersions: string[];
  alternativeFixes?: string[];
  userConfirmed: boolean;
  confirmedAt?: string;
  confidenceTier: ConfidenceTier;
  contributorNote?: string;
}

export interface DebugSession {
  id: string;
  title: string;
  description: string;
  mode: DebugMode;
  status: SessionStatus;
  environment: EnvironmentInfo;
  rawLogs: string;
  stackTrace: string;
  relevantFiles: { name: string; path: string; snippet: string }[];
  messages: DebugMessage[];
  hypotheses: Hypothesis[];
  tests: DebugTest[];
  solution?: ValidatedSolution;
  secretsDetected: SecretFinding[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  similarityScore?: number;
}

export interface KnowledgeEntry {
  id: string;
  sessionId?: string;
  title: string;
  problemSummary: string;
  symptoms: string[];
  environment: EnvironmentInfo;
  rootCause: string;
  solutionSteps: string[];
  codeFix?: string;
  failedAttempts: string[];
  affectedVersions: string[];
  confirmedVersions: string[];
  confidenceTier: ConfidenceTier;
  reproductionsCount: number;
  publishedAt: string;
  tags: string[];
  contributor: string;
}

export interface AiInvestigationResponse {
  message: string;
  investigationType: 'question' | 'fact_check' | 'hypothesis' | 'test_proposal' | 'solution' | 'incident_action';
  hypotheses?: {
    title: string;
    rationale: string;
    confidence: ConfidenceScore;
    suggestedTests: string[];
  }[];
  tests?: {
    title: string;
    command: string;
    purpose: string;
    expectedOutput: string;
  }[];
  quickReplies?: string[];
  suggestedActions?: string[];
  suggestedSolution?: {
    rootCause: string;
    solutionSteps: string[];
    codeFix?: string;
    preventativeAction: string;
    affectedVersions: string[];
    confirmedVersions: string[];
  };
}
