import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { AgentFactory } from './adk/agent-factory.js';
import { ArcherAgent } from './adk/archer-agent.js';
import { WorkflowEngine } from './adk/workflow-engine.js';
import { SessionManager } from './adk/session-manager.js';
import { skillRegistry, initializeSkills } from './adk/skills-system.js';
import { toolRegistry, initializeTools } from './adk/tools-registry.js';
import { logger } from './logger.js';
import { WorkflowStep } from './types/index.js';

const PORT = Number(process.env.PORT) || 4000;

function resolveWorkspaceDir(): string {
  return process.env.ARCHER_WORKSPACE_DIR
    ? path.resolve(process.env.ARCHER_WORKSPACE_DIR)
    : path.resolve(process.cwd(), '.archer-workspace');
}

async function main(): Promise<void> {
  initializeSkills();
  initializeTools();

  const workspaceDir = resolveWorkspaceDir();
  await fs.mkdir(workspaceDir, { recursive: true });
  logger.info(`Agent workspace directory: ${workspaceDir}`);

  const app = express();
  app.use(cors());
  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY || '';
  const agentFactory = new AgentFactory(apiKey);
  const workflowEngine = new WorkflowEngine();
  const sessionManager = new SessionManager();

  let agents: Map<string, ArcherAgent> | null = null;
  if (apiKey) {
    agents = agentFactory.createDefaultAgents();
    for (const [agentId, agent] of agents) {
      workflowEngine.registerAgent(agentId, agent);
    }
  } else {
    logger.warn('GEMINI_API_KEY is not set. Agent features will be unavailable until it is provided.');
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      agentsAvailable: agents !== null,
      skills: skillRegistry.getAllSkills().length,
      tools: toolRegistry.getAllTools().length,
    });
  });

  app.get('/api/agents', (_req, res) => {
    const all = agents ?? agentFactory.getAllAgents();
    res.json(
      [...all.values()].map((agent) => {
        const config = agent.getConfig();
        return { id: config.id, name: config.name, role: config.role };
      })
    );
  });

  app.post('/api/chat', async (req, res) => {
    if (!agents) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Set it and restart the backend.',
      });
      return;
    }
    const { message, agentId } = req.body ?? {};
    if (typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: '"message" is required' });
      return;
    }
    const agent = (agentId && agents.get(agentId)) || agents.get('ARCHER');
    if (!agent) {
      res.status(404).json({ error: `Agent not found: ${agentId}` });
      return;
    }
    try {
      const response = await agent.processMessage(message);
      res.json(response);
    } catch (error) {
      logger.error(
        `Chat failed: ${error instanceof Error ? error.message : String(error)}`
      );
      res.status(502).json({
        error: 'The agent failed to process the message.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/api/sessions', (req, res) => {
    const { userId } = req.body ?? {};
    if (typeof userId !== 'string' || userId.trim() === '') {
      res.status(400).json({ error: '"userId" is required' });
      return;
    }
    res.status(201).json(sessionManager.createSession(userId));
  });

  app.get('/api/sessions/:sessionId', (req, res) => {
    const session = sessionManager.getSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  });

  app.post('/api/workflows', (req, res) => {
    const { name, type, steps } = req.body ?? {};
    if (typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: '"name" is required' });
      return;
    }
    if (type !== 'SEQUENTIAL' && type !== 'PARALLEL' && type !== 'LOOP') {
      res.status(400).json({ error: '"type" must be SEQUENTIAL, PARALLEL, or LOOP' });
      return;
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ error: '"steps" must be a non-empty array' });
      return;
    }
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (typeof step?.agent !== 'string' || step.agent.trim() === '') {
        res.status(400).json({ error: `steps[${i}].agent is required` });
        return;
      }
    }
    const parsedSteps: WorkflowStep[] = steps.map(
      (step: { agent: string; input?: Record<string, unknown> }, index: number) => ({
        id: `step-${index + 1}`,
        agent: step.agent,
        input: step.input,
        status: 'PENDING',
      })
    );
    res.status(201).json(workflowEngine.createWorkflow(name, type, parsedSteps));
  });

  app.post('/api/workflows/:workflowId/execute', async (req, res) => {
    try {
      const execution = await workflowEngine.executeWorkflow(
        req.params.workflowId,
        req.body?.context
      );
      res.json(execution);
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Workflow execution failed',
      });
    }
  });

  app.get('/api/workflows/executions/:executionId', (req, res) => {
    const execution = workflowEngine.getExecution(req.params.executionId);
    if (!execution) {
      res.status(404).json({ error: 'Execution not found' });
      return;
    }
    res.json(execution);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const server = http.createServer(app);
  server.listen(PORT, () => {
    logger.info(`ARCHER AI backend listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    logger.info('Shutting down backend...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error(`Fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
