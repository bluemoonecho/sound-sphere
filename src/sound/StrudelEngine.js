/**
 * StrudelEngine.js - Advanced sound synthesis using Web Audio API
 * Features: Multi-waveform synthesis, dynamic ADSR, octave-aware tone shaping
 */

export class StrudelEngine {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    this.patterns = new Map();
    this.activeSynths = new Map(); // Track active notes
    this.currentPatternSet = 'default';
    this.masterGain = null;
    this.masterFilter = null;
    this.waveform = 'sine';
    this.envelope = {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.3,
      release: 0.2
    };
  }

  /**
   * Unified note event handler for MIDI and keyboard normalized events.
   */
  handleNoteEvent(event) {
    if (!event) {
      return;
    }

    if (event.phase === 'noteOn') {
      this.triggerNote(event.note, event.velocity);
      return;
    }

    if (event.phase === 'noteOff') {
      this.stopNote(event.note);
    }
  }

  /**
   * Initialize Web Audio API with master effects chain
   */
  async init() {
    try {
      // Initialize Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioContext = audioContext;
      
      // Create master gain and filter
      this.masterGain = audioContext.createGain();
      this.masterGain.gain.value = 0.3; // Overall volume limiter
      this.masterGain.connect(audioContext.destination);
      
      this.masterFilter = audioContext.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.value = 8000;
      this.masterFilter.Q.value = 1;
      this.masterFilter.connect(this.masterGain);
      
      // Resume audio context on user interaction
      if (audioContext.state === 'suspended') {
        const resume = () => {
          audioContext.resume().then(() => {
            console.log('Web Audio context resumed');
            document.removeEventListener('click', resume);
          });
        };
        document.addEventListener('click', resume);
      }
      
      this.isInitialized = true;
      this.createDefaultPatterns();
      
      console.log('Sound Engine initialized (Web Audio API + Enhanced Synthesis)');
      return true;
    } catch (error) {
      console.error('Failed to initialize Sound Engine:', error);
      return false;
    }
  }

  /**
   * Create default sound patterns for MIDI notes with octave-aware timbres
   * Octave 3 (36-47): Deep sine bass
   * Octave 4 (48-59): Smooth triangle mid-range
   * Octave 5 (60-71): Bright sawtooth treble
   */
  createDefaultPatterns() {
    for (let midiNote = 36; midiNote <= 71; midiNote++) {
      const noteName = this.getMidiNoteName(midiNote);
      const frequency = this.midiNoteToFrequency(midiNote);
      const octave = Math.floor(midiNote / 12) - 1;
      
      // Select waveform based on octave for harmonic variety
      let waveform = 'sine';
      let envelopeProfile = 'default';
      
      if (octave === 2) {
        // Low octave: Deep, warm sine wave with slow attack
        waveform = 'sine';
        envelopeProfile = 'bass';
      } else if (octave === 3) {
        // Mid octave: Smooth triangle with medium attack
        waveform = 'triangle';
        envelopeProfile = 'mid';
      } else if (octave === 4) {
        // High octave: Bright sawtooth with fast attack
        waveform = 'sawtooth';
        envelopeProfile = 'treble';
      }
      
      const envelope = this.getEnvelopeProfile(envelopeProfile);
      
      this.patterns.set(midiNote, {
        note: noteName,
        frequency: frequency,
        octave: octave,
        waveform: waveform,
        ...envelope,
        // Filter control
        filterFreqBase: this.getFilterFreqForOctave(octave),
        filterQ: 3 + octave * 0.5, // Higher Q for higher octaves
        // Harmonics for richness
        harmonics: this.getHarmonicsForOctave(octave)
      });
    }
  }

  /**
   * Get ADSR envelope profile based on character
   */
  getEnvelopeProfile(profile) {
    const profiles = {
      bass: {
        attack: 0.08,      // Slower attack for bass weight
        decay: 0.25,
        sustain: 0.4,
        release: 0.4
      },
      mid: {
        attack: 0.02,      // Medium attack
        decay: 0.15,
        sustain: 0.3,
        release: 0.25
      },
      treble: {
        attack: 0.003,     // Fast attack for presence
        decay: 0.08,
        sustain: 0.2,
        release: 0.15
      },
      default: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.2
      }
    };
    
    return profiles[profile] || profiles.default;
  }

  /**
   * Get filter frequency based on octave for tonal shaping
   */
  getFilterFreqForOctave(octave) {
    const baseFreqs = {
      2: 2000,  // Bass: deeper, warmer
      3: 4000,  // Mid: balanced
      4: 8000   // Treble: open, bright
    };
    return baseFreqs[octave] || 5000;
  }

  /**
   * Get harmonic series for rich overtones
   */
  getHarmonicsForOctave(octave) {
    if (octave === 2) {
      // Bass: add 2nd harmonic (octave) for weight
      return [1, 2];
    } else if (octave === 3) {
      // Mid: add 2nd and 3rd harmonics for fullness
      return [1, 2, 3];
    } else {
      // Treble: add higher harmonics for brightness
      return [1, 2, 3, 4];
    }
  }

  /**
   * Convert MIDI note number to frequency in Hz
   */
  midiNoteToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Trigger a note sound with velocity and harmonic enhancement
   */
  triggerNote(midiNote, velocity = 100) {
    if (!this.isInitialized || !this.audioContext) {
      console.warn('Sound Engine not initialized');
      return;
    }

    const pattern = this.patterns.get(midiNote);
    if (!pattern) {
      console.warn(`No pattern found for MIDI note ${midiNote}`);
      return;
    }

    // Normalize velocity to 0-1 range
    const normalizedVelocity = Math.max(0, Math.min(1, velocity / 127));

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Create filter for dynamic tone shaping
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = pattern.filterFreqBase;
      filter.Q.value = pattern.filterQ;

      const oscillators = [];
      const waveformType = this.waveform || pattern.waveform;

      const mainOsc = ctx.createOscillator();
      mainOsc.type = waveformType;
      mainOsc.frequency.value = pattern.frequency;
      mainOsc.connect(filter);
      oscillators.push(mainOsc);

      // Harmonic support for richness
      pattern.harmonics.slice(1).forEach((harmonic) => {
        const level = 0.08;
        const harmOsc = ctx.createOscillator();
        harmOsc.type = waveformType;
        harmOsc.frequency.value = pattern.frequency * harmonic;
        const harmGain = ctx.createGain();
        harmGain.gain.value = level;
        harmOsc.connect(harmGain);
        harmGain.connect(filter);
        oscillators.push(harmOsc);
      });

      // Create gain for ADSR envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);

      // Connect filter to master chain
      filter.connect(gain);
      gain.connect(this.masterFilter);
      
      // Apply ADSR envelope with velocity sensitivity
      const velocityGain = normalizedVelocity * 0.35;
      const attackTime = this.envelope.attack * (1 - normalizedVelocity * 0.3);
      const decayTime = this.envelope.decay;
      const sustainGain = this.envelope.sustain * normalizedVelocity;
      const releaseTime = this.envelope.release;
      
      // Attack phase
      gain.gain.linearRampToValueAtTime(velocityGain, now + attackTime);
      
      // Decay phase
      gain.gain.exponentialRampToValueAtTime(
        velocityGain * sustainGain,
        now + attackTime + decayTime
      );
      
      // Release phase (will be stopped by stopNote)
      const stopTime = now + attackTime + decayTime + 3; // 3 seconds max sustain
      gain.gain.linearRampToValueAtTime(0, stopTime + releaseTime);
      
      // Dynamic filter sweep (open filter on attack, close on release)
      const filterMax = pattern.filterFreqBase * (1 + normalizedVelocity);
      filter.frequency.setValueAtTime(pattern.filterFreqBase, now);
      filter.frequency.linearRampToValueAtTime(filterMax, now + attackTime * 2);
      
      // Start all oscillators
      oscillators.forEach(osc => osc.start(now));
      
      // Schedule stop
      oscillators.forEach(osc => osc.stop(stopTime + releaseTime));
      
      // Track active synth
      this.activeSynths.set(midiNote, {
        oscillators,
        gain,
        filter,
        velocity: normalizedVelocity,
        startTime: Date.now(),
        stopTime: stopTime + releaseTime,
        filterMax: filterMax
      });
      
      console.log(`🔊 ${pattern.note} [${pattern.waveform}] velocity:${Math.round(normalizedVelocity * 100)}%`);
    } catch (error) {
      console.error(`Error triggering note ${midiNote}:`, error);
    }
  }

  /**
   * Stop a note with smooth release
   */
  stopNote(midiNote) {
    if (this.activeSynths.has(midiNote)) {
      const synth = this.activeSynths.get(midiNote);
      try {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const releaseTime = 0.15;
        
        // Quick fade out
        synth.gain.gain.linearRampToValueAtTime(0, now + releaseTime);
        synth.oscillators.forEach(osc => osc.stop(now + releaseTime + 0.05));
      } catch (error) {
        console.error(`Error stopping note ${midiNote}:`, error);
      }
      this.activeSynths.delete(midiNote);
    }
  }

  /**
   * Apply pitch bend with smooth frequency transition
   */
  applyPitchBend(midiNote, bendValue) {
    // bendValue is normalized from -1 to 1
    if (this.activeSynths.has(midiNote)) {
      const synth = this.activeSynths.get(midiNote);
      const pattern = this.patterns.get(midiNote);
      const baseFreq = pattern.frequency;
      
      // Apply pitch shift (max ±2 semitones, smooth)
      const semitones = bendValue * 2;
      const freqMultiplier = Math.pow(2, semitones / 12);
      const newFreq = baseFreq * freqMultiplier;
      
      try {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        synth.oscillators.forEach((osc, index) => {
          const harmonic = index === 0 ? 1 : pattern.harmonics[index];
          osc.frequency.linearRampToValueAtTime(newFreq * harmonic, now + 0.05);
        });
      } catch (error) {
        console.error('Error applying pitch bend:', error);
      }
    }
  }

  applyPitchBendToActive(bendValue) {
    this.activeSynths.forEach((_, midiNote) => {
      this.applyPitchBend(midiNote, bendValue);
    });
  }

  setWaveform(waveform) {
    if (!waveform || typeof waveform !== 'string') {
      return;
    }
    this.waveform = waveform;
  }

  setEnvelopeParam(param, value) {
    if (!['attack', 'decay', 'sustain', 'release'].includes(param)) {
      return;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return;
    }
    this.envelope[param] = numeric;
  }

  /**
   * Apply modulation (filter cutoff modulation)
   */
  applyModulation(ccValue) {
    // ccValue is normalized from 0 to 1
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Modulate master filter cutoff (500 Hz to 12 kHz)
    const minFreq = 500;
    const maxFreq = 12000;
    const targetFreq = minFreq + (maxFreq - minFreq) * ccValue;
    
    try {
      this.masterFilter.frequency.linearRampToValueAtTime(targetFreq, now + 0.1);
    } catch (error) {
      console.error('Error applying modulation:', error);
    }
    
    // Also modulate individual note filters
    this.activeSynths.forEach((synth) => {
      try {
        const pattern = this.patterns.get([...this.patterns.keys()].find(
          key => this.patterns.get(key).frequency === synth.mainOsc.frequency.value
        ));
        if (pattern) {
          const filterMin = pattern.filterFreqBase;
          const filterMax = pattern.filterFreqBase * 3;
          const newFilterFreq = filterMin + (filterMax - filterMin) * ccValue;
          synth.filter.frequency.linearRampToValueAtTime(newFilterFreq, now + 0.1);
        }
      } catch (error) {
        // Silently ignore
      }
    });
  }

  /**
   * Get MIDI note name
   */
  getMidiNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = noteNames[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${noteName}${octave}`;
  }

  /**
   * Stop all active notes
   */
  stopAll() {
    const noteArray = Array.from(this.activeSynths.keys());
    noteArray.forEach((note) => this.stopNote(note));
  }

  /**
   * Check if engine is ready
   */
  isReady() {
    return this.isInitialized && this.audioContext;
  }
}
