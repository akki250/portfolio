export const PARTICLE_COUNT = 2200;

export type ShapeId = 'brain' | 'name' | 'chip' | 'bulb' | 'torus';

export const SHAPE_ORDER: ShapeId[] = ['brain', 'name', 'chip', 'bulb', 'torus'];

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface TimelineKeyframe {
  id: string;
  label: string;
  progress: number;
  shape: ShapeId;
  offsetX: number; // Normalized viewport width offset (-0.35 to 0.35)
  scale: number;
  rotationY: number;
  rotationX: number;
  opacity: number;
  accent: RGB;
  bgTint: RGB;
}

export const TIMELINE_KEYFRAMES: TimelineKeyframe[] = [
  {
    id: 'overview',
    label: 'Overview',
    progress: 0.0,
    shape: 'brain',
    offsetX: 0.22,
    scale: 1.05,
    rotationY: 0.25,
    rotationX: 0.15,
    opacity: 0.96,
    accent: { r: 56, g: 189, b: 248 }, // Sky cyan
    bgTint: { r: 7, g: 12, b: 24 },
  },
  {
    id: 'identity',
    label: 'Identity',
    progress: 0.25,
    shape: 'name',
    offsetX: -0.22,
    scale: 0.9,
    rotationY: -0.14,
    rotationX: 0.06,
    opacity: 1.0,
    accent: { r: 167, g: 139, b: 250 }, // Soft violet
    bgTint: { r: 14, g: 10, b: 26 },
  },
  {
    id: 'projects',
    label: 'Projects',
    progress: 0.5,
    shape: 'chip',
    offsetX: 0.24,
    scale: 1.0,
    rotationY: 0.42,
    rotationX: 0.28,
    opacity: 0.92,
    accent: { r: 52, g: 211, b: 153 }, // Emerald
    bgTint: { r: 6, g: 18, b: 16 },
  },
  {
    id: 'experiments',
    label: 'Lab',
    progress: 0.75,
    shape: 'bulb',
    offsetX: -0.22,
    scale: 1.08,
    rotationY: -0.35,
    rotationX: 0.12,
    opacity: 0.95,
    accent: { r: 251, g: 191, b: 36 }, // Warm amber
    bgTint: { r: 22, g: 15, b: 7 },
  },
  {
    id: 'horizon',
    label: 'Contact',
    progress: 1.0,
    shape: 'torus',
    offsetX: 0.18,
    scale: 1.15,
    rotationY: 0.65,
    rotationX: 0.35,
    opacity: 0.98,
    accent: { r: 244, g: 63, b: 94 }, // Cinnabar rose
    bgTint: { r: 22, g: 8, b: 14 },
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

export function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

export interface InterpolatedTimelineState {
  shapeA: ShapeId;
  shapeB: ShapeId;
  localProgress: number; // Raw 0..1 between keyframe A and B
  easedProgress: number; // Ease-in-out 0..1 between keyframe A and B
  offsetX: number;
  scale: number;
  rotationY: number;
  rotationX: number;
  opacity: number;
  accent: RGB;
  bgTint: RGB;
  activeKeyframeIndex: number;
}

export function interpolateKeyframes(
  scrollProgress: number,
  keyframes: TimelineKeyframe[] = TIMELINE_KEYFRAMES
): InterpolatedTimelineState {
  const p = clamp(scrollProgress, 0, 1);

  let idxA = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (p >= keyframes[i].progress && p <= keyframes[i + 1].progress) {
      idxA = i;
      break;
    }
  }
  const idxB = Math.min(idxA + 1, keyframes.length - 1);
  const kfA = keyframes[idxA];
  const kfB = keyframes[idxB];

  const span = Math.max(0.0001, kfB.progress - kfA.progress);
  const localProgress = clamp((p - kfA.progress) / span, 0, 1);
  const eased = easeInOutCubic(localProgress);

  // Determine closest keyframe for active nav indicator
  let activeKeyframeIndex = 0;
  let minDistance = Infinity;
  for (let i = 0; i < keyframes.length; i++) {
    const dist = Math.abs(p - keyframes[i].progress);
    if (dist < minDistance) {
      minDistance = dist;
      activeKeyframeIndex = i;
    }
  }

  return {
    shapeA: kfA.shape,
    shapeB: kfB.shape,
    localProgress,
    easedProgress: eased,
    offsetX: lerp(kfA.offsetX, kfB.offsetX, eased),
    scale: lerp(kfA.scale, kfB.scale, eased),
    rotationY: lerp(kfA.rotationY, kfB.rotationY, eased),
    rotationX: lerp(kfA.rotationX, kfB.rotationX, eased),
    opacity: lerp(kfA.opacity, kfB.opacity, eased),
    accent: lerpRGB(kfA.accent, kfB.accent, eased),
    bgTint: lerpRGB(kfA.bgTint, kfB.bgTint, eased),
    activeKeyframeIndex,
  };
}

/**
 * Computes per-particle staggered morph progress so the transition ripples
 * organically through the constellation instead of moving as a rigid block.
 * @param localProgress 0..1 progress between keyframe A and keyframe B
 * @param particleDelay 0..0.45 random delay assigned to each particle
 */
export function computeParticleMorphT(localProgress: number, particleDelay: number): number {
  const p = clamp(localProgress, 0, 1);
  const d = clamp(particleDelay, 0, 0.48);
  const activeSpan = 1 - d;
  const normalized = clamp((p - d) / activeSpan, 0, 1);
  return easeInOutCubic(normalized);
}

export interface ScrubTextTransform {
  opacity: number;
  translateY: number; // px
  scale: number;
  pointerEvents: 'auto' | 'none';
}

/**
 * Pure scroll-scrubbed text transform.
 * Fades & slides up as it enters, holds while its shape is centered,
 * then fades and drifts upward as the next section arrives.
 * Completely deterministic and reversible when scrolling backwards.
 */
export function computeScrubTextTransform(
  scrollProgress: number,
  centerProgress: number,
  holdRadius = 0.055,
  fadeRadius = 0.14
): ScrubTextTransform {
  const delta = scrollProgress - centerProgress;
  const absDelta = Math.abs(delta);

  if (absDelta <= holdRadius) {
    // Inside hold plateau: subtle drift proportional to delta
    const rawDrift = (delta / Math.max(0.001, holdRadius)) * -8;
    const drift = Object.is(rawDrift, -0) ? 0 : rawDrift;
    return {
      opacity: 1,
      translateY: drift,
      scale: 1,
      pointerEvents: 'auto',
    };
  }

  if (absDelta >= holdRadius + fadeRadius) {
    return {
      opacity: 0,
      translateY: delta < 0 ? 54 : -54,
      scale: 0.96,
      pointerEvents: 'none',
    };
  }

  const fadeT = (absDelta - holdRadius) / fadeRadius; // 0 (edge of hold) -> 1 (fully out)
  const easedOut = easeInOutCubic(1 - fadeT);
  const direction = delta < 0 ? 1 : -1; // Entering from below (+Y) -> Exiting above (-Y)
  const translateY = direction * lerp(8, 54, fadeT);

  return {
    opacity: Number(easedOut.toFixed(4)),
    translateY: Number(translateY.toFixed(2)),
    scale: Number(lerp(0.96, 1, easedOut).toFixed(4)),
    pointerEvents: easedOut > 0.35 ? 'auto' : 'none',
  };
}

export interface CursorForceInput {
  px: number;
  py: number;
  cursorX: number;
  cursorY: number;
  radius: number;
  mode: 'repel' | 'swirl';
  isHolding: boolean;
}

export function computeCursorForce(input: CursorForceInput): { fx: number; fy: number } {
  const dx = input.px - input.cursorX;
  const dy = input.py - input.cursorY;
  const distSq = dx * dx + dy * dy;
  const r = input.radius;

  if (distSq >= r * r || distSq < 0.0001) {
    return { fx: 0, fy: 0 };
  }

  const dist = Math.sqrt(distSq);
  const falloff = Math.pow(1 - dist / r, 2);
  const nx = dx / dist;
  const ny = dy / dist;

  if (input.isHolding) {
    // Hold click attracts particles into a tight orbital cluster
    const pullStrength = -2.4 * falloff;
    const swirlStrength = 0.85 * falloff;
    return {
      fx: nx * pullStrength - ny * swirlStrength,
      fy: ny * pullStrength + nx * swirlStrength,
    };
  }

  if (input.mode === 'swirl') {
    const tangentStrength = 1.95 * falloff;
    const slightRepel = 0.45 * falloff;
    return {
      fx: -ny * tangentStrength + nx * slightRepel,
      fy: nx * tangentStrength + ny * slightRepel,
    };
  }

  // Default repel mode
  const repelStrength = 2.25 * falloff;
  return {
    fx: nx * repelStrength,
    fy: ny * repelStrength,
  };
}
