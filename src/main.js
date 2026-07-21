/**
 * main.js - Application initialization and orchestration
 */

import { MidiInput } from './midi/MidiInput.js';
import { KeyboardInput } from './midi/KeyboardInput.js';
import {
  INPUT_SOURCE_TYPES,
  KEYBOARD_CONFIG,
  PITCH_BEND_CONFIG,
  VELOCITY_RANGES,
  createNormalizedNoteEvent,
  isPlayableNote
} from './midi/MidiConfig.js';
import { StrudelEngine } from './sound/StrudelEngine.js';
import { P5Sketch } from './visual/P5Sketch.js';
import { AnimationController } from './visual/AnimationController.js';
import { SessionManager } from './session/SessionManager.js';

const DISCONNECT_RELEASE_TIMEOUT_MS = 250;

class SoundSphere {
  constructor() {
    this.midiInput = new MidiInput();
    this.keyboardInput = new KeyboardInput();
    this.soundEngine = new StrudelEngine();
    this.p5Sketch = new P5Sketch('#p5-container');
    this.animationController = new AnimationController(this.p5Sketch);
    this.sessionManager = new SessionManager();

    this.uiState = {
      currentAnimationType: -1,
      warningState: 'none',
      activeSource: INPUT_SOURCE_TYPES.KEYBOARD,
      midiSelected: false
    };

    this.synthControls = {
      waveform: 'sine',
      attack: 0.01,
      decay: 0.1,
      sustain: 0.3,
      release: 0.2
    };

    this.performanceStats = {
      samples: 0,
      averageLatencyMs: 0,
      maxLatencyMs: 0,
      lastLatencyMs: 0
    };

    this.activeMidiNotes = new Set();
    this.disconnectTimers = new Map();
  }

  async init() {
    console.log('Initializing Sound Sphere...');

    try {
      const midiSupported = await this.midiInput.init();
      this.keyboardInput.init();

      if (!midiSupported) {
        this.uiState.warningState = this.midiInput.getWarningState();
      }

      const soundReady = await this.soundEngine.init();
      if (!soundReady) {
        console.warn('Sound engine failed to initialize');
      }

      this.p5Sketch.init();

      this.setupUI();
      this.setupSynthControls();
      this.setupInputListeners();
      this.setupKeyboardShortcuts();
      this.loadLastSession();

      this.ensureDefaultMidiSelection();
      this.updateInputStatus();
      this.updateWarningBanner();
      this.updatePerfStatus();

      console.log('Sound Sphere initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sound Sphere:', error);
    }
  }

  setupUI() {
    const midiSelect = document.getElementById('midi-select');
    if (midiSelect) {
      midiSelect.addEventListener('change', (e) => this.selectMidiDevice(e.target.value));
      this.updateMidiDeviceList();
    }

    const animSelect = document.getElementById('animation-select');
    if (animSelect) {
      animSelect.addEventListener('change', (e) => {
        const type = Number.parseInt(e.target.value, 10);
        this.animationController.setAnimationType(type);
        this.uiState.currentAnimationType = type;
      });
    }

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

  updateSynthOverlay() {
    if (this.p5Sketch && typeof this.p5Sketch.setSynthInfo === 'function') {
      this.p5Sketch.setSynthInfo({
        waveform: this.synthControls.waveform,
        attack: this.synthControls.attack,
        decay: this.synthControls.decay,
        sustain: this.synthControls.sustain,
        release: this.synthControls.release
      });
    }
  }

  setupSynthControls() {
    const waveformSelect = document.getElementById('waveform-select');
    const attackRange = document.getElementById('attack-range');
    const decayRange = document.getElementById('decay-range');
    const sustainRange = document.getElementById('sustain-range');
    const releaseRange = document.getElementById('release-range');

    const attackValue = document.getElementById('attack-value');
    const decayValue = document.getElementById('decay-value');
    const sustainValue = document.getElementById('sustain-value');
    const releaseValue = document.getElementById('release-value');

    const updateDisplay = (element, value) => {
      if (element) {
        element.textContent = Number(value).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') || Number(value).toFixed(3);
      }
    };

    const handleControlChange = (name, value) => {
      if (name === 'waveform') {
        this.synthControls.waveform = value;
        this.soundEngine.setWaveform(value);
      } else {
        this.synthControls[name] = Number(value);
        this.soundEngine.setEnvelopeParam(name, Number(value));
      }
      this.updateSynthOverlay();
    };

    if (waveformSelect) {
      waveformSelect.value = this.synthControls.waveform;
      waveformSelect.addEventListener('change', (e) => {
        handleControlChange('waveform', e.target.value);
      });
    }

    if (attackRange) {
      attackRange.value = String(this.synthControls.attack);
      attackRange.addEventListener('input', (e) => {
        handleControlChange('attack', e.target.value);
        updateDisplay(attackValue, e.target.value);
      });
      updateDisplay(attackValue, attackRange.value);
    }

    if (decayRange) {
      decayRange.value = String(this.synthControls.decay);
      decayRange.addEventListener('input', (e) => {
        handleControlChange('decay', e.target.value);
        updateDisplay(decayValue, e.target.value);
      });
      updateDisplay(decayValue, decayRange.value);
    }

    if (sustainRange) {
      sustainRange.value = String(this.synthControls.sustain);
      sustainRange.addEventListener('input', (e) => {
        handleControlChange('sustain', e.target.value);
        updateDisplay(sustainValue, e.target.value);
      });
      updateDisplay(sustainValue, sustainRange.value);
    }

    if (releaseRange) {
      releaseRange.value = String(this.synthControls.release);
      releaseRange.addEventListener('input', (e) => {
        handleControlChange('release', e.target.value);
        updateDisplay(releaseValue, e.target.value);
      });
      updateDisplay(releaseValue, releaseRange.value);
    }

    this.soundEngine.setWaveform(this.synthControls.waveform);
    this.soundEngine.setEnvelopeParam('attack', this.synthControls.attack);
    this.soundEngine.setEnvelopeParam('decay', this.synthControls.decay);
    this.soundEngine.setEnvelopeParam('sustain', this.synthControls.sustain);
    this.soundEngine.setEnvelopeParam('release', this.synthControls.release);
    this.updateSynthOverlay();
  }

  setupInputListeners() {
    this.midiInput.on('normalizedNote', (event) => {
      this.routeNormalizedNoteEvent(event);
    });

    this.keyboardInput.on('normalizedNote', (event) => {
      this.routeNormalizedNoteEvent(event);
    });

    this.midiInput.on('midiControl', (event) => {
      this.routeControlEvent(event);
    });

    this.midiInput.on('warningState', ({ state }) => {
      this.uiState.warningState = state;
      this.updateWarningBanner();
      this.updateInputStatus();
    });

    this.midiInput.on('deviceConnected', () => {
      this.ensureDefaultMidiSelection();
      this.updateMidiDeviceList();
      this.updateInputStatus();
      this.updateWarningBanner();
    });

    this.midiInput.on('deviceDisconnected', () => {
      this.handleMidiDisconnect();
      this.updateMidiDeviceList();
      this.updateInputStatus();
      this.updateWarningBanner();
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '4') {
        const type = Number.parseInt(e.key, 10) - 1;
        this.animationController.setAnimationType(type);
        this.uiState.currentAnimationType = type;
        const animSelect = document.getElementById('animation-select');
        if (animSelect) {
          animSelect.value = String(type);
        }
      }

      if (e.code === 'Space') {
        this.animationController.clear();
        e.preventDefault();
      }
    });
  }

  routeNormalizedNoteEvent(event) {
    if (!event || !isPlayableNote(event.note)) {
      return;
    }

    const midiIsActive = this.isMidiActive();

    if (event.sourceType === INPUT_SOURCE_TYPES.KEYBOARD && midiIsActive) {
      return;
    }

    this.uiState.activeSource = midiIsActive ? INPUT_SOURCE_TYPES.MIDI : event.sourceType;

    if (event.sourceType === INPUT_SOURCE_TYPES.MIDI) {
      if (event.phase === 'noteOn') {
        this.activeMidiNotes.add(event.note);
        this.clearDisconnectTimer(event.note);
      } else {
        this.activeMidiNotes.delete(event.note);
      }
    }

    this.dispatchNormalizedEvent(event);
  }

  dispatchNormalizedEvent(event) {
    const dispatchTimestamp = performance.now();
    const dispatchEvent = {
      ...event,
      dispatchAt: dispatchTimestamp
    };

    if (dispatchEvent.phase === 'noteOn') {
      this.soundEngine.handleNoteEvent(dispatchEvent);
      this.animationController.handleNoteEvent(dispatchEvent);
      this.updateNoteInfo(dispatchEvent.note, dispatchEvent.velocity, dispatchEvent.sourceType);
      this.captureLatency(dispatchEvent);
    } else {
      this.soundEngine.handleNoteEvent(dispatchEvent);
      this.animationController.handleNoteEvent(dispatchEvent);
      this.updateNoteInfo(null, 0, dispatchEvent.sourceType);
    }
  }

  routeControlEvent(event) {
    if (!event) {
      return;
    }

    if (event.type === 'modWheel') {
      const normalized = event.value / 127;
      this.soundEngine.applyModulation(normalized);
      this.animationController.applyModWheel(normalized);
    }

    if (event.type === 'pitchBend') {
      const normalized = PITCH_BEND_CONFIG.getNormalizedBend(event.value + 8192);
      this.soundEngine.applyPitchBendToActive(normalized);
      this.animationController.applyPitchBend(normalized);
    }

    if (event.type === 'sustain') {
      this.animationController.applySustain(Boolean(event.value));
    }
  }

  captureLatency(event) {
    const latencyMs = Math.max(0, event.dispatchAt - event.receivedAt);
    this.performanceStats.samples += 1;
    this.performanceStats.lastLatencyMs = latencyMs;
    this.performanceStats.maxLatencyMs = Math.max(this.performanceStats.maxLatencyMs, latencyMs);
    this.performanceStats.averageLatencyMs =
      ((this.performanceStats.averageLatencyMs * (this.performanceStats.samples - 1)) + latencyMs)
      / this.performanceStats.samples;

    this.updatePerfStatus();
  }

  updatePerfStatus() {
    const perfEl = document.getElementById('perf-status');
    if (!perfEl) {
      return;
    }

    perfEl.textContent = `Latency avg ${this.performanceStats.averageLatencyMs.toFixed(1)} ms, max ${this.performanceStats.maxLatencyMs.toFixed(1)} ms`;
  }

  handleMidiDisconnect() {
    if (this.midiInput.getInputs().length === 0) {
      this.uiState.activeSource = INPUT_SOURCE_TYPES.KEYBOARD;
      this.uiState.warningState = 'device-disconnected';

      this.activeMidiNotes.forEach((note) => {
        this.scheduleForcedMidiRelease(note);
      });
    }
  }

  scheduleForcedMidiRelease(note) {
    this.clearDisconnectTimer(note);

    const timerId = window.setTimeout(() => {
      const forcedOff = createNormalizedNoteEvent({
        sourceType: INPUT_SOURCE_TYPES.MIDI,
        phase: 'noteOff',
        note,
        velocity: 0,
        channel: 0,
        meta: { forced: true, reason: 'disconnect-timeout' }
      });
      this.activeMidiNotes.delete(note);
      this.dispatchNormalizedEvent(forcedOff);
      this.disconnectTimers.delete(note);
    }, DISCONNECT_RELEASE_TIMEOUT_MS);

    this.disconnectTimers.set(note, timerId);
  }

  clearDisconnectTimer(note) {
    const timerId = this.disconnectTimers.get(note);
    if (timerId) {
      window.clearTimeout(timerId);
      this.disconnectTimers.delete(note);
    }
  }

  ensureDefaultMidiSelection() {
    const devices = this.midiInput.getInputs();
    if (devices.length > 0 && !this.midiInput.getSelectedInput()) {
      this.midiInput.selectInput(devices[0].id);
      const midiSelect = document.getElementById('midi-select');
      if (midiSelect) {
        midiSelect.value = devices[0].id;
      }
    }
  }

  isMidiActive() {
    return Boolean(this.midiInput.getSelectedInput());
  }

  selectMidiDevice(deviceId) {
    if (!deviceId) {
      this.midiInput.selectInput(null);
      this.uiState.midiSelected = false;
    } else {
      this.midiInput.selectInput(deviceId);
      this.uiState.midiSelected = true;
      this.uiState.activeSource = INPUT_SOURCE_TYPES.MIDI;
    }

    this.updateInputStatus();
    this.updateWarningBanner();
  }

  updateMidiDeviceList() {
    const midiSelect = document.getElementById('midi-select');
    if (!midiSelect) {
      return;
    }

    const devices = this.midiInput.getInputs();
    const selectedId = this.midiInput.getSelectedInput()?.id || '';

    while (midiSelect.options.length > 1) {
      midiSelect.remove(1);
    }

    devices.forEach((device) => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = device.name || `MIDI Device ${device.id}`;
      midiSelect.appendChild(option);
    });

    midiSelect.value = selectedId;
  }

  updateInputStatus() {
    const statusEl = document.getElementById('midi-status');
    const infoEl = document.getElementById('midi-info');

    if (!statusEl || !infoEl) {
      return;
    }

    const selected = this.midiInput.getSelectedInput();
    const devices = this.midiInput.getInputs();

    if (selected) {
      statusEl.className = 'status connected';
      statusEl.textContent = 'MIDI Active';
      infoEl.textContent = `Connected to ${selected.name}. Keyboard note-on ignored while MIDI is active.`;
      return;
    }

    if (devices.length > 0) {
      statusEl.className = 'status disconnected';
      statusEl.textContent = 'MIDI Ready';
      infoEl.textContent = 'Select a MIDI input or continue in keyboard mode.';
      return;
    }

    statusEl.className = 'status disconnected';
    statusEl.textContent = 'Keyboard Mode';
    infoEl.textContent = 'Using keyboard fallback in playable 3-octave range.';
  }

  updateWarningBanner() {
    const warningEl = document.getElementById('input-warning');
    if (!warningEl) {
      return;
    }

    const warningMessages = {
      none: '',
      unsupported: 'Web MIDI is not supported in this browser. Keyboard fallback is active.',
      'permission-denied': 'MIDI permission denied. Keyboard fallback is active.',
      'device-disconnected': 'MIDI device disconnected. Switched to keyboard fallback.'
    };

    const message = warningMessages[this.uiState.warningState] || '';
    warningEl.textContent = message;
    warningEl.classList.toggle('visible', Boolean(message));
  }

  updateNoteInfo(midiNote, velocity, sourceType) {
    const noteInfoEl = document.getElementById('note-info');
    if (!noteInfoEl) {
      return;
    }

    if (midiNote !== null && KEYBOARD_CONFIG.isInRange(midiNote)) {
      const noteName = KEYBOARD_CONFIG.getMidiNoteName(midiNote);
      const octave = KEYBOARD_CONFIG.getOctaveIndex(midiNote);
      const normalized = VELOCITY_RANGES.getNormalizedVelocity(velocity);
      noteInfoEl.textContent = `Source ${sourceType} | Note ${noteName} | Octave ${octave} | Velocity ${(normalized * 100).toFixed(0)}%`;
      return;
    }

    noteInfoEl.textContent = '';
  }

  saveSession() {
    const timestamp = new Date().toLocaleTimeString();
    const state = this.sessionManager.getStateSnapshot(this);
    this.sessionManager.saveSession(`Session ${timestamp}`, state);
  }

  loadSession() {
    const sessions = this.sessionManager.getSessionList();
    if (sessions.length === 0) {
      return;
    }

    const latest = sessions[sessions.length - 1];
    const loaded = this.sessionManager.loadSession(latest.id);
    if (!loaded) {
      return;
    }

    const restored = this.sessionManager.restoreState(loaded.state);
    this.animationController.setAnimationType(restored.animationType);
    this.uiState.warningState = restored.warningState;

    const animSelect = document.getElementById('animation-select');
    if (animSelect) {
      animSelect.value = String(restored.animationType);
    }

    this.updateWarningBanner();
    this.updateInputStatus();
  }

  loadLastSession() {
    const restored = this.sessionManager.loadLastState();
    if (!restored) {
      return;
    }

    this.animationController.setAnimationType(restored.animationType);
    this.uiState.warningState = restored.warningState;

    const animSelect = document.getElementById('animation-select');
    if (animSelect) {
      animSelect.value = String(restored.animationType);
    }
  }

  clearSession() {
    this.animationController.clear();
    this.sessionManager.clearAllSessions();

    const animSelect = document.getElementById('animation-select');
    if (animSelect) {
      animSelect.value = '-1';
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const app = new SoundSphere();
  await app.init();
  window.soundSphere = app;
});
