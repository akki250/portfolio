import { PARTICLE_COUNT, ShapeId } from './math';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Deterministic pseudo-random generator (Mulberry32) so particle shapes
 * are reproducible across frames and unit tests.
 */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 5x7 crisp glyph bitmaps for uppercase characters, numbers, and symbols
const GLYPH_5X7: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10011', '10101', '10101', '10101', '11001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00010', '00100', '00100', '00000', '00100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

/**
 * Generates a 3D volumetric text constellation from any string.
 * Reused by both the default "DALA" Name shape and the interactive Type-to-Morph input.
 */
export function generateTextShape(text: string, count = PARTICLE_COUNT): Vec3[] {
  const clean = (text.trim().toUpperCase() || 'DALA').slice(0, 12);
  const rng = createSeededRng(clean.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 101));

  // Collect active voxel cells across all characters
  const activeVoxels: { gx: number; gy: number }[] = [];
  const charWidth = 5;
  const charGap = 1.5;
  const totalWidth = clean.length * charWidth + (clean.length - 1) * charGap;

  for (let cIdx = 0; cIdx < clean.length; cIdx++) {
    const ch = clean[cIdx];
    const bitmap = GLYPH_5X7[ch] || GLYPH_5X7['*'] || GLYPH_5X7['D'];
    const offsetX = cIdx * (charWidth + charGap) - totalWidth / 2;

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (bitmap[row][col] === '1') {
          activeVoxels.push({
            gx: offsetX + col + 0.5,
            gy: row - 3.5,
          });
        }
      }
    }
  }

  // Fallback if all spaces
  if (activeVoxels.length === 0) {
    return generateTextShape('DALA', count);
  }

  // Scale so wide words fit gracefully inside [-1.0, 1.0] radius without overlapping side columns
  const scaleFactor = Math.min(0.088, 1.95 / Math.max(10, totalWidth));
  const points: Vec3[] = new Array(count);

  // 88% of particles form the crisp extruded 3D letterforms, 12% form a subtle orbital halo
  const glyphCount = Math.floor(count * 0.88);

  for (let i = 0; i < count; i++) {
    if (i < glyphCount) {
      const voxel = activeVoxels[i % activeVoxels.length];
      const jitterX = (rng() - 0.5) * 0.85;
      const jitterY = (rng() - 0.5) * 0.85;
      const depthZ = (rng() - 0.5) * 0.24;
      points[i] = {
        x: (voxel.gx + jitterX) * scaleFactor,
        y: -(voxel.gy + jitterY) * scaleFactor * 1.12, // Positive Y is up in 3D space
        z: depthZ,
      };
    } else {
      // Subtle ambient constellation dust around the word
      const angle = rng() * Math.PI * 2;
      const radius = 0.82 + rng() * 0.52;
      points[i] = {
        x: Math.cos(angle) * radius * 1.05,
        y: Math.sin(angle) * radius * 0.58,
        z: (rng() - 0.5) * 0.65,
      };
    }
  }

  return points;
}

/**
 * Generates a dual-hemisphere cerebral cortex + synaptic bridge constellation ("brain").
 */
export function generateBrainShape(count = PARTICLE_COUNT): Vec3[] {
  const rng = createSeededRng(1337);
  const points: Vec3[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const u = rng() * Math.PI * 2;
    const v = Math.acos(2 * rng() - 1);
    const rBase = 0.78 + 0.18 * Math.cbrt(rng());

    // Gyri / sulci cortical folding ripples
    const folds =
      0.08 *
      Math.sin(u * 6 + Math.cos(v * 5)) *
      Math.sin(v * 7);

    const r = rBase + folds;
    const hemiSign = i % 2 === 0 ? 1 : -1;

    let x = r * Math.sin(v) * Math.cos(u) * 0.72;
    const y = r * Math.cos(v) * 0.82 + 0.05;
    const z = r * Math.sin(v) * Math.sin(u) * 1.08;

    // Separate left and right hemispheres with longitudinal fissure
    x = Math.abs(x) * hemiSign + hemiSign * 0.14;

    // Add cerebellum & brainstem at lower back
    if (i > count * 0.86) {
      const stemT = (i - count * 0.86) / (count * 0.14);
      const angle = rng() * Math.PI * 2;
      const stemR = 0.18 * (1 - stemT * 0.4);
      points[i] = {
        x: Math.cos(angle) * stemR,
        y: -0.55 - stemT * 0.48,
        z: -0.25 + Math.sin(angle) * stemR,
      };
    } else {
      points[i] = { x, y, z };
    }
  }

  return points;
}

/**
 * Generates an Apple-Silicon style IC package: central die, inner logic grid,
 * bond wires, and perimeter QFP/BGA pins ("chip").
 */
export function generateChipShape(count = PARTICLE_COUNT): Vec3[] {
  const rng = createSeededRng(4242);
  const points: Vec3[] = new Array(count);

  const dieParticles = Math.floor(count * 0.48);
  const substrateParticles = Math.floor(count * 0.24);
  const pinParticles = count - dieParticles - substrateParticles;

  // 1. Central silicon die with neural engine cores
  for (let i = 0; i < dieParticles; i++) {
    const gx = (rng() - 0.5) * 1.1;
    const gz = (rng() - 0.5) * 1.1;
    // Quantize slightly to create micro-core grid lanes
    const coreX = Math.round(gx * 8) / 8 + (rng() - 0.5) * 0.07;
    const coreZ = Math.round(gz * 8) / 8 + (rng() - 0.5) * 0.07;
    const layerY = (rng() - 0.5) * 0.09;
    points[i] = {
      x: coreX,
      y: layerY,
      z: coreZ,
    };
  }

  // 2. Outer package substrate frame
  for (let i = 0; i < substrateParticles; i++) {
    const idx = dieParticles + i;
    const side = i % 4;
    const t = (rng() - 0.5) * 1.72;
    const band = 0.62 + rng() * 0.24;
    let x = 0;
    let z = 0;
    if (side === 0) {
      x = t;
      z = band;
    } else if (side === 1) {
      x = t;
      z = -band;
    } else if (side === 2) {
      x = band;
      z = t;
    } else {
      x = -band;
      z = t;
    }
    points[idx] = {
      x,
      y: (rng() - 0.5) * 0.05,
      z,
    };
  }

  // 3. Perimeter gold contact pins + traces
  const pinsPerSide = 12;
  for (let i = 0; i < pinParticles; i++) {
    const idx = dieParticles + substrateParticles + i;
    const side = i % 4;
    const pinSlot = Math.floor(i / 4) % pinsPerSide;
    const slotCoord = ((pinSlot + 0.5) / pinsPerSide - 0.5) * 1.64;
    const reach = 0.88 + rng() * 0.34;
    const dropY = -0.04 - Math.max(0, reach - 1.02) * 0.55;

    let x = 0;
    let z = 0;
    if (side === 0) {
      x = slotCoord;
      z = reach;
    } else if (side === 1) {
      x = slotCoord;
      z = -reach;
    } else if (side === 2) {
      x = reach;
      z = slotCoord;
    } else {
      x = -reach;
      z = slotCoord;
    }
    points[idx] = { x, y: dropY, z };
  }

  return points;
}

/**
 * Generates an Edison / luminous idea bulb with glowing double-helix filament,
 * glass envelope, and threaded Edison screw base ("bulb").
 */
export function generateBulbShape(count = PARTICLE_COUNT): Vec3[] {
  const rng = createSeededRng(7777);
  const points: Vec3[] = new Array(count);

  const glassCount = Math.floor(count * 0.56);
  const filamentCount = Math.floor(count * 0.24);
  const baseCount = count - glassCount - filamentCount;

  // 1. Glass envelope (upper sphere tapering into neck)
  for (let i = 0; i < glassCount; i++) {
    const t = rng(); // 0 = top crown, 1 = lower neck
    const theta = rng() * Math.PI * 2;
    const y = 0.95 - t * 1.42; // +0.95 down to -0.47
    let radius = 0;
    if (y >= -0.05) {
      // Spherical dome
      const dy = (y - 0.22) / 0.76;
      radius = Math.sqrt(Math.max(0.02, 1 - dy * dy)) * 0.78;
    } else {
      // Tapered neck
      const neckT = (y - -0.05) / -0.42; // 0 to 1
      radius = 0.72 * (1 - neckT * 0.52);
    }

    points[i] = {
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    };
  }

  // 2. Glowing tungsten filament arch inside the bulb
  for (let i = 0; i < filamentCount; i++) {
    const idx = glassCount + i;
    const s = i / Math.max(1, filamentCount - 1); // 0 to 1
    const archAngle = (s - 0.5) * Math.PI * 0.92;
    const coilAngle = s * Math.PI * 28;
    const coilRadius = 0.045;

    const cx = Math.sin(archAngle) * 0.34;
    const cy = -0.35 + Math.cos(archAngle) * 0.68;
    const cz = Math.cos(coilAngle) * coilRadius;

    points[idx] = {
      x: cx + Math.sin(coilAngle) * coilRadius,
      y: cy,
      z: cz,
    };
  }

  // 3. Threaded Edison screw base + contact tip
  for (let i = 0; i < baseCount; i++) {
    const idx = glassCount + filamentCount + i;
    const s = i / Math.max(1, baseCount - 1);
    const y = -0.48 - s * 0.52;
    const threadRipple = 0.035 * Math.sin(s * Math.PI * 10);
    const taper = s > 0.82 ? 1 - (s - 0.82) * 3.8 : 1;
    const radius = Math.max(0.08, (0.34 + threadRipple) * taper);
    const theta = rng() * Math.PI * 2;

    points[idx] = {
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    };
  }

  return points;
}

/**
 * Generates a parametric twisted Mobius/recycling-inspired torus knot constellation ("torus").
 */
export function generateTorusShape(count = PARTICLE_COUNT): Vec3[] {
  const rng = createSeededRng(9001);
  const points: Vec3[] = new Array(count);

  const majorR = 0.78;
  const minorR = 0.31;

  for (let i = 0; i < count; i++) {
    const u = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.05;
    const v = rng() * Math.PI * 2;
    // Subtle 3-lobe torsion along the ring for visual depth
    const twist = 0.07 * Math.sin(3 * u + v * 2);
    const rTube = minorR + twist + (rng() - 0.5) * 0.04;

    const x = (majorR + rTube * Math.cos(v)) * Math.cos(u);
    const y = (majorR + rTube * Math.cos(v)) * Math.sin(u);
    const z = rTube * Math.sin(v);

    points[i] = { x, y, z };
  }

  return points;
}

export function buildCanonicalShapes(count = PARTICLE_COUNT): Record<ShapeId, Vec3[]> {
  return {
    brain: generateBrainShape(count),
    name: generateTextShape('DALA', count),
    chip: generateChipShape(count),
    bulb: generateBulbShape(count),
    torus: generateTorusShape(count),
  };
}
