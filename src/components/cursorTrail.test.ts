import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CURSOR_TRAIL_FRAGMENT_SHADER,
  CURSOR_TRAIL_VERTEX_SHADER,
  FLOATS_PER_PARTICLE,
  createParticlePool,
  emitParticlesAlongSegment,
  hexToRgbNormalized,
  stepParticlePool,
} from "./cursorTrailUtils";

const ROOT = path.resolve(import.meta.dirname, "../..");

test("Custom GLSL vertex and fragment shaders define attributes, uniforms, and point sprite outputs", () => {
  for (const attr of ["aPosition", "aVelocity", "aAge", "aLife", "aSize", "aSeed"]) {
    assert.ok(
      CURSOR_TRAIL_VERTEX_SHADER.includes(`attribute`) &&
        CURSOR_TRAIL_VERTEX_SHADER.includes(attr),
      `Vertex shader missing attribute ${attr}`
    );
  }
  assert.ok(CURSOR_TRAIL_VERTEX_SHADER.includes("gl_Position"));
  assert.ok(CURSOR_TRAIL_VERTEX_SHADER.includes("gl_PointSize"));

  for (const uni of ["uPrimaryColor", "uSecondaryColor", "uCoreColor", "uTime"]) {
    assert.ok(
      CURSOR_TRAIL_FRAGMENT_SHADER.includes(uni),
      `Fragment shader missing uniform ${uni}`
    );
  }
  assert.ok(CURSOR_TRAIL_FRAGMENT_SHADER.includes("gl_PointCoord"));
  assert.ok(CURSOR_TRAIL_FRAGMENT_SHADER.includes("gl_FragColor"));
});

test("hexToRgbNormalized converts 3-digit, 6-digit, and fallback hex strings to normalized RGB", () => {
  const [r1, g1, b1] = hexToRgbNormalized("#ffffff");
  assert.equal(r1, 1);
  assert.equal(g1, 1);
  assert.equal(b1, 1);

  const [r2, g2, b2] = hexToRgbNormalized("#000");
  assert.equal(r2, 0);
  assert.equal(g2, 0);
  assert.equal(b2, 0);

  const [r3, g3, b3] = hexToRgbNormalized("#e0231c");
  assert.ok(Math.abs(r3 - 224 / 255) < 1e-4);
  assert.ok(Math.abs(g3 - 35 / 255) < 1e-4);
  assert.ok(Math.abs(b3 - 28 / 255) < 1e-4);

  const fallback = hexToRgbNormalized("not-a-color");
  assert.equal(fallback.length, 3);
  assert.ok(fallback[0] > 0.8);
});

test("ParticlePool ring buffer emits along cursor segments, packs Float32Array attributes, and expires particles", () => {
  const pool = createParticlePool(24);
  assert.equal(pool.capacity, 24);
  assert.equal(pool.bufferData.length, 24 * FLOATS_PER_PARTICLE);

  // Emit along a 45px mouse stroke
  const emitted = emitParticlesAlongSegment(pool, 100, 100, 145, 100, 0.016, {
    count: 4,
    minLife: 0.4,
    maxLife: 0.5,
    randomFn: () => 0.5,
  });
  assert.ok(emitted >= 10, `Expected interpolated particles along 45px segment, got ${emitted}`);
  assert.equal(pool.totalEmitted, emitted);

  // Step simulation forward by 16ms
  const activeAfterStep = stepParticlePool(pool, 0.016, 0.5);
  assert.equal(activeAfterStep, emitted);

  // Verify interleaved bufferData for the first particle
  assert.ok(pool.bufferData[0] > 100, "Particle X position should advance along segment");
  assert.ok(pool.bufferData[4] > 0, "Particle age should be > 0");
  assert.ok(pool.bufferData[5] > 0.3, "Particle life should be packed");
  assert.ok(pool.bufferData[6] > 0, "Particle size should be > 0");

  // Step past maxLife so all particles expire cleanly
  for (let i = 0; i < 10; i++) {
    stepParticlePool(pool, 0.08, 1.0 + i * 0.08);
  }
  const activeAfterExpiry = stepParticlePool(pool, 0.016, 2.0);
  assert.equal(activeAfterExpiry, 0, "All particles should expire after exceeding lifetime");
});

test("CursorParticleTrail is mounted in Scene.tsx", () => {
  const sceneSource = fs.readFileSync(path.join(ROOT, "src/Scene.tsx"), "utf8");
  assert.ok(sceneSource.includes("CursorParticleTrail"), "Scene.tsx must render <CursorParticleTrail />");
});
