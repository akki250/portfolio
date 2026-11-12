import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TOWER_COUNTRIES, JapaneseTowerLandscape } from "./JapaneseTowerLandscape";

const EXPECTED_HASHES: Record<string, string> = {
  "src/shaders/japanese-tower/JapaneseTowerLandscape.tsx":
    "3ad3de77dabdcf9f2e0d3e7bb1347089249eef68e2b8db9ce98c3acc0920e411",
  "src/shaders/japanese-tower/Towers.html":
    "7810e7163c027f654235032fb1eed48846b68bf80f5b1c1c4292e01694b71f3d",
  "src/shaders/threeui.css":
    "efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf",
};

test("JapaneseTowerLandscape registered files match exact SHA-256 digests", () => {
  for (const [relPath, expectedHash] of Object.entries(EXPECTED_HASHES)) {
    const absPath = path.resolve(process.cwd(), relPath);
    assert.equal(fs.existsSync(absPath), true, `Missing required file: ${relPath}`);
    const bytes = fs.readFileSync(absPath);
    const actualHash = crypto.createHash("sha256").update(bytes).digest("hex");
    assert.equal(
      actualHash,
      expectedHash,
      `SHA-256 mismatch for ${relPath}: expected ${expectedHash}, got ${actualHash}`
    );
  }
});

test("JapaneseTowerLandscape supports china variant and exports cleanly", () => {
  assert.equal(typeof JapaneseTowerLandscape, "function");
  assert.equal(TOWER_COUNTRIES.includes("china"), true);
  const towersHtml = fs.readFileSync(
    path.resolve(process.cwd(), "src/shaders/japanese-tower/Towers.html"),
    "utf-8"
  );
  assert.equal(towersHtml.includes("id:'CHINA'"), true);
  assert.equal(towersHtml.includes("PAGODA GROWTH STUDY"), true);
  assert.equal(towersHtml.includes("buildPagoda"), true);
});
