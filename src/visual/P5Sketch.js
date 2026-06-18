/**
 * P5Sketch.js - p5.js sketch for visual rendering
 */

import p5 from 'p5';

export class P5Sketch {
  constructor(containerSelector = '#p5-container') {
    this.sketch = null;
    this.p5Instance = null;
    this.containerSelector = containerSelector;
    this.animations = [];
    this.currentAnimationType = 0;
    this.backgroundColor = 0; // Black
    this.maxAnimations = 8; // Limit simultaneous animations
  }

  /**
   * Initialize p5.js sketch
   */
  init() {
    const self = this;

    this.sketch = (p) => {
      p.setup = function () {
        const container = document.querySelector(self.containerSelector);
        const width = window.innerWidth - 300; // Account for sidebar
        const height = window.innerHeight;

        p.createCanvas(width, height);
        p.colorMode(p.RGB);
      };

      p.draw = function () {
        // White background
        p.background(255);

        // Update and draw animations
        self.updateAnimations(p);
        self.drawAnimations(p);

        // Draw debug info
        self.drawDebugInfo(p);
      };

      p.windowResized = function () {
        if (p.windowWidth > 300) {
          p.resizeCanvas(p.windowWidth - 300, p.windowHeight);
        }
      };
    };

    this.p5Instance = new p5(this.sketch);
    return this.p5Instance;
  }

  /**
   * Update animation states
   */
  updateAnimations(p) {
    const now = Date.now();
    const toRemove = [];

    this.animations.forEach((anim, index) => {
      anim.update(p, now);

      // Remove finished animations
      if (anim.isFinished(now)) {
        toRemove.push(index);
      }
    });

    // Remove finished animations in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.animations.splice(toRemove[i], 1);
    }
  }

  /**
   * Draw all animations
   */
  drawAnimations(p) {
    this.animations.forEach((anim) => {
      anim.draw(p);
    });
  }

  /**
   * Draw debug info
   */
  drawDebugInfo(p) {
    p.fill(0);
    p.textSize(12);
    p.text(`FPS: ${Math.round(p.frameRate())}`, 10, 20);
    p.text(`Animations: ${this.animations.length}`, 10, 35);
  }

  /**
   * Trigger animation on MIDI note
   */
  triggerAnimation(midiNote, velocity = 100) {
    // Don't add if we're at max
    if (this.animations.length >= this.maxAnimations) {
      return;
    }

    const normalizedVelocity = Math.max(0, Math.min(1, velocity / 127));
    const animationClass = this.getAnimationClass(this.currentAnimationType);
    
    const animation = new animationClass(
      midiNote,
      normalizedVelocity,
      this.p5Instance
    );

    this.animations.push(animation);
  }

  /**
   * Get animation class by type
   */
  getAnimationClass(type) {
    const AnimationTypes = {
      0: RadiatingCircles,
      1: ParticleBurst,
      2: WavePattern,
      3: ExpandingRectangles
    };
    return AnimationTypes[type] || RadiatingCircles;
  }

  /**
   * Set animation type (0-3)
   */
  setAnimationType(type) {
    this.currentAnimationType = Math.max(0, Math.min(3, type));
  }

  /**
   * Stop note animation
   */
  stopNote(midiNote) {
    // Animations will fade out naturally with their lifecycle
    // Could mark for immediate removal if needed
  }

  /**
   * Clear all animations
   */
  clearAnimations() {
    this.animations = [];
  }

  /**
   * Get p5 instance for direct access
   */
  getP5() {
    return this.p5Instance;
  }
}

/**
 * Base Animation Class
 */
class Animation {
  constructor(midiNote, velocity, p5Instance) {
    this.midiNote = midiNote;
    this.velocity = velocity; // 0-1
    this.p5 = p5Instance;
    this.startTime = Date.now();
    this.duration = 1500; // 1.5 seconds default
    this.durationMultiplier = 1.0; // Sustain pedal can extend this
    
    // Modulation properties
    this.velocityModulation = velocity;
    this.modWheelIntensity = 0; // 0-1
    this.pitchBendModulation = 0; // -1 to 1
    this.sustainActive = false;
  }

  update(p, now) {
    this.elapsed = now - this.startTime;
    // Account for sustain pedal extending duration
    const effectiveDuration = this.duration * this.durationMultiplier;
    this.progress = Math.min(1, this.elapsed / effectiveDuration); // 0 to 1
  }

  draw(p) {
    // Override in subclasses
  }

  isFinished(now) {
    const effectiveDuration = this.duration * this.durationMultiplier;
    return (now - this.startTime) > effectiveDuration;
  }

  getAlpha() {
    // Fade out in last 20% of duration
    if (this.progress > 0.8) {
      const fadeAlpha = (1 - (this.progress - 0.8) / 0.2) * 255;
      // Mod wheel also affects opacity
      return fadeAlpha * (0.5 + this.modWheelIntensity * 0.5);
    }
    return 255 * (0.5 + this.modWheelIntensity * 0.5);
  }

  getCenterX(p) {
    return p.width / 2;
  }

  getCenterY(p) {
    return p.height / 2;
  }
}

/**
 * Radiating Circles animation
 */
class RadiatingCircles extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1200;
    // Velocity controls max radius
    this.maxRadius = 150 + velocity * 200;
  }

  draw(p) {
    const centerX = this.getCenterX(p);
    const centerY = this.getCenterY(p);
    const alpha = this.getAlpha();
    // Pitch bend controls stroke weight
    const bendEffect = Math.abs(this.pitchBendModulation) * 4;
    const radius = this.progress * this.maxRadius;
    const strokeWeight = (2 + bendEffect) * (1 - this.progress);

    p.stroke(0, alpha);
    p.strokeWeight(Math.max(1, strokeWeight));
    p.noFill();

    // Draw multiple circles - count affected by modulation
    const circleCount = 2 + Math.floor(this.modWheelIntensity * 2);
    for (let i = 0; i < circleCount; i++) {
      const offset = (i * this.maxRadius / circleCount);
      p.circle(centerX, centerY, radius + offset);
    }
  }
}

/**
 * Particle Burst animation
 */
class ParticleBurst extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1500;
    // Velocity controls particle count
    this.particleCount = 15 + Math.floor(velocity * 35);
    this.centerX = null;
    this.centerY = null;
    this.particles = null;
  }

  createParticles(centerX, centerY) {
    const particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / this.particleCount;
      // Pitch bend affects burst velocity
      const bendSpeed = 1 + this.pitchBendModulation * 0.5;
      const speed = (50 + Math.random() * 150) * bendSpeed;
      particles.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        x: centerX,
        y: centerY,
        size: 2 + Math.random() * 4
      });
    }
    return particles;
  }

  draw(p) {
    // Initialize particles on first draw
    if (this.particles === null) {
      this.centerX = this.getCenterX(p);
      this.centerY = this.getCenterY(p);
      this.particles = this.createParticles(this.centerX, this.centerY);
    }

    const alpha = this.getAlpha();
    // Gravity affected by mod wheel
    const gravity = 80 + this.modWheelIntensity * 40;

    p.fill(0, alpha);
    p.noStroke();

    this.particles.forEach((particle) => {
      const elapsed = this.elapsed / 1000;
      particle.y += particle.vy * elapsed + gravity * elapsed * elapsed * 0.5;
      particle.x += particle.vx * elapsed;

      // Size affected by velocity and modulation
      const sizeMultiplier = this.velocityModulation * 0.5 + 0.5;
      p.circle(particle.x, particle.y, particle.size * sizeMultiplier * (1 - this.progress));
    });
  }
}

/**
 * Wave Pattern animation
 */
class WavePattern extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1800;
    // Velocity affects wave frequency
    this.frequency = 2 + velocity * 6;
    this.amplitude = 30 + velocity * 70;
  }

  draw(p) {
    const centerX = this.getCenterX(p);
    const centerY = this.getCenterY(p);
    const alpha = this.getAlpha();
    
    // Pitch bend affects wave phase shift
    const phaseShift = this.pitchBendModulation * Math.PI;
    // Mod wheel affects line thickness
    const thickness = 1 + this.modWheelIntensity * 3;
    
    p.stroke(0, alpha);
    p.strokeWeight(thickness);
    p.noFill();

    const points = 60;
    p.beginShape();

    for (let i = 0; i < points; i++) {
      const x = centerX - 150 + (i / points) * 300;
      const wave = Math.sin(
        (i / points) * Math.PI * 2 * this.frequency + 
        this.progress * Math.PI * 4 + 
        phaseShift
      );
      const y = centerY + wave * this.amplitude * (1 - this.progress);

      if (i === 0) {
        p.vertex(x, y);
      } else {
        p.curveVertex(x, y);
      }
    }

    p.endShape();
  }
}

/**
 * Expanding Rectangles animation
 */
class ExpandingRectangles extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1000;
    // Velocity controls expansion rate
    this.maxSize = 200 + velocity * 250;
    this.rotationSpeed = 0;
  }

  draw(p) {
    const centerX = this.getCenterX(p);
    const centerY = this.getCenterY(p);
    const alpha = this.getAlpha();
    
    // Pitch bend controls rotation
    const rotation = this.pitchBendModulation * Math.PI * 2 * this.progress;
    // Mod wheel controls rectangle count
    const rectCount = 2 + Math.floor(this.modWheelIntensity * 3);
    const thickness = 1 + this.modWheelIntensity * 2;
    
    p.stroke(0, alpha);
    p.strokeWeight(thickness);
    p.noFill();
    
    p.push();
    p.translate(centerX, centerY);
    p.rotate(rotation);

    // Draw multiple rectangles
    for (let i = 0; i < rectCount; i++) {
      const offset = (i * this.maxSize / rectCount);
      const size = this.progress * this.maxSize + offset;

      p.rectMode(p.CENTER);
      p.rect(0, 0, size, size);
    }
    
    p.pop();
  }
}
