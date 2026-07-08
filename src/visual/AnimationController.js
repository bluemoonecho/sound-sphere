/**
 * AnimationController.js - Manages animation triggering and real-time parameter modulation
 */

export class AnimationController {
  constructor(p5Sketch) {
    this.p5Sketch = p5Sketch;
    this.animationMap = new Map(); // Map MIDI notes to animations
    this.activeNotes = new Set();
    this.globalModulation = {
      modWheel: 0,
      pitchBend: 0,
      sustain: false
    };
  }

  handleNoteEvent(event) {
    if (!event) {
      return;
    }

    if (event.phase === 'noteOn') {
      this.onNoteOn(event.note, event.velocity, event.noteKey);
      return;
    }

    if (event.phase === 'noteOff') {
      this.onNoteOff(event.note, event.noteKey);
    }
  }

  /**
   * Trigger animation on MIDI note with velocity
   */
  onNoteOn(midiNote, velocity, noteKey = `note:${midiNote}`) {
    this.p5Sketch.triggerAnimation(midiNote, velocity, noteKey);
    this.activeNotes.add(midiNote);
    
    // Store animation metadata
    this.animationMap.set(midiNote, {
      triggered: Date.now(),
      velocity: velocity,
      modulation: { ...this.globalModulation },
      noteKey
    });
  }

  /**
   * Stop animation on note off
   */
  onNoteOff(midiNote, noteKey = `note:${midiNote}`) {
    this.p5Sketch.stopNote(midiNote, noteKey);
    this.activeNotes.delete(midiNote);
    this.animationMap.delete(midiNote);
  }

  /**
   * Apply velocity-based animation scaling
   * Higher velocity = larger, brighter animations
   */
  applyVelocityModulation(midiNote, velocity) {
    if (this.animationMap.has(midiNote)) {
      const animData = this.animationMap.get(midiNote);
      animData.velocity = velocity;
      
      // Update animation if it exists
      const animation = this.p5Sketch.animations.find(a => a.midiNote === midiNote);
      if (animation) {
        const normalizedVelocity = Math.max(0, Math.min(1, velocity / 127));
        animation.velocityModulation = normalizedVelocity;
      }
    }
  }

  /**
   * Apply mod wheel modulation to animation intensity
   * Affects opacity, saturation, or scale of active animations
   */
  applyModWheel(normalizedValue) {
    // normalizedValue: 0-1
    this.globalModulation.modWheel = normalizedValue;
    
    // Apply to all active animations
    this.p5Sketch.animations.forEach((animation) => {
      animation.modWheelIntensity = normalizedValue;
    });
  }

  /**
   * Apply pitch bend to animation trajectory and frequency
   * Negative bend = slower, descending motion
   * Positive bend = faster, ascending motion
   */
  applyPitchBend(normalizedValue) {
    // normalizedValue: -1 to 1
    this.globalModulation.pitchBend = normalizedValue;
    
    // Apply to all active animations
    this.p5Sketch.animations.forEach((animation) => {
      animation.pitchBendModulation = normalizedValue;
    });
  }

  /**
   * Apply sustain pedal effect
   * Extends animation lifetime when sustain is active
   */
  applySustain(isActive) {
    this.globalModulation.sustain = isActive;
    
    // Extend or contract animation durations
    this.p5Sketch.animations.forEach((animation) => {
      if (isActive) {
        // Sustain extends lifetime by 50%
        animation.sustainActive = true;
        animation.durationMultiplier = 1.5;
      } else {
        animation.sustainActive = false;
        animation.durationMultiplier = 1.0;
      }
    });
  }

  /**
   * Change animation type globally
   */
  setAnimationType(type) {
    this.p5Sketch.setAnimationType(type);
  }

  /**
   * Get currently active notes
   */
  getActiveNotes() {
    return Array.from(this.activeNotes);
  }

  /**
   * Get animation map info
   */
  getAnimationInfo() {
    return {
      activeNotes: this.getActiveNotes(),
      totalAnimations: this.p5Sketch.animations.length,
      currentType: this.p5Sketch.currentAnimationType,
      modulation: { ...this.globalModulation }
    };
  }

  /**
   * Clear all animations
   */
  clear() {
    this.p5Sketch.clearAnimations();
    this.activeNotes.clear();
    this.animationMap.clear();
  }

  /**
   * Stop all notes
   */
  stopAll() {
    this.activeNotes.forEach((note) => {
      this.onNoteOff(note);
    });
  }
}
