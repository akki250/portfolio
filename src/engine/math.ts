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
    opacity: 0.98,
    accent: { r: 0, g: 240, b: 255 }, // Electric Cyber Cyan
    bgTint: { r: 8, g: 10, b: 24 },
  },
  {
    id: 'identity',
    label: 'Experience',
    progress: 0.25,
    shape: 'name',
    offsetX: -0.22,
    scale: 0.9,
    rotationY: -0.14,
    rotationX: 0.06,
    opacity: 1.0,
    accent: { r: 252, g: 238, b: 10 }, // High-Voltage Cyber Yellow
    bgTint: { r: 18, g: 14, b: 18 },
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
    opacity: 0.96,
    accent: { r: 255, g: 42, b: 133 }, // Neon Cyber Magenta
    bgTint: { r: 22, g: 8, b: 26 },
  },
  {
    id: 'experiments',
    label: 'Skills & Lab',
    progress: 0.75,
    shape: 'bulb',
    offsetX: -0.22,
    scale: 1.08,
    rotationY: -0.35,
    rotationX: 0.12,
    opacity: 0.97,
    accent: { r: 0, g: 255, b: 157 }, // Acid Matrix Green
    bgTint: { r: 6, g: 18, b: 24 },
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
    accent: { r: 184, g: 92, b: 255 }, // Plasma Synth Violet
    bgTint: { r: 14, g: 8, b: 28 },
  },
];

export const SCROLLS_PER_TRANSITION = 20;
export const TRANSITION_SPAN = 0.25; // 4 transitions across 5 keyframes (0, 0.25, 0.5, 0.75, 1.0)
export const STEP_PER_SCROLL = TRANSITION_SPAN / SCROLLS_PER_TRANSITION; // 0.0125 per scroll

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Converts a wheel event delta into a timeline progress step calibrated so
 * 20 standard scrolls (0.0125 each) complete 1 full section transition (0.25).
 */
export function computeWheelScrollStep(deltaY: number, deltaMode = 0): number {
  if (deltaY === 0) return 0;
  const pixelDelta = deltaMode === 1 ? deltaY * (100 / 3) : deltaY;
  const rawStep = pixelDelta / (100 / STEP_PER_SCROLL); // 100px standard wheel notch -> 0.0125
  return clamp(rawStep, -STEP_PER_SCROLL, STEP_PER_SCROLL);
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

export const GLITCH_INTERVAL_MIN_MS = 8000;
export const GLITCH_INTERVAL_MAX_MS = 12000;
export const GLITCH_DURATION_SEC = 0.38;

/**
 * Computes the next random delay in milliseconds between 8,000ms and 12,000ms (8-12 seconds)
 * for the periodic RGB-split glitch effect.
 */
export function computeNextGlitchDelayMs(randomUnit = Math.random()): number {
  const t = clamp(Number.isFinite(randomUnit) ? randomUnit : 0.5, 0, 1);
  return Math.round(lerp(GLITCH_INTERVAL_MIN_MS, GLITCH_INTERVAL_MAX_MS, t));
}

export interface RgbGlitchKeyframes {
  x: number[];
  y: number[];
  skewX: number[];
  textShadow?: string[];
  boxShadow?: string[];
  times: number[];
  duration: number;
}

/**
 * Generates deterministic Framer Motion keyframe arrays for the RGB-split chromatic
 * aberration glitch on main headings and active stage cards.
 * Guaranteed to start and finish at zero/resting offsets.
 */
export function buildRgbGlitchKeyframes(
  variant: 'heading' | 'card',
  intensity = 1
): RgbGlitchKeyframes {
  const s = clamp(intensity, 0.25, 2.5);
  const times = [0, 0.14, 0.32, 0.52, 0.72, 0.88, 1];

  if (variant === 'heading') {
    return {
      x: [0, Number((-4 * s).toFixed(2)), Number((4 * s).toFixed(2)), Number((-2.5 * s).toFixed(2)), Number((3 * s).toFixed(2)), Number((-1 * s).toFixed(2)), 0],
      y: [0, Number((1.5 * s).toFixed(2)), Number((-1.5 * s).toFixed(2)), 0, Number((1 * s).toFixed(2)), 0, 0],
      skewX: [0, Number((-3.2 * s).toFixed(2)), Number((3.2 * s).toFixed(2)), Number((-1.6 * s).toFixed(2)), Number((1.2 * s).toFixed(2)), 0, 0],
      textShadow: [
        '0px 0px 0px rgba(0, 240, 255, 0), 0px 0px 0px rgba(255, 42, 133, 0)',
        '-4px 0px 0px rgba(0, 240, 255, 0.95), 4px 0px 0px rgba(255, 42, 133, 0.95)',
        '3.5px -1px 0px rgba(0, 240, 255, 0.9), -3.5px 1px 0px rgba(168, 85, 247, 0.95)',
        '-2.5px 1px 0px rgba(255, 42, 133, 0.88), 2.5px -1px 0px rgba(0, 240, 255, 0.88)',
        '2px 0px 0px rgba(0, 240, 255, 0.75), -2px 0px 0px rgba(255, 42, 133, 0.75)',
        '-1px 0px 0px rgba(0, 240, 255, 0.4), 1px 0px 0px rgba(168, 85, 247, 0.4)',
        '0px 0px 0px rgba(0, 240, 255, 0), 0px 0px 0px rgba(255, 42, 133, 0)',
      ],
      times,
      duration: GLITCH_DURATION_SEC,
    };
  }

  const restingShadow =
    '0 20px 50px -15px rgba(4, 2, 12, 0.85), 0 0 28px -8px rgba(124, 58, 237, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)';

  return {
    x: [0, Number((-2.5 * s).toFixed(2)), Number((2.5 * s).toFixed(2)), Number((-1.5 * s).toFixed(2)), Number((1.5 * s).toFixed(2)), 0, 0],
    y: [0, Number((1 * s).toFixed(2)), Number((-1 * s).toFixed(2)), Number((0.5 * s).toFixed(2)), 0, 0, 0],
    skewX: [0, Number((-1.1 * s).toFixed(2)), Number((1.1 * s).toFixed(2)), Number((-0.5 * s).toFixed(2)), Number((0.4 * s).toFixed(2)), 0, 0],
    boxShadow: [
      restingShadow,
      '-3px 0 0 rgba(0, 240, 255, 0.88), 3px 0 0 rgba(255, 42, 133, 0.88), 0 0 32px rgba(0, 240, 255, 0.35)',
      '3px -1px 0 rgba(0, 240, 255, 0.82), -3px 1px 0 rgba(168, 85, 247, 0.9), 0 0 34px rgba(255, 42, 133, 0.35)',
      '-2px 1px 0 rgba(255, 42, 133, 0.78), 2px -1px 0 rgba(0, 240, 255, 0.78), 0 0 28px rgba(139, 92, 246, 0.3)',
      '1.5px 0 0 rgba(0, 240, 255, 0.55), -1.5px 0 0 rgba(255, 42, 133, 0.55), 0 20px 50px -15px rgba(4, 2, 12, 0.85)',
      '-0.5px 0 0 rgba(0, 240, 255, 0.25), 0.5px 0 0 rgba(168, 85, 247, 0.25), 0 20px 50px -15px rgba(4, 2, 12, 0.85)',
      restingShadow,
    ],
    times,
    duration: GLITCH_DURATION_SEC,
  };
}

