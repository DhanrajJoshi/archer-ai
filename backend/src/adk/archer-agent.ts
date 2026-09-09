import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../logger.js';
import { getSoulInstructions } from './soul-system.js';
import { toolRegistry } from './tools-registry.js';
import { skillRegistry } from './skills-system.js';
import { AgentConfig } from '../types/index.js';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  content: string;
  toolUses: ToolUse[];
  executionTime: number;
  timestamp: Date;
}

export interface ToolUse {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
}

export class ArcherAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistory: AgentMessage[] = [];
  private config: AgentConfig;
  private maxHistoryLength = 10;

  constructor(apiKey: string, config: AgentConfig) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.model.modelName,
      systemInstruction: this.buildSystemPrompt(config),
    });
    this.config = config;
  }

  private buildSystemPrompt(config: AgentConfig): string {
    const soulInstructions = getSoulInstructions(config.id);
    const skills = this.getAgentSkillsDescription(config.id);
    const tools = this.getAvailableToolsDescription(config.id);

    return `
${soulInstructions}

## Available Skills
${skills}

## Available Tools
${tools}

## Instructions
1. Understand the user's request carefully
2. Determine if you need to use tools to fulfill the request
3. If delegating to another agent, communicate that clearly
4. Provide structured, clear responses
5. Always consider the user's preferences and prior context

## Tool Usage
When you need to use a tool, format it as:
[TOOL: tool_name]
{"param1": "value1", "param2": "value2"}
[/TOOL]

## Response Format
Provide clear, well-structured responses that explain your reasoning and actions.
    `;
  }

  private getAgentSkillsDescription(agentId: string): string {
    const agentSkillMappings: Record<string, string[]> = {
      RESEARCHER: [
        'skill-web-research',
        'skill-summarization',
        'skill-fact-checking',
      ],
      CODER: [
        'skill-code-generation',
        'skill-code-analysis',
        'skill-debugging',
      ],
      WRITER: ['skill-script-writing', 'skill-content-creation'],
      PLANNER: ['skill-task-decomposition', 'skill-project-planning'],
      VISUAL: ['skill-image-generation'],
      ANALYST: ['skill-data-analysis', 'skill-comparative-analysis'],
      MEMORY_MANAGER: ['skill-memory-management'],
      ARCHER: [
        'skill-web-research',
        'skill-code-generation',
        'skill-script-writing',
        'skill-task-decomposition',
        'skill-data-analysis',
        'skill-memory-management',
      ],
    };

    const skillIds = agentSkillMappings[agentId] || [];
    return skillIds
      .map((skillId) => {
        const skill = skillRegistry.getSkill(skillId);
        return skill ? `- **${skill.name}**: ${skill.description}` : '';
      })
      .filter((s) => s)
      .join('\n');
  }

  private getAvailableToolsDescription(agentId: string): string {
    const agentToolPermissions: Record<string, string[]> = {
      RESEARCHER: ['search_web', 'analyze_content'],
      CODER: [
        'read_file',
        'write_file',
        'analyze_code',
      ],
      WRITER: ['write_file'],
      PLANNER: ['create_task'],
      VISUAL: ['generate_image'],
      ANALYST: ['analyze_content'],
      MEMORY_MANAGER: ['save_memory', 'search_memory'],
      ARCHER: [
        'search_web',
        'read_file',
        'write_file',
        'analyze_content',
        'create_task',
        'save_memory',
        'search_memory',
      ],
    };

    const allowedTools = agentToolPermissions[agentId] || [];
    return allowedTools
      .map((toolName) => {
        const tool = toolRegistry.getTool(toolName);
        return tool
          ? `- **${tool.name}**: ${tool.description}\n  Input: ${JSON.stringify(tool.inputSchema)}`
          : '';
      })
      .filter((t) => t)
      .join('\n\n');
  }

  async processMessage(
    userMessage: string,
    context?: Record<string, unknown>
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const toolUses: ToolUse[] = [];

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Build context-aware prompt
      let enhancedMessage = userMessage;
      if (context) {
        enhancedMessage = `
Context:
${JSON.stringify(context, null, 2)}

User Message:
${userMessage}
        `;
      }

      // Call Gemini API
      const response = await this.model.generateContent(enhancedMessage);
      const responseText =
        response.response.content.parts[0].type === 'text'
          ? response.response.content.parts[0].text
          : '';

      logger.info(
        `Agent ${this.config.name} processed message from user in ${Date.now() - startTime}ms`
      );

      // Parse tool uses from response
      toolUses.push(...this.parseToolUses(responseText));

      // Execute tools if needed
      let finalResponse = responseText;
      if (toolUses.length > 0) {
        for (const toolUse of toolUses) {
          try {
            const output = await toolRegistry.executeTool(
              toolUse.toolName,
              toolUse.input
            );
            toolUse.output = output;
            logger.debug(
              `Tool ${toolUse.toolName} executed successfully by ${this.config.name}`
            );
          } catch (error) {
            logger.error(
              `Tool ${toolUse.toolName} failed: ${error instanceof Error ? error.message : String(error)}`
            );
            toolUse.output = {
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }
      }

      // Add assistant response to history (keep history manageable)
      this.conversationHistory.push({
        role: 'assistant',
        content: responseText,
      });

      if (this.conversationHistory.length > this.maxHistoryLength) {
        this.conversationHistory = this.conversationHistory.slice(
          -this.maxHistoryLength
        );
      }

      return {
        agentId: this.config.id,
        agentName: this.config.name,
        content: finalResponse,
        toolUses,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        `Agent ${this.config.name} error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private parseToolUses(response: string): ToolUse[] {
    const toolUses: ToolUse[] = [];
    const toolPattern = /\[TOOL: ([^\]]+)\]\n?([^[]*?)\[/TOOL\]/gs;
    let match;

    while ((match = toolPattern.exec(response)) !== null) {
      try {
        const toolName = match[1].trim();
        const toolInput = JSON.parse(match[2].trim());
        toolUses.push({
          toolName,
          input: toolInput,
          output: null,
        });
      } catch (error) {
        logger.warn(`Failed to parse tool use: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return toolUses;
  }

  clearHistory(): void {
    this.conversationHistory = [];
    logger.debug(`Conversation history cleared for ${this.config.name}`);
  }

  getHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }

  getConfig(): AgentConfig {
    return this.config;
  }
}
