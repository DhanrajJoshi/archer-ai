import { Artifact } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger.js';

export class ArtifactService {
  private artifacts: Map<string, Artifact[]> = new Map();

  createArtifact(
    userId: string,
    name: string,
    type: string,
    content: string,
    createdBy: string
  ): Artifact {
    const artifact: Artifact = {
      id: uuidv4(),
      name,
      type,
      content,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!this.artifacts.has(userId)) {
      this.artifacts.set(userId, []);
    }

    this.artifacts.get(userId)!.push(artifact);
    logger.info(`Artifact created: ${name} (${artifact.id})`);
    return artifact;
  }

  getArtifact(userId: string, artifactId: string): Artifact | null {
    const userArtifacts = this.artifacts.get(userId) || [];
    return userArtifacts.find((a) => a.id === artifactId) || null;
  }

  getUserArtifacts(userId: string): Artifact[] {
    return this.artifacts.get(userId) || [];
  }

  getArtifactsByType(userId: string, type: string): Artifact[] {
    const userArtifacts = this.artifacts.get(userId) || [];
    return userArtifacts.filter((a) => a.type === type);
  }

  updateArtifact(
    userId: string,
    artifactId: string,
    updates: Partial<Artifact>
  ): Artifact | null {
    const userArtifacts = this.artifacts.get(userId);
    if (!userArtifacts) {
      return null;
    }

    const artifact = userArtifacts.find((a) => a.id === artifactId);
    if (!artifact) {
      return null;
    }

    Object.assign(artifact, updates, { updatedAt: new Date() });
    logger.debug(`Artifact updated: ${artifactId}`);
    return artifact;
  }

  deleteArtifact(userId: string, artifactId: string): boolean {
    const userArtifacts = this.artifacts.get(userId);
    if (!userArtifacts) {
      return false;
    }

    const index = userArtifacts.findIndex((a) => a.id === artifactId);
    if (index === -1) {
      return false;
    }

    userArtifacts.splice(index, 1);
    logger.info(`Artifact deleted: ${artifactId}`);
    return true;
  }

  getArtifactsByAgent(userId: string, createdBy: string): Artifact[] {
    const userArtifacts = this.artifacts.get(userId) || [];
    return userArtifacts.filter((a) => a.createdBy === createdBy);
  }
}
