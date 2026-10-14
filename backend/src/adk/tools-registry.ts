import { Tool } from '../types/index.js';
import { logger } from '../logger.js';
import { MemoryService } from './memory-service.js';
import { ArtifactService } from './artifact-service.js';
import { promises as fs } from 'fs';
import path from 'path';

const WORKSPACE_DIR = process.env.ARCHER_WORKSPACE_DIR
  ? path.resolve(process.env.ARCHER_WORKSPACE_DIR)
  : path.resolve(process.cwd(), '.archer-workspace');

const memoryService = new MemoryService();
const artifactService = new ArtifactService();

function resolveWorkspacePath(filePath: unknown): string {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('file is required and must be a non-empty string');
  }
  const resolved = path.resolve(WORKSPACE_DIR, filePath);
  if (!resolved.startsWith(WORKSPACE_DIR + path.sep) && resolved !== WORKSPACE_DIR) {
    throw new Error('Path escapes the workspace directory');
  }
  return resolved;
}

function requireString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`"${key}" is required and must be a non-empty string`);
  }
  return value;
}

const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file from the agent workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'File path relative to the workspace root' },
    },
    required: ['file'],
  },
  async execute(input) {
    const filePath = resolveWorkspacePath(input.file);
    const content = await fs.readFile(filePath, 'utf-8');
    return { file: path.relative(WORKSPACE_DIR, filePath), content };
  },
};

const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file in the agent workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'File path relative to the workspace root' },
      content: { type: 'string', description: 'Content to write to the file' },
    },
    required: ['file', 'content'],
  },
  async execute(input) {
    const filePath = resolveWorkspacePath(input.file);
    const content = typeof input.content === 'string' ? input.content : String(input.content ?? '');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    const relativePath = path.relative(WORKSPACE_DIR, filePath);
    logger.debug(`File written: ${relativePath}`);
    return { file: relativePath, bytes: Buffer.byteLength(content, 'utf-8') };
  },
};

const analyzeContentTool: Tool = {
  name: 'analyze_content',
  description: 'Analyze a piece of text and return basic statistics and key terms.',
  inputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'The text content to analyze' },
    },
    required: ['content'],
  },
  async execute(input) {
    const content = requireString(input, 'content');
    const words = content.match(/[\p{L}\p{N}']+/gu) || [];
    const sentences = content.split(/[.!?]+\s|\n+/).filter((s) => s.trim().length > 0);
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
      'to', 'of', 'in', 'on', 'at', 'for', 'with', 'it', 'this', 'that',
    ]);
    for (const word of words) {
      const lower = word.toLowerCase();
      if (stopWords.has(lower) || lower.length < 3) continue;
      wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1);
    }
    const keywords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
    return {
      characters: content.length,
      words: words.length,
      sentences: sentences.length,
      readingTimeMinutes: Math.max(1, Math.round(words.length / 200)),
      keywords,
    };
  },
};

const analyzeCodeTool: Tool = {
  name: 'analyze_code',
  description: 'Analyze a code snippet and return structural statistics.',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The code to analyze' },
    },
    required: ['code'],
  },
  async execute(input) {
    const code = requireString(input, 'code');
    const lines = code.split('\n');
    const commentLines = lines.filter((l) => l.trim().startsWith('//') || l.trim().startsWith('*') || l.trim().startsWith('/*')).length;
    const functions = code.match(/(function\s+\w+|\w+\s*\([^)]*\)\s*{)/g) || [];
    const classes = code.match(/class\s+\w+/g) || [];
    const imports = code.match(/^\s*(import|require)\s/m) ? code.match(/^\s*(import|require).*$/gm) || [] : [];
    return {
      lines: lines.length,
      commentLines,
      functionCount: functions.length,
      classCount: classes.length,
      importCount: imports.length,
      isEmpty: code.trim().length === 0,
    };
  },
};

const createTaskTool: Tool = {
  name: 'create_task',
  description: 'Create a task for the agent to track.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short task title' },
      description: { type: 'string', description: 'Task details (optional)' },
    },
    required: ['title'],
  },
  async execute(input) {
    const title = requireString(input, 'title');
    const description = typeof input.description === 'string' ? input.description : '';
    return artifactService.createArtifact('default', title, 'task', description, 'tool-registry');
  },
};

const saveMemoryTool: Tool = {
  name: 'save_memory',
  description: 'Save a memory entry for later retrieval.',
  inputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'The information to remember' },
      category: { type: 'string', description: 'Memory category (optional)' },
    },
    required: ['content'],
  },
  async execute(input) {
    const content = requireString(input, 'content');
    const category = typeof input.category === 'string' && input.category.trim() !== ''
      ? input.category
      : 'general';
    return memoryService.addMemory('default', content, category);
  },
};

const searchMemoryTool: Tool = {
  name: 'search_memory',
  description: 'Search previously saved memory entries.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
  async execute(input) {
    const query = requireString(input, 'query');
    return memoryService.searchMemories('default', query);
  },
};

const searchWebTool: Tool = {
  name: 'search_web',
  description:
    'Search the web. Requires a search provider integration; returns a notice until one is configured.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
  async execute(input) {
    const query = requireString(input, 'query');
    logger.warn(`search_web executed without a configured provider: ${query}`);
    return {
      query,
      results: [],
      notice:
        'Web search is not configured yet. Provide a search provider integration to enable live results.',
    };
  },
};

const generateImageTool: Tool = {
  name: 'generate_image',
  description:
    'Generate an image. Requires an image generation provider integration; returns a notice until one is configured.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Description of the image to generate' },
    },
    required: ['prompt'],
  },
  async execute(input) {
    const prompt = requireString(input, 'prompt');
    logger.warn(`generate_image executed without a configured provider: ${prompt}`);
    return {
      prompt,
      image: null,
      notice:
        'Image generation is not configured yet. Provide an image generation provider integration to enable this tool.',
    };
  },
};

const TOOLS: Tool[] = [
  readFileTool,
  writeFileTool,
  analyzeContentTool,
  analyzeCodeTool,
  createTaskTool,
  saveMemoryTool,
  searchMemoryTool,
  searchWebTool,
  generateImageTool,
];

class ToolRegistry {
  private tools: Map<string, Tool> = new Map(TOOLS.map((tool) => [tool.name, tool]));

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return [...this.tools.values()];
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  async executeTool(
    name: string,
    input: Record<string, unknown>
  ): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    logger.debug(`Executing tool: ${name}`);
    return tool.execute(input);
  }
}

export const toolRegistry = new ToolRegistry();

export function initializeTools(): void {
  logger.info(`Tool registry initialized: ${TOOLS.length} tools available`);
}
