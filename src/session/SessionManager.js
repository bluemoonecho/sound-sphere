/**
 * SessionManager.js - Handle session persistence via localStorage
 */

export class SessionManager {
  constructor() {
    this.storageKey = 'sound-sphere-sessions';
    this.sessions = this.loadAllSessions();
  }

  /**
   * Create a session snapshot
   */
  createSession(name, state) {
    const session = {
      id: Date.now().toString(),
      name: name || `Session ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      state: {
        animationType: state.animationType || 0,
        patternSet: state.patternSet || 'default',
        midiDeviceId: state.midiDeviceId || null,
        settings: state.settings || {}
      }
    };

    return session;
  }

  /**
   * Save a session to localStorage
   */
  saveSession(name, state) {
    const session = this.createSession(name, state);
    this.sessions.push(session);
    this.persistSessions();
    return session;
  }

  /**
   * Load a session by ID
   */
  loadSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      console.warn(`Session ${sessionId} not found`);
      return null;
    }
    return session;
  }

  /**
   * Delete a session by ID
   */
  deleteSession(sessionId) {
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    this.persistSessions();
  }

  /**
   * Get all saved sessions
   */
  getAllSessions() {
    return this.sessions;
  }

  /**
   * Get session list for UI (name + id)
   */
  getSessionList() {
    return this.sessions.map(s => ({
      id: s.id,
      name: s.name,
      timestamp: s.timestamp
    }));
  }

  /**
   * Export session as JSON
   */
  exportSession(sessionId) {
    const session = this.loadSession(sessionId);
    if (!session) return null;
    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session from JSON
   */
  importSession(jsonString) {
    try {
      const session = JSON.parse(jsonString);
      
      // Validate session structure
      if (!session.name || !session.state) {
        throw new Error('Invalid session format');
      }

      // Re-generate ID and timestamp for imported session
      session.id = Date.now().toString();
      session.timestamp = Date.now();

      this.sessions.push(session);
      this.persistSessions();
      return session;
    } catch (error) {
      console.error('Error importing session:', error);
      return null;
    }
  }

  /**
   * Clear all sessions
   */
  clearAllSessions() {
    this.sessions = [];
    this.persistSessions();
  }

  /**
   * Load all sessions from localStorage
   */
  loadAllSessions() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading sessions from localStorage:', error);
      return [];
    }
  }

  /**
   * Persist sessions to localStorage
   */
  persistSessions() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.sessions));
    } catch (error) {
      console.error('Error saving sessions to localStorage:', error);
    }
  }

  /**
   * Get current app state snapshot
   */
  getStateSnapshot(app) {
    return {
      animationType: app.animationController.p5Sketch.currentAnimationType,
      patternSet: app.soundEngine.currentPatternSet,
      midiDeviceId: app.midiInput.selectedInput?.id || null,
      settings: {
        // Add any other relevant settings
      }
    };
  }
}
