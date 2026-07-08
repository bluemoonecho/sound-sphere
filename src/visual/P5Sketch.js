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
    this.animationByKey = new Map();
    this.creationOrder = [];
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

        p.createCanvas(width, height, p.WEBGL);
        if (container) {
          p.canvas.parent(container);
          container.style.position = 'relative';
        }

        p.colorMode(p.HSB, 360, 100, 100, 255);
        p.angleMode(p.DEGREES);
        p.textAlign(p.LEFT, p.TOP);
        p.noStroke();
      };

      p.draw = function () {
        p.background(220, 30, 10);
        p.ambientLight(40, 40, 40);
        p.directionalLight(200, 200, 255, 0.5, 0.5, -1);
        p.pointLight(255, 255, 255, 0, 0, 200);

        // Update and draw animations
        self.updateAnimations(p);
        self.drawAnimations(p);

        // Draw debug info on top
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
        if (anim.noteKey) {
          this.animationByKey.delete(anim.noteKey);
          this.creationOrder = this.creationOrder.filter((key) => key !== anim.noteKey);
        }
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
    p.push();
    p.resetMatrix();
    p.fill(0, 0, 100, 255);
    p.textSize(12);
    p.text(`FPS: ${Math.round(p.frameRate())}`, 10, 20);
    p.text(`Animations: ${this.animations.length}`, 10, 35);
    p.pop();
  }

  /**
   * Trigger animation on MIDI note
   */
  triggerAnimation(midiNote, velocity = 100, noteKey = `note:${midiNote}`) {
    const existing = this.animationByKey.get(noteKey);
    if (existing) {
      existing.startRelease();
      this.animationByKey.delete(noteKey);
      this.creationOrder = this.creationOrder.filter((key) => key !== noteKey);
    }

    if (this.animations.length >= this.maxAnimations) {
      const oldestKey = this.creationOrder.shift();
      if (oldestKey) {
        const oldest = this.animationByKey.get(oldestKey);
        if (oldest) {
          oldest.startRelease();
          this.animationByKey.delete(oldestKey);
        }
      }
    }

    const normalizedVelocity = Math.max(0, Math.min(1, velocity / 127));
    const animationClass = this.getAnimationClass(this.currentAnimationType);
    
    const animation = new animationClass(
      midiNote,
      normalizedVelocity,
      this.p5Instance
    );
    animation.noteKey = noteKey;

    this.animations.push(animation);
    this.animationByKey.set(noteKey, animation);
    this.creationOrder.push(noteKey);
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
  stopNote(midiNote, noteKey = `note:${midiNote}`) {
    const animation = this.animationByKey.get(noteKey);
    if (!animation) {
      return;
    }

    animation.startRelease();
    this.animationByKey.delete(noteKey);
    this.creationOrder = this.creationOrder.filter((key) => key !== noteKey);
  }

  /**
   * Clear all animations
   */
  clearAnimations() {
    this.animations = [];
    this.animationByKey.clear();
    this.creationOrder = [];
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

  startRelease() {
    if (this.releasing) {
      return;
    }

    this.releasing = true;
    const elapsed = Date.now() - this.startTime;
    const releaseWindow = 180;
    this.duration = Math.min(this.duration, elapsed + releaseWindow);
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
    const alpha = this.getAlpha();
    const hue = (this.midiNote * 7) % 360;
    const ringCount = 4 + Math.floor(this.modWheelIntensity * 4);
    const radius = 100 + this.progress * this.maxRadius;
    const rotation = this.progress * 180 + this.pitchBendModulation * 90;

    p.push();
    p.translate(0, 0, -200);
    p.rotateY(rotation);

    for (let i = 0; i < ringCount; i++) {
      const ringRadius = radius * (1 + i * 0.15);
      const sphereCount = 6 + i * 2;
      for (let j = 0; j < sphereCount; j++) {
        const angle = (360 / sphereCount) * j + this.progress * 120;
        const x = Math.cos(angle) * ringRadius;
        const y = Math.sin(angle) * ringRadius * 0.6;
        const z = Math.sin(this.progress * 360 + angle) * 40;

        p.push();
        p.translate(x, y, z);
        p.fill(hue, 90, 90, alpha);
        p.sphere(12 * (1 - this.progress) + 4, 16, 16);
        p.pop();
      }
    }

    p.pop();
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
    this.centerX = 0;
    this.centerY = 0;
    this.particles = this.createParticles(this.centerX, this.centerY);
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
        vz: (Math.random() - 0.5) * speed * 0.5,
        x: centerX,
        y: centerY,
        z: 0,
        size: 2 + Math.random() * 4
      });
    }
    return particles;
  }

  update(p, now) {
    super.update(p, now);
    if (!Array.isArray(this.particles) || this.particles.length === 0) {
      return;
    }

    const dt = Math.min(0.033, p.deltaTime / 1000 || 0.016);
    const gravity = 80 + this.modWheelIntensity * 40;

    this.particles.forEach((particle) => {
      particle.vy += gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
    });
  }

  draw(p) {
    if (!Array.isArray(this.particles) || this.particles.length === 0) {
      return;
    }

    const alpha = this.getAlpha();
    const hue = (this.midiNote * 5) % 360;
    const sizeMultiplier = this.velocityModulation * 0.5 + 0.5;

    p.push();
    p.translate(0, 0, -200);

    this.particles.forEach((particle) => {
      p.push();
      p.translate(particle.x, particle.y, particle.z);
      p.fill(hue, 90, 90, alpha);
      p.sphere(particle.size * sizeMultiplier * (1 - this.progress) + 2, 10, 10);
      p.pop();
    });

    p.pop();
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
    const alpha = this.getAlpha();
    const hue = (this.midiNote * 4) % 360;
    const phaseShift = this.pitchBendModulation * 45;
    const thickness = 2 + this.modWheelIntensity * 4;

    p.push();
    p.translate(0, 0, -230);
    p.rotateX(60);

    p.stroke(hue, 100, 100, alpha);
    p.strokeWeight(thickness);
    p.noFill();

    const points = 80;
    p.beginShape();

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 360;
      const x = Math.cos(angle + phaseShift) * 140;
      const y = Math.sin(angle + phaseShift) * 40 * (1 - this.progress);
      const z = Math.sin((i / points) * Math.PI * 4 + this.progress * 360) * this.amplitude * (1 - this.progress);
      p.vertex(x, y, z);
    }

    p.endShape(p.CLOSE);
    p.pop();
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
    const alpha = this.getAlpha();
    const hue = (this.midiNote * 9) % 360;
    const rotation = this.pitchBendModulation * 90 * this.progress;
    const rectCount = 2 + Math.floor(this.modWheelIntensity * 4);
    const thickness = 2 + this.modWheelIntensity * 3;

    p.push();
    p.translate(0, 0, -220);
    p.rotateX(25 + this.progress * 15);
    p.rotateY(rotation + this.progress * 45);

    p.stroke(hue, 100, 100, alpha);
    p.strokeWeight(thickness);
    p.noFill();

    for (let i = 0; i < rectCount; i++) {
      const size = this.progress * this.maxSize + i * 40;
      p.push();
      p.rotateY(i * 15);
      p.box(size, size, 20);
      p.pop();
    }

    p.pop();
  }
}
