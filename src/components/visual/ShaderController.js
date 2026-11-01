import * as THREE from 'three';
import fluidFrag from './shaders/fluid.frag';
import auroraFrag from './shaders/aurora.frag';
import metaballFrag from './shaders/metaball.frag';
import particlesFrag from './shaders/particles.frag';
import energyWaveFrag from './shaders/energy-wave.frag';
import liquidGlassFrag from './shaders/liquid-glass.frag';
import {
  SHADER_MODE_INDEX,
  SHADER_PRESETS,
  computeOptimalPixelRatio,
  lerpVec3,
  lerpScalar,
} from './shaderEngineLogic';

export const RAW_SHADER_SOURCES = {
  fluid: fluidFrag,
  aurora: auroraFrag,
  metaball: metaballFrag,
  particles: particlesFrag,
  'energy-wave': energyWaveFrag,
  'liquid-glass': liquidGlassFrag,
};

function extractEvaluatorFunctions(glslSource) {
  // Strip header lines (precision, varying, uniform) and the standalone void main() block
  const withoutMain = glslSource.replace(/void\s+main\s*\(\s*\)\s*\{[\s\S]*$/m, '');
  const lines = withoutMain.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('precision ') ||
      trimmed.startsWith('varying ') ||
      trimmed.startsWith('uniform ')
    ) {
      return false;
    }
    return true;
  });
  return lines.join('\n');
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

function buildUnifiedFragmentShader() {
  const chunks = [
    extractEvaluatorFunctions(fluidFrag),
    extractEvaluatorFunctions(auroraFrag),
    extractEvaluatorFunctions(metaballFrag),
    extractEvaluatorFunctions(particlesFrag),
    extractEvaluatorFunctions(energyWaveFrag),
    extractEvaluatorFunctions(liquidGlassFrag),
  ].join('\n\n');

  return `
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

    uniform int uModeA;
    uniform int uModeB;
    uniform int uBlendPartnerMode;
    uniform float uBlendPartnerWeight;

    ${chunks}

    vec3 evaluateByIndex(int modeIdx, vec2 uv, vec2 aspectUv, vec2 mouseAspect) {
      if (modeIdx == 0) return evaluateFluidShader(uv, aspectUv, mouseAspect);
      if (modeIdx == 1) return evaluateAuroraShader(uv, aspectUv, mouseAspect);
      if (modeIdx == 2) return evaluateMetaballShader(uv, aspectUv, mouseAspect);
      if (modeIdx == 3) return evaluateParticlesShader(uv, aspectUv, mouseAspect);
      if (modeIdx == 4) return evaluateEnergyWaveShader(uv, aspectUv, mouseAspect);
      return evaluateLiquidGlassShader(uv, aspectUv, mouseAspect);
    }

    void main() {
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      vec2 aspectUv = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
      vec2 mouseAspect = vec2((uMouse.x - 0.5) * aspect, uMouse.y - 0.5);

      vec3 colA = evaluateByIndex(uModeA, vUv, aspectUv, mouseAspect);

      // Composite secondary harmonic layer for rich Shader.se depth
      if (uBlendPartnerWeight > 0.01 && uBlendPartnerMode != uModeA) {
        vec3 partnerCol = evaluateByIndex(uBlendPartnerMode, vUv, aspectUv, mouseAspect);
        colA = mix(colA, partnerCol, uBlendPartnerWeight);
      }

      vec3 finalCol = colA;
      if (uTransition > 0.001 && uModeB != uModeA) {
        vec3 colB = evaluateByIndex(uModeB, vUv, aspectUv, mouseAspect);
        float smoothT = smoothstep(0.0, 1.0, uTransition);
        finalCol = mix(colA, colB, smoothT);
      }

      // Subtle atmospheric filmic tone curve & deep obsidian floor protection
      finalCol = max(finalCol, vec3(0.010, 0.011, 0.028));
      finalCol = finalCol / (1.0 + finalCol * 0.28);

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;
}

/**
 * Persistent WebGL Shader Engine Controller.
 * Mounts once at the application root, manages Three.js scene/camera/material,
 * and paces frames automatically on both hardware GPUs and software WebGL.
 */
export class ShaderController {
  constructor(canvas, interactionManager, options = {}) {
    this.canvas = canvas;
    this.interactionManager = interactionManager;
    this.isSoftwareGl = Boolean(options.isSoftwareGl);
    this.isPaused = false;
    this.disposed = false;
    this.rafId = 0;
    this.fenceTimerId = 0;

    const initialMode = options.initialMode || 'aurora';
    const initialPreset = SHADER_PRESETS[initialMode] || SHADER_PRESETS.aurora;

    this.currentMode = initialMode;
    this.targetMode = initialMode;
    this.fromPreset = initialPreset;
    this.toPreset = initialPreset;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });

    const dpr = computeOptimalPixelRatio(
      typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      this.isSoftwareGl
    );
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.geometry = new THREE.PlaneGeometry(2, 2);

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth * dpr, window.innerHeight * dpr),
      },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseVelocity: { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 },
      uScrollVelocity: { value: 0 },
      uTransition: { value: 0 },
      uIntensity: { value: initialPreset.intensity },
      uColorPrimary: {
        value: new THREE.Vector3(
          initialPreset.primary.r,
          initialPreset.primary.g,
          initialPreset.primary.b
        ),
      },
      uColorSecondary: {
        value: new THREE.Vector3(
          initialPreset.secondary.r,
          initialPreset.secondary.g,
          initialPreset.secondary.b
        ),
      },
      uColorAccent: {
        value: new THREE.Vector3(
          initialPreset.accent.r,
          initialPreset.accent.g,
          initialPreset.accent.b
        ),
      },
      uRippleCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uRippleTime: { value: 10.0 },
      uRippleIntensity: { value: 0.0 },
      uModeA: { value: SHADER_MODE_INDEX[initialMode] ?? 1 },
      uModeB: { value: SHADER_MODE_INDEX[initialMode] ?? 1 },
      uBlendPartnerMode: {
        value: SHADER_MODE_INDEX[initialPreset.blendPartner] ?? 0,
      },
      uBlendPartnerWeight: { value: initialPreset.blendAmount },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: buildUnifiedFragmentShader(),
      uniforms: this.uniforms,
      depthWrite: false,
      depthTest: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTime = performance.now();
    this._boundResize = this.handleResize.bind(this);
    this._boundVisibility = this.handleVisibilityChange.bind(this);
    this._boundTick = this.tick.bind(this);

    window.addEventListener('resize', this._boundResize, { passive: true });
    document.addEventListener('visibilitychange', this._boundVisibility);
  }

  handleResize() {
    if (this.disposed) return;
    const dpr = computeOptimalPixelRatio(window.devicePixelRatio || 1, this.isSoftwareGl);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.uniforms.uResolution.value.set(window.innerWidth * dpr, window.innerHeight * dpr);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.stopLoop();
    } else if (!this.isPaused && !this.disposed) {
      this.lastTime = performance.now();
      this.startLoop();
    }
  }

  prepareModeTransition(nextModeId, nextPreset) {
    this.targetMode = nextModeId;
    this.fromPreset = {
      primary: {
        r: this.uniforms.uColorPrimary.value.x,
        g: this.uniforms.uColorPrimary.value.y,
        b: this.uniforms.uColorPrimary.value.z,
      },
      secondary: {
        r: this.uniforms.uColorSecondary.value.x,
        g: this.uniforms.uColorSecondary.value.y,
        b: this.uniforms.uColorSecondary.value.z,
      },
      accent: {
        r: this.uniforms.uColorAccent.value.x,
        g: this.uniforms.uColorAccent.value.y,
        b: this.uniforms.uColorAccent.value.z,
      },
      intensity: this.uniforms.uIntensity.value,
      blendAmount: this.uniforms.uBlendPartnerWeight.value,
    };
    this.toPreset = nextPreset || SHADER_PRESETS[nextModeId] || SHADER_PRESETS.aurora;
    this.uniforms.uModeB.value = SHADER_MODE_INDEX[nextModeId] ?? 1;
    this.uniforms.uTransition.value = 0;
  }

  setTransitionProgress(t) {
    this.uniforms.uTransition.value = t;
    const p = lerpVec3(this.fromPreset.primary, this.toPreset.primary, t);
    const s = lerpVec3(this.fromPreset.secondary, this.toPreset.secondary, t);
    const a = lerpVec3(this.fromPreset.accent, this.toPreset.accent, t);

    this.uniforms.uColorPrimary.value.set(p.r, p.g, p.b);
    this.uniforms.uColorSecondary.value.set(s.r, s.g, s.b);
    this.uniforms.uColorAccent.value.set(a.r, a.g, a.b);
    this.uniforms.uIntensity.value = lerpScalar(
      this.fromPreset.intensity,
      this.toPreset.intensity,
      t
    );
  }

  commitModeTransition(nextModeId) {
    this.currentMode = nextModeId;
    const preset = SHADER_PRESETS[nextModeId] || SHADER_PRESETS.aurora;
    this.uniforms.uModeA.value = SHADER_MODE_INDEX[nextModeId] ?? 1;
    this.uniforms.uModeB.value = SHADER_MODE_INDEX[nextModeId] ?? 1;
    this.uniforms.uTransition.value = 0;
    this.uniforms.uBlendPartnerMode.value =
      SHADER_MODE_INDEX[preset.blendPartner] ?? 0;
    this.uniforms.uBlendPartnerWeight.value = preset.blendAmount;
  }

  setCustomAccentTint(rgb255) {
    if (!rgb255) return;
    this.uniforms.uColorAccent.value.set(
      rgb255.r / 255,
      rgb255.g / 255,
      rgb255.b / 255
    );
  }

  setIntensityMultiplier(val) {
    this.uniforms.uIntensity.value = Math.max(0.2, Math.min(2.5, val));
  }

  setPaused(paused) {
    this.isPaused = Boolean(paused);
    if (this.isPaused) {
      this.stopLoop();
    } else {
      this.lastTime = performance.now();
      this.startLoop();
    }
  }

  afterDraw(cb) {
    const gl = this.renderer.getContext();
    if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const status = gl.clientWaitSync(sync, 0, 0);
        if (status === gl.CONDITION_SATISFIED || status === gl.ALREADY_SIGNALED) {
          gl.deleteSync(sync);
          cb();
        } else {
          this.fenceTimerId = window.setTimeout(poll, 16);
        }
      };
      this.fenceTimerId = window.setTimeout(poll, 16);
    } else {
      this.fenceTimerId = window.setTimeout(cb, 32);
    }
  }

  tick(now = performance.now()) {
    if (this.disposed || this.isPaused || document.hidden) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.uniforms.uTime.value += dt;

    if (this.interactionManager) {
      const { pointer, scroll, ripple } = this.interactionManager.step(dt);
      this.uniforms.uMouse.value.set(pointer.x, pointer.y);
      this.uniforms.uMouseVelocity.value.set(pointer.vx, pointer.vy);
      this.uniforms.uScroll.value = scroll.value;
      this.uniforms.uScrollVelocity.value = scroll.velocity;
      this.uniforms.uRippleCenter.value.set(ripple.centerX, ripple.centerY);
      this.uniforms.uRippleTime.value = ripple.elapsed;
      this.uniforms.uRippleIntensity.value = ripple.active ? ripple.intensity : 0.0;
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.disposed && !this.isPaused) {
          this.rafId = window.requestAnimationFrame(this._boundTick);
        }
      });
    } else {
      this.rafId = window.requestAnimationFrame(this._boundTick);
    }
  }

  startLoop() {
    this.stopLoop();
    this.rafId = window.requestAnimationFrame(this._boundTick);
  }

  stopLoop() {
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.fenceTimerId) {
      window.clearTimeout(this.fenceTimerId);
      this.fenceTimerId = 0;
    }
  }

  dispose() {
    this.disposed = true;
    this.stopLoop();
    window.removeEventListener('resize', this._boundResize);
    document.removeEventListener('visibilitychange', this._boundVisibility);
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}

export default ShaderController;
