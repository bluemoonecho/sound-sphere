/**
 * MidiInput.js - Web MIDI API handler for keyboard detection and event dispatch
 */

import {
  INPUT_SOURCE_TYPES,
  createNormalizedNoteEvent
} from './MidiConfig.js';

export class MidiInput {
  constructor() {
    this.inputs = [];
    this.selectedInput = null;
    this.eventListeners = {
      noteOn: [],
      noteOff: [],
      modWheel: [],
      pitchBend: [],
      sustain: [],
      normalizedNote: [],
      midiControl: [],
      deviceConnected: [],
      deviceDisconnected: [],
      warningState: []
    };
    this.isSupported = false;
    this.accessGranted = false;
    this.warningState = 'none';
  }

  /**
   * Initialize Web MIDI API access
   */
  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser');
      this.warningState = 'unsupported';
      this.emit('warningState', { state: this.warningState });
      return false;
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess();
      this.isSupported = true;
      this.accessGranted = true;
      
      this.setupInputs(midiAccess);
      this.setupStateChangeListener(midiAccess);
      this.warningState = 'none';
      this.emit('warningState', { state: this.warningState });
      
      console.log('Web MIDI API initialized');
      return true;
    } catch (error) {
      console.error('MIDI access denied:', error);
      this.warningState = 'permission-denied';
      this.emit('warningState', { state: this.warningState, error });
      return false;
    }
  }

  /**
   * Setup initial MIDI inputs and attach listeners
   */
  setupInputs(midiAccess) {
    const inputs = midiAccess.inputs.values();
    for (let input of inputs) {
      this.addInput(input);
    }
  }

  /**
   * Add a MIDI input and attach message listener
   */
  addInput(midiInput) {
    if (!this.inputs.find(inp => inp.id === midiInput.id)) {
      this.inputs.push(midiInput);
      midiInput.onmidimessage = (msg) => this.handleMidiMessage(msg, midiInput);
      this.emit('deviceConnected', midiInput);
    }
  }

  /**
   * Remove a MIDI input
   */
  removeInput(midiInput) {
    this.inputs = this.inputs.filter(inp => inp.id !== midiInput.id);
    if (this.selectedInput?.id === midiInput.id) {
      this.selectedInput = null;
    }
    if (this.inputs.length === 0) {
      this.warningState = 'device-disconnected';
      this.emit('warningState', { state: this.warningState, device: midiInput });
    }
    this.emit('deviceDisconnected', midiInput);
  }

  /**
   * Setup listener for MIDI port connection/disconnection
   */
  setupStateChangeListener(midiAccess) {
    midiAccess.onstatechange = (event) => {
      if (event.port.type === 'input') {
        if (event.port.state === 'connected') {
          this.addInput(event.port);
        } else if (event.port.state === 'disconnected') {
          this.removeInput(event.port);
        }
      }
    };
  }

  /**
   * Select which MIDI input to listen to
   */
  selectInput(inputId) {
    this.selectedInput = this.inputs.find(inp => inp.id === inputId) || null;
    if (this.selectedInput) {
      this.warningState = 'none';
      this.emit('warningState', { state: this.warningState });
    }
    return this.selectedInput;
  }

  /**
   * Get all available MIDI inputs
   */
  getInputs() {
    return this.inputs;
  }

  /**
   * Get currently selected input
   */
  getSelectedInput() {
    return this.selectedInput;
  }

  /**
   * Handle incoming MIDI messages
   */
  handleMidiMessage(msg, midiInput) {
    // Only process messages from selected input
    if (this.selectedInput && midiInput.id !== this.selectedInput.id) {
      return;
    }

    const [status, data1, data2] = msg.data;
    const statusHigh = status & 0xf0;
    const channel = status & 0x0f;
    const receivedAt = performance.now();

    switch (statusHigh) {
      case 0x90: // Note On
        if (data2 > 0) {
          const noteOn = createNormalizedNoteEvent({
            sourceType: INPUT_SOURCE_TYPES.MIDI,
            phase: 'noteOn',
            note: data1,
            velocity: data2,
            channel,
            receivedAt
          });
          this.emit('normalizedNote', noteOn);
          this.emit('noteOn', noteOn);
        } else {
          const noteOffFromZeroVelocity = createNormalizedNoteEvent({
            sourceType: INPUT_SOURCE_TYPES.MIDI,
            phase: 'noteOff',
            note: data1,
            velocity: 0,
            channel,
            receivedAt
          });
          this.emit('normalizedNote', noteOffFromZeroVelocity);
          this.emit('noteOff', noteOffFromZeroVelocity);
        }
        break;

      case 0x80: // Note Off
        {
          const noteOff = createNormalizedNoteEvent({
            sourceType: INPUT_SOURCE_TYPES.MIDI,
            phase: 'noteOff',
            note: data1,
            velocity: data2,
            channel,
            receivedAt
          });
          this.emit('normalizedNote', noteOff);
          this.emit('noteOff', noteOff);
        }
        break;

      case 0xb0: // Control Change
        this.handleControlChange(data1, data2, channel, receivedAt);
        break;

      case 0xe0: // Pitch Bend
        const pitchValue = ((data2 << 7) | data1) - 8192; // Center at 0
        this.emit('pitchBend', { value: pitchValue, channel, receivedAt });
        this.emit('midiControl', {
          type: 'pitchBend',
          value: pitchValue,
          channel,
          receivedAt
        });
        break;
    }
  }

  /**
   * Handle Control Change messages
   */
  handleControlChange(cc, value, channel, receivedAt) {
    switch (cc) {
      case 1: // Mod Wheel
        this.emit('modWheel', { value, channel, receivedAt });
        this.emit('midiControl', {
          type: 'modWheel',
          value,
          channel,
          receivedAt
        });
        break;

      case 64: // Sustain Pedal
        this.emit('sustain', { 
          active: value >= 64, 
          channel,
          receivedAt
        });
        this.emit('midiControl', {
          type: 'sustain',
          value: value >= 64,
          channel,
          receivedAt
        });
        break;

      // Add more CC handlers as needed
      default:
        break;
    }
  }

  /**
   * Register event listener
   */
  on(eventType, callback) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].push(callback);
    }
  }

  /**
   * Unregister event listener
   */
  off(eventType, callback) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType] = this.eventListeners[eventType].filter(
        cb => cb !== callback
      );
    }
  }

  /**
   * Emit an event to all listeners
   */
  emit(eventType, data) {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventType} listener:`, error);
        }
      });
    }
  }

  getWarningState() {
    return this.warningState;
  }
}
