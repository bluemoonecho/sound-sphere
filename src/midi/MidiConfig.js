/**
 * MidiConfig.js - MIDI keyboard mapping and configuration
 * Maps 3 octaves (36-47 + 48-59 + 60-71 = 36 keys) to musical notes
 */

export const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B'
];

// 3 octaves starting from MIDI note 36 (C2)
// Layout: C2 to B2 (octave 2), C3 to B3 (octave 3), C4 to B4 (octave 4)
export const KEYBOARD_CONFIG = {
  minNote: 36,  // C2
  maxNote: 71,  // B4
  totalKeys: 36,
  octaveSize: 12,
  
  /**
   * Get note name and octave from MIDI note number
   */
  getMidiNoteName(midiNote) {
    if (midiNote < 0 || midiNote > 127) return 'Invalid';
    const noteName = NOTE_NAMES[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${noteName}${octave}`;
  },

  /**
   * Get note index within the 3-octave range (0-35)
   */
  getNoteIndex(midiNote) {
    if (midiNote < this.minNote || midiNote > this.maxNote) return -1;
    return midiNote - this.minNote;
  },

  /**
   * Get octave (0, 1, or 2) for a MIDI note within our range
   */
  getOctaveIndex(midiNote) {
    const index = this.getNoteIndex(midiNote);
    if (index < 0) return -1;
    return Math.floor(index / this.octaveSize);
  },

  /**
   * Get note position within octave (0-11)
   */
  getNoteInOctave(midiNote) {
    return midiNote % 12;
  },

  /**
   * Check if note is within our 3-octave range
   */
  isInRange(midiNote) {
    return midiNote >= this.minNote && midiNote <= this.maxNote;
  }
};

// Default MIDI CC assignments
export const CC_CONFIG = {
  modWheel: 1,
  sustain: 64,
  volume: 7
};

// Default velocity ranges for animation intensity
export const VELOCITY_RANGES = {
  min: 1,
  max: 127,
  
  getNormalizedVelocity(velocity) {
    return Math.max(0, Math.min(1, (velocity - this.min) / (this.max - this.min)));
  }
};

// Pitch bend range (typically ±2 semitones, value from -8192 to +8191)
export const PITCH_BEND_CONFIG = {
  center: 8192,
  min: 0,
  max: 16383,
  semitoneRange: 2,

  getNormalizedBend(rawValue) {
    if (rawValue < this.center) {
      return -1 * ((this.center - rawValue) / this.center);
    } else {
      return (rawValue - this.center) / (this.max - this.center);
    }
  }
};
