// ============================================================================
// SHADER E: Energy Wave Shader (energy-wave.frag)
// Distorted circular harmonic wave patterns, interference ripple propagation,
// interactive mouse-triggered energy waves, and smooth harmonic decay.
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

vec3 evaluateEnergyWaveShader(vec2 uv, vec2 aspectUv, vec2 mouseAspect) {
  float t = uTime * (0.75 + uIntensity * 0.25) + uScroll * 2.2;

  // Harmonic domain distortion
  vec2 p = aspectUv;
  float angle = atan(p.y, p.x);
  float radius = length(p);

  float angularWarp = sin(angle * 5.0 + t * 0.8) * 0.045 + cos(angle * 3.0 - t * 0.6) * 0.035;
  float distCenter = radius + angularWarp;

  // Primary concentric harmonic waves
  float wave1 = sin(distCenter * 22.0 - t * 2.6);
  float wave2 = cos(length(p - mouseAspect) * 26.0 - t * 3.2) * exp(-length(p - mouseAspect) * 2.2);

  // Interactive click-triggered expanding energy wave
  vec2 rippleAspect = vec2((uRippleCenter.x - 0.5) * (uResolution.x / max(uResolution.y, 1.0)), uRippleCenter.y - 0.5);
  float rDist = length(p - rippleAspect);
  float clickWave = sin(rDist * 34.0 - uRippleTime * 14.0) * exp(-abs(rDist - uRippleTime * 0.55) * 6.0) * exp(-uRippleTime * 1.2) * uRippleIntensity;

  float combined = wave1 * 0.55 + wave2 * 0.85 + clickWave * 1.35;

  // Crisp glowing energy filaments
  float filamentA = 0.045 / (abs(combined - 0.35) + 0.065);
  float filamentB = 0.035 / (abs(wave1 + wave2 * 0.6) + 0.075);

  vec3 bg = vec3(0.010, 0.011, 0.032);
  vec3 col = bg;
  col += uColorPrimary * filamentA * 0.34;
  col += uColorSecondary * filamentB * 0.28;
  col += uColorAccent * pow(max(0.0, wave2 + clickWave), 2.0) * 0.65;

  // Subtle radial decay
  col *= 1.0 - smoothstep(0.45, 1.45, radius) * 0.45;
  return col;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 aspectUv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  vec2 mouseAspect = vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5);
  vec3 color = evaluateEnergyWaveShader(vUv, aspectUv, mouseAspect);
  gl_FragColor = vec4(color, 1.0);
}
