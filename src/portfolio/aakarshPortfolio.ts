import { PROFILE_CARD_CSS } from "../components/profileCardUtils";
import { DOCK_CSS } from "../components/dockUtils";

export interface PortfolioMounts {
  heroDockMount: HTMLElement | null;
  profileCardMount: HTMLElement | null;
}

export interface ProjectItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  jp: string;
  tag: string;
  bullets: string[];
}

export interface SkillGroup {
  number: string;
  title: string;
  jp: string;
  items: string;
  badge: string;
}

export const AAKARSH_PORTFOLIO_DATA = {
  name: "Aakarsh Yadav",
  location: "Navi Mumbai, India",
  email: "mr.aakarshyadav@gmail.com",
  phone: "+91 9607555095",
  phoneTel: "+919607555095",
  linkedinUrl: "https://www.linkedin.com/in/aakarsh-yadav/",
  github: "akki250",
  githubUrl: "https://github.com/akki250",
  contactItems: [
    { label: "mr.aakarshyadav@gmail.com", href: "mailto:mr.aakarshyadav@gmail.com" },
    { label: "+91 9607555095", href: "tel:+919607555095" },
    { label: "linkedin.com/in/aakarsh-yadav", href: "https://www.linkedin.com/in/aakarsh-yadav/" },
    { label: "GitHub: akki250", href: "https://github.com/akki250" },
    { label: "Navi Mumbai, India", href: "#eternity" },
  ],
  education: {
    degree: "B.Tech, Computer Engineering",
    institution: "NMIMS MPSTME, Navi Mumbai",
    meta: "Expected [Year] | CGPA: [add]",
    summary:
      "B.Tech, Computer Engineering – NMIMS MPSTME, Navi Mumbai · Expected [Year] | CGPA: [add]",
  },
  experience: {
    role: "Web Development & Content Member",
    organization: "IEEE Student Branch, NMIMS MPSTME Navi Mumbai",
    bullets: [
      "Built and maintain the branch website; diagnosed an SEO-spam compromise on the WordPress/Avada site (obfuscated malicious backlinks) and rebuilt the affected pages in clean, self-contained HTML/CSS with a custom PCB-inspired theme",
      "Delivered a standalone, lightweight index.html version of the site",
    ],
  },
  projects: [
    {
      id: "recircuit",
      number: "01",
      title: "ReCircuit",
      subtitle: "E-Waste Marketplace Platform",
      jp: "循環",
      tag: "React 19 · FastAPI · MongoDB · Stripe (INR)",
      bullets: [
        "Web/mobile-responsive SaaS where users upload e-waste photos, which are classified by type and matched to recyclers",
        "React 19 frontend, Python FastAPI backend, MongoDB, Stripe Checkout (INR), recycler matching",
      ],
    },
    {
      id: "move-my-car",
      number: "02",
      title: "Move My Car",
      subtitle: "QR Vehicle Contact System",
      jp: "車両",
      tag: "React · TypeScript · Vite · Tailwind · Express · Twilio",
      bullets: [
        "Full-stack app letting people contact a car owner by scanning a QR code, with Twilio masked calling and Google Sheets logging",
        "React, TypeScript, Vite, Tailwind, Express, deployed on Vercel; redesigning with private per-user QR tokens on MongoDB",
      ],
    },
    {
      id: "smart-landline",
      number: "03",
      title: "Smart Landline Automation (ESP32)",
      subtitle: "IoT Servo & Sensor Telephony Controller",
      jp: "制御",
      tag: "ESP32 · LDR Sensor · Servos · Wi-Fi · Telegram · BLE",
      bullets: [
        "Detects a ringing landline with an LDR light sensor, then uses servos to lift the receiver, press a key and hang up",
        "Designed with a Wi-Fi dashboard, Telegram notifications and Bluetooth control",
      ],
    },
    {
      id: "fire-extinguisher",
      number: "04",
      title: "Arduino Automatic Fire Extinguisher",
      subtitle: "Autonomous Flame-Tracking Suppression Rig",
      jp: "消火",
      tag: "Arduino · Dual Flame Sensors · Servo · Relay Pump",
      bullets: [
        "Dual flame sensors steer a servo toward the fire and trigger a relay-driven water pump",
      ],
    },
    {
      id: "portfolio-macos",
      number: "05",
      title: "Portfolio App (SwiftUI, macOS)",
      subtitle: "Native 3D Morphing Particle Constellation",
      jp: "星座",
      tag: "SwiftUI · macOS · 3D Particle Morphing",
      bullets: [
        "Native app with a 3D particle constellation that morphs between shapes (brain, name, IC chip, bulb)",
      ],
    },
  ] as ProjectItem[],
  skills: [
    {
      number: "01",
      title: "Languages",
      jp: "言語",
      items: "Java, C, TypeScript/JavaScript, Python, HTML/CSS",
      badge: "Core",
    },
    {
      number: "02",
      title: "Web",
      jp: "ウェブ",
      items: "React, Vite, Tailwind, Express, FastAPI, MongoDB, PostgreSQL, WordPress",
      badge: "Full-Stack",
    },
    {
      number: "03",
      title: "Embedded & Hardware",
      jp: "ハード",
      items: "Arduino, ESP32, sensors, servos, relays",
      badge: "IoT & Edge",
    },
    {
      number: "04",
      title: "Other",
      jp: "ツール",
      items: "SwiftUI, Git/GitHub, Vercel, Twilio, Stripe",
      badge: "Platforms",
    },
    {
      number: "05",
      title: "Currently Learning",
      jp: "学習中",
      items: "Data Structures & Algorithms in Java (LeetCode)",
      badge: "DSA / Java",
    },
  ] as SkillGroup[],
  activities: [
    'Hackathon participant – "Rapid Relief" QR-based disaster response coordination dashboard',
    "Applied to Student Affairs Committee (SAC); Class Representative candidate",
  ],
};

function renderWordMaskedHeading(el: HTMLElement, phrase: string) {
  const hadRvIn = el.classList.contains("rv-in");
  el.dataset.wordReady = "true";
  el.classList.add("word-reveal");
  if (hadRvIn) el.classList.add("rv-in");
  el.setAttribute("aria-label", phrase);
  el.textContent = "";
  phrase.split(" ").forEach((word, i) => {
    if (i) el.appendChild(el.ownerDocument.createTextNode(" "));
    const mask = el.ownerDocument.createElement("span");
    const inner = el.ownerDocument.createElement("span");
    mask.className = "word-mask";
    mask.setAttribute("aria-hidden", "true");
    inner.className = "word";
    inner.textContent = word;
    inner.style.setProperty("--word-delay", `${i * 72}ms`);
    mask.appendChild(inner);
    el.appendChild(mask);
  });
}

export function applyAakarshPortfolioToDocument(doc: Document): PortfolioMounts {
  if (!doc || !doc.body) return { heroDockMount: null, profileCardMount: null };
  const d = AAKARSH_PORTFOLIO_DATA;

  doc.title = `${d.name} — Computer Engineering & Full-Stack Portfolio`;

  // Inject ProfileCard component CSS into the iframe document once
  const pcStyleId = "aakarsh-profile-card-css";
  if (!doc.getElementById(pcStyleId)) {
    const pcStyle = doc.createElement("style");
    pcStyle.id = pcStyleId;
    pcStyle.textContent = PROFILE_CARD_CSS;
    doc.head.appendChild(pcStyle);
  }

  // Inject Dock component CSS into the iframe document once
  const dockStyleId = "aakarsh-dock-css";
  if (!doc.getElementById(dockStyleId)) {
    const dockStyle = doc.createElement("style");
    dockStyle.id = dockStyleId;
    dockStyle.textContent = DOCK_CSS;
    doc.head.appendChild(dockStyle);
  }

  // Inject portfolio enhancement styles once
  const styleId = "aakarsh-portfolio-styles";
  if (!doc.getElementById(styleId)) {
    const style = doc.createElement("style");
    style.id = styleId;
    style.textContent = `
      #fg-sky {
        z-index: 6 !important;
        opacity: 0.42 !important;
      }
      .page {
        z-index: 12 !important;
      }
      .aakarsh-hero-dock-mount {
        position: relative;
        z-index: 35 !important;
        margin-top: 10px;
        width: 100%;
        max-width: 380px;
        pointer-events: auto;
      }
      .aakarsh-hero-dock-stage {
        position: relative;
        width: 366px;
        max-width: 100%;
        height: 82px;
        margin-left: -14px;
      }
      .aakarsh-hero-dock-stage .dock--bottom {
        bottom: 6px;
      }
      @media (max-width: 640px) {
        .aakarsh-hero-dock-stage {
          margin-left: 0;
          width: 100%;
        }
      }
      .aakarsh-edu-banner {
        margin-bottom: 18px;
        padding: 14px 18px;
        border-left: 2px solid #e0231c;
        background: rgba(10, 15, 20, 0.78);
        color: #dfe7e0;
        font-size: 14px;
        line-height: 1.55;
      }
      .aakarsh-edu-banner strong {
        display: block;
        font-weight: 500;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-size: 12px;
        color: #e0231c;
        margin-bottom: 4px;
      }
      .aakarsh-project-dossier {
        position: relative;
        z-index: 20;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px;
        margin-top: 28px;
      }
      .aakarsh-project-item {
        padding: 18px 20px;
        border: 1px solid rgba(223, 231, 224, 0.16);
        background: rgba(5, 8, 12, 0.88);
        backdrop-filter: blur(10px);
        transition: border-color 0.3s ease, transform 0.3s ease;
      }
      .aakarsh-project-item:hover {
        border-color: rgba(224, 35, 28, 0.65);
        transform: translateY(-2px);
      }
      .aakarsh-project-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 4px;
      }
      .aakarsh-project-head h3 {
        margin: 0;
        font-size: 16.5px;
        font-weight: 400;
        color: #dfe7e0;
      }
      .aakarsh-project-num {
        font-size: 10.5px;
        letter-spacing: 0.18em;
        color: #e0231c;
        white-space: nowrap;
      }
      .aakarsh-project-sub {
        font-size: 11px;
        letter-spacing: 0.11em;
        text-transform: uppercase;
        color: rgba(223, 231, 224, 0.64);
        margin-bottom: 8px;
      }
      .aakarsh-project-tag {
        display: inline-block;
        font-size: 10.5px;
        letter-spacing: 0.06em;
        color: #dfe7e0;
        background: rgba(224, 35, 28, 0.16);
        border: 1px solid rgba(224, 35, 28, 0.38);
        padding: 3px 7px;
        margin-bottom: 10px;
      }
      .aakarsh-project-bullets {
        margin: 0;
        padding-left: 15px;
        color: rgba(223, 231, 224, 0.84);
        font-size: 12.8px;
        line-height: 1.5;
      }
      .aakarsh-project-bullets li + li {
        margin-top: 5px;
      }
      #cur .les h3 {
        font-size: clamp(17px, 1.5vw, 22px) !important;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
      }
      #cur .les h3 em.jp {
        white-space: nowrap;
        flex-shrink: 0;
      }
      /* Chapter 04 — Activities & Leadership layout with ProfileCard at the very end */
      body[data-layout-closing="b"] #eternity.fin {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
        gap: 0 !important;
      }
      body[data-layout-closing="b"] #eternity.fin .eyebrow {
        margin: 0 0 18px !important;
      }
      body[data-layout-closing="b"] #eternity.fin h2 {
        writing-mode: horizontal-tb !important;
        font-size: clamp(34px, 5.2vw, 72px) !important;
        line-height: 1.04 !important;
        margin: 0 auto 18px !important;
      }
      body[data-layout-closing="b"] #eternity.fin p.body-lg {
        margin: 0 auto !important;
        max-width: 58ch !important;
      }
      .aakarsh-activities-grid {
        position: relative;
        z-index: 15;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 18px;
        width: 100%;
        max-width: 860px;
        margin: 28px auto 36px;
        text-align: left;
      }
      .aakarsh-activity-card {
        padding: 20px 22px;
        border: 1px solid rgba(223, 231, 224, 0.15);
        background: rgba(5, 8, 12, 0.86);
        backdrop-filter: blur(8px);
      }
      .aakarsh-activity-card span {
        display: block;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #e0231c;
        margin-bottom: 8px;
      }
      .aakarsh-activity-card p {
        margin: 0;
        font-size: 14px;
        line-height: 1.55;
        color: #dfe7e0;
      }
      .aakarsh-eternity-profile-mount {
        position: relative;
        z-index: 25 !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 8px auto 12px;
        width: 100%;
        text-align: left;
        pointer-events: auto;
      }
      body[data-layout-closing="b"] #eternity.fin .cta {
        position: relative;
        z-index: 20 !important;
        align-self: center !important;
        margin-top: 28px !important;
      }
      .aakarsh-contact-popover {
        margin-top: 10px;
        width: 340px;
        max-width: calc(100vw - 40px);
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(12, 15, 21, 0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 22px 44px -14px rgba(0, 0, 0, 0.92);
        color: #f4f4f5;
      }
      .aakarsh-contact-popover__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(244, 244, 245, 0.58);
      }
      .aakarsh-contact-popover__head button {
        background: none;
        border: none;
        color: rgba(244, 244, 245, 0.7);
        cursor: pointer;
        font-size: 12px;
        padding: 2px 4px;
      }
      .aakarsh-contact-popover__actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .aakarsh-contact-popover__link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 7px 10px;
        border-radius: 9px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        color: #f4f4f5;
        text-decoration: none;
        font-size: 12px;
        cursor: pointer;
        transition: border-color 0.2s ease, background 0.2s ease;
      }
      .aakarsh-contact-popover__link:hover {
        border-color: rgba(224, 35, 28, 0.55);
        background: rgba(224, 35, 28, 0.12);
      }
      .aakarsh-contact-popover__link span {
        color: rgba(244, 244, 245, 0.6);
      }
      .aakarsh-contact-popover__link b {
        font-weight: 500;
        color: #f4f4f5;
      }
    `;
    doc.head.appendChild(style);
  }

  // 1. Preloader copy
  const preMetaSpan = doc.querySelector("#pre .pre-meta span");
  if (preMetaSpan) preMetaSpan.textContent = "Loading Aakarsh Yadav Portfolio";

  // 2. Top Navigation
  const brandTx = doc.querySelector("#nav .brand-tx");
  if (brandTx) {
    brandTx.innerHTML = `<b>AAKARSH YADAV</b><i>B.TECH COMPUTER ENG · NMIMS MPSTME</i>`;
  }
  const navLinks = doc.querySelectorAll("#nav .nav-link");
  const navConfig = [
    { label: "Experience", jp: "経歴" },
    { label: "Projects", jp: "作品" },
    { label: "Skills", jp: "技術" },
    { label: "Activities", jp: "活動" },
  ];
  navLinks.forEach((link, i) => {
    const cfg = navConfig[i];
    if (!cfg) return;
    const spans = link.querySelectorAll("span");
    if (spans[0]) spans[0].textContent = cfg.label;
    if (spans[1]) spans[1].textContent = cfg.jp;
  });

  // 3. Hero Section
  const heroEyebrow = doc.querySelector("#hero .eyebrow");
  if (heroEyebrow) {
    heroEyebrow.innerHTML = `<span class="dot"></span> ${d.name} · ${d.location} · GitHub: ${d.github}`;
  }

  const heroLines = doc.querySelectorAll<HTMLElement>("#hero h1.display .mask-line");
  const heroPhrases = ["Aakarsh Yadav", "Full-Stack &", "Embedded Systems."];
  heroLines.forEach((line, i) => {
    const phrase = heroPhrases[i] || "";
    if (line.dataset.wordReady === "true") {
      renderWordMaskedHeading(line, phrase);
    } else {
      line.innerHTML = `<span>${phrase}</span>`;
    }
  });

  const heroSub = doc.querySelector<HTMLElement>("#hero .hero-sub");
  let heroDockMount = doc.getElementById("aakarsh-hero-dock-mount");
  if (heroSub) {
    heroSub.textContent =
      "B.Tech, Computer Engineering – NMIMS MPSTME, Navi Mumbai (Expected [Year] | CGPA: [add]). Building full-stack SaaS platforms, ESP32 & Arduino automation, and interactive 3D applications.";
    const legacyStrip = doc.querySelector(".aakarsh-contact-strip");
    if (legacyStrip) legacyStrip.remove();
    if (!heroDockMount) {
      heroDockMount = doc.createElement("div");
      heroDockMount.id = "aakarsh-hero-dock-mount";
      heroDockMount.className = "aakarsh-hero-dock-mount";
      heroSub.insertAdjacentElement("afterend", heroDockMount);
    }
  }

  const heroChips = doc.querySelectorAll("#chips .chip");
  const chipData = [
    {
      num: "01",
      title: "Education",
      desc: "B.Tech, Computer Engineering – NMIMS MPSTME, Navi Mumbai · Expected [Year] | CGPA: [add]",
    },
    {
      num: "02",
      title: "IEEE MPSTME",
      desc: "Web Development & Content Member — diagnosed SEO-spam & rebuilt in custom PCB-inspired HTML/CSS.",
    },
    {
      num: "03",
      title: "5 Flagship Projects",
      desc: "ReCircuit, Move My Car QR, Smart Landline (ESP32), Arduino Fire Extinguisher & macOS Portfolio.",
    },
    {
      num: "04",
      title: "Skills & Activities",
      desc: "Java, C, TS/JS, Python, React, FastAPI, ESP32, Rapid Relief Hackathon & SAC.",
    },
  ];
  heroChips.forEach((chip, i) => {
    const c = chipData[i];
    if (!c) return;
    const numEl = chip.querySelector(".num");
    const bEl = chip.querySelector(".tx b");
    const pEl = chip.querySelector(".tx p");
    if (numEl) numEl.textContent = c.num;
    if (bEl) bEl.textContent = c.title;
    if (pEl) pEl.textContent = c.desc;
  });

  const peek = doc.querySelector("#hero .peek");
  if (peek) {
    peek.setAttribute("aria-label", "Preview: ReCircuit & IEEE MPSTME Engineering");
    const cap = peek.querySelector(".peek-cap");
    if (cap) {
      cap.innerHTML = `<b class="jp">IEEE</b><i>NMIMS MPSTME — PCB Theme & Standalone Build</i>`;
    }
  }

  const wordFb = doc.querySelector("#hero .word-fb");
  if (wordFb) wordFb.textContent = "AAKARSH";

  // 4. Chapter 01 — Education & Experience (#gate)
  const gateHead = doc.querySelector("#gate .sec-head");
  if (gateHead) {
    gateHead.innerHTML = `<span class="k"><b>01</b> — Education &amp; Experience</span><span class="rule"></span><span class="k jp">学歴・経歴</span>`;
  }
  const gateH2 = doc.querySelector<HTMLElement>("#gate h2.display");
  if (gateH2) {
    const text = "IEEE Student Branch & Computer Engineering at NMIMS MPSTME.";
    if (gateH2.dataset.wordReady === "true") {
      renderWordMaskedHeading(gateH2, text);
    } else {
      gateH2.textContent = text;
    }
  }
  const gateCopy = doc.querySelector("#gate .gate-copy");
  if (gateCopy) {
    gateCopy.innerHTML = `
      <div class="aakarsh-edu-banner">
        <strong>Education</strong>
        B.Tech, Computer Engineering – NMIMS MPSTME, Navi Mumbai · Expected [Year] | CGPA: [add]
      </div>
      <p class="lead rv-in" data-rv="up">
        <strong>Web Development &amp; Content Member – IEEE Student Branch, NMIMS MPSTME Navi Mumbai</strong><br>
        • Built and maintain the branch website; diagnosed an SEO-spam compromise on the WordPress/Avada site (obfuscated malicious backlinks) and rebuilt the affected pages in clean, self-contained HTML/CSS with a custom PCB-inspired theme.
      </p>
      <p class="body rv-in" data-rv="up">
        • Delivered a standalone, lightweight <code>index.html</code> version of the site.
      </p>
      <a class="arrowlink rv-in" href="#pathways" data-rv="fade" data-cursor>
        <span>View All 5 Projects</span>
        <span class="ar"><svg viewBox="0 0 14 14" fill="none"><path d="M3 11 11 3M5 3h6v6" stroke="#dfe7e0" stroke-width="1.3"/></svg></span>
      </a>
    `;
  }
  const gateStats = doc.querySelector("#gate .gate-stats");
  if (gateStats) {
    gateStats.innerHTML = `
      <div><b>B.Tech</b><span>Computer Eng · NMIMS MPSTME</span></div>
      <div><b>IEEE</b><span>Web Dev &amp; Content Member</span></div>
      <div><b>05</b><span>Full-Stack, IoT &amp; macOS Builds</span></div>
      <div><b>DSA</b><span>Java (LeetCode) Active</span></div>
    `;
  }

  // 5. Chapter 02 — Projects (#pathways)
  const pathwaysSection = doc.querySelector("#pathways");
  const pathwaysHead = doc.querySelector("#pathways .sec-head");
  if (pathwaysHead) {
    pathwaysHead.innerHTML = `<span class="k"><b>02</b> — Projects</span><span class="rule"></span><span class="k jp">主要プロジェクト</span>`;
  }
  const cards = doc.querySelectorAll("#cards .card");
  const topThreeProjects = d.projects.slice(0, 3);
  cards.forEach((card, i) => {
    const proj = topThreeProjects[i];
    if (!proj) return;
    const lab = card.querySelector(".card-lab");
    const meta = card.querySelector(".card-meta");
    if (lab) {
      lab.innerHTML = `<b>${proj.title}</b><span class="jp">${proj.jp}</span>`;
    }
    if (meta) {
      meta.innerHTML = `<span>${proj.subtitle}</span><span>${proj.number} / 05</span>`;
    }
  });

  if (pathwaysSection && !pathwaysSection.querySelector(".aakarsh-project-dossier")) {
    const dossier = doc.createElement("div");
    dossier.className = "aakarsh-project-dossier";
    dossier.innerHTML = d.projects
      .map(
        (p) => `
        <article class="aakarsh-project-item" data-project-id="${p.id}">
          <div class="aakarsh-project-head">
            <h3>${p.title}</h3>
            <span class="aakarsh-project-num">${p.number} · ${p.jp}</span>
          </div>
          <div class="aakarsh-project-sub">${p.subtitle}</div>
          <span class="aakarsh-project-tag">${p.tag}</span>
          <ul class="aakarsh-project-bullets">
            ${p.bullets.map((b) => `<li>${b}</li>`).join("")}
          </ul>
        </article>
      `
      )
      .join("");
    pathwaysSection.appendChild(dossier);
  }

  // 6. Chapter 03 — Technical Skills (#lessons)
  const lessonsHead = doc.querySelector("#lessons .sec-head");
  if (lessonsHead) {
    lessonsHead.innerHTML = `<span class="k"><b>03</b> — Technical Skills</span><span class="rule"></span><span class="k jp">技術スタック</span>`;
  }
  const lessonsH2 = doc.querySelector<HTMLElement>("#lessons h2.display");
  if (lessonsH2) {
    const text = "Languages, Full-Stack Web, Embedded Hardware & Platforms.";
    if (lessonsH2.dataset.wordReady === "true") {
      renderWordMaskedHeading(lessonsH2, text);
    } else {
      lessonsH2.textContent = text;
    }
  }
  const lessonsSub = doc.querySelector("#lessons .cur-head .body-lg");
  if (lessonsSub) {
    lessonsSub.textContent =
      "Hands-on experience across full-stack web architectures (React 19, TypeScript, FastAPI, Express, MongoDB, PostgreSQL), embedded microcontrollers (ESP32, Arduino, servos, sensors, relays), and native macOS SwiftUI.";
  }
  const lessonRows = doc.querySelectorAll("#cur .les");
  lessonRows.forEach((row, i) => {
    const sk = d.skills[i];
    if (!sk) return;
    const kEl = row.querySelector(".k");
    const h3El = row.querySelector("h3");
    const pEl = row.querySelector("p");
    const tEl = row.querySelector(".t");
    if (kEl) kEl.textContent = sk.number;
    if (h3El) h3El.innerHTML = `${sk.title}<em class="jp">${sk.jp}</em>`;
    if (pEl) pEl.textContent = sk.items;
    if (tEl) tEl.textContent = sk.badge;
  });

  // 7. Chapter 04 — Activities & Leadership (#eternity)
  const eternitySec = doc.querySelector<HTMLElement>("#eternity");
  const eternityEyebrow = doc.querySelector("#eternity .eyebrow");
  if (eternityEyebrow) {
    eternityEyebrow.textContent = "Chapter 04 — Activities & Leadership";
  }
  const eternityH2 = doc.querySelector<HTMLElement>("#eternity h2.display");
  if (eternityH2) {
    const text = "Activities & Leadership";
    if (eternityH2.dataset.wordReady === "true") {
      renderWordMaskedHeading(eternityH2, text);
    } else {
      eternityH2.textContent = text;
    }
  }
  const eternityBody = doc.querySelector<HTMLElement>("#eternity .body-lg");
  if (eternityBody) {
    eternityBody.textContent =
      "Building practical solutions for campus and community — from disaster response coordination to student representation at NMIMS MPSTME, Navi Mumbai.";
    if (eternitySec && !eternitySec.querySelector(".aakarsh-activities-grid")) {
      const actGrid = doc.createElement("div");
      actGrid.className = "aakarsh-activities-grid";
      actGrid.innerHTML = `
        <div class="aakarsh-activity-card">
          <span>Hackathon Participant</span>
          <p>"Rapid Relief" QR-based disaster response coordination dashboard</p>
        </div>
        <div class="aakarsh-activity-card">
          <span>Student Leadership</span>
          <p>Applied to Student Affairs Committee (SAC); Class Representative candidate</p>
        </div>
      `;
      eternityBody.insertAdjacentElement("afterend", actGrid);
    }
  }

  // Mount container for the React Bits <ProfileCard /> at the very end of the Leadership & Activities page
  let profileCardMount = doc.getElementById("aakarsh-profile-card-mount");
  if (eternitySec && !profileCardMount) {
    profileCardMount = doc.createElement("div");
    profileCardMount.id = "aakarsh-profile-card-mount";
    profileCardMount.className = "aakarsh-eternity-profile-mount";
    const ctaEl = eternitySec.querySelector(".cta");
    if (ctaEl) {
      ctaEl.insertAdjacentElement("beforebegin", profileCardMount);
    } else {
      eternitySec.appendChild(profileCardMount);
    }
  }

  const eternityCtaSpan = doc.querySelector("#eternity .cta span");
  if (eternityCtaSpan) {
    eternityCtaSpan.textContent = "Back to Top — Aakarsh Yadav";
  }

  // 8. Footer
  const footBrandP = doc.querySelector(".foot-brand p");
  if (footBrandP) {
    footBrandP.textContent =
      "Aakarsh Yadav — B.Tech, Computer Engineering at NMIMS MPSTME, Navi Mumbai, India. Full-Stack Web, ESP32/Arduino Embedded Systems, and SwiftUI.";
  }
  const footCols = doc.querySelectorAll(".foot-grid > div:not(.foot-brand)");
  if (footCols[0]) {
    footCols[0].innerHTML = `
      <h4>Sections</h4>
      <ul>
        <li><a href="#gate" data-cursor>Education &amp; IEEE</a></li>
        <li><a href="#pathways" data-cursor>Projects (05)</a></li>
        <li><a href="#lessons" data-cursor>Technical Skills</a></li>
        <li><a href="#eternity" data-cursor>Activities &amp; SAC</a></li>
      </ul>
    `;
  }
  if (footCols[1]) {
    footCols[1].innerHTML = `
      <h4>Projects</h4>
      <ul>
        <li><a href="#pathways" data-cursor>ReCircuit SaaS</a></li>
        <li><a href="#pathways" data-cursor>Move My Car QR</a></li>
        <li><a href="#pathways" data-cursor>Smart Landline (ESP32)</a></li>
        <li><a href="#pathways" data-cursor>Arduino Fire Extinguisher</a></li>
      </ul>
    `;
  }
  if (footCols[2]) {
    footCols[2].innerHTML = `
      <h4>Contact</h4>
      <ul>
        <li><a href="mailto:mr.aakarshyadav@gmail.com" data-cursor>mr.aakarshyadav@gmail.com</a></li>
        <li><a href="tel:+919607555095" data-cursor>+91 9607555095</a></li>
        <li><a href="https://www.linkedin.com/in/aakarsh-yadav/" target="_blank" rel="noreferrer" data-cursor>LinkedIn · aakarsh-yadav</a></li>
        <li><a href="https://github.com/akki250" target="_blank" rel="noreferrer" data-cursor>GitHub: akki250</a></li>
      </ul>
    `;
  }
  const footBaseSpans = doc.querySelectorAll(".foot-base span");
  if (footBaseSpans[0]) footBaseSpans[0].textContent = "© 2026 Aakarsh Yadav — Navi Mumbai, India";
  if (footBaseSpans[1]) footBaseSpans[1].textContent = "GitHub: akki250";
  if (footBaseSpans[2]) footBaseSpans[2].textContent = "B.Tech Computer Engineering · NMIMS MPSTME";

  // Update rail button labels
  const railButtons = doc.querySelectorAll("#rail button");
  const railLabels = [
    "Aakarsh Yadav",
    "Education & IEEE",
    "Projects",
    "Technical Skills",
    "Activities",
    "Contact",
  ];
  railButtons.forEach((btn, i) => {
    if (railLabels[i]) {
      btn.setAttribute("title", railLabels[i]);
      btn.setAttribute("aria-label", railLabels[i]);
    }
  });

  return { heroDockMount, profileCardMount };
}

export function openExternalLinkFromParent(url: string, newTab = true): void {
  if (typeof document === "undefined" || !document.body) return;
  const a = document.createElement("a");
  a.href = url;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function applyAakarshPortfolio(
  frame: HTMLIFrameElement,
  onMountsReady?: (mounts: PortfolioMounts) => void
): void {
  const doc = frame.contentDocument;
  const win = frame.contentWindow as (Window & {
    __aakarshObserverAttached?: boolean;
    __aakarshExternalLinkHandler?: boolean;
  }) | null;
  if (!doc || !win) return;

  // Ensure external links inside the sandboxed iframe open cleanly from the parent document
  if (!win.__aakarshExternalLinkHandler) {
    win.__aakarshExternalLinkHandler = true;
    doc.addEventListener("click", (event) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("http://") || href.startsWith("https://")) {
        event.preventDefault();
        openExternalLinkFromParent(href, true);
      } else if (href.startsWith("mailto:") || href.startsWith("tel:")) {
        event.preventDefault();
        openExternalLinkFromParent(href, false);
      }
    });
  }

  const mounts = applyAakarshPortfolioToDocument(doc);
  onMountsReady?.(mounts);

  // Re-apply after boot() / splitHeadingWords() finishes so word-reveal headings stay in sync
  const scheduleSync = () => {
    const updatedMounts = applyAakarshPortfolioToDocument(doc);
    onMountsReady?.(updatedMounts);
    win.dispatchEvent(new Event("resize"));
  };
  win.setTimeout(scheduleSync, 80);
  win.setTimeout(scheduleSync, 450);
}
