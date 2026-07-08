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
      0: GlyphBurst,
      1: ScanlineRipple,
      2: RetroVector,
      3: LetterStamp,
    };
    return AnimationTypes[type] || GlyphBurst;
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
// GlyphBurst — note-name letter at center, alphanumeric chars radiate outward
// ---------------------------------------------------------------------------
class GlyphBurst extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1600;

    const noteLetters = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    this.centralChar = noteLetters[midiNote % 12];

    const glyphPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&*+-=~<>?/|';
    this.maxRadius = 200 + velocity * 160;
    this.particleCount = 14 + Math.floor(velocity * 22);
    this.particles = [];

    for (let i = 0; i < this.particleCount; i++) {
      const angle = (360 / this.particleCount) * i + (Math.random() - 0.5) * 20;
      this.particles.push({
        char: glyphPool[Math.floor(Math.random() * glyphPool.length)],
        angle,
        radiusFrac: 0.55 + Math.random() * 0.55,
        spinRate: (Math.random() - 0.5) * 540,
        spin: Math.random() * 360,
        size: 12 + Math.random() * 20,
      });
    }
  }

  draw(p) {
    const alpha = this.getAlpha();

    // Central note-name character — large, bright, shrinks as it fades
    p.push();
    const centralSize = 90 * (1.5 - this.progress * 0.7);
    p.textSize(centralSize);
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(255, alpha);
    p.noStroke();
    p.text(this.centralChar, 0, 0);
    p.pop();

    // Register crosshair (fades early)
    const crossAlpha = alpha * (1 - this.progress) * 0.4;
    if (crossAlpha > 4) {
      p.push();
      const cr = 18 + this.progress * 36;
      p.stroke(255, crossAlpha);
      p.strokeWeight(1);
      p.line(-cr, 0, cr, 0);
      p.line(0, -cr, 0, cr);
      p.pop();
    }

    // Burst particles — alphanumeric glyphs scatter outward
    this.particles.forEach((particle) => {
      const eased = 1 - Math.pow(1 - this.progress, 2); // ease-out
      const dist = eased * this.maxRadius * particle.radiusFrac;
      const aRad = p.radians(particle.angle);
      const x = Math.cos(aRad) * dist;
      const y = Math.sin(aRad) * dist;

      p.push();
      p.translate(x, y);
      p.rotate(particle.spin + this.progress * particle.spinRate);
      p.textSize(particle.size * (1 - this.progress * 0.45));
      p.textAlign(p.CENTER, p.CENTER);
      p.fill(210, alpha * (1 - this.progress * 0.25));
      p.noStroke();
      p.text(particle.char, 0, 0);
      p.pop();
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
// RetroVector — expanding wireframe polygons with letter chars at vertices
// ---------------------------------------------------------------------------
class RetroVector extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1700;
    this.maxSize = 190 + velocity * 200;

    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const noteLetters = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    this.noteChar = noteLetters[midiNote % 12];

    const shapeCount = 2 + Math.floor(velocity * 2);
    this.shapes = [];
    for (let s = 0; s < shapeCount; s++) {
      const sides = 3 + Math.floor(Math.random() * 5); // 3–7 sided polygon
      const verts = [];
      for (let v = 0; v < sides; v++) {
        verts.push({
          angle: (360 / sides) * v + s * 27,
          char:
            s === 0 && v === 0
              ? this.noteChar
              : glyphs[Math.floor(Math.random() * glyphs.length)],
        });
      }
      this.shapes.push({
        verts,
        spinRate: (Math.random() - 0.5) * 110,
        radiusMult: 0.45 + s * 0.55,
      });
    }
  }

  draw(p) {
    const alpha = this.getAlpha();

    this.shapes.forEach((shape) => {
      const eased = 1 - Math.pow(1 - this.progress, 1.5);
      const radius = eased * this.maxSize * shape.radiusMult;
      const spin = this.progress * shape.spinRate;

      p.push();
      p.noFill();
      p.stroke(255, alpha);
      p.strokeWeight(1.5);

      // Wireframe polygon
      p.beginShape();
      shape.verts.forEach((vert) => {
        const a = p.radians(vert.angle + spin);
        p.vertex(Math.cos(a) * radius, Math.sin(a) * radius);
      });
      p.endShape(p.CLOSE);

      // Letter at each vertex
      shape.verts.forEach((vert) => {
        const a = p.radians(vert.angle + spin);
        const vx = Math.cos(a) * radius;
        const vy = Math.sin(a) * radius;

        p.push();
        p.translate(vx, vy);
        p.rotate(vert.angle + spin);
        p.textSize(11 + (1 - this.progress) * 6);
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255, alpha);
        p.noStroke();
        p.text(vert.char, 0, 0);
        p.pop();
      });
      p.pop();
    });

    // Origin crosshair
    const cAlpha = alpha * (1 - this.progress) * 0.5;
    if (cAlpha > 4) {
      p.push();
      p.stroke(255, cAlpha);
      p.strokeWeight(1);
      p.line(-14, 0, 14, 0);
      p.line(0, -14, 0, 14);
      p.pop();
    }
  }
}

// ---------------------------------------------------------------------------
// LetterStamp — large note-name letter drops from above and impacts center
// ---------------------------------------------------------------------------
class LetterStamp extends Animation {
  constructor(midiNote, velocity, p5Instance) {
    super(midiNote, velocity, p5Instance);
    this.duration = 1300;

    const noteLetters = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    this.letter = noteLetters[midiNote % 12];

    const fragChars = '|/\\-+*.:_=!~#@';
    const fragCount = 8 + Math.floor(velocity * 14);
    this.fragments = [];
    for (let i = 0; i < fragCount; i++) {
      const angle = (360 / fragCount) * i + (Math.random() - 0.5) * 30;
      this.fragments.push({
        char: fragChars[i % fragChars.length],
        angle,
        speed: 55 + Math.random() * 130 * velocity,
        size: 8 + Math.random() * 13,
      });
    }
    this.letterSize = 120 + velocity * 70;
  }

  draw(p) {
    const alpha = this.getAlpha();
    const landingPoint = 0.38;

    // Accelerating drop: starts above, arrives at center at landingPoint
    const dropRaw = Math.min(1, this.progress / landingPoint);
    const easeIn = dropRaw * dropRaw; // ease-in (accelerate into center)
    const startY = -p.height * 0.52;
    const stampY = startY * (1 - easeIn);

    // Post-impact squash/stretch
    const postImpact = Math.max(0, (this.progress - landingPoint) / (1 - landingPoint));
    const squash = 1 + Math.sin(postImpact * Math.PI) * 0.22;
    const stretch = 2 - squash;
    const displaySize = this.letterSize * (1 - this.progress * 0.55);

    p.push();
    p.translate(0, stampY);
    p.scale(squash, stretch);
    p.textSize(displaySize);
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(255, alpha);
    p.noStroke();
    p.text(this.letter, 0, 0);
    p.pop();

    if (this.progress > landingPoint) {
      const ringProg = (this.progress - landingPoint) / (1 - landingPoint);
      const ringR = ringProg * (90 + this.velocity * 90);

      p.push();
      p.noFill();
      p.stroke(255, alpha * (1 - ringProg));
      p.strokeWeight(2);
      p.circle(0, 0, ringR * 2);

      // Typographic fragment scatter
      this.fragments.forEach((frag) => {
        const dist = ringProg * frag.speed;
        const aRad = p.radians(frag.angle);
        const fx = Math.cos(aRad) * dist;
        const fy = Math.sin(aRad) * dist;

        p.push();
        p.translate(fx, fy);
        p.rotate(frag.angle + ringProg * 180);
        p.textSize(frag.size);
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(220, alpha * (1 - ringProg * 0.65));
        p.noStroke();
        p.text(frag.char, 0, 0);
        p.pop();
      });
      p.pop();
    }
  }
}
