import {
  stepPointerDamping,
  triggerRipple,
  stepRippleState,
  clamp01,
} from './shaderEngineLogic';

/**
 * Centralized interaction manager for mouse/touch movement, click-triggered
 * energy ripples, and scroll-scrubbed velocity.
 */
export class InteractionManager {
  constructor() {
    this.pointer = {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      vx: 0,
      vy: 0,
    };

    this.scroll = {
      value: 0,
      target: 0,
      velocity: 0,
    };

    this.ripple = {
      centerX: 0.5,
      centerY: 0.5,
      elapsed: 10.0,
      intensity: 0.0,
      active: false,
    };

    this.rippleCount = 0;
    this._boundPointerDown = this._onPointerDown.bind(this);
    this._boundAttached = false;
  }

  attach() {
    if (this._boundAttached || typeof window === 'undefined') return;
    this._boundAttached = true;
    window.addEventListener('pointerdown', this._boundPointerDown, { passive: true });
  }

  detach() {
    if (!this._boundAttached || typeof window === 'undefined') return;
    this._boundAttached = false;
    window.removeEventListener('pointerdown', this._boundPointerDown);
  }

  _onPointerDown(e) {
    const w = Math.max(window.innerWidth, 1);
    const h = Math.max(window.innerHeight, 1);
    const nx = clamp01(e.clientX / w);
    const ny = clamp01(1.0 - e.clientY / h);
    this.spawnRipple(nx, ny, 1.15);
  }

  setPointerTarget(nx, ny) {
    this.pointer.targetX = clamp01(nx);
    this.pointer.targetY = clamp01(ny);
  }

  setScrollTarget(progress) {
    this.scroll.target = clamp01(progress);
  }

  spawnRipple(nx = 0.5, ny = 0.5, strength = 1.0) {
    this.ripple = triggerRipple(nx, ny, strength);
    this.rippleCount += 1;
  }

  step(dtSeconds) {
    const dt = Math.max(0.001, Math.min(0.1, dtSeconds));
    this.pointer = stepPointerDamping(this.pointer, dt, 10.5);

    const scrollAlpha = 1 - Math.exp(-8.5 * dt);
    const nextScroll = this.scroll.value + (this.scroll.target - this.scroll.value) * scrollAlpha;
    this.scroll.velocity = (nextScroll - this.scroll.value) / dt;
    this.scroll.value = nextScroll;

    this.ripple = stepRippleState(this.ripple, dt);
    return {
      pointer: this.pointer,
      scroll: this.scroll,
      ripple: this.ripple,
    };
  }
}

export default InteractionManager;
