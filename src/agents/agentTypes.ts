export type StepInputType =
  | 'single-choice'
  | 'multiple-choice'
  | 'text'
  | 'image'
  | 'number'
  | 'confirmation';

export interface AgentOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  nextStepId?: string;
}

export interface AgentValidation {
  minLength?: number;
  pattern?: string;
  customError?: string;
  requireImage?: boolean;
  allowImageOnly?: boolean;
}

export interface AgentCondition {
  field: string;
  equals?: string;
  in?: string[];
  goToStepId: string;
}

export interface AgentStep {
  id: string;
  order: number;
  title: string;
  question: string;
  type: StepInputType;
  options?: AgentOption[];
  required: boolean;
  validation?: AgentValidation;
  confirmationMessage?: string;
  nextStepId?: string;
  conditions?: AgentCondition[];
}

export interface AgentRule {
  id: string;
  rule: string;
}

export interface AgentOutputTemplate {
  id: string;
  title: string;
  template: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  initialMessage: string;
  rawPrompt?: string;
  rules?: AgentRule[];
  steps: AgentStep[];
  outputs: AgentOutputTemplate[];
}

export interface AgentImage {
  data: string;
  name: string;
}

export interface AgentSession {
  agentId: string;
  currentStepId: string;
  completedStepIds: string[];
  answers: Record<string, any>;
  attachedImages: AgentImage[];
  status: 'started' | 'in-progress' | 'completed';
  lastUpdated: string;
}
