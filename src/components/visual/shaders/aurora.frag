// ============================================================================
// SHADER B: Volumetric Aurora Shader (aurora.frag)
// Flowing northern-light effects, electric violet, indigo, ultraviolet & cyan
// illumination, volumetric light curtains, and multi-layered noise movement.
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

mat2 rot2_aurora(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float tri_aurora(float x) {
  return clamp(abs(fract(x) - 0.5), 0.01, 0.49);
}

vec2 tri2_aurora(vec2 p) {
  return vec2(tri_aurora(p.x) + tri_aurora(p.y), tri_aurora(p.y + tri_aurora(p.x)));
}

float auroraNoise(vec2 p, float spd, float t) {
  float z = 1.8;
  float z2 = 2.5;
  float rz = 0.0;
  p *= rot2_aurora(p.x * 0.06);
  vec2 bp = p;
  for (int i = 0; i < 5; i++) {
    vec2 dg = tri2_aurora(bp * 1.85) * 0.75;
    dg *= rot2_aurora(t * spd);
    p -= dg / z2;
    bp *= 1.3;
    z2 *= 0.45;
    z *= 0.42;
    p *= 1.21 + (rz - 1.0) * 0.02;
    rz += tri_aurora(p.x + tri_aurora(p.y)) * z;
    p *= -mat2(0.95534, 0.29552, -0.29552, 0.95534);
  }
  return clamp(1.0 / pow(rz * 29.0, 1.3), 0.0, 0.55);
}

vec3 evaluateAuroraShader(vec2 uv, vec2 aspectUv, vec2 mouseAspect) {
  float t = uTime * (0.28 + uIntensity * 0.14) + uScroll * 0.9;

  // Deep midnight sky with subtle horizon glow
  vec3 sky = mix(vec3(0.010, 0.012, 0.032), vec3(0.028, 0.020, 0.075), smoothstep(-0.5, 0.5, aspectUv.y));

  // Parallax shift from pointer
  vec2 p = aspectUv + (mouseAspect * 0.12);

  vec3 auroraAccum = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float layerOffset = fi * 0.14;
    vec2 sampleCoord = vec2(
      p.x * (1.25 + fi * 0.15) + sin(t * 0.35 + fi) * 0.25,
      (p.y + 0.35) * (1.6 + fi * 0.22) + layerOffset
    );
    float curtain = auroraNoise(sampleCoord, 0.65 + fi * 0.08, t);

    // Vertical volumetric streak attenuation
    float streakFade = exp(-abs(aspectUv.y - (0.08 - fi * 0.04)) * 3.2);
    curtain *= streakFade;

    vec3 bandColor = mix(
      uColorPrimary,
      mix(uColorSecondary, uColorAccent, sin(fi * 0.9 + t * 0.5) * 0.5 + 0.5),
      fi / 5.0
    );

    auroraAccum += curtain * bandColor * (0.62 - fi * 0.06);
  }

  // Subtle volumetric light rays near cursor
  float mouseDist = length(aspectUv - mouseAspect);
  auroraAccum += uColorAccent * exp(-mouseDist * 3.8) * 0.26;

  // Click energy wave boost
  vec2 rippleAspect = vec2((uRippleCenter.x - 0.5) * (uResolution.x / max(uResolution.y, 1.0)), uRippleCenter.y - 0.5);
  float rDist = length(aspectUv - rippleAspect);
  float pulse = exp(-abs(rDist - uRippleTime * 0.55) * 14.0) * exp(-uRippleTime * 1.5) * uRippleIntensity;
  auroraAccum += (uColorAccent + uColorPrimary) * pulse * 0.55;

  return sky + auroraAccum * (1.15 + uIntensity * 0.35);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 aspectUv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  vec2 mouseAspect = vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5);
  vec3 color = evaluateAuroraShader(vUv, aspectUv, mouseAspect);
  gl_FragColor = vec4(color, 1.0);
}
