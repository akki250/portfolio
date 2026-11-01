// ============================================================================
// SHADER F: Liquid Glass Shader (liquid-glass.frag)
// Refraction-like distortion, chromatic aberration highlights, iridescent
// spectral color variations, and reflective organic Fresnel surfaces.
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

float glassSurfaceHeight(vec2 p, float t, vec2 mouseAspect) {
  float h = sin(p.x * 4.2 + t * 0.7) * cos(p.y * 3.8 - t * 0.55) * 0.35;
  h += sin((p.x + p.y) * 6.5 - t * 0.9) * 0.18;
  h += cos(length(p * 2.4) * 5.0 - t * 0.8) * 0.22;

  // Pointer lens depression
  float dMouse = length(p - mouseAspect);
  h += cos(dMouse * 14.0 - t * 3.5) * exp(-dMouse * 3.5) * 0.32;
  return h;
}

vec3 iridescentSpectrum(float x) {
  return 0.5 + 0.5 * cos(6.28318 * (x + vec3(0.0, 0.33, 0.67)));
}

vec3 evaluateLiquidGlassShader(vec2 uv, vec2 aspectUv, vec2 mouseAspect) {
  float t = uTime * (0.42 + uIntensity * 0.15) + uScroll * 1.4;

  // Compute surface normal via finite differences
  vec2 eps = vec2(0.008, 0.0);
  float hCenter = glassSurfaceHeight(aspectUv, t, mouseAspect);
  float hRight = glassSurfaceHeight(aspectUv + eps.xy, t, mouseAspect);
  float hUp = glassSurfaceHeight(aspectUv + eps.yx, t, mouseAspect);

  vec3 normal = normalize(vec3(hCenter - hRight, hCenter - hUp, 0.085));
  vec3 viewDir = normalize(vec3(-aspectUv * 0.6, 1.0));

  // Fresnel reflectance
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);

  // Chromatic dispersion (R, G, B refracted at slightly different indices)
  vec2 refractR = aspectUv + normal.xy * 0.14;
  vec2 refractG = aspectUv + normal.xy * 0.18;
  vec2 refractB = aspectUv + normal.xy * 0.22;

  float bandR = sin(refractR.x * 5.0 + refractR.y * 4.0 + t * 0.5) * 0.5 + 0.5;
  float bandG = sin(refractG.x * 5.0 + refractG.y * 4.0 + t * 0.5 + 0.6) * 0.5 + 0.5;
  float bandB = sin(refractB.x * 5.0 + refractB.y * 4.0 + t * 0.5 + 1.2) * 0.5 + 0.5;

  vec3 baseGlass = vec3(0.014, 0.016, 0.042);
  vec3 refractedCol = baseGlass
    + uColorPrimary * bandR * 0.42
    + uColorSecondary * bandG * 0.38
    + uColorAccent * bandB * 0.40;

  // Iridescent thin-film interference + specular highlight
  vec3 lightDir = normalize(vec3(mouseAspect.x * 1.4, mouseAspect.y * 1.4, 0.9));
  vec3 halfVec = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfVec), 0.0), 36.0);

  vec3 iridescence = iridescentSpectrum(hCenter * 0.8 + fresnel * 1.2 + t * 0.08);
  vec3 col = refractedCol;
  col += mix(uColorSecondary, iridescence, 0.55) * fresnel * 0.72;
  col += mix(uColorAccent, vec3(1.0), 0.65) * spec * 0.65;

  return col;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 aspectUv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
  vec2 mouseAspect = vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5);
  vec3 color = evaluateLiquidGlassShader(vUv, aspectUv, mouseAspect);
  gl_FragColor = vec4(color, 1.0);
}
