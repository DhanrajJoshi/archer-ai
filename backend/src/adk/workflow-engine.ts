import { Workflow, WorkflowStep } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger.js';
import { ArcherAgent } from './archer-agent.js';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  steps: WorkflowStep[];
  startTime: Date;
  endTime?: Date;
}

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private agents: Map<string, ArcherAgent> = new Map();

  registerAgent(agentId: string, agent: ArcherAgent): void {
    this.agents.set(agentId, agent);
  }

  createWorkflow(
    name: string,
    type: 'SEQUENTIAL' | 'PARALLEL' | 'LOOP',
    steps: WorkflowStep[]
  ): Workflow {
    const workflow: Workflow = {
      id: uuidv4(),
      name,
      type,
      steps,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);
    logger.info(`Workflow created: ${name} (${workflow.id})`);
    return workflow;
  }

  async executeWorkflow(
    workflowId: string,
    context?: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      status: 'RUNNING',
      steps: [...workflow.steps],
      startTime: new Date(),
    };

    try {
      if (workflow.type === 'SEQUENTIAL') {
        await this.executeSequential(execution, context);
      } else if (workflow.type === 'PARALLEL') {
        await this.executeParallel(execution, context);
      } else if (workflow.type === 'LOOP') {
        await this.executeLoop(execution, context);
      }

      execution.status = 'COMPLETED';
      execution.endTime = new Date();
      logger.info(`Workflow execution completed: ${execution.id}`);
    } catch (error) {
      execution.status = 'FAILED';
      execution.endTime = new Date();
      logger.error(
        `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this.executions.set(execution.id, execution);
    return execution;
  }

  private async executeSequential(
    execution: WorkflowExecution,
    context?: Record<string, unknown>
  ): Promise<void> {
    for (const step of execution.steps) {
      const agent = this.agents.get(step.agent);
      if (!agent) {
        logger.warn(`Agent not found for step: ${step.id}`);
        step.status = 'FAILED';
        continue;
      }

      try {
        const input = step.input
          ? JSON.stringify(step.input)
          : 'Execute action';
        const response = await agent.processMessage(input, context);
        step.output = { content: response.content, toolUses: response.toolUses };
        step.status = 'COMPLETED';
        logger.debug(`Workflow step completed: ${step.id}`);
      } catch (error) {
        step.status = 'FAILED';
        logger.error(
          `Workflow step failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  private async executeParallel(
    execution: WorkflowExecution,
    context?: Record<string, unknown>
  ): Promise<void> {
    const promises = execution.steps.map(async (step) => {
      const agent = this.agents.get(step.agent);
      if (!agent) {
        logger.warn(`Agent not found for step: ${step.id}`);
        step.status = 'FAILED';
        return;
      }

      try {
        const input = step.input
          ? JSON.stringify(step.input)
          : 'Execute action';
        const response = await agent.processMessage(input, context);
        step.output = { content: response.content, toolUses: response.toolUses };
        step.status = 'COMPLETED';
      } catch (error) {
        step.status = 'FAILED';
        logger.error(
          `Workflow step failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    await Promise.all(promises);
  }

  private async executeLoop(
    execution: WorkflowExecution,
    context?: Record<string, unknown>
  ): Promise<void> {
    let iterations = 0;
    const maxIterations = 3;

    while (iterations < maxIterations) {
      let allCompleted = true;

      for (const step of execution.steps) {
        if (step.status === 'COMPLETED') continue;

        const agent = this.agents.get(step.agent);
        if (!agent) {
          logger.warn(`Agent not found for step: ${step.id}`);
          step.status = 'FAILED';
          continue;
        }

        try {
          const input = step.input
            ? JSON.stringify(step.input)
            : 'Execute action';
          const response = await agent.processMessage(input, context);
          step.output = {
            content: response.content,
            toolUses: response.toolUses,
          };
          step.status = 'COMPLETED';
        } catch (error) {
          step.status = 'FAILED';
          allCompleted = false;
          logger.error(
            `Workflow step failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (allCompleted) break;
      iterations++;
    }
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }
}
