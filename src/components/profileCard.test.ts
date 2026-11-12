import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { clamp, isDark, THEMES, FOILS, PROFILE_CARD_CSS } from "./profileCardUtils";

const ROOT = path.resolve(import.meta.dirname, "../..");

test("ProfileCard pure helpers clamp and isDark evaluate edge and nominal cases", () => {
  assert.equal(clamp(0.5, 0, 1), 0.5);
  assert.equal(clamp(-2, -1, 1), -1);
  assert.equal(clamp(3.4, -1, 1), 1);

  // Dark hex colors (3-digit and 6-digit)
  assert.equal(isDark("#000"), true);
  assert.equal(isDark("#131722"), true);
  assert.equal(isDark("27242f"), true);

  // Light hex colors
  assert.equal(isDark("#fff"), false);
  assert.equal(isDark("#f4f4f5"), false);

  // Invalid / non-hex colors return null
  assert.equal(isDark(""), null);
  assert.equal(isDark("rgba(0,0,0,0.5)"), null);
  assert.equal(isDark(undefined), null);
});

test("ProfileCard is mounted at the very end of the Leadership & Activities (#eternity) section", () => {
  assert.equal(THEMES.dark["--pc-ink"], "#f4f4f5");
  assert.equal(THEMES.light["--pc-ink"], "#27272a");
  assert.equal(FOILS.dark["--pc-blend"], "color-dodge");
  assert.equal(FOILS.light["--pc-blend"], "multiply");
  assert.ok(PROFILE_CARD_CSS.includes(".profile-card__holo"));

  const cssPath = path.join(ROOT, "src/components/ProfileCard.css");
  assert.ok(fs.existsSync(cssPath), "ProfileCard.css must exist");

  for (const rel of [
    "public/profile-card/aakarsh-portrait.svg",
    "public/profile-card/holo-pattern.svg",
    "public/profile-card/aakarsh-mini.svg",
  ]) {
    const full = path.join(ROOT, rel);
    assert.ok(fs.existsSync(full), `Missing asset ${rel}`);
    assert.ok(fs.statSync(full).size > 100, `Asset ${rel} is unexpectedly empty`);
  }

  const portfolioSource = fs.readFileSync(path.join(ROOT, "src/portfolio/aakarshPortfolio.ts"), "utf8");
  assert.ok(
    portfolioSource.includes("aakarsh-profile-card-mount"),
    "aakarshPortfolio.ts must create #aakarsh-profile-card-mount inside #eternity"
  );

  const sceneSource = fs.readFileSync(path.join(ROOT, "src/Scene.tsx"), "utf8");
  assert.ok(sceneSource.includes("createPortal"), "Scene.tsx must portal <ProfileCard /> into eternityMount");
  assert.ok(sceneSource.includes("<ProfileCard"), "Scene.tsx must render <ProfileCard />");
});
