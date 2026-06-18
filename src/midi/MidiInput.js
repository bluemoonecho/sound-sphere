/**
 * MidiInput.js - Web MIDI API handler for keyboard detection and event dispatch
 */

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
      deviceConnected: [],
      deviceDisconnected: []
    };
    this.isSupported = false;
    this.accessGranted = false;
  }

  /**
   * Initialize Web MIDI API access
   */
  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser');
      return false;
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess();
      this.isSupported = true;
      this.accessGranted = true;
      
      this.setupInputs(midiAccess);
      this.setupStateChangeListener(midiAccess);
      
      console.log('Web MIDI API initialized');
      return true;
    } catch (error) {
      console.error('MIDI access denied:', error);
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

    switch (statusHigh) {
      case 0x90: // Note On
        if (data2 > 0) {
          this.emit('noteOn', { note: data1, velocity: data2, channel });
        } else {
          this.emit('noteOff', { note: data1, velocity: 0, channel });
        }
        break;

      case 0x80: // Note Off
        this.emit('noteOff', { note: data1, velocity: data2, channel });
        break;

      case 0xb0: // Control Change
        this.handleControlChange(data1, data2, channel);
        break;

      case 0xe0: // Pitch Bend
        const pitchValue = ((data2 << 7) | data1) - 8192; // Center at 0
        this.emit('pitchBend', { value: pitchValue, channel });
        break;
    }
  }

  /**
   * Handle Control Change messages
   */
  handleControlChange(cc, value, channel) {
    switch (cc) {
      case 1: // Mod Wheel
        this.emit('modWheel', { value, channel });
        break;

      case 64: // Sustain Pedal
        this.emit('sustain', { 
          active: value >= 64, 
          channel 
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
}
