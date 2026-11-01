import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLITCH_DURATION_SEC,
  GLITCH_INTERVAL_MAX_MS,
  GLITCH_INTERVAL_MIN_MS,
  PARTICLE_COUNT,
  SCROLLS_PER_TRANSITION,
  STEP_PER_SCROLL,
  TIMELINE_KEYFRAMES,
  buildRgbGlitchKeyframes,
  computeCursorForce,
  computeNextGlitchDelayMs,
  computeParticleMorphT,
  computeScrubTextTransform,
  computeWheelScrollStep,
  interpolateKeyframes,
} from './math';
import { buildCanonicalShapes, generateTextShape } from './shapes';

test('20 standard wheel scrolls complete exactly 1 keyframe transition (0.25 progress)', () => {
  assert.equal(SCROLLS_PER_TRANSITION, 20);
  assert.equal(STEP_PER_SCROLL, 0.0125);

  let progress = 0;
  for (let i = 0; i < 20; i++) {
    progress += computeWheelScrollStep(100, 0);
  }
  assert.ok(Math.abs(progress - 0.25) < 1e-9, '20 scrolls advance progress from 0.00 to 0.25');

  const kfState = interpolateKeyframes(progress);
  assert.equal(kfState.activeKeyframeIndex, 1);
});

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

test('computeNextGlitchDelayMs stays strictly within the 8-12 second (8000ms-12000ms) window', () => {
  assert.equal(GLITCH_INTERVAL_MIN_MS, 8000);
  assert.equal(GLITCH_INTERVAL_MAX_MS, 12000);

  assert.equal(computeNextGlitchDelayMs(0), 8000);
  assert.equal(computeNextGlitchDelayMs(0.5), 10000);
  assert.equal(computeNextGlitchDelayMs(1), 12000);
  assert.equal(computeNextGlitchDelayMs(-0.2), 8000);
  assert.equal(computeNextGlitchDelayMs(1.4), 12000);

  for (let i = 0; i < 50; i++) {
    const d = computeNextGlitchDelayMs(Math.random());
    assert.ok(d >= 8000 && d <= 12000, `Expected delay ${d}ms to be within [8000, 12000]`);
  }
});

test('buildRgbGlitchKeyframes generates symmetric RGB-split Framer Motion keyframes that start and end at rest', () => {
  const headingKf = buildRgbGlitchKeyframes('heading', 1);
  assert.equal(headingKf.duration, GLITCH_DURATION_SEC);
  assert.equal(headingKf.x.length, headingKf.times.length);
  assert.equal(headingKf.x[0], 0);
  assert.equal(headingKf.x[headingKf.x.length - 1], 0);
  assert.equal(headingKf.y[0], 0);
  assert.equal(headingKf.y[headingKf.y.length - 1], 0);
  assert.equal(headingKf.skewX[0], 0);
  assert.equal(headingKf.skewX[headingKf.skewX.length - 1], 0);
  assert.ok(headingKf.textShadow && headingKf.textShadow.length === headingKf.times.length);
  assert.equal(headingKf.textShadow[0], headingKf.textShadow[headingKf.textShadow.length - 1]);
  assert.ok(headingKf.x.some((v) => v < 0) && headingKf.x.some((v) => v > 0));

  const cardKf = buildRgbGlitchKeyframes('card', 1);
  assert.equal(cardKf.x.length, cardKf.times.length);
  assert.equal(cardKf.x[0], 0);
  assert.equal(cardKf.x[cardKf.x.length - 1], 0);
  assert.equal(cardKf.skewX[0], 0);
  assert.equal(cardKf.skewX[cardKf.skewX.length - 1], 0);
  assert.ok(cardKf.boxShadow && cardKf.boxShadow.length === cardKf.times.length);
  assert.equal(cardKf.boxShadow[0], cardKf.boxShadow[cardKf.boxShadow.length - 1]);
});

