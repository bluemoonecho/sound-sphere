/**
 * SessionManager.js - Handle session persistence via localStorage
 */

export class SessionManager {
  constructor() {
    this.storageKey = 'sound-sphere-sessions';
    this.schemaVersion = '2.0.0';
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
        version: this.schemaVersion,
        animationType: state.animationType || 0,
        patternSet: state.patternSet || 'default',
        midiDeviceId: state.midiDeviceId || null,
        activeSource: state.activeSource || 'keyboard',
        warningState: state.warningState || 'none',
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
      version: this.schemaVersion,
      animationType: app.animationController.p5Sketch.currentAnimationType,
      patternSet: app.soundEngine.currentPatternSet,
      midiDeviceId: app.midiInput.selectedInput?.id || null,
      activeSource: app.uiState.activeSource,
      warningState: app.uiState.warningState,
      settings: {
        // Add any other relevant settings
      }
    };
  }

  restoreState(state) {
    if (!state || typeof state !== 'object') {
      return this.getDefaultState();
    }

    const version = typeof state.version === 'string' ? state.version : '1.0.0';
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return this.getDefaultState();
    }

    return {
      version,
      animationType: Number.isInteger(state.animationType) ? state.animationType : 0,
      patternSet: typeof state.patternSet === 'string' ? state.patternSet : 'default',
      midiDeviceId: typeof state.midiDeviceId === 'string' ? state.midiDeviceId : null,
      activeSource: state.activeSource === 'midi' ? 'midi' : 'keyboard',
      warningState: typeof state.warningState === 'string' ? state.warningState : 'none',
      settings: state.settings && typeof state.settings === 'object' ? state.settings : {}
    };
  }

  loadLastState() {
    const sessions = this.getAllSessions();
    if (sessions.length === 0) {
      return null;
    }

    const last = sessions[sessions.length - 1];
    if (!last || !last.state) {
      return this.getDefaultState();
    }

    return this.restoreState(last.state);
  }

  getDefaultState() {
    return {
      version: this.schemaVersion,
      animationType: 0,
      patternSet: 'default',
      midiDeviceId: null,
      activeSource: 'keyboard',
      warningState: 'none',
      settings: {}
    };
  }
}
