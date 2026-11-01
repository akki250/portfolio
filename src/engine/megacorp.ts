export const PARTICLE_COUNT = 1800;

export type StageShapeId = 'shard' | 'katana' | 'oni' | 'tower' | 'skull' | 'emblem';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
  isWireNode?: boolean;
}

export interface StageMetadata {
  index: number;
  id: StageShapeId;
  code: string;
  designation: string;
  jpLabel: string;
  railKatakana: string;
  nodesText: string;
  integrity: string;
  isWarning?: boolean;
  coords: string;
  accentHex: string;
  accentRgb: [number, number, number];
  secondaryRgb: [number, number, number];
  rotSpeedY: number;
  baseTiltX: number;
}

export const MEGACORP_STAGES: StageMetadata[] = [
  {
    index: 0,
    id: 'shard',
    code: 'OBJ-01 // DATA-SHARD',
    designation: 'HEXAGONAL ENGRAM SHARD',
    jpLabel: '記憶結晶 // 機密レベル-5',
    railKatakana: '壱・結晶',
    nodesText: '1,800 NODES / 540 EDGES',
    integrity: '99.7%',
    coords: '35.6895° N · 139.6917° E // BAY-07',
    accentHex: '#e8202e',
    accentRgb: [232, 32, 46],
    secondaryRgb: [233, 228, 218],
    rotSpeedY: 0.005,
    baseTiltX: 0.18,
  },
  {
    index: 1,
    id: 'katana',
    code: 'OBJ-02 // MONO-KATANA',
    designation: 'THERMAL KATANA & TSUBA RING',
    jpLabel: '高周波刀剣 // 武装部門',
    railKatakana: '弐・刀剣',
    nodesText: '1,800 NODES / 612 EDGES',
    integrity: '99.9%',
    coords: '35.6912° N · 139.7010° E // SEC-02',
    accentHex: '#ff3b47',
    accentRgb: [255, 59, 71],
    secondaryRgb: [233, 228, 218],
    rotSpeedY: 0.007,
    baseTiltX: 0.28,
  },
  {
    index: 2,
    id: 'oni',
    code: 'OBJ-03 // ONI-MEMPO',
    designation: 'TACTICAL ONI DETERRENCE VISOR',
    jpLabel: '鬼面装甲 // 鎮圧部隊',
    railKatakana: '参・鬼面',
    nodesText: '1,800 NODES / 780 EDGES',
    integrity: '94.2% [WARN]',
    isWarning: true,
    coords: '35.6762° N · 139.6503° E // TAC-09',
    accentHex: '#ffb020',
    accentRgb: [255, 176, 32],
    secondaryRgb: [232, 32, 46],
    rotSpeedY: 0.0045,
    baseTiltX: 0.08,
  },
  {
    index: 3,
    id: 'tower',
    code: 'OBJ-04 // ARCOLOGY-HQ',
    designation: 'TOKYO SECTOR-01 ARCOLOGY SPIRE',
    jpLabel: '本社尖塔 // 都市支配',
    railKatakana: '肆・尖塔',
    nodesText: '1,800 NODES / 890 EDGES',
    integrity: '99.8%',
    coords: '35.6812° N · 139.7671° E // HQ-01',
    accentHex: '#e8202e',
    accentRgb: [232, 32, 46],
    secondaryRgb: [233, 228, 218],
    rotSpeedY: 0.0038,
    baseTiltX: 0.14,
  },
  {
    index: 4,
    id: 'skull',
    code: 'OBJ-05 // NEURO-CRANIUM',
    designation: 'SOULKILLER NEURAL LATTICE',
    jpLabel: '神経頭蓋 // 意識転送',
    railKatakana: '伍・神経',
    nodesText: '1,800 NODES / 940 EDGES',
    integrity: '98.4%',
    coords: '35.6580° N · 139.7515° E // LAB-04',
    accentHex: '#e9e4da',
    accentRgb: [233, 228, 218],
    secondaryRgb: [232, 32, 46],
    rotSpeedY: 0.0052,
    baseTiltX: 0.12,
  },
  {
    index: 5,
    id: 'emblem',
    code: 'OBJ-06 // ZAIBATSU-SEAL',
    designation: 'KAGAMI-ARASAKA SOVEREIGN GLYPH',
    jpLabel: '帝国紋章 // 最高機密',
    railKatakana: '陸・紋章',
    nodesText: '1,800 NODES / 1,024 EDGES',
    integrity: '100.0%',
    coords: '35.6895° N · 139.6917° E // CORE-00',
    accentHex: '#ff3b47',
    accentRgb: [255, 59, 71],
    secondaryRgb: [255, 176, 32],
    rotSpeedY: 0.006,
    baseTiltX: 0.05,
  },
];

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function computeDelayedMorphT(localT: number, delay: number): number {
  const safeDelay = clamp(delay, 0, 0.45);
  const windowSpan = 1 - safeDelay;
  const normalized = clamp((localT - safeDelay) / windowSpan, 0, 1);
  return easeInOutCubic(normalized);
}

/**
 * Computes a short glitch burst (0..1) centered around the transition midpoint (t = 0.5).
 */
export function computeMidpointGlitch(localT: number): number {
  const dist = Math.abs(localT - 0.5);
  if (dist > 0.11) return 0;
  return Math.pow(1 - dist / 0.11, 2);
}

/**
 * Computes reversible opacity and Y translation for a chapter copy block based on smoothed scrollProgress.
 */
export function computeChapterTransform(
  scrollProgress: number,
  chapterIndex: number,
  totalChapters = 6
): { opacity: number; translateY: number; isActive: boolean } {
  const step = 1 / Math.max(1, totalChapters - 1);
  const center = chapterIndex * step;
  const delta = scrollProgress - center;
  const absDelta = Math.abs(delta);
  const hold = step * 0.28;
  const fade = step * 0.48;

  if (absDelta <= hold) {
    return { opacity: 1, translateY: 0, isActive: true };
  }
  if (absDelta >= hold + fade) {
    const dir = delta > 0 ? -1 : 1;
    return { opacity: 0.14, translateY: dir * 28, isActive: false };
  }
  const t = (absDelta - hold) / fade;
  const eased = easeInOutCubic(t);
  const dir = delta > 0 ? -1 : 1;
  return {
    opacity: Number(lerp(1, 0.14, eased).toFixed(4)),
    translateY: Number((dir * eased * 28).toFixed(2)),
    isActive: t < 0.45,
  };
}

export function buildMegacorpShapes(count: number = PARTICLE_COUNT): Record<StageShapeId, Vec3[]> {
  const shard: Vec3[] = new Array(count);
  const katana: Vec3[] = new Array(count);
  const oni: Vec3[] = new Array(count);
  const tower: Vec3[] = new Array(count);
  const skull: Vec3[] = new Array(count);
  const emblem: Vec3[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const u = i / count;
    const h1 = ((i * 1664525 + 1013904223) >>> 0) / 4294967296;
    const h2 = ((i * 22695477 + 1) >>> 0) / 4294967296;

    // 1. HEXAGONAL DATA SHARD
    {
      const side = i % 6;
      const a0 = (side * Math.PI) / 3;
      const a1 = ((side + 1) * Math.PI) / 3;
      if (u < 0.72) {
        const y = (h1 - 0.5) * 2.1;
        const taper = Math.max(0.06, 1 - Math.pow(Math.abs(y) / 1.08, 1.35));
        const edgeMix = h2;
        const r = 0.68 * taper;
        const x = lerp(Math.cos(a0), Math.cos(a1), edgeMix) * r;
        const z = lerp(Math.sin(a0), Math.sin(a1), edgeMix) * r;
        shard[i] = { x, y, z, isWireNode: i % 18 === 0 };
      } else {
        // Internal core pillar + data rings
        const ringY = ((i % 7) - 3) * 0.26;
        const theta = u * Math.PI * 24;
        const rad = i % 2 === 0 ? 0.24 : 0.82;
        shard[i] = {
          x: Math.cos(theta) * rad,
          y: ringY,
          z: Math.sin(theta) * rad,
          isWireNode: i % 16 === 0,
        };
      }
    }

    // 2. KATANA BLADE WITH TSUBA RING
    {
      if (u < 0.58) {
        // Long slightly curved monomolecular blade along diagonal/vertical
        const t = u / 0.58; // 0 (tsuba) to 1 (kissaki tip)
        const y = -0.22 + t * 1.42;
        const soriCurve = Math.pow(t, 1.8) * 0.22;
        const bladeWidth = (1 - Math.pow(t, 2.8) * 0.65) * 0.11;
        const edgePos = h1;
        const x = soriCurve + (edgePos - 0.5) * bladeWidth * 2;
        const z = (h2 - 0.5) * 0.03 * (1 - edgePos * 0.8);
        katana[i] = { x, y, z, isWireNode: i % 15 === 0 };
      } else if (u < 0.8) {
        // Circular ornate Tsuba handguard ring at y = -0.24
        const angle = ((u - 0.58) / 0.22) * Math.PI * 2 * 4;
        const rad = 0.12 + h1 * 0.34;
        katana[i] = {
          x: Math.cos(angle) * rad,
          y: -0.24 + (h2 - 0.5) * 0.035,
          z: Math.sin(angle) * rad,
          isWireNode: i % 14 === 0,
        };
      } else {
        // Wrapped Tsuka hilt below tsuba (-0.24 down to -1.15)
        const t = (u - 0.8) / 0.2;
        const y = -0.24 - t * 0.9;
        const wrapAngle = t * Math.PI * 14;
        const x = -t * 0.08 + Math.cos(wrapAngle) * 0.075;
        const z = Math.sin(wrapAngle) * 0.055;
        katana[i] = { x, y, z, isWireNode: i % 18 === 0 };
      }
    }

    // 3. ONI-STYLE FACE MASK
    {
      const sym = i % 2 === 0 ? 1 : -1;
      if (u < 0.22) {
        // Twin curved Oni horns rising from temples
        const t = u / 0.22;
        const hx = sym * (0.34 + t * 0.32 - Math.pow(t, 2) * 0.18);
        const hy = 0.42 + t * 0.78;
        const hz = 0.18 - t * 0.25 + Math.cos(t * 12) * 0.05;
        const ringA = h1 * Math.PI * 2;
        const hornR = (1 - t * 0.78) * 0.09;
        oni[i] = {
          x: hx + Math.cos(ringA) * hornR,
          y: hy,
          z: hz + Math.sin(ringA) * hornR,
          isWireNode: i % 14 === 0,
        };
      } else if (u < 0.44) {
        // Menacing angled ocular visors & brow ridge
        const t = (u - 0.22) / 0.22;
        const ex = sym * (0.16 + t * 0.36);
        const ey = 0.18 + (t - 0.3) * 0.16 + (h1 - 0.5) * 0.06;
        const ez = 0.48 - t * 0.14;
        oni[i] = { x: ex, y: ey, z: ez, isWireNode: i % 12 === 0 };
      } else if (u < 0.74) {
        // Cheek armor plates & nasal bridge
        const y = -0.55 + h1 * 0.95;
        const widthAtY = 0.66 - Math.abs(y - 0.05) * 0.35;
        const angle = (h2 - 0.5) * Math.PI * 0.88;
        const x = Math.sin(angle) * widthAtY;
        const z = Math.cos(angle) * 0.52;
        oni[i] = { x, y, z, isWireNode: i % 16 === 0 };
      } else {
        // Lower fanged jaw guard & tusk fangs
        const t = (u - 0.74) / 0.26;
        const isTusk = t > 0.65;
        if (isTusk) {
          const ft = (t - 0.65) / 0.35;
          oni[i] = {
            x: sym * (0.28 + ft * 0.06),
            y: -0.42 + ft * 0.28,
            z: 0.48 + ft * 0.12,
            isWireNode: true,
          };
        } else {
          const jx = (h1 - 0.5) * 0.78;
          const jy = -0.35 - h2 * 0.42 + Math.abs(jx) * 0.22;
          const jz = 0.46 - Math.abs(jx) * 0.35;
          oni[i] = { x: jx, y: jy, z: jz, isWireNode: i % 15 === 0 };
        }
      }
    }

    // 4. CORPORATE TOWER / ARCOLOGY SPIRE
    {
      if (u < 0.78) {
        // Brutalist stepped megacorp monolith with recessed vertical fins
        const y = -1.08 + (u / 0.78) * 1.88; // -1.08 to +0.80
        const tier = y < -0.3 ? 1.0 : y < 0.25 ? 0.74 : 0.48;
        const w = 0.46 * tier;
        const d = 0.34 * tier;
        const face = i % 4;
        const pos = (h1 - 0.5) * 2;
        let x = 0;
        let z = 0;
        if (face === 0) {
          x = pos * w;
          z = d;
        } else if (face === 1) {
          x = pos * w;
          z = -d;
        } else if (face === 2) {
          x = w;
          z = pos * d;
        } else {
          x = -w;
          z = pos * d;
        }
        tower[i] = { x, y, z, isWireNode: i % 15 === 0 };
      } else {
        // Dual high-altitude antenna needles & landing pad halo
        const t = (u - 0.78) / 0.22;
        if (t < 0.65) {
          const nt = t / 0.65;
          const side = i % 2 === 0 ? -0.11 : 0.11;
          tower[i] = {
            x: side * (1 - nt * 0.4),
            y: 0.8 + nt * 0.48,
            z: (h2 - 0.5) * 0.03,
            isWireNode: i % 10 === 0,
          };
        } else {
          const a = h1 * Math.PI * 2;
          tower[i] = {
            x: Math.cos(a) * 0.72,
            y: -1.08,
            z: Math.sin(a) * 0.72,
            isWireNode: i % 12 === 0,
          };
        }
      }
    }

    // 5. NEURAL SKULL WITH NODE NETWORK
    {
      if (u < 0.52) {
        // Cranial dome sphere
        const phi = Math.acos(1 - 2 * ((u / 0.52) * 0.78));
        const theta = i * 2.3999632;
        const r = 0.62;
        const x = Math.sin(phi) * Math.cos(theta) * r * 0.88;
        const y = 0.22 + Math.cos(phi) * r * 0.92;
        const z = Math.sin(phi) * Math.sin(theta) * r * 0.96;
        skull[i] = { x, y, z, isWireNode: i % 14 === 0 };
      } else if (u < 0.74) {
        // Orbital eye rings & nasal aperture
        const sym = i % 2 === 0 ? 1 : -1;
        const a = h1 * Math.PI * 2;
        const isNose = i % 7 === 0;
        if (isNose) {
          skull[i] = {
            x: (h1 - 0.5) * 0.14,
            y: -0.08 + (h2 - 0.5) * 0.16,
            z: 0.56,
            isWireNode: true,
          };
        } else {
          const er = 0.14 + h2 * 0.03;
          skull[i] = {
            x: sym * 0.23 + Math.cos(a) * er,
            y: 0.1 + Math.sin(a) * er * 0.85,
            z: 0.52,
            isWireNode: i % 10 === 0,
          };
        }
      } else if (u < 0.88) {
        // Mandible & teeth grid
        const jx = (h1 - 0.5) * 0.58;
        const jy = -0.24 - h2 * 0.36;
        const jz = 0.48 - Math.abs(jx) * 0.42;
        skull[i] = { x: jx, y: jy, z: jz, isWireNode: i % 12 === 0 };
      } else {
        // Radiating neural network nodes & cervical spine
        const t = (u - 0.88) / 0.12;
        const angle = i * 1.15;
        const dist = 0.75 + t * 0.42;
        skull[i] = {
          x: Math.cos(angle) * dist,
          y: -0.75 + t * 1.55,
          z: Math.sin(angle) * dist * 0.65,
          isWireNode: true,
        };
      }
    }

    // 6. CORPORATE EMBLEM AS A 3D EXTRUDED GLYPH (3-Pronged Imperial Monolith + Ring)
    {
      const zExtrude = (h2 - 0.5) * 0.24;
      if (u < 0.32) {
        // Outer octagonal containment ring
        const a = (u / 0.32) * Math.PI * 2;
        const r = 0.92 + (i % 2 === 0 ? 0.04 : -0.04);
        emblem[i] = {
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          z: zExtrude * 0.6,
          isWireNode: i % 12 === 0,
        };
      } else if (u < 0.56) {
        // Central vertical sovereign spear / diamond spine
        const t = (u - 0.32) / 0.24;
        const y = -0.78 + t * 1.58;
        const w = (1 - Math.abs(t - 0.55) * 1.5) * 0.14;
        emblem[i] = {
          x: (h1 - 0.5) * Math.max(0.04, w) * 2,
          y,
          z: zExtrude,
          isWireNode: i % 10 === 0,
        };
      } else {
        // Twin symmetrical angled cyber-wings / chevrons (Arasaka/Kagami triad motif)
        const sym = i % 2 === 0 ? 1 : -1;
        const t = (u - 0.56) / 0.44;
        const wingTier = i % 3;
        const baseY = wingTier === 0 ? 0.18 : wingTier === 1 ? -0.14 : -0.44;
        const span = 0.18 + t * 0.56;
        const x = sym * span;
        const y = baseY + span * 0.48 - (wingTier === 2 ? 0.08 : 0);
        emblem[i] = {
          x,
          y,
          z: zExtrude,
          isWireNode: i % 11 === 0,
        };
      }
    }
  }

  return { shard, katana, oni, tower, skull, emblem };
}
