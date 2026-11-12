import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { KageLandingPage } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Call02Icon,
  GithubIcon,
  Linkedin01Icon,
  Location01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import Dock, { type DockItemData } from "./components/Dock";
import ProfileCard from "./components/ProfileCard";
import CursorParticleTrail from "./components/CursorParticleTrail";
import {
  AAKARSH_PORTFOLIO_DATA,
  applyAakarshPortfolio,
  openExternalLinkFromParent,
} from "./portfolio/aakarshPortfolio";

const glyph = (icon: IconSvgElement) => (
  <HugeiconsIcon icon={icon} size="1em" strokeWidth={1.8} />
);

export function Scene() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  const [heroDockMount, setHeroDockMount] = useState<HTMLElement | null>(null);
  const [eternityMount, setEternityMount] = useState<HTMLElement | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleApplyScene = useCallback((frame: HTMLIFrameElement) => {
    frameRef.current = frame;
    setIframeEl((curr) => (curr === frame ? curr : frame));
    applyAakarshPortfolio(frame, ({ heroDockMount: dockEl, profileCardMount: cardEl }) => {
      setHeroDockMount((curr) => (curr === dockEl ? curr : dockEl));
      setEternityMount((curr) => (curr === cardEl ? curr : cardEl));
    });
  }, []);

  const handleContactClick = useCallback(() => {
    setContactOpen((prev) => !prev);
  }, []);

  const handleCopy = useCallback((label: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(label);
    window.setTimeout(() => {
      setCopiedField((curr) => (curr === label ? null : curr));
    }, 1800);
  }, []);

  const scrollToFrameSection = useCallback((selector: string) => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    doc.body.classList.remove("is-locked");
    const target = doc.querySelector<HTMLElement>(selector);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const dockItems: DockItemData[] = useMemo(
    () => [
      {
        icon: glyph(Mail01Icon),
        label: "Email · mr.aakarshyadav@gmail.com",
        active: true,
        badge: 1,
        onClick: () => {
          handleCopy("email", AAKARSH_PORTFOLIO_DATA.email);
          openExternalLinkFromParent(`mailto:${AAKARSH_PORTFOLIO_DATA.email}`, false);
        },
        menu: [
          {
            label: "Send Email (mailto)",
            onClick: () => {
              openExternalLinkFromParent(`mailto:${AAKARSH_PORTFOLIO_DATA.email}`, false);
            },
          },
          {
            label: "Copy mr.aakarshyadav@gmail.com",
            onClick: () => handleCopy("email", AAKARSH_PORTFOLIO_DATA.email),
          },
          { separator: true },
          {
            label: "Inbox Channels",
            items: [
              {
                label: "Primary · mr.aakarshyadav@gmail.com",
                checked: true,
                onClick: () => handleCopy("email", AAKARSH_PORTFOLIO_DATA.email),
              },
              {
                label: "IEEE MPSTME Web Desk",
                onClick: () => scrollToFrameSection("#gate"),
              },
            ],
          },
        ],
      },
      {
        icon: glyph(Call02Icon),
        label: "Phone · +91 9607555095",
        active: true,
        onClick: () => {
          handleCopy("phone", AAKARSH_PORTFOLIO_DATA.phone);
          openExternalLinkFromParent(`tel:${AAKARSH_PORTFOLIO_DATA.phoneTel}`, false);
        },
        menu: [
          {
            label: "Call +91 9607555095",
            onClick: () => {
              openExternalLinkFromParent(`tel:${AAKARSH_PORTFOLIO_DATA.phoneTel}`, false);
            },
          },
          {
            label: "Copy +91 9607555095",
            onClick: () => handleCopy("phone", AAKARSH_PORTFOLIO_DATA.phone),
          },
        ],
      },
      {
        icon: glyph(Linkedin01Icon),
        label: "LinkedIn · /in/aakarsh-yadav",
        active: true,
        onClick: () => {
          openExternalLinkFromParent(AAKARSH_PORTFOLIO_DATA.linkedinUrl, true);
        },
        menu: [
          {
            label: "Open linkedin.com/in/aakarsh-yadav",
            onClick: () => openExternalLinkFromParent(AAKARSH_PORTFOLIO_DATA.linkedinUrl, true),
          },
          {
            label: "Copy linkedin.com/in/aakarsh-yadav",
            onClick: () => handleCopy("linkedin", AAKARSH_PORTFOLIO_DATA.linkedinUrl),
          },
          { separator: true },
          {
            label: "View Holographic Profile Card",
            onClick: () => scrollToFrameSection("#eternity"),
          },
        ],
      },
      {
        icon: glyph(GithubIcon),
        label: "GitHub: akki250",
        active: true,
        badge: 5,
        onClick: () => {
          openExternalLinkFromParent(AAKARSH_PORTFOLIO_DATA.githubUrl, true);
        },
        menu: [
          {
            label: "Open https://github.com/akki250",
            onClick: () => openExternalLinkFromParent(AAKARSH_PORTFOLIO_DATA.githubUrl, true),
          },
          {
            label: "Copy https://github.com/akki250",
            onClick: () => handleCopy("github", AAKARSH_PORTFOLIO_DATA.githubUrl),
          },
          { separator: true },
          {
            label: "5 Flagship Projects",
            items: AAKARSH_PORTFOLIO_DATA.projects.map((p) => ({
              label: `${p.number} · ${p.title}`,
              onClick: () => scrollToFrameSection("#pathways"),
            })),
          },
          { separator: true },
          {
            label: "Technical Skills (DSA in Java)",
            onClick: () => scrollToFrameSection("#lessons"),
          },
        ],
      },
      { separator: true },
      {
        icon: glyph(Location01Icon),
        label: "Navi Mumbai, India",
        onClick: () => {
          scrollToFrameSection("#gate");
        },
        menu: [
          {
            label: "Navi Mumbai, India (IN)",
            checked: true,
            onClick: () => scrollToFrameSection("#gate"),
          },
          { separator: true },
          {
            label: "01 · Education & IEEE",
            onClick: () => scrollToFrameSection("#gate"),
          },
          {
            label: "02 · Flagship Projects (05)",
            onClick: () => scrollToFrameSection("#pathways"),
          },
          {
            label: "03 · Technical Skills",
            onClick: () => scrollToFrameSection("#lessons"),
          },
          {
            label: "04 · Leadership & Profile Card",
            onClick: () => scrollToFrameSection("#eternity"),
          },
        ],
      },
    ],
    [handleCopy, scrollToFrameSection]
  );

  const heroDockElement = (
    <div className="aakarsh-hero-dock-stage">
      <Dock
        items={dockItems}
        baseItemSize={50}
        magnification={70}
        panelHeight={68}
        accentColor="#e0231c"
        badgeColor="#e0231c"
      />
    </div>
  );

  const profileCardElement = (
    <>
      <ProfileCard
        name={AAKARSH_PORTFOLIO_DATA.name}
        title="Full-Stack & Embedded Systems"
        handle={AAKARSH_PORTFOLIO_DATA.github}
        status="Available · IN"
        statusColor="#22c55e"
        contactText={contactOpen ? "Close" : "Contact"}
        avatarUrl="/profile-card/aakarsh-portrait.svg"
        iconUrl="/profile-card/holo-pattern.svg"
        miniAvatarUrl="/profile-card/aakarsh-mini.svg"
        backdropColor="#151926"
        holo={0.88}
        glare={0.55}
        tiltStrength={12}
        parallax={8}
        radius={16}
        enableTilt={true}
        intro={true}
        showUserInfo={true}
        enableMobileTilt={false}
        theme="dark"
        onContactClick={handleContactClick}
      />

      {contactOpen && (
        <div className="aakarsh-contact-popover" role="dialog" aria-label="Contact Aakarsh Yadav">
          <div className="aakarsh-contact-popover__head">
            <span>Direct Channels · Navi Mumbai, IN</span>
            <button
              type="button"
              onClick={() => setContactOpen(false)}
              aria-label="Close contact channels"
            >
              ✕
            </button>
          </div>
          <div className="aakarsh-contact-popover__actions">
            <a
              href={AAKARSH_PORTFOLIO_DATA.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="aakarsh-contact-popover__link"
              onClick={(e) => {
                e.preventDefault();
                openExternalLinkFromParent(AAKARSH_PORTFOLIO_DATA.githubUrl, true);
              }}
            >
              <span>GitHub</span>
              <b>@akki250 ↗</b>
            </a>
            <a
              href={AAKARSH_PORTFOLIO_DATA.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="aakarsh-contact-popover__link"
              onClick={(e) => {
                e.preventDefault();
                openExternalLinkFromParent(AAKARSH_PORTFOLIO_DATA.linkedinUrl, true);
              }}
            >
              <span>LinkedIn</span>
              <b>/in/aakarsh-yadav ↗</b>
            </a>
            <button
              type="button"
              className="aakarsh-contact-popover__link"
              onClick={() => handleCopy("email", AAKARSH_PORTFOLIO_DATA.email)}
            >
              <span>Email</span>
              <b>{copiedField === "email" ? "Copied!" : AAKARSH_PORTFOLIO_DATA.email}</b>
            </button>
            <button
              type="button"
              className="aakarsh-contact-popover__link"
              onClick={() => handleCopy("phone", AAKARSH_PORTFOLIO_DATA.phone)}
            >
              <span>Phone</span>
              <b>{copiedField === "phone" ? "Copied!" : AAKARSH_PORTFOLIO_DATA.phone}</b>
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="shader-frame">
      <KageLandingPage
        headingFont="onest"
        bodyFont="onest"
        headingWeight="400"
        bodyWeight="300"
        primaryColor="#e0231c"
        headingSize={46}
        bodySize={17}
        headingLetterSpacing={-0.012}
        applyScene={handleApplyScene}
      />
      <CursorParticleTrail
        iframeEl={iframeEl}
        primaryColor="#e0231c"
        secondaryColor="#ff8a3d"
        coreColor="#fff7f0"
      />
      {heroDockMount ? createPortal(heroDockElement, heroDockMount) : null}
      {eternityMount ? createPortal(profileCardElement, eternityMount) : null}
    </div>
  );
}
