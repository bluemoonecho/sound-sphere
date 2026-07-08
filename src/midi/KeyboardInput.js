/**
 * KeyboardInput.js - Mac keyboard fallback when MIDI is unavailable
 * Maps Mac keyboard keys to MIDI notes within playable range (C2-B4, 36-71)
 */

import {
  INPUT_SOURCE_TYPES,
  createNormalizedNoteEvent,
  isPlayableNote
} from './MidiConfig.js';

export class KeyboardInput {
  constructor() {
    this.eventListeners = {
      noteOn: [],
      noteOff: [],
      normalizedNote: []
    };
    
    // 3-octave map across alphanumeric rows.
    this.keyToNote = {
      'z': 36,  // C2
      's': 37,
      'x': 38,
      'd': 39,
      'c': 40,
      'v': 41,
      'g': 42,
      'b': 43,
      'h': 44,
      'n': 45,
      'j': 46,
      'm': 47,

      'q': 48,  // C3
      '2': 49,
      'w': 50,
      '3': 51,
      'e': 52,
      'r': 53,
      '5': 54,
      't': 55,
      '6': 56,
      'y': 57,
      '7': 58,
      'u': 59,

      'i': 60,  // C4
      '9': 61,
      'o': 62,
      '0': 63,
      'p': 64,
      '[': 65,
      '=': 66,
      ']': 67,
      '\\': 68,
      ';': 69,
      "'": 70,
      '/': 71
    };

    this.activeNotes = new Set();
    this.enabled = true; // Disabled automatically when a MIDI device connects
  }

  /**
   * Initialize keyboard listener
   */
  init() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    console.log('Keyboard input initialized (Mac fallback)');
    return true;
  }

  /**
   * Handle key down event
   */
  enable() {
    this.enabled = true;
    console.log('Keyboard input enabled');
  }

  disable() {
    this.enabled = false;
    // Release any stuck notes
    this.activeNotes.forEach((key) => {
      const midiNote = this.keyToNote[key];
      if (isPlayableNote(midiNote)) {
        const noteOff = createNormalizedNoteEvent({
          sourceType: INPUT_SOURCE_TYPES.KEYBOARD,
          phase: 'noteOff',
          note: midiNote,
          velocity: 0,
          channel: 0,
          meta: { key, forced: true }
        });
        this.emit('normalizedNote', noteOff);
        this.emit('noteOff', noteOff);
      }
    });
    this.activeNotes.clear();
    console.log('Keyboard input disabled (MIDI device active)');
  }

  handleKeyDown(event) {
    if (!this.enabled) return;

    const key = event.key.toLowerCase();

    // Ignore if modifier keys are pressed (Cmd, Ctrl, Alt, Shift)
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    // Skip if input is focused
    if (this.isInputFocused()) {
      return;
    }

    const midiNote = this.keyToNote[key];
    if (isPlayableNote(midiNote) && !this.activeNotes.has(key)) {
      this.activeNotes.add(key);
      
      const noteOn = createNormalizedNoteEvent({
        sourceType: INPUT_SOURCE_TYPES.KEYBOARD,
        phase: 'noteOn',
        note: midiNote,
        velocity: 100,
        channel: 0,
        meta: { key }
      });
      this.emit('normalizedNote', noteOn);
      this.emit('noteOn', noteOn);

      event.preventDefault();
    }
  }

  /**
   * Handle key up event
   */
  handleKeyUp(event) {
    if (!this.enabled) return;

    const key = event.key.toLowerCase();

    const midiNote = this.keyToNote[key];
    if (isPlayableNote(midiNote) && this.activeNotes.has(key)) {
      this.activeNotes.delete(key);

      const noteOff = createNormalizedNoteEvent({
        sourceType: INPUT_SOURCE_TYPES.KEYBOARD,
        phase: 'noteOff',
        note: midiNote,
        velocity: 0,
        channel: 0,
        meta: { key }
      });
      this.emit('normalizedNote', noteOff);
      this.emit('noteOff', noteOff);

      event.preventDefault();
    }
  }

  /**
   * Check if any input is focused (to avoid triggering notes while typing)
   */
  isInputFocused() {
    const focused = document.activeElement;
    return (
      focused &&
      (focused.tagName === 'INPUT' ||
       focused.tagName === 'TEXTAREA' ||
       focused.contentEditable === 'true')
    );
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

  /**
   * Get all currently pressed notes
   */
  getPressedNotes() {
    const notes = [];
    this.activeNotes.forEach(key => {
      const midiNote = this.keyToNote[key];
      if (isPlayableNote(midiNote)) {
        notes.push(midiNote);
      }
    });
    return notes;
  }

  /**
   * Stop all active notes
   */
  stopAll() {
    const notesToStop = Array.from(this.activeNotes);
    notesToStop.forEach(key => {
      const midiNote = this.keyToNote[key];
      this.activeNotes.delete(key);
      if (!isPlayableNote(midiNote)) {
        return;
      }
      const noteOff = createNormalizedNoteEvent({
        sourceType: INPUT_SOURCE_TYPES.KEYBOARD,
        phase: 'noteOff',
        note: midiNote,
        velocity: 0,
        channel: 0,
        meta: { key, forced: true }
      });
      this.emit('normalizedNote', noteOff);
      this.emit('noteOff', noteOff);
    });
  }
}
