import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  SIDES,
  THEMES,
  hasBadge,
  usable,
  clamp,
  menuPath,
  DOCK_CSS,
} from "./dockUtils";

const ROOT = path.resolve(import.meta.dirname, "../..");

test("Dock pure helpers evaluate badge visibility, row usability, clamping, and SVG menu paths", () => {
  assert.deepEqual(SIDES, ["bottom", "top", "left", "right"]);

  // hasBadge
  assert.equal(hasBadge(0), true);
  assert.equal(hasBadge(5), true);
  assert.equal(hasBadge("New"), true);
  assert.equal(hasBadge(true), true);
  assert.equal(hasBadge(false), false);
  assert.equal(hasBadge(undefined), false);
  assert.equal(hasBadge(null), false);

  // usable
  assert.equal(usable({}), true);
  assert.equal(usable({ separator: false, disabled: false }), true);
  assert.equal(usable({ separator: true }), false);
  assert.equal(usable({ disabled: true }), false);
  assert.equal(usable(null), false);
  assert.equal(usable(undefined), false);

  // clamp
  assert.equal(clamp(0.5, 0, 1), 0.5);
  assert.equal(clamp(-4, 0, 1), 0);
  assert.equal(clamp(12, 0, 1), 1);

  // menuPath generates valid SVG path commands with tail on requested side
  const bottomPath = menuPath(180, 120, "bottom", 90);
  assert.ok(bottomPath.startsWith("M "));
  assert.ok(bottomPath.endsWith("Z"));
  assert.ok(bottomPath.includes("Q "));

  // Themes & CSS
  assert.equal(THEMES.dark["--dock-ink"], "#f4f4f5");
  assert.equal(THEMES.light["--dock-ink"], "#27272a");
  assert.ok(DOCK_CSS.includes(".dock--bottom"));
  assert.ok(DOCK_CSS.includes(".dock-menu"));
});

test("Dock component is integrated at the start (#hero) for Email, Phone, LinkedIn, GitHub, and Location", () => {
  const dockCssPath = path.join(ROOT, "src/components/Dock.css");
  const dockTsxPath = path.join(ROOT, "src/components/Dock.tsx");
  assert.ok(fs.existsSync(dockCssPath), "Dock.css must exist");
  assert.ok(fs.existsSync(dockTsxPath), "Dock.tsx must exist");

  const portfolioSource = fs.readFileSync(path.join(ROOT, "src/portfolio/aakarshPortfolio.ts"), "utf8");
  assert.ok(
    portfolioSource.includes("aakarsh-hero-dock-mount"),
    "aakarshPortfolio.ts must mount #aakarsh-hero-dock-mount in the Hero section"
  );

  const sceneSource = fs.readFileSync(path.join(ROOT, "src/Scene.tsx"), "utf8");
  assert.ok(sceneSource.includes("<Dock"), "Scene.tsx must render <Dock />");
  assert.ok(sceneSource.includes("Mail01Icon"), "Scene.tsx must include Email icon in Dock");
  assert.ok(sceneSource.includes("Call02Icon"), "Scene.tsx must include Phone icon in Dock");
  assert.ok(sceneSource.includes("Linkedin01Icon"), "Scene.tsx must include LinkedIn icon in Dock");
  assert.ok(sceneSource.includes("GithubIcon"), "Scene.tsx must include GitHub icon in Dock");
  assert.ok(sceneSource.includes("Location01Icon"), "Scene.tsx must include Location icon in Dock");
  assert.ok(sceneSource.includes("mr.aakarshyadav@gmail.com"), "Scene.tsx must include real email");
  assert.ok(sceneSource.includes("+91 9607555095"), "Scene.tsx must include real phone");
  assert.ok(sceneSource.includes("/in/aakarsh-yadav"), "Scene.tsx must include real LinkedIn handle");
});
