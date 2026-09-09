import { Session, SessionEvent } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger.js';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, string[]> = new Map();

  createSession(userId: string): Session {
    const session: Session = {
      id: uuidv4(),
      userId,
      sessionId: `session-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      events: [],
      state: {},
    };

    this.sessions.set(session.id, session);

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, []);
    }
    this.userSessions.get(userId)!.push(session.id);

    logger.info(`Session created: ${session.id} for user: ${userId}`);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getUserSessions(userId: string): Session[] {
    const sessionIds = this.userSessions.get(userId) || [];
    return sessionIds
      .map((id) => this.sessions.get(id))
      .filter((s) => s !== undefined) as Session[];
  }

  addEvent(sessionId: string, event: SessionEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return;
    }

    session.events.push(event);
    session.updatedAt = new Date();
    logger.debug(`Event added to session ${sessionId}: ${event.type}`);
  }

  updateSessionState(
    sessionId: string,
    stateUpdates: Record<string, unknown>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return;
    }

    session.state = { ...session.state, ...stateUpdates };
    session.updatedAt = new Date();
    logger.debug(`Session state updated: ${sessionId}`);
  }

  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);

    // Remove from user sessions
    const userIds = this.userSessions.get(session.userId);
    if (userIds) {
      const index = userIds.indexOf(sessionId);
      if (index > -1) {
        userIds.splice(index, 1);
      }
    }

    logger.info(`Session deleted: ${sessionId}`);
    return true;
  }

  getSessionStats(sessionId: string): {
    eventCount: number;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      eventCount: session.events.length,
      duration: session.updatedAt.getTime() - session.createdAt.getTime(),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
