import { Memory } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger.js';

export class MemoryService {
  private memories: Map<string, Memory[]> = new Map();

  addMemory(
    userId: string,
    content: string,
    category: string = 'general',
    metadata: Record<string, unknown> = {}
  ): Memory {
    const memory: Memory = {
      id: uuidv4(),
      userId,
      category,
      content,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!this.memories.has(userId)) {
      this.memories.set(userId, []);
    }

    this.memories.get(userId)!.push(memory);
    logger.debug(`Memory added for user ${userId}: ${category}`);
    return memory;
  }

  searchMemories(
    userId: string,
    query: string,
    category?: string
  ): Memory[] {
    const userMemories = this.memories.get(userId) || [];
    const queryLower = query.toLowerCase();

    return userMemories.filter((memory) => {
      const contentMatch = memory.content.toLowerCase().includes(queryLower);
      const categoryMatch = !category || memory.category === category;
      return contentMatch && categoryMatch;
    });
  }

  updateMemory(
    userId: string,
    memoryId: string,
    updates: Partial<Memory>
  ): Memory | null {
    const userMemories = this.memories.get(userId);
    if (!userMemories) {
      return null;
    }

    const memory = userMemories.find((m) => m.id === memoryId);
    if (!memory) {
      return null;
    }

    Object.assign(memory, updates, { updatedAt: new Date() });
    logger.debug(`Memory updated for user ${userId}: ${memoryId}`);
    return memory;
  }

  deleteMemory(userId: string, memoryId: string): boolean {
    const userMemories = this.memories.get(userId);
    if (!userMemories) {
      return false;
    }

    const index = userMemories.findIndex((m) => m.id === memoryId);
    if (index === -1) {
      return false;
    }

    userMemories.splice(index, 1);
    logger.debug(`Memory deleted for user ${userId}: ${memoryId}`);
    return true;
  }

  getMemoriesByCategory(
    userId: string,
    category: string
  ): Memory[] {
    const userMemories = this.memories.get(userId) || [];
    return userMemories.filter((m) => m.category === category);
  }

  getAllMemories(userId: string): Memory[] {
    return this.memories.get(userId) || [];
  }

  getMemoryStats(userId: string): {
    total: number;
    byCategory: Record<string, number>;
  } {
    const userMemories = this.memories.get(userId) || [];
    const byCategory: Record<string, number> = {};

    for (const memory of userMemories) {
      byCategory[memory.category] = (byCategory[memory.category] || 0) + 1;
    }

    return {
      total: userMemories.length,
      byCategory,
    };
  }
}
