// ============================================================================
// SHADER A: Fluid Distortion Shader (fluid.frag)
// Organic flowing liquid surfaces, multi-layered procedural FBM domain warping,
// smooth UV distortion, interactive pointer wake & click ripple refraction.
// ============================================================================
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec2 uMouseVelocity;
uniform float uScroll;
uniform float uScrollVelocity;
uniform float uTransition;
uniform float uIntensity;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform vec3 uColorAccent;
uniform vec2 uRippleCenter;
uniform float uRippleTime;
uniform float uRippleIntensity;

float hash21_fluid(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise_fluid(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21_fluid(i);
  float b = hash21_fluid(i + vec2(1.0, 0.0));
  float c = hash21_fluid(i + vec2(0.0, 1.0));
  float d = hash21_fluid(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm_fluid(vec2 p) {
  float val = 0.0;
  float amp = 0.52;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    val += amp * noise_fluid(p);
    p = rot * p * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return val;
}

vec3 evaluateFluidShader(vec2 uv, vec2 aspectUv, vec2 mouseAspect) {
  float t = uTime * (0.22 + uIntensity * 0.12) + uScroll * 1.4;

  // Pointer fluid displacement
  vec2 toMouse = aspectUv - mouseAspect;
  float mouseDist = length(toMouse);
  float mouseWake = exp(-mouseDist * 4.2) * (0.18 + length(uMouseVelocity) * 1.8);
  vec2 warpedUv = aspectUv - normalize(toMouse + 0.0001) * mouseWake * 0.22;

  // Click ripple displacement
  vec2 rippleAspect = vec2((uRippleCenter.x - 0.5) * (uResolution.x / max(uResolution.y, 1.0)), uRippleCenter.y - 0.5);
  float rDist = length(aspectUv - rippleAspect);
  float waveRing = sin(rDist * 28.0 - uRippleTime * 11.0) * exp(-rDist * 4.5) * exp(-uRippleTime * 1.6);
  warpedUv += normalize(aspectUv - rippleAspect + 0.0001) * waveRing * 0.045 * uRippleIntensity;

  // Multi-layered domain warping (Inigo Quilez style organic liquid simulation)
  vec2 q = vec2(
    fbm_fluid(warpedUv * 2.1 + vec2(0.0, t * 0.45)),
    fbm_fluid(warpedUv * 2.1 + vec2(5.2, 1.3 - t * 0.38))
  );

  vec2 r = vec2(
    fbm_fluid(warpedUv * 2.4 + 3.2 * q + vec2(1.7, 9.2) + 0.28 * t),
    fbm_fluid(warpedUv * 2.4 + 3.2 * q + vec2(8.3, 2.8) - 0.24 * t)
  );

  float f = fbm_fluid(warpedUv * 2.2 + 2.8 * r);

  // Deep midnight base
  vec3 deepBg = vec3(0.012, 0.014, 0.038);
  vec3 col = mix(deepBg, uColorPrimary * 0.55, clamp(f * f * 2.4, 0.0, 1.0));
  col = mix(col, uColorSecondary * 0.85, clamp(length(q) * 0.85, 0.0, 1.0));
  col = mix(col, uColorAccent, clamp(pow(abs(r.x), 2.2) * 0.9, 0.0, 1.0));

  // Specular liquid ridges
  float ridge = smoothstep(0.48, 0.88, f) * smoothstep(0.95, 0.52, f);
  col += uColorAccent * ridge * 0.42;
  col += (uColorPrimary + uColorAccent * 0.5) * mouseWake * 0.65;

  // Atmospheric vignette
  float vig = 1.0 - smoothstep(0.45, 1.45, length(aspectUv));
  return col * (0.65 + 0.35 * vig);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 aspectUv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  vec2 mouseAspect = vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5);
  vec3 color = evaluateFluidShader(vUv, aspectUv, mouseAspect);
  gl_FragColor = vec4(color, 1.0);
}
