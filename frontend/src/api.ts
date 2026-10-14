export interface AgentInfo {
  id: string;
  name: string;
  role: string;
}

export interface ToolUse {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
}

export interface ChatResponse {
  agentId: string;
  agentName: string;
  content: string;
  toolUses: ToolUse[];
  executionTime: number;
  timestamp: string;
}

export interface HealthStatus {
  status: string;
  agentsAvailable: boolean;
  skills: number;
  tools: number;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export async function fetchAgents(): Promise<AgentInfo[]> {
  const res = await fetch('/api/agents');
  if (!res.ok) throw new Error(`Failed to load agents (${res.status})`);
  return res.json();
}

export async function sendMessage(
  message: string,
  agentId: string | null
): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, agentId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.error || `Chat failed (${res.status})`);
  }
  return data;
}
