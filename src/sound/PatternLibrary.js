/**
 * PatternLibrary.js - Pre-coded Strudel sound patterns
 * Organized by type: drums, bass, melody, effects
 */

export const PatternLibrary = {
  // Drum patterns
  drums: {
    kick: {
      sound: 'sine',
      duration: 0.5,
      attack: 0.001,
      decay: 0.3,
      sustain: 0,
      release: 0.1,
      frequency: 150
    },
    snare: {
      sound: 'white-noise',
      duration: 0.2,
      attack: 0.001,
      decay: 0.15,
      sustain: 0,
      release: 0.05,
      filter: 'highpass',
      filterFreq: 5000
    },
    hihat: {
      sound: 'white-noise',
      duration: 0.1,
      attack: 0.001,
      decay: 0.08,
      sustain: 0,
      release: 0.01,
      filter: 'highpass',
      filterFreq: 8000
    },
    tom: {
      sound: 'sine',
      duration: 0.15,
      attack: 0.002,
      decay: 0.12,
      sustain: 0,
      release: 0.05,
      frequency: 350
    }
  },

  // Bass patterns
  bass: {
    deepBass: {
      sound: 'sine',
      duration: 0.8,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.3,
      release: 0.2,
      minFrequency: 50
    },
    plusBass: {
      sound: 'sine',
      duration: 0.6,
      attack: 0.005,
      decay: 0.15,
      sustain: 0.2,
      release: 0.15
    },
    squareBass: {
      sound: 'square',
      duration: 0.5,
      attack: 0.003,
      decay: 0.2,
      sustain: 0.1,
      release: 0.1,
      filter: 'lowpass',
      filterFreq: 800
    }
  },

  // Melody patterns
  melody: {
    bell: {
      sound: 'sine',
      duration: 0.5,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.1,
      release: 0.2,
      harmonics: [1, 2, 3] // Add harmonics for bell timbre
    },
    piano: {
      sound: 'sine',
      duration: 1,
      attack: 0.001,
      decay: 0.5,
      sustain: 0.2,
      release: 0.3
    },
    lead: {
      sound: 'sine',
      duration: 0.4,
      attack: 0.002,
      decay: 0.1,
      sustain: 0.2,
      release: 0.1,
      filter: 'lowpass',
      filterFreq: 5000
    },
    pad: {
      sound: 'sine',
      duration: 2,
      attack: 0.1,
      decay: 0.5,
      sustain: 0.8,
      release: 0.5
    }
  },

  // Effect/texture patterns
  effects: {
    blip: {
      sound: 'sine',
      duration: 0.05,
      attack: 0.001,
      decay: 0.04,
      sustain: 0,
      release: 0.01
    },
    pluck: {
      sound: 'sine',
      duration: 0.3,
      attack: 0.001,
      decay: 0.2,
      sustain: 0,
      release: 0.05,
      filter: 'highpass',
      filterFreq: 2000
    },
    punch: {
      sound: 'square',
      duration: 0.2,
      attack: 0.001,
      decay: 0.15,
      sustain: 0,
      release: 0.04,
      filter: 'lowpass',
      filterFreq: 3000
    },
    woosh: {
      sound: 'white-noise',
      duration: 0.4,
      attack: 0.001,
      decay: 0.35,
      sustain: 0,
      release: 0.05,
      filter: 'lowpass',
      filterFreq: 4000
    }
  },

  /**
   * Get a pattern by category and name
   */
  getPattern(category, name) {
    if (this[category] && this[category][name]) {
      return this[category][name];
    }
    return null;
  },

  /**
   * Get all patterns in a category
   */
  getCategory(category) {
    return this[category] || {};
  },

  /**
   * List all available categories
   */
  getCategories() {
    return ['drums', 'bass', 'melody', 'effects'];
  }
};
