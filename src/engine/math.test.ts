import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTICLE_COUNT,
  TIMELINE_KEYFRAMES,
  computeCursorForce,
  computeParticleMorphT,
  computeScrubTextTransform,
  interpolateKeyframes,
} from './math';
import { buildCanonicalShapes, generateTextShape } from './shapes';

test('interpolateKeyframes continuously interpolates across [0, 1] without step jumps', () => {
  const start = interpolateKeyframes(0);
  assert.equal(start.shapeA, 'brain');
  assert.equal(start.localProgress, 0);
  assert.equal(start.activeKeyframeIndex, 0);

  const midFirst = interpolateKeyframes(0.125);
  assert.equal(midFirst.shapeA, 'brain');
  assert.equal(midFirst.shapeB, 'name');
  assert.ok(midFirst.easedProgress > 0.49 && midFirst.easedProgress < 0.51);
  // OffsetX should be halfway between +0.22 and -0.22 (approx 0)
  assert.ok(Math.abs(midFirst.offsetX) < 0.01);

  const end = interpolateKeyframes(1.0);
  assert.equal(end.shapeB, 'torus');
  assert.equal(end.activeKeyframeIndex, TIMELINE_KEYFRAMES.length - 1);
});

test('computeParticleMorphT staggers individual particles and clamps cleanly to [0, 1]', () => {
  const earlyParticle = computeParticleMorphT(0.3, 0.0);
  const delayedParticle = computeParticleMorphT(0.3, 0.4);
  assert.ok(earlyParticle > delayedParticle, 'Undelayed particle progresses ahead of delayed particle');
  assert.equal(computeParticleMorphT(0, 0.35), 0);
  assert.equal(computeParticleMorphT(1, 0.35), 1);
});

test('computeScrubTextTransform is strictly reversible and symmetric around keyframe center', () => {
  const atCenter = computeScrubTextTransform(0.5, 0.5);
  assert.equal(atCenter.opacity, 1);
  assert.equal(atCenter.translateY, 0);
  assert.equal(atCenter.pointerEvents, 'auto');

  const entering = computeScrubTextTransform(0.4, 0.5);
  const exiting = computeScrubTextTransform(0.6, 0.5);
  assert.equal(entering.opacity, exiting.opacity);
  assert.equal(entering.translateY, -exiting.translateY);
  assert.ok(entering.translateY > 0, 'Entering text slides up from positive Y');
  assert.ok(exiting.translateY < 0, 'Exiting text drifts up to negative Y');
});

test('computeCursorForce handles repel, swirl, and hold-to-attract modes', () => {
  const repel = computeCursorForce({
    px: 120,
    py: 100,
    cursorX: 100,
    cursorY: 100,
    radius: 160,
    mode: 'repel',
    isHolding: false,
  });
  assert.ok(repel.fx > 0, 'Repel pushes particle away on +X');
  assert.equal(repel.fy, 0);

  const attract = computeCursorForce({
    px: 120,
    py: 100,
    cursorX: 100,
    cursorY: 100,
    radius: 160,
    mode: 'repel',
    isHolding: true,
  });
  assert.ok(attract.fx < 0, 'Hold click pulls particle inward toward cursor');
  assert.ok(attract.fy !== 0, 'Hold click adds orbital tangential component');
});

test('buildCanonicalShapes and generateTextShape return exact PARTICLE_COUNT valid 3D coordinates', () => {
  const shapes = buildCanonicalShapes(PARTICLE_COUNT);
  for (const key of ['brain', 'name', 'chip', 'bulb', 'torus'] as const) {
    assert.equal(shapes[key].length, PARTICLE_COUNT);
    for (const pt of shapes[key]) {
      assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y) && Number.isFinite(pt.z));
    }
  }

  const customWord = generateTextShape('SYNAPSE', PARTICLE_COUNT);
  assert.equal(customWord.length, PARTICLE_COUNT);
});
