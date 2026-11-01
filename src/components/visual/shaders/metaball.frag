// ============================================================================
// SHADER C: Organic Metaball Shader (metaball.frag)
// Smooth merging and separation of organic shapes, soft glowing contours,
// interactive cursor attraction, and dynamic ultraviolet/cyan color transitions.
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

float smin_meta(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

vec3 evaluateMetaballShader(vec2 uv, vec2 aspectUv, vec2 mouseAspect) {
  float t = uTime * (0.48 + uIntensity * 0.15) + uScroll * 1.8;

  // Evaluate smooth SDF of 7 organic metaballs + 1 cursor-bound attractor
  float dField = 10.0;
  vec3 weightedColor = vec3(0.0);
  float totalWeight = 0.0001;

  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float angle = t * (0.35 + fi * 0.07) + fi * 1.89;
    vec2 orbitCenter = vec2(
      sin(angle * 1.1 + fi) * 0.48 + cos(t * 0.25 - fi) * 0.18,
      cos(angle * 0.85 + fi * 1.4) * 0.32 + sin(t * 0.31 + fi) * 0.12
    );

    // Subtle attraction toward cursor
    orbitCenter = mix(orbitCenter, mouseAspect, 0.22 * exp(-length(orbitCenter - mouseAspect) * 1.5));

    float radius = 0.12 + 0.045 * sin(t * 0.9 + fi * 2.1);
    float d = length(aspectUv - orbitCenter) - radius;
    dField = smin_meta(dField, d, 0.24);

    float w = 1.0 / (pow(max(length(aspectUv - orbitCenter), 0.04), 2.2));
    vec3 blobCol = (i == 0 || i == 3)
      ? uColorPrimary
      : (i == 1 || i == 4 || i == 6)
        ? uColorSecondary
        : uColorAccent;
    weightedColor += blobCol * w;
    totalWeight += w;
  }

  // Interactive cursor metaball
  float cursorRadius = 0.14 + clamp(length(uMouseVelocity) * 0.4, 0.0, 0.10);
  float dCursor = length(aspectUv - mouseAspect) - cursorRadius;
  dField = smin_meta(dField, dCursor, 0.28);

  float cursorW = 1.4 / (pow(max(length(aspectUv - mouseAspect), 0.04), 2.2));
  weightedColor += uColorAccent * cursorW;
  totalWeight += cursorW;

  vec3 blendedHue = weightedColor / totalWeight;

  // Deep obsidian background
  vec3 bg = vec3(0.012, 0.010, 0.032) + blendedHue * 0.08;

  // Interior volumetric glow & pseudo-3D normal shading
  float inside = smoothstep(0.04, -0.14, dField);
  float rimContour = exp(-abs(dField) * 26.0);
  float outerHalo = exp(-max(dField, 0.0) * 6.5);

  // Soft internal normal approximation from radial gradient
  float coreHighlight = smoothstep(-0.02, -0.22, dField);

  vec3 col = bg;
  col += blendedHue * outerHalo * 0.48;
  col = mix(col, blendedHue * 0.68 + uColorPrimary * 0.25, inside);
  col += mix(uColorSecondary, uColorAccent, 0.6) * rimContour * 0.85;
  col += vec3(0.82, 0.88, 1.0) * coreHighlight * 0.28;

  return col;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 aspectUv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  vec2 mouseAspect = vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5);
  vec3 color = evaluateMetaballShader(vUv, aspectUv, mouseAspect);
  gl_FragColor = vec4(color, 1.0);
}
