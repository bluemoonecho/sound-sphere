/**
 * main.js - Application initialization and orchestration
 */

import { MidiInput } from './midi/MidiInput.js';
import { KeyboardInput } from './midi/KeyboardInput.js';
import { KEYBOARD_CONFIG, VELOCITY_RANGES, PITCH_BEND_CONFIG } from './midi/MidiConfig.js';
import { StrudelEngine } from './sound/StrudelEngine.js';
import { P5Sketch } from './visual/P5Sketch.js';
import { AnimationController } from './visual/AnimationController.js';
import { SessionManager } from './session/SessionManager.js';

class SoundSphere {
  constructor() {
    // Core components
    this.midiInput = new MidiInput();
    this.keyboardInput = new KeyboardInput();
    this.soundEngine = new StrudelEngine();
    this.p5Sketch = new P5Sketch('#p5-container');
    this.animationController = new AnimationController(this.p5Sketch);
    this.sessionManager = new SessionManager();

    // UI State
    this.uiState = {
      midiSelected: false,
      midiDevices: [],
      currentAnimationType: 0,
      useKeyboard: false
    };
  }

  /**
   * Initialize the entire application
   */
  async init() {
    console.log('Initializing Sound Sphere...');

    try {
      // Initialize MIDI
      const midiSupported = await this.midiInput.init();
      if (!midiSupported) {
        console.warn('Web MIDI not supported - enabling keyboard fallback');
      }

      // Always initialize keyboard input as fallback
      this.keyboardInput.init();
      this.uiState.useKeyboard = true;

      // Initialize sound engine
      const soundReady = await this.soundEngine.init();
      if (!soundReady) {
        console.warn('Sound engine failed to initialize');
      }

      // Initialize visuals
      this.p5Sketch.init();

      // Setup UI
      this.setupUI();

      // Setup MIDI event listeners
      this.setupMidiListeners();

      // Setup keyboard event listeners
      this.setupKeyboardListeners();

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();

      // Load last session if available
      this.loadLastSession();

      console.log('Sound Sphere initialized successfully');
      this.updateMidiStatus();
    } catch (error) {
      console.error('Failed to initialize Sound Sphere:', error);
    }
  }

  /**
   * Setup UI controls
   */
  setupUI() {
    // MIDI device selector
    const midiSelect = document.getElementById('midi-select');
    if (midiSelect) {
      midiSelect.addEventListener('change', (e) => this.selectMidiDevice(e.target.value));
      this.updateMidiDeviceList();
    }

    // Animation type selector
    const animSelect = document.getElementById('animation-select');
    if (animSelect) {
      animSelect.addEventListener('change', (e) => {
        const type = parseInt(e.target.value);
        this.animationController.setAnimationType(type);
        this.uiState.currentAnimationType = type;
      });
    }

    // Session controls
    const saveBtn = document.getElementById('save-session');
    const loadBtn = document.getElementById('load-session');
    const clearBtn = document.getElementById('clear-session');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSession());
    }
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadSession());
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSession());
    }
  }

  /**
   * Setup keyboard event listeners (for Mac keyboard fallback)
   */
  setupKeyboardListeners() {
    this.keyboardInput.on('noteOn', (data) => {
      const { note, velocity } = data;

      // Check if note is in our 3-octave range
      if (!KEYBOARD_CONFIG.isInRange(note)) {
        return;
      }

      console.log(`Keyboard: Note On ${KEYBOARD_CONFIG.getMidiNoteName(note)} Velocity: ${velocity}`);

      // Trigger sound
      this.soundEngine.triggerNote(note, velocity);

      // Trigger animation
      this.animationController.onNoteOn(note, velocity);

      // Update UI
      this.updateNoteInfo(note, velocity);
    });

    this.keyboardInput.on('noteOff', (data) => {
      const { note } = data;

      if (!KEYBOARD_CONFIG.isInRange(note)) {
        return;
      }

      console.log(`Keyboard: Note Off ${KEYBOARD_CONFIG.getMidiNoteName(note)}`);

      // Stop sound
      this.soundEngine.stopNote(note);

      // Stop animation
      this.animationController.onNoteOff(note);

      // Clear note info
      this.updateNoteInfo(null, 0);
    });
  }

  /**
   * Setup MIDI event listeners
   */
  setupMidiListeners() {
    this.midiInput.on('noteOn', (data) => {
      const { note, velocity } = data;

      // Check if note is in our 3-octave range
      if (!KEYBOARD_CONFIG.isInRange(note)) {
        return;
      }

      console.log(`Note On: ${KEYBOARD_CONFIG.getMidiNoteName(note)} Velocity: ${velocity}`);

      // Trigger sound
      this.soundEngine.triggerNote(note, velocity);

      // Trigger animation
      this.animationController.onNoteOn(note, velocity);

      // Update UI
      this.updateNoteInfo(note, velocity);
    });

    this.midiInput.on('noteOff', (data) => {
      const { note } = data;

      if (!KEYBOARD_CONFIG.isInRange(note)) {
        return;
      }

      console.log(`Note Off: ${KEYBOARD_CONFIG.getMidiNoteName(note)}`);

      // Stop sound
      this.soundEngine.stopNote(note);

      // Stop animation
      this.animationController.onNoteOff(note);

      // Clear note info
      this.updateNoteInfo(null, 0);
    });

    this.midiInput.on('modWheel', (data) => {
      const { value } = data;
      const normalized = value / 127;
      console.log(`Mod Wheel: ${normalized.toFixed(2)}`);

      // Apply modulation to sound and animation
      this.soundEngine.applyModulation(normalized);
      this.animationController.applyModWheel(normalized);
    });

    this.midiInput.on('pitchBend', (data) => {
      const { value, note } = data;
      const normalized = PITCH_BEND_CONFIG.getNormalizedBend(value + 8192);
      console.log(`Pitch Bend: ${normalized.toFixed(2)}`);

      // Apply pitch bend to sound and animation
      if (KEYBOARD_CONFIG.isInRange(note)) {
        this.soundEngine.applyPitchBend(note, normalized);
      }
      this.animationController.applyPitchBend(normalized);
    });

    this.midiInput.on('sustain', (data) => {
      const { active } = data;
      console.log(`Sustain: ${active ? 'ON' : 'OFF'}`);

      // Apply sustain effect
      this.animationController.applySustain(active);
    });

    this.midiInput.on('deviceConnected', (device) => {
      console.log(`MIDI Device connected: ${device.name}`);
      this.updateMidiDeviceList();
    });

    this.midiInput.on('deviceDisconnected', (device) => {
      console.log(`MIDI Device disconnected: ${device.name}`);
      this.updateMidiDeviceList();
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    let pitchBendValue = 0;
    let modWheelValue = 0;
    const bendStep = 0.1; // Increment per key press

    document.addEventListener('keydown', (e) => {
      // Number keys 1-4 to switch animation types
      if (e.key >= '1' && e.key <= '4') {
        const type = parseInt(e.key) - 1;
        this.animationController.setAnimationType(type);
        const animSelect = document.getElementById('animation-select');
        if (animSelect) animSelect.value = type;
      }

      // Space to clear animations
      if (e.code === 'Space') {
        this.animationController.clear();
        e.preventDefault();
      }

      // Arrow keys for pitch bend simulation
      if (e.key === 'ArrowUp') {
        pitchBendValue = Math.min(1, pitchBendValue + bendStep);
        this.animationController.applyPitchBend(pitchBendValue);
        // Find first active note for sound engine
        const activeNotes = this.animationController.getActiveNotes();
        if (activeNotes.length > 0) {
          this.soundEngine.applyPitchBend(activeNotes[0], pitchBendValue);
        }
        console.log(`⬆️ Pitch Bend: +${(pitchBendValue * 100).toFixed(0)}%`);
        e.preventDefault();
      }

      if (e.key === 'ArrowDown') {
        pitchBendValue = Math.max(-1, pitchBendValue - bendStep);
        this.animationController.applyPitchBend(pitchBendValue);
        const activeNotes = this.animationController.getActiveNotes();
        if (activeNotes.length > 0) {
          this.soundEngine.applyPitchBend(activeNotes[0], pitchBendValue);
        }
        console.log(`⬇️ Pitch Bend: ${(pitchBendValue * 100).toFixed(0)}%`);
        e.preventDefault();
      }

      // Shift + Arrow keys for mod wheel simulation
      if (e.shiftKey && e.key === 'ArrowRight') {
        modWheelValue = Math.min(1, modWheelValue + bendStep);
        this.soundEngine.applyModulation(modWheelValue);
        this.animationController.applyModWheel(modWheelValue);
        console.log(`🎛️  Mod Wheel: +${(modWheelValue * 100).toFixed(0)}%`);
        e.preventDefault();
      }

      if (e.shiftKey && e.key === 'ArrowLeft') {
        modWheelValue = Math.max(0, modWheelValue - bendStep);
        this.soundEngine.applyModulation(modWheelValue);
        this.animationController.applyModWheel(modWheelValue);
        console.log(`🎛️  Mod Wheel: ${(modWheelValue * 100).toFixed(0)}%`);
        e.preventDefault();
      }

      // 's' key for sustain toggle
      if (e.key === 's' || e.key === 'S') {
        const activeNotes = this.animationController.getActiveNotes();
        if (activeNotes.length > 0) {
          // Toggle sustain state
          const currentInfo = this.animationController.getAnimationInfo();
          const newSustainState = !currentInfo.modulation.sustain;
          this.animationController.applySustain(newSustainState);
          console.log(`🎵 Sustain: ${newSustainState ? 'ON' : 'OFF'}`);
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      // Reset pitch bend when no arrow key pressed
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Could add smooth return to center, for now just log
      }
    });
  }

  /**
   * Select a MIDI device
   */
  selectMidiDevice(deviceId) {
    if (deviceId === '') {
      this.midiInput.selectInput(null);
      this.uiState.midiSelected = false;
    } else {
      this.midiInput.selectInput(deviceId);
      this.uiState.midiSelected = true;
    }
    this.updateMidiStatus();
  }

  /**
   * Update MIDI device list in UI
   */
  updateMidiDeviceList() {
    const midiSelect = document.getElementById('midi-select');
    if (!midiSelect) return;

    const devices = this.midiInput.getInputs();
    this.uiState.midiDevices = devices;

    // Store current selection
    const currentValue = midiSelect.value;

    // Clear options except first
    while (midiSelect.options.length > 1) {
      midiSelect.remove(1);
    }

    // Add device options
    devices.forEach((device) => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = device.name || `MIDI Device ${device.id}`;
      midiSelect.appendChild(option);
    });

    // Restore selection if still valid
    if (currentValue && [...devices].find(d => d.id === currentValue)) {
      midiSelect.value = currentValue;
    }
  }

  /**
   * Update MIDI status indicator
   */
  updateMidiStatus() {
    const statusEl = document.getElementById('midi-status');
    const infoEl = document.getElementById('midi-info');

    if (!statusEl || !infoEl) return;

    const selected = this.midiInput.getSelectedInput();
    const devices = this.midiInput.getInputs();

    if (selected) {
      statusEl.className = 'status connected';
      statusEl.textContent = 'Connected';
      infoEl.textContent = `Connected to: ${selected.name}`;
    } else if (devices.length > 0) {
      statusEl.className = 'status disconnected';
      statusEl.textContent = 'Ready';
      infoEl.textContent = `${devices.length} device(s) available. Select one. (or use keyboard)`;
    } else {
      statusEl.className = 'status disconnected';
      statusEl.textContent = 'Keyboard Ready';
      infoEl.textContent = 'No MIDI devices. Using Mac keyboard (Z X C V B N M keys).';
    }
  }

  /**
   * Update note info in UI
   */
  updateNoteInfo(midiNote, velocity) {
    const noteInfoEl = document.getElementById('note-info');
    if (!noteInfoEl) return;

    if (midiNote !== null && KEYBOARD_CONFIG.isInRange(midiNote)) {
      const noteName = KEYBOARD_CONFIG.getMidiNoteName(midiNote);
      const octave = KEYBOARD_CONFIG.getOctaveIndex(midiNote);
      const normalized = VELOCITY_RANGES.getNormalizedVelocity(velocity);
      noteInfoEl.textContent = `Note: ${noteName} | Octave: ${octave} | Velocity: ${(normalized * 100).toFixed(0)}%`;
    } else {
      noteInfoEl.textContent = '';
    }
  }

  /**
   * Save current session
   */
  saveSession() {
    const timestamp = new Date().toLocaleTimeString();
    const state = this.sessionManager.getStateSnapshot(this);
    const session = this.sessionManager.saveSession(`Session ${timestamp}`, state);

    alert(`Session saved: ${session.name}`);
    console.log('Session saved:', session);
  }

  /**
   * Load a session
   */
  loadSession() {
    const sessions = this.sessionManager.getSessionList();

    if (sessions.length === 0) {
      alert('No saved sessions');
      return;
    }

    const sessionNames = sessions.map(s => s.name).join('\n');
    const sessionName = prompt(`Select a session:\n\n${sessionNames}`);

    if (!sessionName) return;

    const session = sessions.find(s => s.name === sessionName);
    if (session) {
      const loaded = this.sessionManager.loadSession(session.id);
      if (loaded) {
        this.animationController.setAnimationType(loaded.state.animationType);
        const animSelect = document.getElementById('animation-select');
        if (animSelect) animSelect.value = loaded.state.animationType;
        console.log('Session loaded:', loaded);
      }
    }
  }

  /**
   * Load last session on startup
   */
  loadLastSession() {
    const sessions = this.sessionManager.getAllSessions();
    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      const loaded = this.sessionManager.loadSession(lastSession.id);
      if (loaded) {
        this.animationController.setAnimationType(loaded.state.animationType);
      }
    }
  }

  /**
   * Clear current session
   */
  clearSession() {
    if (confirm('Clear current animation and settings?')) {
      this.animationController.clear();
      const animSelect = document.getElementById('animation-select');
      if (animSelect) animSelect.value = 0;
    }
  }
}

// Initialize app on page load
window.addEventListener('DOMContentLoaded', async () => {
  const app = new SoundSphere();
  await app.init();
  // Make app globally accessible for debugging
  window.soundSphere = app;
});
