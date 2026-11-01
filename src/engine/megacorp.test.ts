import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTICLE_COUNT,
  MEGACORP_STAGES,
  buildMegacorpShapes,
  computeChapterTransform,
  computeDelayedMorphT,
  computeMidpointGlitch,
} from './megacorp';

test('buildMegacorpShapes generates all 6 canonical shapes with exact PARTICLE_COUNT valid 3D points', () => {
  const shapes = buildMegacorpShapes(PARTICLE_COUNT);
  const expectedIds = ['shard', 'katana', 'oni', 'tower', 'skull', 'emblem'] as const;

  assert.equal(MEGACORP_STAGES.length, 6);
  for (const id of expectedIds) {
    const pts = shapes[id];
    assert.equal(pts.length, PARTICLE_COUNT, `Shape ${id} must have ${PARTICLE_COUNT} points`);
    for (let i = 0; i < pts.length; i++) {
      assert.ok(
        Number.isFinite(pts[i].x) && Number.isFinite(pts[i].y) && Number.isFinite(pts[i].z),
        `Invalid coordinate in ${id} at index ${i}`
      );
    }
  }
});

test('computeDelayedMorphT staggers particles smoothly and clamps to [0, 1]', () => {
  assert.equal(computeDelayedMorphT(0, 0.25), 0);
  assert.equal(computeDelayedMorphT(1, 0.25), 1);
  const early = computeDelayedMorphT(0.4, 0.05);
  const late = computeDelayedMorphT(0.4, 0.35);
  assert.ok(early > late, 'Particle with smaller delay should progress further at t=0.4');
});

test('computeMidpointGlitch peaks at transition midpoint (t=0.5) and is zero at endpoints', () => {
  assert.equal(computeMidpointGlitch(0), 0);
  assert.equal(computeMidpointGlitch(1), 0);
  assert.equal(computeMidpointGlitch(0.5), 1);
  assert.ok(computeMidpointGlitch(0.46) > 0.3);
});

test('computeChapterTransform is strictly reversible around each chapter center', () => {
  const center2 = 2 / 5; // 0.40
  const atCenter = computeChapterTransform(center2, 2, 6);
  assert.equal(atCenter.opacity, 1);
  assert.equal(atCenter.translateY, 0);
  assert.equal(atCenter.isActive, true);

  const before = computeChapterTransform(center2 - 0.12, 2, 6);
  const after = computeChapterTransform(center2 + 0.12, 2, 6);
  assert.equal(before.opacity, after.opacity);
  assert.equal(before.translateY, -after.translateY);
});
