import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { splitTypographyProps } from "./pageTypography";
import { SYLVA_TYPOGRAPHY } from "./pageRecipes";

const EXPECTED_FILES = [
  {
    path: "src/shaders/landing-pages/LandingPages.tsx",
    sha256: "4d379461ad00eb4de7900df312878035383de7e1ed4e13283b8143a2eea9d30a",
  },
  {
    path: "src/shaders/landing-pages/pageTypography.ts",
    sha256: "809cc65797d531cd3b3ca5a56815d55d24b3ee8d293e4e4bad6fdfe6c83244cc",
  },
  {
    path: "src/shaders/landing-pages/pageRecipes.ts",
    sha256: "c9d9849cc255bac2d1d938d088c50917f84916f1c516d2bbb27fcfd803523233",
  },
  {
    path: "src/shaders/landing-pages/LandingPageFrame.tsx",
    sha256: "61de2cc50888aac4ac5557420b07fa47ed3543bb57c1e0055fafdefa53dbaa78",
  },
  {
    path: "public/landing-pages/inner-green-3d.html",
    sha256: "69c3694bd63f44ef9f007ebe4dac57a83e4402e0cdf6b54dd10b96dd4f05e197",
  },
  {
    path: "public/landing-pages/inner-green-assets/three.min.js",
    sha256: "8a5f7249903b54d30f79f708699d2fed2d6a1d0741a4cd41377d1f01bb5a2271",
  },
  {
    path: "src/shaders/threeui.css",
    sha256: "efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf",
  },
  {
    path: "public/landing-pages/inner-green-assets/card-ecostove.jpg",
    bytes: 290988,
    sha256: "70ce084084902bc502f00c366405b661ecdff90dee95d363b36a6e146829e433",
  },
  {
    path: "public/landing-pages/inner-green-assets/card-ethos.jpg",
    bytes: 316720,
    sha256: "337627390f499b3ae272cec9e2f83c817694a82f42e1aa10a7b26a2c7d679dff",
  },
  {
    path: "public/landing-pages/inner-green-assets/lexend-latin.woff2",
    bytes: 39692,
    sha256: "1ec8f6ee2750554b4bc59ff0b507d316a82a7ba37e0e5bebc41d3bd9b9faad46",
  },
] as const;

test("all registered SylvaHero source files and binary assets match exact SHA-256 hashes", () => {
  for (const item of EXPECTED_FILES) {
    assert.equal(fs.existsSync(item.path), true, `Missing required file: ${item.path}`);
    const buf = fs.readFileSync(item.path);
    if ("bytes" in item && item.bytes !== undefined) {
      assert.equal(buf.length, item.bytes, `Byte size mismatch for ${item.path}`);
    }
    const sha = crypto.createHash("sha256").update(buf).digest("hex");
    assert.equal(sha, item.sha256, `SHA-256 mismatch for ${item.path}`);
  }
});

test("SYLVA_TYPOGRAPHY recipe and splitTypographyProps match configured SylvaHero defaults", () => {
  const [typeProps, rest] = splitTypographyProps({
    variant: "living-green" as const,
    headingFont: "lexend",
    bodyFont: "lexend",
    headingWeight: "300",
    bodyWeight: "300",
    primaryColor: "#ffffff",
    headingSize: 63,
    bodySize: 16.5,
    headingLetterSpacing: -0.006,
  });

  assert.equal(rest.variant, "living-green");
  assert.equal(typeProps.headingFont, "lexend");
  assert.equal(typeProps.bodyFont, "lexend");
  assert.equal(SYLVA_TYPOGRAPHY.primaryColor, "#ffffff");
  assert.equal(SYLVA_TYPOGRAPHY.headingWeight, "300");
  assert.equal(SYLVA_TYPOGRAPHY.bodyWeight, "300");
  assert.equal(SYLVA_TYPOGRAPHY.headingSize[1], 63);
  assert.equal(SYLVA_TYPOGRAPHY.bodySize[1], 16.5);
  assert.equal(SYLVA_TYPOGRAPHY.headingLetterSpacing[1], -0.006);
});
