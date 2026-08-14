export const SUPPORTED_LANGUAGES = [
  "java",
  "cpp",
  "c",
  "python",
  "javascript",
  "csharp",
  "go",
] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export type UserRole = "user" | "admin";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  trialEndsAt: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  createdBy: string;
  createdAt: string;
  starterCode: Record<Language, string>;
  solutionCode: Record<Language, string>;
}

export interface VisualizationVariable {
  name: string;
  value: string;
  type?: string;
}

export interface VisualizationStep {
  step: number;
  line?: number;
  message: string;
  variables: VisualizationVariable[];
  output: string;
  highlights?: number[];
}

export interface VisualizationResult {
  language: Language;
  success: boolean;
  steps: VisualizationStep[];
  finalOutput: string;
  error?: string;
  visualizationLevel: "full" | "execution" | "unsupported";
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  java: "Java",
  cpp: "C++",
  c: "C",
  python: "Python",
  javascript: "JavaScript",
  csharp: "C#",
  go: "Go",
};

export const MONACO_LANGUAGE_MAP: Record<Language, string> = {
  java: "java",
  cpp: "cpp",
  c: "c",
  python: "python",
  javascript: "javascript",
  csharp: "csharp",
  go: "go",
};

export const TRIAL_DAYS = 7;
export const WEEKLY_PRICE_USD = 10;
