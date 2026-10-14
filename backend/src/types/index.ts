export interface AgentSoul {
  identity: string;
  purpose: string;
  personality: string;
  communicationStyle: string;
  decisionStyle: string;
  goals: string[];
  rules: string[];
  customInstructions: string;
}

export interface AgentModelConfig {
  provider: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

export interface AgentPermissions {
  [key: string]: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  soul: AgentSoul;
  skills: any[];
  tools: any[];
  permissions: AgentPermissions;
  model: AgentModelConfig;
}

export interface SessionEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  events: SessionEvent[];
  state: Record<string, unknown>;
}

export interface Memory {
  id: string;
  userId: string;
  category: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowType = 'SEQUENTIAL' | 'PARALLEL' | 'LOOP';

export interface WorkflowStep {
  id: string;
  agent: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export interface Workflow {
  id: string;
  name: string;
  type: WorkflowType;
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: Record<string, unknown>): Promise<unknown>;
}
