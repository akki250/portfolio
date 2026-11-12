export interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  seed: number;
  active: boolean;
}

export interface ParticlePool {
  capacity: number;
  cursor: number;
  totalEmitted: number;
  particles: TrailParticle[];
  /** Interleaved float32 data: [x, y, vx, vy, age, life, size, seed] per particle (8 floats) */
  bufferData: Float32Array;
}

export const FLOATS_PER_PARTICLE = 8;

export const CURSOR_TRAIL_VERTEX_SHADER = `
precision highp float;

attribute vec2 aPosition;
attribute vec2 aVelocity;
attribute float aAge;
attribute float aLife;
attribute float aSize;
attribute float aSeed;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;

varying float vProgress;
varying float vSeed;
varying float vSpeed;

void main() {
  if (aLife <= 0.0 || aAge >= aLife) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vProgress = 1.0;
    vSeed = aSeed;
    vSpeed = 0.0;
    return;
  }

  float progress = clamp(aAge / max(aLife, 0.0001), 0.0, 1.0);
  vProgress = progress;
  vSeed = aSeed;
  vSpeed = length(aVelocity);

  // Subtle organic wave drift perpendicular to particle motion
  float waveAngle = uTime * 3.8 + aSeed * 6.2831853;
  vec2 drift = vec2(cos(waveAngle), sin(waveAngle * 1.3)) * (progress * 6.5);
  vec2 screenPos = aPosition + drift;

  vec2 clipSpace = ((screenPos / max(uResolution, vec2(1.0))) * 2.0 - 1.0) * vec2(1.0, -1.0);
  gl_Position = vec4(clipSpace, 0.0, 1.0);

  // Swell rapidly at birth and taper smoothly along the tail
  float birthEnvelope = smoothstep(0.0, 0.14, progress);
  float decayEnvelope = pow(1.0 - progress, 0.72);
  float pulse = 0.88 + 0.24 * sin(uTime * 10.0 + aSeed * 25.1327);

  gl_PointSize = max(1.0, aSize * birthEnvelope * decayEnvelope * pulse * uPixelRatio);
}
`;

export const CURSOR_TRAIL_FRAGMENT_SHADER = `
precision highp float;

uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uCoreColor;
uniform float uTime;

varying float vProgress;
varying float vSeed;
varying float vSpeed;

void main() {
  if (vProgress >= 1.0) {
    discard;
  }

  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);
  if (r > 1.0) {
    discard;
  }

  // Rotate coordinates per particle for subtle 4-point star ember glint
  float angle = vSeed * 6.2831853 + uTime * (1.4 + vSeed * 1.6);
  float c = cos(angle);
  float s = sin(angle);
  vec2 rotUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

  // Soft Gaussian ember halo + hot core + crystalline star flare
  float halo = exp(-r * r * 3.6);
  float core = smoothstep(0.46, 0.0, r);
  float star = max(0.0, 1.0 - abs(rotUv.x * rotUv.y) * 15.0) * exp(-r * 2.1);

  // Color evolution from hot bone-white core -> warm lantern gold -> vermilion ember
  vec3 birthColor = mix(uCoreColor, uSecondaryColor, smoothstep(0.0, 0.28, vProgress));
  vec3 emberColor = mix(birthColor, uPrimaryColor, smoothstep(0.18, 0.68, vProgress));
  vec3 finalColor = mix(emberColor, uCoreColor, core * (1.0 - vProgress * 0.55) + star * 0.35);

  float twinkle = 0.84 + 0.16 * sin(uTime * 15.0 + vSeed * 37.699);
  float lifeAlpha = smoothstep(0.0, 0.08, vProgress) * pow(1.0 - vProgress, 1.15);
  float alpha = clamp((halo * 0.78 + core * 0.65 + star * 0.42) * lifeAlpha * twinkle, 0.0, 1.0);

  gl_FragColor = vec4(finalColor * alpha, alpha);
}
`;

export function hexToRgbNormalized(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(clean)) {
    return [0.878, 0.137, 0.11]; // Fallback #e0231c
  }
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

export function createParticlePool(capacity = 420): ParticlePool {
  const safeCap = Math.max(8, Math.floor(capacity));
  const particles: TrailParticle[] = Array.from({ length: safeCap }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 1,
    life: 0,
    size: 0,
    seed: 0,
    active: false,
  }));
  return {
    capacity: safeCap,
    cursor: 0,
    totalEmitted: 0,
    particles,
    bufferData: new Float32Array(safeCap * FLOATS_PER_PARTICLE),
  };
}

export interface EmitOptions {
  count?: number;
  spread?: number;
  baseSize?: number;
  minLife?: number;
  maxLife?: number;
  randomFn?: () => number;
}

export function spawnSingleParticle(
  pool: ParticlePool,
  x: number,
  y: number,
  vx: number,
  vy: number,
  options: EmitOptions = {}
): void {
  const rand = options.randomFn ?? Math.random;
  const spread = options.spread ?? 42;
  const baseSize = options.baseSize ?? 22;
  const minLife = options.minLife ?? 0.55;
  const maxLife = options.maxLife ?? 1.15;

  const angle = rand() * Math.PI * 2;
  const speedJitter = (0.25 + rand() * 0.75) * spread;
  const p = pool.particles[pool.cursor];

  p.x = x + (rand() - 0.5) * 6;
  p.y = y + (rand() - 0.5) * 6;
  p.vx = vx * 0.22 + Math.cos(angle) * speedJitter;
  p.vy = vy * 0.22 + Math.sin(angle) * speedJitter - (12 + rand() * 24);
  p.age = 0;
  p.life = minLife + rand() * Math.max(0.05, maxLife - minLife);
  p.size = baseSize * (0.65 + rand() * 0.85);
  p.seed = rand();
  p.active = true;

  pool.cursor = (pool.cursor + 1) % pool.capacity;
  pool.totalEmitted += 1;
}

/**
 * Emits particles smoothly interpolated along the pointer segment from (x0, y0) to (x1, y1).
 */
export function emitParticlesAlongSegment(
  pool: ParticlePool,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  dtSeconds = 0.016,
  options: EmitOptions = {}
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const safeDt = Math.max(0.004, dtSeconds);
  const vx = dx / safeDt;
  const vy = dy / safeDt;

  // Interpolate 1 particle every ~4.5px of movement, plus minimum count if requested
  const steps = Math.max(options.count ?? 2, Math.min(36, Math.ceil(dist / 4.5)));
  for (let i = 0; i < steps; i++) {
    const t = steps <= 1 ? 1 : (i + 1) / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    spawnSingleParticle(pool, px, py, vx, vy, options);
  }
  return steps;
}

/**
 * Advances active particles by dtSeconds and packs attributes into pool.bufferData.
 * Returns the number of currently active particles.
 */
export function stepParticlePool(pool: ParticlePool, dtSeconds: number, timeSeconds = 0): number {
  const dt = Math.min(0.1, Math.max(0.0005, dtSeconds));
  const drag = Math.pow(0.92, dt * 60);
  const data = pool.bufferData;
  let activeCount = 0;

  for (let i = 0; i < pool.capacity; i++) {
    const p = pool.particles[i];
    const offset = i * FLOATS_PER_PARTICLE;

    if (!p.active) {
      data[offset + 4] = 1;
      data[offset + 5] = 0;
      continue;
    }

    p.age += dt;
    if (p.age >= p.life) {
      p.active = false;
      data[offset + 4] = 1;
      data[offset + 5] = 0;
      continue;
    }

    // Curl-like turbulence + gentle upward ember buoyancy
    const swirlAngle = timeSeconds * 2.4 + p.seed * Math.PI * 2 + (p.x + p.y) * 0.008;
    p.vx = (p.vx + Math.cos(swirlAngle) * 28 * dt) * drag;
    p.vy = (p.vy + (Math.sin(swirlAngle) * 24 - 18) * dt) * drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    data[offset + 0] = p.x;
    data[offset + 1] = p.y;
    data[offset + 2] = p.vx;
    data[offset + 3] = p.vy;
    data[offset + 4] = p.age;
    data[offset + 5] = p.life;
    data[offset + 6] = p.size;
    data[offset + 7] = p.seed;
    activeCount += 1;
  }

  return activeCount;
}
