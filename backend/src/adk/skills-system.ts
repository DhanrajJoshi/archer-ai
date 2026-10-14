import { Skill } from '../types/index.js';
import { logger } from '../logger.js';

const SKILLS: Skill[] = [
  {
    id: 'skill-web-research',
    name: 'Web Research',
    description: 'Research topics online and gather information from multiple sources.',
    category: 'research',
    instructions:
      'Break the research question into key sub-questions, gather facts from multiple angles, and summarize findings with sources.',
  },
  {
    id: 'skill-summarization',
    name: 'Summarization',
    description: 'Condense long content into clear, structured summaries.',
    category: 'research',
    instructions:
      'Identify the core message, key points, and conclusions. Present a concise summary preserving important details.',
  },
  {
    id: 'skill-fact-checking',
    name: 'Fact Checking',
    description: 'Verify claims by cross-referencing multiple sources.',
    category: 'research',
    instructions:
      'Extract verifiable claims, compare them against known reliable information, and label each claim as supported, unsupported, or uncertain.',
  },
  {
    id: 'skill-code-generation',
    name: 'Code Generation',
    description: 'Write clean, maintainable, production-quality code.',
    category: 'coding',
    instructions:
      'Understand requirements, choose appropriate structure, write typed and documented code, and include usage examples.',
  },
  {
    id: 'skill-code-analysis',
    name: 'Code Analysis',
    description: 'Analyze code for structure, quality, and potential issues.',
    category: 'coding',
    instructions:
      'Read the code carefully, describe its structure and flow, and point out strengths, weaknesses, and risks.',
  },
  {
    id: 'skill-debugging',
    name: 'Debugging',
    description: 'Diagnose and fix bugs systematically.',
    category: 'coding',
    instructions:
      'Reproduce the issue mentally, form hypotheses, identify the root cause, and propose a minimal targeted fix with verification steps.',
  },
  {
    id: 'skill-script-writing',
    name: 'Script Writing',
    description: 'Write engaging scripts for videos, podcasts, and presentations.',
    category: 'writing',
    instructions:
      'Structure the script with a hook, body, and call to action. Match the requested tone and audience.',
  },
  {
    id: 'skill-content-creation',
    name: 'Content Creation',
    description: 'Create engaging written content for various formats and audiences.',
    category: 'writing',
    instructions:
      'Understand the audience and goal, draft clear and engaging content, and refine for tone and clarity.',
  },
  {
    id: 'skill-task-decomposition',
    name: 'Task Decomposition',
    description: 'Break complex tasks into manageable, ordered steps.',
    category: 'planning',
    instructions:
      'Identify the outcome, split the work into concrete steps with dependencies, and order them by priority.',
  },
  {
    id: 'skill-project-planning',
    name: 'Project Planning',
    description: 'Create actionable project plans with timelines and milestones.',
    category: 'planning',
    instructions:
      'Define scope, milestones, and deliverables. Estimate effort, note dependencies, and highlight risks.',
  },
  {
    id: 'skill-image-generation',
    name: 'Image Generation',
    description: 'Describe and plan visual concepts for image generation.',
    category: 'creative',
    instructions:
      'Craft detailed visual descriptions including subject, style, composition, lighting, and mood.',
  },
  {
    id: 'skill-data-analysis',
    name: 'Data Analysis',
    description: 'Analyze data and extract meaningful insights.',
    category: 'analysis',
    instructions:
      'Examine the data, compute or estimate key metrics, identify patterns, and present conclusions with caveats.',
  },
  {
    id: 'skill-comparative-analysis',
    name: 'Comparative Analysis',
    description: 'Compare options objectively across relevant criteria.',
    category: 'analysis',
    instructions:
      'Define comparison criteria, evaluate each option per criterion, and recommend based on trade-offs.',
  },
  {
    id: 'skill-memory-management',
    name: 'Memory Management',
    description: 'Store, organize, and retrieve persistent knowledge.',
    category: 'memory',
    instructions:
      'Categorize information clearly, store what is important, and retrieve relevant memories when needed.',
  },
];

class SkillRegistry {
  private skills: Map<string, Skill> = new Map(
    SKILLS.map((skill) => [skill.id, skill])
  );

  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  getAllSkills(): Skill[] {
    return [...this.skills.values()];
  }

  getSkillsByCategory(category: string): Skill[] {
    return this.getAllSkills().filter((s) => s.category === category);
  }

  hasSkill(skillId: string): boolean {
    return this.skills.has(skillId);
  }
}

export const skillRegistry = new SkillRegistry();

export function initializeSkills(): void {
  logger.info(`Skill registry initialized: ${SKILLS.length} skills available`);
}
