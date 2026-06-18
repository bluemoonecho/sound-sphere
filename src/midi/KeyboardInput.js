/**
 * KeyboardInput.js - Mac keyboard fallback when MIDI is unavailable
 * Maps Mac keyboard keys to MIDI notes (C4-B5 range, 60-71)
 */

export class KeyboardInput {
  constructor() {
    this.eventListeners = {
      noteOn: [],
      noteOff: []
    };
    
    // Map keyboard keys to MIDI notes
    // Row 1: C4-G4 (60-67)
    // Row 2: A4-E5 (69-76)
    // Row 3: F#5-B5 (78-83)
    this.keyToNote = {
      // QWERTY Row 1 (Z X C V B N M = C4 D4 E4 F4 G4 A4 B4)
      'z': 60,  // C4
      'x': 62,  // D4
      'c': 64,  // E4
      'v': 65,  // F4
      'b': 67,  // G4
      'n': 69,  // A4
      'm': 71,  // B4
      
      // QWERTY Row 2 (A S D F G H J = C#4 D#4 F#4 G#4 A#4 B#4 C#5)
      'a': 61,  // C#4
      's': 63,  // D#4
      'd': 66,  // F#4
      'f': 68,  // G#4
      'g': 70,  // A#4
      'h': 72,  // C5
      'j': 73,  // C#5
      'k': 74,  // D5
      'l': 75,  // D#5
      
      // QWERTY Row 3 (Q W E R T Y U I = C5 D5 E5 F5 G5 A5 B5 C6)
      'q': 72,  // C5
      'w': 74,  // D5
      'e': 76,  // E5
      'r': 77,  // F5
      't': 79,  // G5
      'y': 81,  // A5
      'u': 83,  // B5
      'i': 84,  // C6
      
      // Number row for octave modifiers
      '1': 60,  // Octave 1 base
      '2': 72,  // Octave 2 base
      '3': 84   // Octave 3 base
    };

    this.activeNotes = new Set();
    this.octaveOffset = 0; // Can be adjusted by number keys
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
  handleKeyDown(event) {
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
    if (midiNote !== undefined && !this.activeNotes.has(key)) {
      this.activeNotes.add(key);
      
      // Use a fixed "velocity" for keyboard (100)
      this.emit('noteOn', {
        note: midiNote + this.octaveOffset,
        velocity: 100,
        channel: 0,
        source: 'keyboard'
      });

      event.preventDefault();
    }
  }

  /**
   * Handle key up event
   */
  handleKeyUp(event) {
    const key = event.key.toLowerCase();

    const midiNote = this.keyToNote[key];
    if (midiNote !== undefined && this.activeNotes.has(key)) {
      this.activeNotes.delete(key);

      this.emit('noteOff', {
        note: midiNote + this.octaveOffset,
        velocity: 0,
        channel: 0,
        source: 'keyboard'
      });

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
      if (midiNote !== undefined) {
        notes.push(midiNote + this.octaveOffset);
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
      this.emit('noteOff', {
        note: midiNote + this.octaveOffset,
        velocity: 0,
        channel: 0,
        source: 'keyboard'
      });
    });
  }
}
