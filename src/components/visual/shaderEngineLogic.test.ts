import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHADER_MODES,
  SHADER_PRESETS,
  resolveShaderForKeyframe,
  resolveShaderForRoute,
  lerpVec3,
  stepPointerDamping,
  triggerRipple,
  stepRippleState,
  computeOptimalPixelRatio,
} from './shaderEngineLogic.ts';

describe('Shader Engine Pure Logic', () => {
  it('defines all 6 required custom shader presets with normalized RGB vectors', () => {
    assert.equal(SHADER_MODES.length, 6);
    for (const mode of SHADER_MODES) {
      const preset = SHADER_PRESETS[mode];
      assert.ok(preset, `Preset missing for ${mode}`);
      assert.ok(preset.primary.r >= 0 && preset.primary.r <= 1);
      assert.ok(preset.secondary.g >= 0 && preset.secondary.g <= 1);
      assert.ok(preset.accent.b >= 0 && preset.accent.b <= 1);
    }
  });

  it('maps timeline keyframes and routes to distinct shader experiences', () => {
    assert.equal(resolveShaderForKeyframe(0), 'aurora');
    assert.equal(resolveShaderForKeyframe(1), 'metaball');
    assert.equal(resolveShaderForKeyframe(2), 'particles');
    assert.equal(resolveShaderForKeyframe(3), 'energy-wave');
    assert.equal(resolveShaderForKeyframe(4), 'liquid-glass');

    assert.equal(resolveShaderForRoute('/'), 'aurora');
    assert.equal(resolveShaderForRoute('/about'), 'metaball');
    assert.equal(resolveShaderForRoute('/services'), 'particles');
    assert.equal(resolveShaderForRoute('/contact'), 'liquid-glass');
    assert.equal(resolveShaderForRoute('fluid'), 'fluid');
  });

  it('interpolates color vectors smoothly across transitions', () => {
    const a = { r: 0.2, g: 0.4, b: 0.8 };
    const b = { r: 0.8, g: 0.6, b: 0.2 };
    const mid = lerpVec3(a, b, 0.5);
    assert.deepEqual(mid, { r: 0.5, g: 0.5, b: 0.5 });
  });

  it('steps pointer damping smoothly toward target and computes bounded velocity', () => {
    const initial = { x: 0.5, y: 0.5, targetX: 0.9, targetY: 0.1, vx: 0, vy: 0 };
    const next = stepPointerDamping(initial, 0.016, 10.0);
    assert.ok(next.x > 0.5 && next.x < 0.9);
    assert.ok(next.y < 0.5 && next.y > 0.1);
    assert.ok(next.vx > 0);
    assert.ok(next.vy < 0);
  });

  it('triggers and decays click ripples over time', () => {
    const r0 = triggerRipple(0.75, 0.25, 1.2);
    assert.equal(r0.active, true);
    assert.equal(r0.centerX, 0.75);
    assert.equal(r0.centerY, 0.25);

    const r1 = stepRippleState(r0, 0.5);
    assert.equal(r1.active, true);
    assert.equal(r1.elapsed, 0.5);

    const rDone = stepRippleState(r1, 4.0);
    assert.equal(rDone.active, false);
    assert.equal(rDone.intensity, 0);
  });

  it('caps devicePixelRatio to 1.5 on hardware GPU and 1.0 on software WebGL', () => {
    assert.equal(computeOptimalPixelRatio(3.0, false), 1.5);
    assert.equal(computeOptimalPixelRatio(1.25, false), 1.25);
    assert.equal(computeOptimalPixelRatio(2.5, true), 1.0);
  });
});
