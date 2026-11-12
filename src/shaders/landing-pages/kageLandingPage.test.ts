import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { KAGE_TYPOGRAPHY } from "./pageRecipes";
import { splitTypographyProps } from "./pageTypography";
import { AAKARSH_PORTFOLIO_DATA } from "../../portfolio/aakarshPortfolio";

function sha256File(relPath: string): { sha256: string; bytes: number } {
  const buf = fs.readFileSync(path.resolve(process.cwd(), relPath));
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  return { sha256, bytes: buf.length };
}

test("all registered KageLandingPage source files and binary assets match exact SHA-256 hashes", () => {
  const expectedFiles: Array<[string, string]> = [
    ["src/shaders/landing-pages/LandingPages.tsx", "4d379461ad00eb4de7900df312878035383de7e1ed4e13283b8143a2eea9d30a"],
    ["src/shaders/landing-pages/pageTypography.ts", "809cc65797d531cd3b3ca5a56815d55d24b3ee8d293e4e4bad6fdfe6c83244cc"],
    ["src/shaders/landing-pages/pageRecipes.ts", "c9d9849cc255bac2d1d938d088c50917f84916f1c516d2bbb27fcfd803523233"],
    ["src/shaders/landing-pages/LandingPageFrame.tsx", "61de2cc50888aac4ac5557420b07fa47ed3543bb57c1e0055fafdefa53dbaa78"],
    ["public/landing-pages/kage.html", "c8e06b90397ac246baf0ab6f32f5f6b570acc6fe03c7009f711b579fb72d9f49"],
    ["public/landing-pages/secret-pathways-assets/fonts.css", "985f85a904a4096f92c06552b06f42a45973ac004af4780d68f18af65ddcc1b0"],
    ["public/landing-pages/secret-pathways-assets/three.min.js", "8a5f7249903b54d30f79f708699d2fed2d6a1d0741a4cd41377d1f01bb5a2271"],
    ["src/shaders/threeui.css", "efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf"],
  ];

  for (const [relPath, expectedHash] of expectedFiles) {
    const { sha256 } = sha256File(relPath);
    assert.equal(sha256, expectedHash, `Hash mismatch for ${relPath}`);
  }

  const expectedAssets: Array<[string, number, string]> = [
    ["public/landing-pages/secret-pathways-assets/generated/kage-sanmon-preview.webp", 186398, "23937f8c8350c55730c3bd17066a250548b2d29aad0e6ffb96218c1354b6db43"],
    ["public/landing-pages/secret-pathways-assets/generated/kage-approach.webp", 180064, "39ff338936097e1bde0c4eadcf09805b9890862703186e67314942de7e0bc36c"],
    ["public/landing-pages/secret-pathways-assets/generated/kage-lantern-court.webp", 197940, "c0a6ff7da1cd6909d66e2f3f690b0d524a693e01d2222ab846d0074a90f47471"],
    ["public/landing-pages/secret-pathways-assets/generated/kage-moonwater.webp", 102234, "b8c8060c51c87a103bae619b3a4cc8b8b80632649d83f1f2c2299051e7f9b400"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/temple-wall.webp", 86466, "41c00f017e4ecf2147ee468d74da955bb4e2dad773f75a575022842eaf7609ce"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/pine-tree.webp", 195918, "79b233716d067bbc64c1507f79e4a30ba5f445995158c78562cc5b81f607ede7"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/tall-grass.webp", 351644, "8db0b5fbd160a7225391a6283a99681e346e205f24191031657285ef85ef12d2"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/sakura-branch.webp", 252528, "48564194d40496090dbf3bba2a68785cf91fafb655dc8d43ac16f6678aff196d"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/maple-leaves.webp", 178208, "35a90fec62c1a6bbfbbe73cd5d7b1acb889e80546d404182ef9a45fe417b531f"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/stone-lantern.webp", 150108, "d5f3c881bc9d92b72eaaff2b709614d66e21a19e14025d2b9b16a15ab52df3bc"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/garden-bush.webp", 286406, "707e2516ebc0108041fe0ddc26d8bff0a69dc9700641f837765018b64e9ff15e"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/basalt-stones.webp", 167866, "150f1c87e181d651c318168c271bb65c9c8abac6dea6f2421fdd081c5b740471"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/hill.webp", 84142, "ffba816244bcba98e4e33c6ee56165edfe4048db4af122ef3f5822180a85edbc"],
    ["public/landing-pages/secret-pathways-assets/foreground/png/shrine-ruins.webp", 145814, "77006e58f2066e6fa9bfc504df396db49b1c7977858fa52d34dd2dad5feced77"],
  ];

  for (const [relPath, expectedBytes, expectedHash] of expectedAssets) {
    const { sha256, bytes } = sha256File(relPath);
    assert.equal(bytes, expectedBytes, `Byte size mismatch for ${relPath}`);
    assert.equal(sha256, expectedHash, `Hash mismatch for ${relPath}`);
  }
});

test("KAGE_TYPOGRAPHY recipe and splitTypographyProps match configured KageLandingPage defaults", () => {
  assert.equal(KAGE_TYPOGRAPHY.primaryColor, "#e0231c");
  assert.equal(KAGE_TYPOGRAPHY.headingWeight, "400");
  assert.equal(KAGE_TYPOGRAPHY.bodyWeight, "300");
  assert.equal(KAGE_TYPOGRAPHY.headingSize[1], 46);
  assert.equal(KAGE_TYPOGRAPHY.bodySize[1], 17);
  assert.equal(KAGE_TYPOGRAPHY.headingLetterSpacing[1], -0.012);

  const [typo, rest] = splitTypographyProps({
    headingFont: "onest",
    bodyFont: "onest",
    headingWeight: "400",
    bodyWeight: "300",
    primaryColor: "#e0231c",
    headingSize: 46,
    bodySize: 17,
    headingLetterSpacing: -0.012,
    className: "custom-frame",
  });
  assert.equal(typo.headingFont, "onest");
  assert.equal(typo.primaryColor, "#e0231c");
  assert.equal(rest.className, "custom-frame");
});

test("AAKARSH_PORTFOLIO_DATA includes complete education, IEEE experience, 5 projects, 5 skill groups, and activities", () => {
  assert.equal(AAKARSH_PORTFOLIO_DATA.name, "Aakarsh Yadav");
  assert.equal(AAKARSH_PORTFOLIO_DATA.email, "mr.aakarshyadav@gmail.com");
  assert.equal(AAKARSH_PORTFOLIO_DATA.phone, "+91 9607555095");
  assert.equal(AAKARSH_PORTFOLIO_DATA.linkedinUrl, "https://www.linkedin.com/in/aakarsh-yadav/");
  assert.equal(AAKARSH_PORTFOLIO_DATA.github, "akki250");
  assert.equal(AAKARSH_PORTFOLIO_DATA.location, "Navi Mumbai, India");
  assert.ok(AAKARSH_PORTFOLIO_DATA.education.institution.includes("NMIMS MPSTME"));
  assert.ok(AAKARSH_PORTFOLIO_DATA.experience.organization.includes("IEEE Student Branch"));
  assert.equal(AAKARSH_PORTFOLIO_DATA.projects.length, 5);
  assert.deepEqual(
    AAKARSH_PORTFOLIO_DATA.projects.map((p) => p.title),
    [
      "ReCircuit",
      "Move My Car",
      "Smart Landline Automation (ESP32)",
      "Arduino Automatic Fire Extinguisher",
      "Portfolio App (SwiftUI, macOS)",
    ]
  );
  assert.equal(AAKARSH_PORTFOLIO_DATA.skills.length, 5);
  assert.equal(AAKARSH_PORTFOLIO_DATA.activities.length, 2);
});
