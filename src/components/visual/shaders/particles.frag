// ============================================================================
// SHADER D: GPU Particle Field Shader (particles.frag)
// GPU-accelerated multi-depth floating glowing points, mouse-responsive
// displacement, depth parallax, and volumetric nebula illumination.
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

vec2 hash22_part(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float particleLayer(vec2 uv, float scale, float t, vec2 mouseOffset) {
  vec2 gv = fract(uv * scale) - 0.5;
  vec2 id = floor(uv * scale);
  float glow = 0.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offs = vec2(float(x), float(y));
      vec2 n = hash22_part(id + offs);
      vec2 pos = offs + sin(n * 6.2831 + t * (0.65 + n.x * 0.5)) * 0.36;
      float d = length(gv - pos);
      float spark = (0.0042 / max(d * d, 0.00025)) * smoothstep(1.0, 0.12, d);
      float twinkle = 0.55 + 0.45 * sin(t * 2.4 + n.x * 19.0 + n.y * 11.0);
      glow += spark * twinkle;
    }
  }
  return glow;
}

vec3 evaluateParticlesShader(vec2 uv, vec2 aspectUv, vec2 mouseAspect) {
  float t = uTime * (0.38 + uIntensity * 0.15);

  // Cursor gravitational lens / repulsion displacement
  vec2 deltaM = aspectUv - mouseAspect;
  float distM = length(deltaM);
  vec2 displaced = aspectUv + normalize(deltaM + 0.0001) * exp(-distM * 3.8) * 0.085;

  // Deep atmospheric nebula backdrop
  float nebula = sin(displaced.x * 3.2 + t * 0.3) * cos(displaced.y * 2.8 - t * 0.25) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.010, 0.011, 0.030), uColorPrimary * 0.22, nebula);

  // 4 parallax depth planes of glowing GPU particles
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float depth = fract(fi * 0.25 + uScroll * 0.45 + t * 0.04);
    float scale = mix(11.0, 3.2, depth);
    float fade = depth * smoothstep(1.0, 0.82, depth);

    vec2 layerUv = displaced + mouseAspect * (0.06 + fi * 0.045) + vec2(fi * 3.7, uScroll * (0.3 + fi * 0.15));
    float pGlow = particleLayer(layerUv, scale, t + fi * 4.2, mouseAspect);

    vec3 layerHue = mix(uColorPrimary, mix(uColorSecondary, uColorAccent, fi / 3.0), depth);
    col += pGlow * fade * layerHue * 0.26;
  }

  // Click shockwave illumination across particle field
  vec2 rippleAspect = vec2((uRippleCenter.x - 0.5) * (uResolution.x / max(uResolution.y, 1.0)), uRippleCenter.y - 0.5);
  float rDist = length(aspectUv - rippleAspect);
  float shock = exp(-abs(rDist - uRippleTime * 0.65) * 16.0) * exp(-uRippleTime * 1.4) * uRippleIntensity;
  col += uColorAccent * shock * 0.75;

  return col;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 aspectUv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  vec2 mouseAspect = vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5);
  vec3 color = evaluateParticlesShader(vUv, aspectUv, mouseAspect);
  gl_FragColor = vec4(color, 1.0);
}
