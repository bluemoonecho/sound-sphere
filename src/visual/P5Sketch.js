/**
 * P5Sketch.js - p5.js sketch for visual rendering (2D canvas, B&W retro aesthetic)
 */

import p5 from 'p5';

export class P5Sketch {
  constructor(containerSelector = '#p5-container') {
    this.sketch = null;
    this.p5Instance = null;
    this.containerSelector = containerSelector;
    this.animations = [];
    this.currentAnimationType = -1; // -1 = auto (type cycles by midiNote % 4)
    this.maxAnimations = 8;
    this.animationByKey = new Map();
    this.creationOrder = [];
  }

  init() {
    const self = this;

    this.sketch = (p) => {
      p.setup = function () {
        const container = document.querySelector(self.containerSelector);
        const width = window.innerWidth - 300;
        const height = window.innerHeight;

        const canvas = p.createCanvas(width, height); // 2D mode — text works natively
        if (container) {
          canvas.parent(container);
          container.style.position = 'relative';
        }

        p.colorMode(p.RGB);
        p.angleMode(p.DEGREES);
        p.noStroke();
      };

      p.draw = function () {
        p.background(12); // near-black

        self.updateAnimations(p);
        self.drawAnimations(p);
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

  updateAnimations(p) {
    const now = Date.now();
    const toRemove = [];

    this.animations.forEach((anim, index) => {
      anim.update(p, now);
      if (anim.isFinished(now)) {
        if (anim.noteKey) {
          this.animationByKey.delete(anim.noteKey);
          this.creationOrder = this.creationOrder.filter((key) => key !== anim.noteKey);
        }
        toRemove.push(index);
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.animations.splice(toRemove[i], 1);
    }
  }

  drawAnimations(p) {
    this.animations.forEach((anim) => {
      p.push();
      p.translate(p.width / 2, p.height / 2); // center the origin for all animations
      anim.draw(p);
      p.pop();
    });
  }

  drawDebugInfo(p) {
    p.push();
    p.fill(255, 90);
    p.noStroke();
    p.textSize(11);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`FPS: ${Math.round(p.frameRate())}`, 10, 10);
    p.text(`Animations: ${this.animations.length}`, 10, 24);
    p.pop();
  }

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
    // In auto mode (-1), type is determined by the note itself (cycles 0-3 per semitone).
    // In manual mode (0-3), the selected type overrides.
    const animType = this.currentAnimationType >= 0
      ? this.currentAnimationType
      : midiNote % 4;
    const animationClass = this.getAnimationClass(animType);

    const animation = new animationClass(midiNote, normalizedVelocity, this.p5Instance);
    animation.noteKey = noteKey;

    this.animations.push(animation);
    this.animationByKey.set(noteKey, animation);
    this.creationOrder.push(noteKey);
  }

  getAnimationClass(type) {
    const AnimationTypes = {
      0: RingBurst,
      1: ScanlineRipple,
      2: SpinPolygon,
      3: ShockImpact,
    };
    return AnimationTypes[type] || RingBurst;
  }

  setAnimationType(type) {
    this.currentAnimationType = Math.max(-1, Math.min(3, type));
  }

  stopNote(midiNote, noteKey = `note:${midiNote}`) {
    const animation = this.animationByKey.get(noteKey);
    if (!animation) return;
    animation.startRelease();
    this.animationByKey.delete(noteKey);
    this.creationOrder = this.creationOrder.filter((key) => key !== noteKey);
  }

  clearAnimations() {
    this.animations = [];
    this.animationByKey.clear();
    this.creationOrder = [];
  }

  getP5() {
    return this.p5Instance;
  }
}

// ---------------------------------------------------------------------------
// Base Animation Class
// ---------------------------------------------------------------------------
class Animation {
  constructor(midiNote, velocity, p5Instance) {
    this.midiNote = midiNote;
    this.velocity = velocity; // 0–1
    this.p5 = p5Instance;
    this.startTime = Date.now();
    this.duration = 1500;
    this.durationMultiplier = 1.0;
    this.velocityModulation = velocity;
    this.modWheelIntensity = 0; // 0–1
    this.pitchBendModulation = 0; // –1 to 1
    this.sustainActive = false;
  }

  update(p, now) {
    this.elapsed = now - this.startTime;
    const effectiveDuration = this.duration * this.durationMultiplier;
    this.progress = Math.min(1, this.elapsed / effectiveDuration);
  }

  startRelease() {
    if (this.releasing) return;
    this.releasing = true;
    const elapsed = Date.now() - this.startTime;
    this.duration = Math.min(this.duration, elapsed + 180);
  }

  draw(p) {} // override in subclasses

  isFinished(now) {
    return (now - this.startTime) > this.duration * this.durationMultiplier;
  }

  getAlpha() {
    if (this.progress > 0.8) {
      return (1 - (this.progress - 0.8) / 0.2) * 255 * (0.6 + this.modWheelIntensity * 0.4);
    }
    return 255 * (0.7 + this.modWheelIntensity * 0.3);
  }
}

// ---------------------------------------------------------------------------
// RingBurst — concentric rings expand outward, dot particles scatter radially
// ---------------------------------------------------------------------------
class RingBurst extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1600;
    this.maxRadius = 220 + velocity * 140;

    const ringCount = 4 + Math.floor(velocity * 4);
    this.rings = [];
    for (let r = 0; r < ringCount; r++) {
      this.rings.push({
        delay: (r / ringCount) * 0.35,
        radiusMult: 0.28 + (r / ringCount) * 0.72,
      });
    }

    const dotCount = 12 + Math.floor(velocity * 20);
    this.dots = [];
    for (let d = 0; d < dotCount; d++) {
      const angle = (360 / dotCount) * d + (Math.random() - 0.5) * 15;
      this.dots.push({
        angle,
        speed: 0.55 + Math.random() * 0.5,
        size: 3 + Math.random() * 5 + velocity * 3,
        delay: Math.random() * 0.12,
      });
    }
  }

  draw(p) {
    const alpha = this.getAlpha();

    // Central flash dot
    const centerR = (7 + this.velocity * 9) * Math.max(0, 1 - this.progress * 3.5);
    if (centerR > 0.5) {
      p.fill(255, alpha);
      p.noStroke();
      p.circle(0, 0, centerR * 2);
    }

    // Concentric expanding rings
    this.rings.forEach((ring) => {
      const rp = Math.max(0, (this.progress - ring.delay) / (1 - ring.delay));
      if (rp <= 0) return;
      const eased = 1 - Math.pow(1 - rp, 2);
      const radius = eased * this.maxRadius * ring.radiusMult;
      p.noFill();
      p.stroke(255, alpha * (1 - eased * 0.55));
      p.strokeWeight(1.5);
      p.circle(0, 0, radius * 2);
    });

    // Dot particles radiating outward
    this.dots.forEach((dot) => {
      const dp = Math.max(0, (this.progress - dot.delay) / (1 - dot.delay));
      if (dp <= 0) return;
      const eased = 1 - Math.pow(1 - dp, 2);
      const dist = eased * this.maxRadius * dot.speed;
      const aRad = p.radians(dot.angle);
      const x = Math.cos(aRad) * dist;
      const y = Math.sin(aRad) * dist;
      const dotSize = dot.size * (1 - dp * 0.5);
      p.fill(255, alpha * (1 - dp * 0.3));
      p.noStroke();
      p.circle(x, y, dotSize);
    });
  }
}

// ---------------------------------------------------------------------------
// ScanlineRipple — CRT-style horizontal lines expanding from center
// ---------------------------------------------------------------------------
class ScanlineRipple extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1400;
    this.lineCount = 44 + Math.floor(velocity * 36);
    this.maxSpread = 280 + velocity * 200;
    this.seed = Math.random() * 1000;
  }

  draw(p) {
    const alpha = this.getAlpha();
    const spread = this.progress * this.maxSpread;

    p.push();
    p.noFill();

    for (let i = 0; i < this.lineCount; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      const lineIdx = Math.floor(i / 2);
      const step = spread / Math.max(1, this.lineCount / 2);
      const baseY = sign * lineIdx * step;

      // Analog glitch offset — subsides as animation matures
      const glitch =
        Math.sin(lineIdx * 7.3 + this.seed + this.progress * 900) *
        (1 - this.progress) * 7;
      const y = baseY + glitch;

      const distFrac = Math.abs(baseY) / this.maxSpread;
      const lineAlpha = alpha * (1 - distFrac * 0.65) * (1 - this.progress * 0.35);
      if (lineAlpha < 3) continue;

      const halfLen =
        (p.width * 0.48) * (1 - distFrac * 0.38) * Math.min(1, this.progress * 3.5);
      const weight = Math.max(0.5, 1.8 * (1 - distFrac));

      p.stroke(200, lineAlpha);
      p.strokeWeight(weight);
      p.line(-halfLen, y, halfLen, y);
    }

    // Bright center hot-spot line
    p.stroke(255, alpha * (1 - this.progress * 0.25));
    p.strokeWeight(2.5);
    const hotLen = p.width * 0.44 * Math.min(1, this.progress * 5);
    p.line(-hotLen, 0, hotLen, 0);

    // Edge tick marks (CRT raster framing)
    const tickAlpha = alpha * (1 - this.progress) * 0.5;
    if (tickAlpha > 4) {
      p.stroke(255, tickAlpha);
      p.strokeWeight(1);
      p.line(-hotLen, -5, -hotLen, 5);
      p.line(hotLen, -5, hotLen, 5);
    }
    p.pop();
  }
}

// ---------------------------------------------------------------------------
// SpinPolygon — nested wireframe polygons spin and expand; dot markers at vertices
// ---------------------------------------------------------------------------
class SpinPolygon extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1700;
    this.maxSize = 200 + velocity * 180;

    const polyCount = 3 + Math.floor(velocity * 3);
    this.polygons = [];
    for (let i = 0; i < polyCount; i++) {
      this.polygons.push({
        sides: 3 + i,          // triangle → square → pentagon → hexagon…
        spinDir: i % 2 === 0 ? 1 : -1,
        spinSpeed: 22 + Math.random() * 32,
        radiusMult: (i + 1) / polyCount,
        startAngle: (360 / (3 + i)) * Math.random(),
        weight: Math.max(1, 2.5 - i * 0.4),
      });
    }
  }

  draw(p) {
    const alpha = this.getAlpha();

    this.polygons.forEach((poly, idx) => {
      const eased = 1 - Math.pow(1 - this.progress, 1.5);
      const radius = eased * this.maxSize * poly.radiusMult;
      const spin = poly.startAngle + this.progress * poly.spinSpeed * poly.spinDir;

      p.push();
      p.noFill();
      p.stroke(255, alpha * (1 - idx * 0.07));
      p.strokeWeight(poly.weight);

      p.beginShape();
      for (let v = 0; v < poly.sides; v++) {
        const a = p.radians((360 / poly.sides) * v + spin);
        p.vertex(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      p.endShape(p.CLOSE);

      // Small filled dot at each vertex
      p.fill(255, alpha * 0.85);
      p.noStroke();
      for (let v = 0; v < poly.sides; v++) {
        const a = p.radians((360 / poly.sides) * v + spin);
        p.circle(Math.cos(a) * radius, Math.sin(a) * radius, 5);
      }
      p.pop();
    });
  }
}

// ---------------------------------------------------------------------------
// ShockImpact — diamond shape drops and impacts; concentric rings + shape fragments scatter
// ---------------------------------------------------------------------------
class ShockImpact extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1300;
    this.impactSize = 55 + velocity * 55;

    const fragCount = 10 + Math.floor(velocity * 16);
    this.fragments = [];
    for (let i = 0; i < fragCount; i++) {
      const angle = (360 / fragCount) * i + (Math.random() - 0.5) * 25;
      this.fragments.push({
        angle,
        speed: 65 + Math.random() * 120 * velocity,
        size: 3 + Math.random() * 6,
        spin: Math.random() * 360,
        spinRate: (Math.random() - 0.5) * 360,
        isDiamond: Math.random() > 0.4, // 60% diamonds, 40% squares
      });
    }
  }

  draw(p) {
    const alpha = this.getAlpha();
    const landingPoint = 0.3;

    // Drop from above, ease-in (accelerate)
    const dropRaw = Math.min(1, this.progress / landingPoint);
    const impactY = -p.height * 0.5 * (1 - dropRaw * dropRaw);

    // Post-impact squash/stretch
    const postImpact = Math.max(0, (this.progress - landingPoint) / (1 - landingPoint));
    const squashX = 1 + Math.sin(postImpact * Math.PI) * 0.3;
    const squashY = 1 / squashX;
    const displaySize = this.impactSize * (1 - this.progress * 0.5);

    // Falling diamond (rotated square)
    p.push();
    p.translate(0, impactY);
    p.scale(squashX, squashY);
    p.rotate(45);
    p.noFill();
    p.stroke(255, alpha);
    p.strokeWeight(2.5);
    p.rect(-displaySize / 2, -displaySize / 2, displaySize, displaySize);
    p.pop();

    if (this.progress > landingPoint) {
      const ringProg = (this.progress - landingPoint) / (1 - landingPoint);

      // Staggered concentric circles
      for (let r = 0; r < 3; r++) {
        const rp = Math.max(0, ringProg - r * 0.1);
        if (rp <= 0) continue;
        const ringR = rp * (70 + this.velocity * 80 + r * 35);
        p.noFill();
        p.stroke(255, alpha * (1 - rp) * (1 - r * 0.15));
        p.strokeWeight(2 - r * 0.35);
        p.circle(0, 0, ringR * 2);
      }

      // Geometric fragment scatter (squares and diamonds)
      this.fragments.forEach((frag) => {
        const dist = ringProg * frag.speed;
        const aRad = p.radians(frag.angle);
        const fragAlpha = alpha * (1 - ringProg * 0.65);
        const fragSize = frag.size * (1 - ringProg * 0.4);

        p.push();
        p.translate(Math.cos(aRad) * dist, Math.sin(aRad) * dist);
        p.rotate(frag.spin + ringProg * frag.spinRate + (frag.isDiamond ? 45 : 0));
        p.fill(255, fragAlpha);
        p.noStroke();
        p.rect(-fragSize / 2, -fragSize / 2, fragSize, fragSize);
        p.pop();
      });
    }
  }
}
