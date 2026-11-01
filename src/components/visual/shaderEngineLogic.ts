/**
 * Pure, framework-agnostic logic for the Shader.se-inspired site-wide shader engine.
 * Handles preset metadata, route/stage mapping, color palette interpolation,
 * pointer velocity damping, and click ripple propagation math.
 */

export type ShaderModeId =
  | 'fluid'
  | 'aurora'
  | 'metaball'
  | 'particles'
  | 'energy-wave'
  | 'liquid-glass';

export const SHADER_MODES: ShaderModeId[] = [
  'fluid',
  'aurora',
  'metaball',
  'particles',
  'energy-wave',
  'liquid-glass',
];

export const SHADER_MODE_INDEX: Record<ShaderModeId, number> = {
  fluid: 0,
  aurora: 1,
  metaball: 2,
  particles: 3,
  'energy-wave': 4,
  'liquid-glass': 5,
};

export interface RGBVec3 {
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
}

export interface ShaderPresetConfig {
  id: ShaderModeId;
  name: string;
  subtitle: string;
  routeHint: string;
  primary: RGBVec3; // Normalized 0..1
  secondary: RGBVec3;
  accent: RGBVec3;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  intensity: number;
  blendPartner: ShaderModeId;
  blendAmount: number;
}

export const SHADER_PRESETS: Record<ShaderModeId, ShaderPresetConfig> = {
  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    subtitle: 'Volumetric Ultraviolet & Cyan Curtains + Fluid Distortion',
    routeHint: 'Home · Overview',
    primary: { r: 0.486, g: 0.227, b: 0.929 }, // Electric Violet #7c3aed
    secondary: { r: 0.310, g: 0.275, b: 0.898 }, // Deep Indigo #4f46e5
    accent: { r: 0.0, g: 0.941, b: 1.0 }, // Electric Cyan #00f0ff
    primaryHex: '#7c3aed',
    secondaryHex: '#4f46e5',
    accentHex: '#00f0ff',
    intensity: 1.05,
    blendPartner: 'fluid',
    blendAmount: 0.34,
  },
  metaball: {
    id: 'metaball',
    name: 'Organic Metaballs',
    subtitle: 'Smooth-Min Merging Bio-Forms & Liquid Glass Contours',
    routeHint: 'About · Experience',
    primary: { r: 0.659, g: 0.333, b: 0.969 }, // Ultraviolet #a855f7
    secondary: { r: 0.388, g: 0.400, b: 0.945 }, // Indigo #6366f1
    accent: { r: 0.133, g: 0.827, b: 0.933 }, // Luminous Cyan #22d3ee
    primaryHex: '#a855f7',
    secondaryHex: '#6366f1',
    accentHex: '#22d3ee',
    intensity: 1.0,
    blendPartner: 'liquid-glass',
    blendAmount: 0.28,
  },
  particles: {
    id: 'particles',
    name: 'Nebula Particle Field',
    subtitle: 'Multi-Depth GPU Starfield + Harmonic Energy Waves',
    routeHint: 'Services · Projects',
    primary: { r: 0.310, g: 0.275, b: 0.898 }, // Indigo #4f46e5
    secondary: { r: 0.545, g: 0.361, b: 0.965 }, // Violet #8b5cf6
    accent: { r: 0.0, g: 0.941, b: 1.0 }, // Electric Cyan #00f0ff
    primaryHex: '#4f46e5',
    secondaryHex: '#8b5cf6',
    accentHex: '#00f0ff',
    intensity: 1.12,
    blendPartner: 'energy-wave',
    blendAmount: 0.32,
  },
  'energy-wave': {
    id: 'energy-wave',
    name: 'Harmonic Energy Waves',
    subtitle: 'Interactive Circular Interference & Ripple Propagation',
    routeHint: 'Skills · Physics Lab',
    primary: { r: 0.545, g: 0.361, b: 0.965 }, // Electric Violet #8b5cf6
    secondary: { r: 0.024, g: 0.714, b: 0.831 }, // Deep Cyan #06b6d4
    accent: { r: 0.753, g: 0.518, b: 0.988 }, // Bright Ultraviolet #c084fc
    primaryHex: '#8b5cf6',
    secondaryHex: '#06b6d4',
    accentHex: '#c084fc',
    intensity: 1.15,
    blendPartner: 'fluid',
    blendAmount: 0.3,
  },
  'liquid-glass': {
    id: 'liquid-glass',
    name: 'Iridescent Liquid Glass',
    subtitle: 'Chromatic Refraction, Fresnel Specular & Thin-Film Sheen',
    routeHint: 'Contact · Access',
    primary: { r: 0.388, g: 0.400, b: 0.945 }, // Indigo #6366f1
    secondary: { r: 0.659, g: 0.333, b: 0.969 }, // Ultraviolet #a855f7
    accent: { r: 0.0, g: 0.941, b: 1.0 }, // Cyan #00f0ff
    primaryHex: '#6366f1',
    secondaryHex: '#a855f7',
    accentHex: '#00f0ff',
    intensity: 0.92,
    blendPartner: 'aurora',
    blendAmount: 0.25,
  },
  fluid: {
    id: 'fluid',
    name: 'Domain-Warped Fluid',
    subtitle: 'Multi-Octave FBM Liquid Currents & Pointer Vortex',
    routeHint: 'Global Fluid Sim',
    primary: { r: 0.486, g: 0.227, b: 0.929 }, // Electric Violet #7c3aed
    secondary: { r: 0.024, g: 0.714, b: 0.831 }, // Cyan #06b6d4
    accent: { r: 0.659, g: 0.333, b: 0.969 }, // Ultraviolet #a855f7
    primaryHex: '#7c3aed',
    secondaryHex: '#06b6d4',
    accentHex: '#a855f7',
    intensity: 1.08,
    blendPartner: 'aurora',
    blendAmount: 0.3,
  },
};

/**
 * Maps timeline keyframe index (0..4) or route name to its primary ShaderModeId
 * per section 5 of the specification:
 * - 0 (Home / Overview): Aurora + Fluid distortion ('aurora')
 * - 1 (About / Experience): Organic Metaballs ('metaball')
 * - 2 (Projects / Services): Abstract Particle Field & Energy Waves ('particles')
 * - 3 (Skills & Lab): Interactive Energy Wave & Fluid ('energy-wave')
 * - 4 (Contact): Calm Ambient Liquid-Glass ('liquid-glass')
 */
export function resolveShaderForKeyframe(keyframeIndex: number): ShaderModeId {
  switch (keyframeIndex) {
    case 0:
      return 'aurora';
    case 1:
      return 'metaball';
    case 2:
      return 'particles';
    case 3:
      return 'energy-wave';
    case 4:
      return 'liquid-glass';
    default:
      return 'aurora';
  }
}

export function resolveShaderForRoute(routeOrStageId: string): ShaderModeId {
  const clean = routeOrStageId.toLowerCase().replace(/^[/#]+/, '');
  if (clean === '' || clean === 'home' || clean === 'overview') return 'aurora';
  if (clean === 'about' || clean === 'identity' || clean === 'experience') return 'metaball';
  if (clean === 'services' || clean === 'projects') return 'particles';
  if (clean === 'lab' || clean === 'experiments' || clean === 'skills') return 'energy-wave';
  if (clean === 'contact' || clean === 'horizon') return 'liquid-glass';
  if ((SHADER_MODES as string[]).includes(clean)) return clean as ShaderModeId;
  return 'aurora';
}

export function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

export function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function lerpVec3(a: RGBVec3, b: RGBVec3, t: number): RGBVec3 {
  const c = clamp01(t);
  return {
    r: Number(lerpScalar(a.r, b.r, c).toFixed(4)),
    g: Number(lerpScalar(a.g, b.g, c).toFixed(4)),
    b: Number(lerpScalar(a.b, b.b, c).toFixed(4)),
  };
}

export interface PointerDampingState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
}

/**
 * Exponential pointer damping step so shader coordinates and fluid velocity
 * respond smoothly at any frame rate without jitter.
 */
export function stepPointerDamping(
  state: PointerDampingState,
  dtSeconds: number,
  smoothingFactor = 10.0
): PointerDampingState {
  const dt = Math.max(0.001, Math.min(0.1, dtSeconds));
  const alpha = 1 - Math.exp(-smoothingFactor * dt);
  const nextX = state.x + (state.targetX - state.x) * alpha;
  const nextY = state.y + (state.targetY - state.y) * alpha;
  const vx = (nextX - state.x) / dt;
  const vy = (nextY - state.y) / dt;

  return {
    x: nextX,
    y: nextY,
    targetX: state.targetX,
    targetY: state.targetY,
    vx: Math.max(-5, Math.min(5, vx)),
    vy: Math.max(-5, Math.min(5, vy)),
  };
}

export interface RippleState {
  centerX: number;
  centerY: number;
  elapsed: number;
  intensity: number;
  active: boolean;
}

export function triggerRipple(xNorm: number, yNorm: number, strength = 1.0): RippleState {
  return {
    centerX: clamp01(xNorm),
    centerY: clamp01(yNorm),
    elapsed: 0,
    intensity: Math.max(0.1, Math.min(2.0, strength)),
    active: true,
  };
}

export function stepRippleState(ripple: RippleState, dtSeconds: number): RippleState {
  if (!ripple.active) return ripple;
  const nextElapsed = ripple.elapsed + Math.max(0, dtSeconds);
  const decay = Math.exp(-nextElapsed * 1.15);
  if (nextElapsed > 3.2 || decay < 0.02) {
    return {
      ...ripple,
      elapsed: nextElapsed,
      intensity: 0,
      active: false,
    };
  }
  return {
    ...ripple,
    elapsed: nextElapsed,
  };
}

/**
 * Computes optimal devicePixelRatio capped at 1.5 on hardware GPU and 1.0 on software GL.
 */
export function computeOptimalPixelRatio(
  rawDevicePixelRatio: number,
  isSoftwareGl: boolean
): number {
  if (isSoftwareGl) return 1.0;
  const safeDpr = Number.isFinite(rawDevicePixelRatio) && rawDevicePixelRatio > 0 ? rawDevicePixelRatio : 1.0;
  return Math.min(safeDpr, 1.5);
}
