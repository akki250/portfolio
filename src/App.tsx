/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Code2,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Type,
  Wand2,
  ArrowUpRight,
  Mail,
  Phone,
  Github,
  Linkedin,
  GraduationCap,
  ShieldCheck,
  Sliders,
  Layers,
  Send,
  CheckCircle2,
} from 'lucide-react';
import {
  PARTICLE_COUNT,
  RGB,
  SHAPE_ORDER,
  ShapeId,
  TIMELINE_KEYFRAMES,
  clamp,
  computeScrubTextTransform,
  computeWheelScrollStep,
  interpolateKeyframes,
} from './engine/math';
import { ParticleCanvas, ProjectHoverState } from './components/ParticleCanvas';
import { ShortcutModal } from './components/ShortcutModal';
import { SwiftCodeModal } from './components/SwiftCodeModal';
import { ShaderStudioModal } from './components/ShaderStudioModal';
import { ShaderProvider } from './components/visual/ShaderProvider';
import { useVisualContext } from './contexts/VisualContext';
import { ShaderModeId } from './components/visual/shaderEngineLogic';
import {
  GlitchHeading,
  GlitchStageCard,
  useRandomRgbGlitch,
} from './components/visual/RgbGlitch';

interface ProjectItem {
  id: string;
  title: string;
  stack: string;
  tag: string;
  metrics: string;
  summary: string;
  highlights: string;
  shape: ShapeId;
  shaderHint: ShaderModeId;
  accent: RGB;
  accentHex: string;
}

const PROJECTS: ProjectItem[] = [
  {
    id: 'recircuit',
    title: 'ReCircuit',
    stack: 'React 19 · FastAPI · MongoDB · Stripe',
    tag: 'E-Waste Marketplace',
    metrics: 'AI Waste Classifier · INR Stripe Checkout',
    summary:
      'Built an e-waste platform where users upload a photo, the app classifies the waste type, and matches them with verified recyclers through a marketplace.',
    highlights:
      'Integrated Stripe Checkout (INR) for seamless payments, photo-based waste classification, and recycler marketplace matching.',
    shape: 'torus',
    shaderHint: 'fluid',
    accent: { r: 0, g: 240, b: 255 },
    accentHex: '#00f0ff',
  },
  {
    id: 'movemycar',
    title: 'Move My Car',
    stack: 'React · TS · Express · PostgreSQL · Twilio',
    tag: 'Privacy QR System',
    metrics: 'Twilio Masked Calling · Multi-QR Tokens',
    summary:
      'Full-stack QR-code system that lets people contact a car owner without exposing their phone number using Twilio masked calling and Google Sheets logging.',
    highlights:
      'Deployed backend on Vercel; rebuilding on MongoDB with private per-user QR tokens and multiple QR codes per user.',
    shape: 'bulb',
    shaderHint: 'aurora',
    accent: { r: 168, g: 85, b: 247 },
    accentHex: '#a855f7',
  },
  {
    id: 'landline',
    title: 'Smart Landline Automation',
    stack: 'ESP32 · C++ · Arduino · LDR · Servos',
    tag: 'Embedded Hardware',
    metrics: 'Dual-Servo Actuation · Zero Line Tap',
    summary:
      'Detects a phone’s flashing ring light with an LDR sensor, then drives two servos to lift the receiver, press #, and hang up automatically.',
    highlights:
      'Engineered a non-invasive optical LDR sensor approach to avoid physically tapping or modifying the high-voltage telephone line.',
    shape: 'chip',
    shaderHint: 'energy-wave',
    accent: { r: 34, g: 211, b: 238 },
    accentHex: '#22d3ee',
  },
  {
    id: 'fireextinguisher',
    title: 'Automatic Fire Extinguisher',
    stack: 'Arduino · C++ · Flame Sensors · Relay',
    tag: 'Autonomous Robotics',
    metrics: 'Dual Flame Triangulation · Servo Pump',
    summary:
      'Uses two flame sensors to triangulate and locate a fire, aims a servo-mounted nozzle at the heat source, and triggers a relay-driven water pump.',
    highlights:
      'Closed-loop embedded C++ control loop combining dual IR flame sensing, servo targeting, and high-current relay switching.',
    shape: 'bulb',
    shaderHint: 'metaball',
    accent: { r: 192, g: 132, b: 252 },
    accentHex: '#c084fc',
  },
  {
    id: 'esp32audio',
    title: 'ESP32 Live Audio Streaming',
    stack: 'ESP32 · I²S Digital Mic · iOS Stream',
    tag: 'In Progress',
    metrics: 'Authenticated I²S · Physical Mute + LED',
    summary:
      'Designing a consent-based, authenticated live audio streaming system from an ESP32 I²S microphone to an iPhone with hardware privacy controls.',
    highlights:
      'Features a physical hardware mic cut-off switch and hardware status LED indicator alongside authenticated packet streaming.',
    shape: 'brain',
    shaderHint: 'particles',
    accent: { r: 139, g: 92, b: 246 },
    accentHex: '#8b5cf6',
  },
  {
    id: 'browsergames',
    title: 'Browser Games Suite',
    stack: 'TypeScript · HTML5 Canvas · Physics',
    tag: 'Interactive Games',
    metrics: 'Beach Buggy · Wheelspin vs Wheelspin',
    summary:
      'Designed and built playable web games from scratch, including Beach Buggy and Wheelspin vs Wheelspin, with custom arcade physics loops.',
    highlights:
      'Zero-dependency 60fps browser game loops, custom collision detection, and responsive keyboard/touch controls.',
    shape: 'torus',
    shaderHint: 'liquid-glass',
    accent: { r: 56, g: 189, b: 248 },
    accentHex: '#38bdf8',
  },
];

const SKILL_GROUPS = [
  {
    category: 'Languages & Shaders',
    items: 'GLSL · TypeScript / JavaScript · Python · C · C++ (Arduino) · Java (DSA)',
  },
  {
    category: 'Web, 3D & Backend',
    items: 'React 19 · Three.js / WebGL · GSAP · Vite · Tailwind CSS · Node / Express · FastAPI',
  },
  {
    category: 'Data & Cloud',
    items: 'MongoDB · PostgreSQL · Stripe Checkout · Twilio · Vercel',
  },
  {
    category: 'Hardware & Interests',
    items: 'ESP32 · Arduino · I²S · Sensors · Servos · Relays · Motorsports · Poetry · Badminton',
  },
];

const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

const STAGE_CONFIGS = [
  { center: 0.0, hold: 0.075, fade: 0.085 },
  { center: 0.25, hold: 0.075, fade: 0.085 },
  { center: 0.5, hold: 0.075, fade: 0.085 },
  { center: 0.75, hold: 0.075, fade: 0.085 },
  { center: 1.0, hold: 0.075, fade: 0.085 },
];

interface PortfolioContentProps {
  targetScrollProgress: number;
  setTargetScrollProgress: React.Dispatch<React.SetStateAction<number>>;
}

function PortfolioContent({
  targetScrollProgress,
  setTargetScrollProgress,
}: PortfolioContentProps) {
  const {
    activeShader,
    autoSyncRoute,
    constellationOverlayEnabled,
    presets,
    modes,
    setShaderMode,
    setAutoSyncRoute,
    syncRouteKeyframe,
    triggerShaderRipple,
    setHoverAccentTint,
  } = useVisualContext();

  const [activeKeyframeIndex, setActiveKeyframeIndex] = useState(0);

  // Interactive overrides
  const [manualShapeOverride, setManualShapeOverride] = useState<ShapeId | null>(null);
  const [customTypedWord, setCustomTypedWord] = useState('');
  const [hoveredProject, setHoveredProject] = useState<ProjectHoverState | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [forceMode, setForceMode] = useState<'repel' | 'swirl'>('repel');
  const [isPaused, setIsPaused] = useState(false);
  const [rainbowBurstTrigger, setRainbowBurstTrigger] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [particleCount, setParticleCount] = useState<number>(PARTICLE_COUNT);

  // Contact quick message state
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Overlays
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);
  const [isSwiftModalOpen, setIsSwiftModalOpen] = useState(false);
  const [isShaderStudioOpen, setIsShaderStudioOpen] = useState(false);

  // Random 8–12s RGB-split glitch scheduler for main headings & active stage cards
  const handleGlitchBurst = useCallback(() => {
    triggerShaderRipple(0.5, 0.5, 0.42);
  }, [triggerShaderRipple]);
  const { glitchPulse, isGlitching, nextDelayMs, triggerGlitchNow } =
    useRandomRgbGlitch(handleGlitchBurst);

  // Direct DOM refs for 60fps scrubbed transforms without triggering 60Hz React re-renders
  const waveRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<(HTMLElement | null)[]>([null, null, null, null, null]);
  const timelineReadoutRef = useRef<HTMLSpanElement | null>(null);
  const activeKfRef = useRef(0);
  const konamiIndexRef = useRef(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const triggerTactilePulse = useCallback((freq = 140) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
      if (
        typeof navigator !== 'undefined' &&
        (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent))
      ) {
        return;
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.028);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.028);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Ignore if audio context is blocked before interaction
    }
  }, []);

  // Compute scroll progress (0 to 1) calibrated so 20 scrolls (0.0125 per scroll) completes 1 transition (0.25 interval)
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('[role="dialog"]')) return;
      setManualShapeOverride(null);
      const step = computeWheelScrollStep(e.deltaY, e.deltaMode);
      setTargetScrollProgress((prev) => clamp(prev + step, 0, 1));
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [setTargetScrollProgress]);

  // Smoothly scrub to a specific timeline progress value (0..1) and sync WebGL shader preset
  const scrollToProgress = useCallback(
    (progress: number) => {
      const clamped = clamp(progress, 0, 1);
      setManualShapeOverride(null);
      setTargetScrollProgress(clamped);
      const kfIdx = Math.round(clamped * 4);
      syncRouteKeyframe(kfIdx);
      triggerShaderRipple(0.5, 0.5, 0.95);
      triggerTactilePulse(165);
    },
    [setTargetScrollProgress, syncRouteKeyframe, triggerShaderRipple, triggerTactilePulse]
  );

  const lastAppliedScrollRef = useRef(-1);

  // Apply lerped scrollProgress directly to DOM elements at 60fps (zero React reconciliation overhead)
  const handleScrollProgressFrame = useCallback(
    (smoothed: number, _velocity: number) => {
      if (Math.abs(smoothed - lastAppliedScrollRef.current) < 0.0005) {
        return;
      }
      lastAppliedScrollRef.current = smoothed;

      const kfState = interpolateKeyframes(smoothed);

      if (waveRef.current) {
        waveRef.current.style.transform = `translate3d(0, ${Math.round(-smoothed * 64)}px, 0)`;
      }

      for (let i = 0; i < STAGE_CONFIGS.length; i++) {
        const el = stageRefs.current[i];
        if (!el) continue;
        const cfg = STAGE_CONFIGS[i];
        const t = computeScrubTextTransform(smoothed, cfg.center, cfg.hold, cfg.fade);
        el.style.opacity = String(t.opacity);
        el.style.transform = `translate3d(0, ${Math.round(t.translateY)}px, 0) scale(${t.scale})`;
        el.style.pointerEvents = t.pointerEvents;
        el.style.visibility = t.opacity <= 0.005 ? 'hidden' : 'visible';
      }

      if (timelineReadoutRef.current) {
        timelineReadoutRef.current.textContent = `${Math.round(smoothed * 100)}%`;
      }

      if (activeKfRef.current !== kfState.activeKeyframeIndex) {
        activeKfRef.current = kfState.activeKeyframeIndex;
        setActiveKeyframeIndex(kfState.activeKeyframeIndex);
        syncRouteKeyframe(kfState.activeKeyframeIndex);
      }
    },
    [syncRouteKeyframe]
  );

  // Keyboard shortcuts: 1-5 shapes, Up/Down arrows navigate sections, Spacebar pause, ? overlay, Konami code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isTypingInInput = activeTag === 'input' || activeTag === 'textarea';

      const expectedKey = KONAMI_SEQUENCE[konamiIndexRef.current];
      if (e.key.toLowerCase() === expectedKey.toLowerCase()) {
        konamiIndexRef.current += 1;
        if (konamiIndexRef.current === KONAMI_SEQUENCE.length) {
          konamiIndexRef.current = 0;
          setRainbowBurstTrigger((c) => c + 1);
          triggerShaderRipple(0.5, 0.5, 1.8);
          triggerTactilePulse(260);
        }
      } else {
        konamiIndexRef.current = e.key === 'ArrowUp' ? 1 : 0;
      }

      if (e.key === 'Escape') {
        setIsShortcutOpen(false);
        setIsSwiftModalOpen(false);
        setIsShaderStudioOpen(false);
        setSelectedProject(null);
        return;
      }

      if (isTypingInInput) return;

      if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key, 10) - 1;
        const chosen = SHAPE_ORDER[idx];
        if (chosen) {
          setManualShapeOverride(chosen);
          setCustomTypedWord('');
          triggerTactilePulse(180);
        }
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
        triggerTactilePulse(120);
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutOpen((prev) => !prev);
        triggerTactilePulse(190);
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        triggerGlitchNow();
        triggerTactilePulse(175);
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = Math.min(TIMELINE_KEYFRAMES.length - 1, activeKfRef.current + 1);
        scrollToProgress(TIMELINE_KEYFRAMES[nextIdx].progress);
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = Math.max(0, activeKfRef.current - 1);
        scrollToProgress(TIMELINE_KEYFRAMES[prevIdx].progress);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToProgress, triggerGlitchNow, triggerShaderRipple, triggerTactilePulse]);

  const currentKeyframe = TIMELINE_KEYFRAMES[activeKeyframeIndex] || TIMELINE_KEYFRAMES[0];
  const activeShapeId: ShapeId = hoveredProject
    ? hoveredProject.shape
    : manualShapeOverride || currentKeyframe.shape;

  const activeShapeLabel: string =
    customTypedWord.trim().length > 0
      ? customTypedWord.trim().toUpperCase()
      : activeShapeId;

  const renderScroll =
    lastAppliedScrollRef.current >= 0 ? lastAppliedScrollRef.current : targetScrollProgress;
  const stageStyles = STAGE_CONFIGS.map((cfg) => {
    const t = computeScrubTextTransform(renderScroll, cfg.center, cfg.hold, cfg.fade);
    return {
      opacity: t.opacity,
      transform: `translate3d(0, ${Math.round(t.translateY)}px, 0) scale(${t.scale})`,
      pointerEvents: t.pointerEvents,
      visibility: (t.opacity <= 0.005 ? 'hidden' : 'visible') as 'hidden' | 'visible',
    };
  });

  const currentShaderPreset = presets[activeShader as ShaderModeId] || presets.aurora;

  return (
    <div
      data-active-shape={activeShapeLabel}
      data-active-keyframe={currentKeyframe.id}
      data-active-shader={activeShader}
      data-glitch-active={isGlitching ? 'true' : 'false'}
      data-glitch-count={glitchPulse}
      data-glitch-next-ms={nextDelayMs}
      className="relative z-10 h-screen w-full overflow-hidden text-zinc-100 select-none"
    >
      <div className="relative w-full h-screen overflow-hidden">
        {/* Subtle Volumetric Horizon Wave Ribbon over the WebGL Shader */}
        <div
          ref={waveRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-45"
        >
          <svg
            viewBox="0 0 1440 420"
            fill="none"
            preserveAspectRatio="none"
            className="absolute -bottom-24 inset-x-0 w-full h-[340px]"
          >
            <defs>
              <linearGradient id="shaderHorizonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#00f0ff" stopOpacity="0.50" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.30" />
              </linearGradient>
            </defs>
            <path
              d="M0,210 C360,130 720,290 1080,180 C1260,130 1360,170 1440,150"
              stroke="url(#shaderHorizonGlow)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M0,265 C420,190 820,320 1180,220 C1310,185 1390,210 1440,195"
              stroke="rgba(139, 92, 246, 0.22)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>

        {/* 60fps Batched 3D Particle Constellation Canvas (layered harmoniously over the WebGL shader) */}
        {constellationOverlayEnabled && (
          <ParticleCanvas
            targetScrollProgress={targetScrollProgress}
            onScrollProgressFrame={handleScrollProgressFrame}
            manualShapeOverride={manualShapeOverride}
            onCycleShape={(next) => {
              setManualShapeOverride(next);
              setCustomTypedWord('');
              triggerShaderRipple(0.5, 0.5, 1.15);
              triggerTactilePulse(175);
            }}
            customTypedWord={customTypedWord}
            hoveredProject={hoveredProject}
            forceMode={forceMode}
            isPaused={isPaused}
            rainbowBurstTrigger={rainbowBurstTrigger}
            zoomScale={zoomScale}
            onZoomChange={setZoomScale}
            particleCount={particleCount}
          />
        )}

        {/* Top Bar with Navigation & Live WebGL Shader Studio Controls */}
        <header className="cyber-bar absolute top-3 inset-x-3 md:inset-x-10 z-30 flex items-center justify-between gap-2 md:gap-4 px-3.5 md:px-5 py-2 md:py-2.5">
          {/* Zone 1: Brand Wordmark + Live Shader Engine Pill */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <a
              href="#overview"
              onClick={(e) => {
                e.preventDefault();
                scrollToProgress(0);
              }}
              className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white font-display whitespace-nowrap"
            >
              Aakarsh Yadav
            </a>
            <button
              type="button"
              onClick={() => setIsShaderStudioOpen(true)}
              title="Open WebGL Shader Studio (6 Custom GLSL Shaders)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/35 text-[11px] font-mono text-cyan-300 hover:border-cyan-400 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>GLSL: {currentShaderPreset.id}.frag</span>
            </button>
          </div>

          {/* Zone 2: 5 Timeline Stage Navigation Links */}
          <nav
            aria-label="Timeline navigation"
            className="hidden lg:flex items-center gap-5 text-sm font-medium"
          >
            {TIMELINE_KEYFRAMES.map((kf, idx) => {
              const isActive = activeKeyframeIndex === idx;
              return (
                <a
                  key={kf.id}
                  href={`#${kf.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setAutoSyncRoute(true);
                    scrollToProgress(kf.progress);
                  }}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'text-cyan-300 font-semibold border-b-2 border-cyan-400'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {kf.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Shader Studio + SwiftUI Source Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsShaderStudioOpen(true);
                triggerTactilePulse(170);
              }}
              className="spring-interactive cyber-btn-cyan flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Shader Studio</span>
              <span className="sm:hidden">Shaders</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSwiftModalOpen(true);
                triggerTactilePulse(180);
              }}
              className="spring-interactive cyber-btn-yellow flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SwiftUI Source</span>
              <span className="sm:hidden">SwiftUI</span>
            </button>
          </div>
        </header>

        {/* Floating Type-to-Morph Showcase Banner when custom word is active */}
        {customTypedWord.trim().length > 0 && (
          <div className="absolute top-20 inset-x-0 z-20 flex justify-center pointer-events-none px-4">
            <div className="pointer-events-auto cyber-card flex items-center gap-3 px-4 py-2 text-xs font-mono text-zinc-100">
              <span className="text-cyan-300">Type-to-Morph Active:</span>
              <span className="font-bold tracking-wider text-violet-300">
                &ldquo;{customTypedWord.trim().toUpperCase()}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setCustomTypedWord('')}
                className="ml-1 px-2.5 py-0.5 rounded cyber-control text-xs"
              >
                Return to Stage
              </button>
            </div>
          </div>
        )}

        {/* Scrubbed Viewport Narrative Stage (Driven 100% by scrollProgress) */}
        <main
          className={`absolute inset-0 z-10 pointer-events-none flex items-center justify-center px-3 sm:px-6 md:px-14 pt-16 pb-24 md:py-0 transition-opacity duration-300 ${
            customTypedWord.trim().length > 0 ? 'opacity-5' : 'opacity-100'
          }`}
        >
          <div className="relative w-full max-w-[1260px] h-full flex items-center">
            {/* STAGE 0 (0.00): Aakarsh Yadav Overview & Bio (Aurora + Fluid Distortion Shader) */}
            <section
              ref={(el) => {
                stageRefs.current[0] = el;
              }}
              aria-label="Overview"
              className="w-full md:w-[52%] pr-0 md:pr-8 max-h-full overflow-y-auto md:overflow-visible"
              style={stageStyles[0]}
            >
              <GlitchStageCard
                isActiveStage={activeKeyframeIndex === 0}
                glitchPulse={glitchPulse}
                staggerIndex={0}
                className="cyber-card p-4 sm:p-6 md:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] sm:text-xs font-mono tracking-wider text-cyan-300">
                    01. B.Tech Computer Engineering · NMIMS MPSTME, Navi Mumbai · Expected 2029
                  </p>
                  <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/20 border border-violet-400/30 text-violet-200">
                    Shader: {currentShaderPreset.name}
                  </span>
                </div>

                <GlitchHeading
                  as="h1"
                  isActiveStage={activeKeyframeIndex === 0}
                  glitchPulse={glitchPulse}
                  className="font-display font-bold tracking-tight shader-text-gradient leading-[1.05]"
                  style={{ fontSize: 'clamp(1.95rem, 4.1vw, 3.65rem)', textWrap: 'balance' }}
                >
                  Aakarsh Yadav
                </GlitchHeading>
                <p className="mt-1.5 sm:mt-2 text-base sm:text-lg md:text-xl font-display font-medium text-violet-300">
                  Full-Stack Web, Creative WebGL &amp; Embedded Hardware Engineer
                </p>
                <p className="mt-2.5 sm:mt-3.5 text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed max-w-[54ch]">
                  Ideas take shape where generative shaders and web engineering meet the hardware
                  workbench—from React 19 &amp; FastAPI e-waste marketplaces and Twilio
                  masked-calling QR platforms to bare-metal ESP32 I²S audio streaming, optical LDR
                  landline robotics, and autonomous fire-suppression hardware.
                </p>

                <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToProgress(0.5)}
                    className="spring-interactive cyber-btn-yellow px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap"
                  >
                    Explore 6 Projects
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToProgress(0.25)}
                    className="spring-interactive cyber-btn-cyan px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    IEEE Experience &amp; Education
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShaderStudioOpen(true)}
                    className="spring-interactive cyber-control px-3 py-2 sm:py-2.5 text-xs font-mono whitespace-nowrap flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-300" />
                    6 GLSL Shaders
                  </button>
                </div>

                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-violet-500/25 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] sm:text-xs text-slate-300 font-mono">
                  <a
                    href="mailto:mr.aakarshyadav@gmail.com"
                    className="hover:text-cyan-300 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    mr.aakarshyadav@gmail.com
                  </a>
                  <a
                    href="tel:9607555095"
                    className="hover:text-violet-300 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Phone className="w-3.5 h-3.5 text-violet-400" />
                    +91 9607555095
                  </a>
                  <a
                    href="https://github.com/akki250"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-cyan-300 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Github className="w-3.5 h-3.5 text-cyan-400" />
                    github.com/akki250
                  </a>
                  <a
                    href="https://www.linkedin.com/in/aakarsh-yadav/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-violet-300 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-violet-400" />
                    linkedin.com/in/aakarsh-yadav
                  </a>
                </div>
              </GlitchStageCard>
            </section>

            {/* STAGE 1 (0.25): Experience & Education (Organic Metaballs Shader) */}
            <section
              ref={(el) => {
                stageRefs.current[1] = el;
              }}
              aria-label="Experience and Education"
              className="absolute inset-x-0 md:left-auto md:right-0 w-full md:w-[50%] pl-0 md:pl-8 max-h-full overflow-y-auto md:overflow-visible"
              style={stageStyles[1]}
            >
              <p className="text-xs font-mono tracking-wider text-violet-300 mb-2">
                02. Experience &amp; Education · Organic Metaballs + &ldquo;AAKARSH&rdquo; Constellation
              </p>
              <GlitchHeading
                as="h2"
                isActiveStage={activeKeyframeIndex === 1}
                glitchPulse={glitchPulse}
                className="font-display font-bold tracking-tight shader-text-gradient leading-[1.08]"
                style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.8rem)', textWrap: 'balance' }}
              >
                IEEE Student Branch &amp; Computer Engineering.
              </GlitchHeading>

              {/* Experience Card */}
              <GlitchStageCard
                isActiveStage={activeKeyframeIndex === 1}
                glitchPulse={glitchPulse}
                staggerIndex={0}
                className="mt-4 cyber-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>Web Development &amp; Content Member</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    IEEE MPSTME · Navi Mumbai
                  </span>
                </div>
                <ul className="mt-2.5 space-y-2 text-xs md:text-sm text-slate-200 leading-relaxed">
                  <li>
                    • Built and maintained the official IEEE Student Branch website at NMIMS MPSTME
                    Navi Mumbai.
                  </li>
                  <li>
                    • Diagnosed an SEO-spam compromise on the WordPress/Avada site (hidden
                    base64-encoded backlinks) and rebuilt the affected pages as clean,
                    self-contained custom HTML with a circuit-trace visual theme.
                  </li>
                </ul>
              </GlitchStageCard>

              {/* Education Card */}
              <GlitchStageCard
                isActiveStage={activeKeyframeIndex === 1}
                glitchPulse={glitchPulse}
                staggerIndex={1}
                className="mt-3 cyber-card p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-display font-semibold text-white">
                      B.Tech in Computer Engineering (1st Year · Expected 2029)
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      NMIMS Mukesh Patel School of Technology Management &amp; Engineering (MPSTME),
                      Navi Mumbai
                    </div>
                  </div>
                </div>
              </GlitchStageCard>

              {/* Preset Word Morph Triggers */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(['AAKARSH', 'IEEE', 'ESP32', 'MPSTME'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCustomTypedWord(preset === 'AAKARSH' ? '' : preset);
                      triggerShaderRipple(0.35, 0.5, 1.1);
                      triggerTactilePulse(170);
                    }}
                    className={`spring-interactive px-3.5 py-1.5 text-xs font-mono whitespace-nowrap ${
                      customTypedWord.toUpperCase() === preset ||
                      (preset === 'AAKARSH' && customTypedWord === '')
                        ? 'cyber-btn-yellow font-semibold'
                        : 'cyber-control rounded'
                    }`}
                  >
                    Morph &ldquo;{preset}&rdquo;
                  </button>
                ))}
              </div>
            </section>

            {/* STAGE 2 (0.50): All 6 Projects with Hover Shape & Shader Accent Reactions */}
            <section
              ref={(el) => {
                stageRefs.current[2] = el;
              }}
              aria-label="Selected Projects"
              className="absolute inset-x-0 w-full md:w-[60%] pr-0 md:pr-6 max-h-full overflow-y-auto md:overflow-visible"
              style={stageStyles[2]}
            >
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <p className="text-xs font-mono tracking-wider text-cyan-300">
                    03. Full-Stack &amp; Embedded Projects · Hover Cards to Morph Shader &amp; Constellation
                  </p>
                  <GlitchHeading
                    as="h2"
                    isActiveStage={activeKeyframeIndex === 2}
                    glitchPulse={glitchPulse}
                    className="text-2xl md:text-3xl font-display font-bold tracking-tight shader-text-gradient mt-0.5"
                  >
                    Web Platforms, Robotics &amp; Silicon
                  </GlitchHeading>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PROJECTS.map((proj, projIdx) => {
                  const isHovered = hoveredProject?.title === proj.title;
                  return (
                    <GlitchStageCard
                      key={proj.id}
                      as="article"
                      isActiveStage={activeKeyframeIndex === 2}
                      glitchPulse={glitchPulse}
                      staggerIndex={projIdx}
                      data-interactive-card="true"
                      onMouseEnter={() => {
                        setHoveredProject({
                          shape: proj.shape,
                          accent: proj.accent,
                          title: proj.title,
                        });
                        setHoverAccentTint(proj.accent);
                        triggerTactilePulse(155);
                      }}
                      onMouseLeave={() => {
                        setHoveredProject(null);
                        setHoverAccentTint(null);
                      }}
                      onClick={() => {
                        setSelectedProject(proj);
                        setManualShapeOverride(proj.shape);
                        setShaderMode(proj.shaderHint, false);
                        triggerShaderRipple(0.5, 0.5, 1.3);
                        triggerTactilePulse(195);
                      }}
                      className="spring-interactive cyber-card group cursor-pointer p-3.5"
                      style={{
                        borderColor: isHovered ? proj.accentHex : 'rgba(139, 92, 246, 0.28)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                        <span className="truncate">{proj.stack}</span>
                        <span className="text-cyan-300 shrink-0">{proj.tag}</span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between">
                        <h3 className="text-base font-display font-semibold text-white group-hover:text-cyan-300">
                          {proj.title}
                        </h3>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 shrink-0" />
                      </div>

                      <p className="mt-1 text-xs text-slate-300 leading-relaxed line-clamp-2">
                        {proj.summary}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-violet-500/20 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                        <span className="truncate">{proj.metrics}</span>
                        <span
                          className="capitalize font-semibold shrink-0"
                          style={{ color: proj.accentHex }}
                        >
                          → {proj.shape} · {proj.shaderHint}
                        </span>
                      </div>
                    </GlitchStageCard>
                  );
                })}
              </div>

              {selectedProject && (
                <GlitchStageCard
                  isActiveStage={activeKeyframeIndex === 2}
                  glitchPulse={glitchPulse}
                  staggerIndex={6}
                  data-interactive-card="true"
                  className="mt-2.5 cyber-card p-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-mono text-cyan-300 font-semibold">
                      {selectedProject.title} · {selectedProject.stack} (
                      {selectedProject.shape.toUpperCase()} / {selectedProject.shaderHint}.frag)
                    </div>
                    <p className="text-xs text-slate-200 mt-0.5">{selectedProject.highlights}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="cyber-control px-3 py-1 rounded text-xs font-mono shrink-0"
                  >
                    Close
                  </button>
                </GlitchStageCard>
              )}
            </section>

            {/* STAGE 3 (0.75): Skills, Hardware Stack & Shader/Physics Lab */}
            <section
              ref={(el) => {
                stageRefs.current[3] = el;
              }}
              aria-label="Skills and Physics Lab"
              className="absolute inset-x-0 md:left-auto md:right-0 w-full md:w-[50%] pl-0 md:pl-8 max-h-full overflow-y-auto md:overflow-visible"
              style={stageStyles[3]}
            >
              <p className="text-xs font-mono tracking-wider text-cyan-300 mb-2">
                04. Technical Skills, WebGL Shader Presets &amp; Physics Lab
              </p>
              <GlitchHeading
                as="h2"
                isActiveStage={activeKeyframeIndex === 3}
                glitchPulse={glitchPulse}
                className="font-display font-bold tracking-tight shader-text-gradient leading-[1.08]"
                style={{ fontSize: 'clamp(1.75rem, 3.1vw, 2.65rem)', textWrap: 'balance' }}
              >
                Full-stack software, GLSL shaders &amp; ESP32 hardware.
              </GlitchHeading>

              {/* Categorized Skills Grid */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SKILL_GROUPS.map((grp, grpIdx) => (
                  <GlitchStageCard
                    key={grp.category}
                    isActiveStage={activeKeyframeIndex === 3}
                    glitchPulse={glitchPulse}
                    staggerIndex={grpIdx}
                    className="cyber-card p-3"
                  >
                    <div className="text-[11px] font-mono text-violet-300 font-semibold">
                      {grp.category}
                    </div>
                    <div className="text-xs text-slate-200 mt-1 leading-relaxed">{grp.items}</div>
                  </GlitchStageCard>
                ))}
              </div>

              {/* Interactive Shader & Physics Lab Controls */}
              <GlitchStageCard
                isActiveStage={activeKeyframeIndex === 3}
                glitchPulse={glitchPulse}
                staggerIndex={4}
                className="mt-3 cyber-card p-4 space-y-3"
              >
                {/* Direct 6-Shader Switcher */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Site-Wide WebGL Shader Preset</span>
                    <span className="font-mono text-[11px] text-cyan-300">
                      Active: {currentShaderPreset.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(modes as ShaderModeId[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setShaderMode(m, true);
                          triggerShaderRipple(0.5, 0.5, 1.2);
                          triggerTactilePulse(165);
                        }}
                        className={`px-2.5 py-1 text-[11px] font-mono capitalize whitespace-nowrap ${
                          activeShader === m ? 'cyber-btn-yellow font-semibold' : 'cyber-control'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-violet-500/20">
                  <div>
                    <div className="text-xs font-semibold text-white">Cursor Force Field</div>
                    <div className="text-[11px] text-slate-400">
                      Hold click to attract cluster, release for radial wave
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setForceMode('repel');
                        triggerTactilePulse(150);
                      }}
                      className={`px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                        forceMode === 'repel' ? 'cyber-btn-yellow' : 'cyber-control'
                      }`}
                    >
                      Repel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForceMode('swirl');
                        triggerTactilePulse(170);
                      }}
                      className={`px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                        forceMode === 'swirl' ? 'cyber-btn-yellow' : 'cyber-control'
                      }`}
                    >
                      Swirl Vortex
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-violet-500/20">
                  <div className="text-xs font-medium text-white font-mono">
                    PARTICLE_COUNT ({particleCount})
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1400, 2200, 3200].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          setParticleCount(cnt);
                          triggerTactilePulse(160);
                        }}
                        className={`spring-interactive px-3 py-1 text-xs font-mono whitespace-nowrap ${
                          particleCount === cnt ? 'cyber-btn-cyan font-semibold' : 'cyber-control'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-violet-500/20">
                  <label htmlFor="zoom-scale-range" className="text-xs font-medium text-white">
                    Constellation Scale ({zoomScale.toFixed(2)}x)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="zoom-scale-range"
                      type="range"
                      min="0.55"
                      max="2.20"
                      step="0.05"
                      value={zoomScale}
                      onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                      className="w-28 accent-violet-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setZoomScale(1.0)}
                      aria-label="Reset zoom scale"
                      className="cyber-control p-1.5 rounded"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </GlitchStageCard>
            </section>

            {/* STAGE 4 (1.00): Contact & Full SwiftUI / GLSL Export (Liquid Glass Shader) */}
            <section
              ref={(el) => {
                stageRefs.current[4] = el;
              }}
              aria-label="Contact and SwiftUI Export"
              className="absolute inset-x-0 w-full md:w-[56%] pr-0 md:pr-8 max-h-full overflow-y-auto md:overflow-visible"
              style={stageStyles[4]}
            >
              <GlitchStageCard
                isActiveStage={activeKeyframeIndex === 4}
                glitchPulse={glitchPulse}
                staggerIndex={0}
                className="cyber-card p-6 md:p-7"
              >
                <p className="text-xs font-mono tracking-wider text-violet-300 mb-2">
                  05. Direct Contact · Liquid Glass Refraction &amp; Source Export
                </p>
                <GlitchHeading
                  as="h2"
                  isActiveStage={activeKeyframeIndex === 4}
                  glitchPulse={glitchPulse}
                  className="font-display font-bold tracking-tight shader-text-gradient leading-[1.08]"
                  style={{ fontSize: 'clamp(2.0rem, 3.5vw, 3.0rem)', textWrap: 'balance' }}
                >
                  Connect with Aakarsh Yadav.
                </GlitchHeading>
                <p className="mt-2 text-sm text-slate-200 leading-relaxed max-w-[54ch]">
                  Available for full-stack web engineering, creative WebGL experiences, embedded
                  ESP32/Arduino systems, and collaborative hackathons at NMIMS MPSTME Navi Mumbai.
                </p>

                {/* Contact Cards */}
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href="mailto:mr.aakarshyadav@gmail.com"
                    className="spring-interactive cyber-control p-3 rounded flex items-center gap-3"
                  >
                    <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-slate-400">Email</div>
                      <div className="text-xs font-mono text-white truncate">
                        mr.aakarshyadav@gmail.com
                      </div>
                    </div>
                  </a>

                  <a
                    href="tel:9607555095"
                    className="spring-interactive cyber-control p-3 rounded flex items-center gap-3"
                  >
                    <Phone className="w-4 h-4 text-violet-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-slate-400">Phone</div>
                      <div className="text-xs font-mono text-white truncate">+91 9607555095</div>
                    </div>
                  </a>

                  <a
                    href="https://github.com/akki250"
                    target="_blank"
                    rel="noreferrer"
                    className="spring-interactive cyber-control p-3 rounded flex items-center gap-3"
                  >
                    <Github className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-slate-400">GitHub</div>
                      <div className="text-xs font-mono text-white truncate">
                        github.com/akki250
                      </div>
                    </div>
                  </a>

                  <a
                    href="https://www.linkedin.com/in/aakarsh-yadav/"
                    target="_blank"
                    rel="noreferrer"
                    className="spring-interactive cyber-control p-3 rounded flex items-center gap-3"
                  >
                    <Linkedin className="w-4 h-4 text-violet-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-slate-400">LinkedIn</div>
                      <div className="text-xs font-mono text-white truncate">
                        linkedin.com/in/aakarsh-yadav
                      </div>
                    </div>
                  </a>
                </div>

                {/* Quick Direct Message / Pulse Transmission Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!contactMessage.trim()) return;
                    setContactSent(true);
                    triggerShaderRipple(0.5, 0.5, 1.6);
                    triggerTactilePulse(220);
                    setTimeout(() => {
                      setContactSent(false);
                      setContactMessage('');
                    }, 3000);
                  }}
                  className="mt-3.5 flex items-center gap-2"
                >
                  <label htmlFor="quick-contact-input" className="sr-only">
                    Send quick project inquiry
                  </label>
                  <input
                    id="quick-contact-input"
                    type="text"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Send a project inquiry or trigger shader pulse..."
                    className="flex-1 cyber-control px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="spring-interactive cyber-btn-cyan px-4 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {contactSent ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pulse Dispatched</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Transmit</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSwiftModalOpen(true);
                      triggerTactilePulse(200);
                    }}
                    className="spring-interactive cyber-btn-yellow flex items-center gap-2 px-4 py-2 text-xs font-semibold whitespace-nowrap"
                  >
                    <Code2 className="w-4 h-4" />
                    Open SwiftUI (.swift)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsShaderStudioOpen(true);
                      triggerTactilePulse(190);
                    }}
                    className="spring-interactive cyber-btn-cyan flex items-center gap-2 px-4 py-2 text-xs font-semibold whitespace-nowrap"
                  >
                    <Sliders className="w-4 h-4" />
                    Inspect 6 GLSL Shaders
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRainbowBurstTrigger((c) => c + 1);
                      triggerShaderRipple(0.5, 0.5, 1.8);
                      triggerTactilePulse(240);
                    }}
                    className="spring-interactive cyber-control flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4 text-violet-300" />
                    Konami Supernova
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToProgress(0)}
                    className="spring-interactive cyber-control px-3.5 py-2 rounded text-xs font-medium whitespace-nowrap"
                  >
                    Return to Top
                  </button>
                </div>
              </GlitchStageCard>
            </section>
          </div>
        </main>

        {/* Persistent Bottom Interactive Control Dock */}
        <footer className="absolute bottom-3 inset-x-0 z-30 px-4 md:px-10 pointer-events-none flex justify-center">
          <div className="pointer-events-auto cyber-bar w-full max-w-[1220px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            {/* Type-to-Morph Live Text Input */}
            <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-xs">
              <Type className="w-4 h-4 text-cyan-300 shrink-0" />
              <label htmlFor="type-to-morph-input" className="sr-only">
                Type any word to morph particles
              </label>
              <input
                id="type-to-morph-input"
                type="text"
                maxLength={12}
                value={customTypedWord}
                onChange={(e) => {
                  setCustomTypedWord(e.target.value);
                }}
                placeholder="Type to morph particles..."
                className="w-full cyber-control rounded px-3.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
              />
              {customTypedWord && (
                <button
                  type="button"
                  onClick={() => setCustomTypedWord('')}
                  className="cyber-control px-2.5 py-1 text-[11px] font-mono rounded"
                >
                  Reset
                </button>
              )}
            </div>

            {/* 1-5 Direct Shape Switcher */}
            <div
              className="flex items-center gap-1.5"
              role="group"
              aria-label="Select particle shape"
            >
              {SHAPE_ORDER.map((shape, idx) => {
                const isSelected = customTypedWord.trim() === '' && activeShapeId === shape;
                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => {
                      setManualShapeOverride(shape);
                      setCustomTypedWord('');
                      triggerShaderRipple(0.5, 0.5, 0.9);
                      triggerTactilePulse(165 + idx * 15);
                    }}
                    className={`spring-interactive px-1.5 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-mono capitalize whitespace-nowrap ${
                      isSelected ? 'cyber-btn-yellow font-semibold' : 'cyber-control rounded'
                    }`}
                  >
                    {idx + 1}.{shape}
                  </button>
                );
              })}
            </div>

            {/* Live Shader Quick Cycling + Utility Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const list = modes as ShaderModeId[];
                  const nextIdx = (list.indexOf(activeShader as ShaderModeId) + 1) % list.length;
                  setShaderMode(list[nextIdx], true);
                  triggerShaderRipple(0.5, 0.5, 1.25);
                  triggerTactilePulse(175);
                }}
                className="spring-interactive cyber-control hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap"
                title="Cycle through the 6 WebGL GLSL Shaders (fluid, aurora, metaball, particles, energy-wave, liquid-glass)"
              >
                <Layers className="w-3.5 h-3.5 text-violet-300" />
                <span>Shader: {activeShader}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setForceMode((m) => (m === 'repel' ? 'swirl' : 'repel'));
                  triggerTactilePulse(160);
                }}
                className="spring-interactive cyber-control hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap"
                title="Toggle cursor force field mode (Repel vs Swirl)"
              >
                <Wand2 className="w-3.5 h-3.5 text-cyan-300" />
                {forceMode === 'repel' ? 'Force: Repel' : 'Force: Swirl'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPaused((p) => !p);
                  triggerTactilePulse(130);
                }}
                aria-label={isPaused ? 'Resume particle motion' : 'Pause particle motion'}
                className="spring-interactive cyber-control flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap"
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Pause className="w-3.5 h-3.5 text-cyan-300" />
                )}
                <span className="hidden md:inline">{isPaused ? 'Paused' : '60fps'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsShortcutOpen(true);
                  triggerTactilePulse(190);
                }}
                aria-label="Open keyboard shortcuts overlay"
                className="spring-interactive cyber-control flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-300" />
                <span>?</span>
              </button>

              {/* Continuous Timeline Scrub Readout */}
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-violet-500/30 text-xs font-mono text-slate-400 tabular-nums">
                <span>Timeline</span>
                <span ref={timelineReadoutRef} className="text-cyan-300 font-semibold">
                  0%
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Keyboard Shortcut Modal ("?") */}
      <ShortcutModal
        isOpen={isShortcutOpen}
        onClose={() => setIsShortcutOpen(false)}
        onSelectShape={(shape) => {
          setManualShapeOverride(shape);
          setCustomTypedWord('');
          triggerTactilePulse(180);
        }}
        onTriggerKonami={() => {
          setRainbowBurstTrigger((c) => c + 1);
          triggerShaderRipple(0.5, 0.5, 1.8);
          triggerTactilePulse(250);
        }}
        onTogglePause={() => setIsPaused((p) => !p)}
        isPaused={isPaused}
      />

      {/* Full Updated SwiftUI macOS Source Modal */}
      <SwiftCodeModal isOpen={isSwiftModalOpen} onClose={() => setIsSwiftModalOpen(false)} />

      {/* Live WebGL Shader Studio & GLSL Source Modal */}
      <ShaderStudioModal
        isOpen={isShaderStudioOpen}
        onClose={() => setIsShaderStudioOpen(false)}
      />
    </div>
  );
}

export default function App() {
  const [targetScrollProgress, setTargetScrollProgress] = useState(0);

  return (
    <ShaderProvider scrollProgress={targetScrollProgress}>
      <PortfolioContent
        targetScrollProgress={targetScrollProgress}
        setTargetScrollProgress={setTargetScrollProgress}
      />
    </ShaderProvider>
  );
}
