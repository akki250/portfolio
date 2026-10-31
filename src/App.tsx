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
} from 'lucide-react';
import {
  PARTICLE_COUNT,
  RGB,
  SHAPE_ORDER,
  ShapeId,
  TIMELINE_KEYFRAMES,
  clamp,
  computeScrubTextTransform,
  interpolateKeyframes,
} from './engine/math';
import { ParticleCanvas, ProjectHoverState } from './components/ParticleCanvas';
import { ShortcutModal } from './components/ShortcutModal';
import { SwiftCodeModal } from './components/SwiftCodeModal';

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  year: string;
  metrics: string;
  summary: string;
  architectureNote: string;
  shape: ShapeId;
  accent: RGB;
  accentHex: string;
}

const PROJECTS: ProjectItem[] = [
  {
    id: 'recircuit',
    title: 'ReCircuit',
    category: 'Circular Hardware Telemetry',
    year: '2026',
    metrics: '99.4% Yield · 140K Boards',
    summary:
      'Computer-vision sorting and closed-loop component harvesting pipeline that maps desoldered silicon back into live inventory constellations.',
    architectureNote: 'Metal Compute Shaders · Swift Concurrency · Sub-millimeter Optical Mesh',
    shape: 'torus',
    accent: { r: 52, g: 211, b: 153 },
    accentHex: '#34d399',
  },
  {
    id: 'landline',
    title: 'Landline',
    category: 'Deterministic Silicon Mesh',
    year: '2025',
    metrics: '0.4ms Jitter · Zero-Alloc',
    summary:
      'Bare-metal packet routing protocol and custom IC layout engineered for ultra-low-latency tactile and studio audio interconnects.',
    architectureNote: 'ARM64 SIMD Intrinsics · Lock-Free Audio Graph · Custom FPGA Bridge',
    shape: 'chip',
    accent: { r: 56, g: 189, b: 248 },
    accentHex: '#38bdf8',
  },
  {
    id: 'cortex',
    title: 'Cortex Studio',
    category: 'Spatial Neural Visualizer',
    year: '2025',
    metrics: '120fps · 2.2K Synaptic Nodes',
    summary:
      'Interactive 3D force-directed constellation profiler for inspecting attention weights and activation ripples across local transformer models.',
    architectureNote: 'SwiftUI Canvas Batching · Accelerate vDSP · NSHapticFeedback Tactile Scrubbing',
    shape: 'brain',
    accent: { r: 167, g: 139, b: 250 },
    accentHex: '#a78bfa',
  },
  {
    id: 'lumina',
    title: 'Lumina Field',
    category: 'Photonic Filament Workbench',
    year: '2024',
    metrics: '60fps · 8 Depth Layers',
    summary:
      'Real-time spectral dispersion and tungsten filament thermal simulation designed for industrial luminaire prototyping on macOS.',
    architectureNote: 'CoreGraphics Glyph Sampler · Physical Bloom Lut · Trackpad Force Scrub',
    shape: 'bulb',
    accent: { r: 251, g: 191, b: 36 },
    accentHex: '#fbbf24',
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
  { center: 0.0, hold: 0.065, fade: 0.14 },
  { center: 0.25, hold: 0.055, fade: 0.13 },
  { center: 0.5, hold: 0.075, fade: 0.13 },
  { center: 0.75, hold: 0.055, fade: 0.13 },
  { center: 1.0, hold: 0.065, fade: 0.14 },
];

export default function App() {
  // Native scroll target (0..1) and discrete active keyframe index (0..4)
  const [targetScrollProgress, setTargetScrollProgress] = useState(0);
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

  // Overlays
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);
  const [isSwiftModalOpen, setIsSwiftModalOpen] = useState(false);

  // Direct DOM refs for 60fps scrubbed transforms without triggering 60Hz React re-renders
  const bgRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<(HTMLElement | null)[]>([null, null, null, null, null]);
  const timelineReadoutRef = useRef<HTMLSpanElement | null>(null);
  const activeKfRef = useRef(0);
  const konamiIndexRef = useRef(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Subtle WebAudio / tactile pulse synthesizing macOS NSHapticFeedbackManager alignment feel
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

  // Compute scroll progress (0 to 1) from native wheel / trackpad momentum
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[role="dialog"]')) return;
      setManualShapeOverride(null);
      setTargetScrollProgress((prev) => clamp(prev + e.deltaY / 3600, 0, 1));
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, []);

  // Smoothly scrub to a specific timeline progress value (0..1)
  const scrollToProgress = useCallback(
    (progress: number) => {
      const clamped = clamp(progress, 0, 1);
      setManualShapeOverride(null);
      setTargetScrollProgress(clamped);
      triggerTactilePulse(165);
    },
    [triggerTactilePulse]
  );

  const lastAppliedScrollRef = useRef(-1);

  // Apply lerped scrollProgress directly to DOM elements at 60fps (zero React reconciliation overhead)
  const handleScrollProgressFrame = useCallback((smoothed: number, _velocity: number) => {
    if (Math.abs(smoothed - lastAppliedScrollRef.current) < 0.0005) {
      return;
    }
    lastAppliedScrollRef.current = smoothed;

    const kfState = interpolateKeyframes(smoothed);

    if (bgRef.current) {
      bgRef.current.style.background = `radial-gradient(circle at ${(
        50 +
        kfState.offsetX * 55
      ).toFixed(1)}% 50%, rgba(${kfState.bgTint.r}, ${kfState.bgTint.g}, ${
        kfState.bgTint.b
      }, 0.92) 0%, rgba(5, 5, 7, 1) 78%)`;
    }

    if (gridRef.current) {
      gridRef.current.style.transform = `translate3d(0, ${Math.round(-smoothed * 180)}px, 0)`;
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
    }
  }, []);

  // Keyboard shortcuts: 1-5 shapes, Up/Down arrows navigate sections, Spacebar pause, ? overlay, Konami code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isTypingInInput = activeTag === 'input' || activeTag === 'textarea';

      // Track Konami code sequence anywhere
      const expectedKey = KONAMI_SEQUENCE[konamiIndexRef.current];
      if (e.key.toLowerCase() === expectedKey.toLowerCase()) {
        konamiIndexRef.current += 1;
        if (konamiIndexRef.current === KONAMI_SEQUENCE.length) {
          konamiIndexRef.current = 0;
          setRainbowBurstTrigger((c) => c + 1);
          triggerTactilePulse(260);
        }
      } else {
        konamiIndexRef.current = e.key === 'ArrowUp' ? 1 : 0;
      }

      if (e.key === 'Escape') {
        setIsShortcutOpen(false);
        setIsSwiftModalOpen(false);
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
  }, [scrollToProgress, triggerTactilePulse]);

  const currentKeyframe = TIMELINE_KEYFRAMES[activeKeyframeIndex] || TIMELINE_KEYFRAMES[0];
  const activeAccent = hoveredProject ? hoveredProject.accent : currentKeyframe.accent;
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

  return (
    <div
      data-active-shape={activeShapeLabel}
      data-active-keyframe={currentKeyframe.id}
      className="relative h-screen w-full overflow-hidden text-zinc-100 select-none"
    >
      <div className="relative w-full h-screen overflow-hidden">
        {/* Dynamic Scrubbed Background Tint (updated via ref at 60fps) */}
        <div
          ref={bgRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 62% 50%, rgba(7, 12, 24, 0.92) 0%, rgba(5, 5, 7, 1) 78%)',
          }}
        />

        {/* Subtle Scrubbed Parallax Coordinate Grid (updated via ref at 60fps) */}
        <div
          ref={gridRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* 60fps Batched 3D Particle Constellation Canvas */}
        <ParticleCanvas
          targetScrollProgress={targetScrollProgress}
          onScrollProgressFrame={handleScrollProgressFrame}
          manualShapeOverride={manualShapeOverride}
          onCycleShape={(next) => {
            setManualShapeOverride(next);
            setCustomTypedWord('');
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

        {/* Top Bar Contract: 3 Zones (Brand Wordmark — 5 Nav Links — 1 Primary Action) */}
        <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between gap-8 px-6 md:px-12 py-4 bg-zinc-950/85 border-b border-white/[0.06]">
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              scrollToProgress(0);
            }}
            className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
          >
            Dala
          </a>

          <nav aria-label="Timeline navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
            {TIMELINE_KEYFRAMES.map((kf, idx) => {
              const isActive = activeKeyframeIndex === idx;
              return (
                <a
                  key={kf.id}
                  href={`#${kf.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToProgress(kf.progress);
                  }}
                  className={`relative py-1 whitespace-nowrap shrink-0 ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {kf.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full"
                      style={{
                        backgroundColor: `rgb(${activeAccent.r}, ${activeAccent.g}, ${activeAccent.b})`,
                      }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsSwiftModalOpen(true);
                triggerTactilePulse(180);
              }}
              className="spring-interactive flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg whitespace-nowrap shrink-0 shadow-sm"
            >
              <Code2 className="w-3.5 h-3.5" />
              SwiftUI Source
            </button>
          </div>
        </header>

        {/* Floating Type-to-Morph Showcase Banner when custom word is active */}
        {customTypedWord.trim().length > 0 && (
          <div className="absolute top-20 inset-x-0 z-20 flex justify-center pointer-events-none px-4">
            <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-950/90 border border-sky-400/40 shadow-lg text-xs font-mono text-zinc-200">
              <span className="text-sky-400">Type-to-Morph Active:</span>
              <span className="font-bold tracking-wider text-white">
                &ldquo;{customTypedWord.trim().toUpperCase()}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setCustomTypedWord('')}
                className="ml-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
              >
                Return to Stage
              </button>
            </div>
          </div>
        )}

        {/* Scrubbed Viewport Narrative Stage (Driven 100% by scrollProgress) */}
        <main
          className={`absolute inset-0 z-10 pointer-events-none flex items-center justify-center px-6 md:px-14 transition-opacity duration-300 ${
            customTypedWord.trim().length > 0 ? 'opacity-5' : 'opacity-100'
          }`}
        >
          <div className="relative w-full max-w-[1240px] h-full flex items-center">
            {/* STAGE 0 (0.00): Overview & Neural Constellation */}
            <section
              ref={(el) => {
                stageRefs.current[0] = el;
              }}
              aria-label="Overview"
              className="w-full md:w-[50%] pr-0 md:pr-8"
              style={stageStyles[0]}
            >
            <p className="text-xs font-mono tracking-wider text-sky-400 mb-3">
              01 · Spatial Systems & Graphics Architecture
            </p>
            <h1
              className="font-display font-bold tracking-tight text-white leading-[1.06]"
              style={{ fontSize: 'clamp(2.35rem, 4.2vw, 3.85rem)', textWrap: 'balance' }}
            >
              Tactile particle constellations engineered at 60fps.
            </h1>
            <p className="mt-5 text-base text-zinc-300 leading-relaxed max-w-[56ch]">
              An interactive macOS & spatial portfolio where every particle responds to cursor force
              fields, continuous scroll-scrubbed keyframe morphing, and real-time glyph synthesis.
              Drag empty space to spin, hold click to collapse into an orbital cluster, or release
              to burst outward.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollToProgress(0.5)}
                className="spring-interactive px-5 py-2.5 rounded-xl text-sm font-medium bg-sky-400 text-zinc-950 hover:bg-sky-300 whitespace-nowrap"
              >
                Explore Selected Works
              </button>
              <button
                type="button"
                onClick={() => setIsSwiftModalOpen(true)}
                className="spring-interactive px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-100 whitespace-nowrap"
              >
                Inspect PortfolioView.swift
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400 font-mono">
              <span>{particleCount.toLocaleString()} Particles</span>
              <span aria-hidden="true">·</span>
              <span>8 Depth Batch Layers</span>
              <span aria-hidden="true">·</span>
              <span>0.08 Lerp Scrubbing</span>
            </div>
          </section>

          {/* STAGE 1 (0.25): Identity & Volumetric Glyph Synthesis (Right Column while Name is Left) */}
          <section
            ref={(el) => {
              stageRefs.current[1] = el;
            }}
            aria-label="Identity"
            className="absolute inset-x-0 md:left-auto md:right-0 w-full md:w-[48%] pl-0 md:pl-8"
            style={stageStyles[1]}
          >
            <p className="text-xs font-mono tracking-wider text-violet-400 mb-3">
              02 · Identity & Real-Time Glyph Synthesis
            </p>
            <h2
              className="font-display font-bold tracking-tight text-white leading-[1.08]"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 3.1rem)', textWrap: 'balance' }}
            >
              Hardware-sympathetic motion without framework bloat.
            </h2>
            <p className="mt-4 text-base text-zinc-300 leading-relaxed max-w-[54ch]">
              Built for native macOS SwiftUI and high-frequency canvases. Instead of switching
              models at rigid scroll thresholds, each particle carries an individual phase delay so
              morphs ripple organically between the cerebral cortex, typographic glyphs, and silicon
              topography.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.08]">
              <div>
                <div className="text-2xl font-display font-bold text-white tabular-nums">
                  16.6ms
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Strict frame budget via depth-bucketed Path2D batching
                </div>
              </div>
              <div>
                <div className="text-2xl font-display font-bold text-white tabular-nums">
                  100%
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Reversible scroll-scrubbed state with zero time triggers
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {(['DALA', 'SWIFTUI', 'METAL', 'SYNAPSE'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setCustomTypedWord(preset === 'DALA' ? '' : preset);
                    triggerTactilePulse(170);
                  }}
                  className={`spring-interactive px-3 py-1.5 rounded-lg text-xs font-mono border whitespace-nowrap ${
                    customTypedWord.toUpperCase() === preset ||
                    (preset === 'DALA' && customTypedWord === '')
                      ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Morph &ldquo;{preset}&rdquo;
                </button>
              ))}
            </div>
          </section>

          {/* STAGE 2 (0.50): Selected Works & Hover Shape Reactions (Left Column while Chip is Right) */}
          <section
            ref={(el) => {
              stageRefs.current[2] = el;
            }}
            aria-label="Selected Projects"
            className="absolute inset-x-0 w-full md:w-[56%] pr-0 md:pr-6"
            style={stageStyles[2]}
          >
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <p className="text-xs font-mono tracking-wider text-emerald-400">
                  03 · Selected Works — Hover Cards to Morph Constellation
                </p>
                <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white mt-1">
                  Production Systems & Silicon Tooling
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {PROJECTS.map((proj) => {
                const isHovered = hoveredProject?.title === proj.title;
                return (
                  <article
                    key={proj.id}
                    data-interactive-card="true"
                    onMouseEnter={() => {
                      setHoveredProject({
                        shape: proj.shape,
                        accent: proj.accent,
                        title: proj.title,
                      });
                      triggerTactilePulse(155);
                    }}
                    onMouseLeave={() => {
                      setHoveredProject(null);
                    }}
                    onClick={() => {
                      setSelectedProject(proj);
                      setManualShapeOverride(proj.shape);
                      triggerTactilePulse(195);
                    }}
                    className="spring-interactive group cursor-pointer rounded-2xl p-4 bg-zinc-950/80 border"
                    style={{
                      borderColor: isHovered ? proj.accentHex : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 font-mono">
                      <span>{proj.category}</span>
                      <span>{proj.year}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <h3 className="text-lg font-display font-semibold text-white group-hover:text-sky-200">
                        {proj.title}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
                    </div>

                    <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed line-clamp-2">
                      {proj.summary}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 whitespace-nowrap">
                      <span className="truncate">{proj.metrics}</span>
                      <span
                        className="capitalize font-medium shrink-0"
                        style={{ color: proj.accentHex }}
                      >
                        → {proj.shape}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            {selectedProject && (
              <div
                data-interactive-card="true"
                className="mt-3 p-4 rounded-xl bg-zinc-900/95 border border-zinc-700/80 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs font-mono text-sky-400">
                    Active Architecture Focus · {selectedProject.title} (
                    {selectedProject.shape.toUpperCase()})
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    {selectedProject.architectureNote}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0"
                >
                  Clear Lock
                </button>
              </div>
            )}
          </section>

          {/* STAGE 3 (0.75): Interactive Physics Lab (Right Column while Bulb is Left) */}
          <section
            ref={(el) => {
              stageRefs.current[3] = el;
            }}
            aria-label="Physics Lab"
            className="absolute inset-x-0 md:left-auto md:right-0 w-full md:w-[48%] pl-0 md:pl-8"
            style={stageStyles[3]}
          >
            <p className="text-xs font-mono tracking-wider text-amber-400 mb-3">
              04 · Interactive Constellation Lab
            </p>
            <h2
              className="font-display font-bold tracking-tight text-white leading-[1.08]"
              style={{ fontSize: 'clamp(1.9rem, 3.3vw, 2.9rem)', textWrap: 'balance' }}
            >
              Tune force fields, batching density, and kinetic response.
            </h2>
            <p className="mt-3.5 text-sm text-zinc-300 leading-relaxed">
              Test the constellation engine live. Switch the cursor field between radial repulsion
              and tangential vortex swirl, scale the `PARTICLE_COUNT` constant, or trigger the
              Konami prismatic burst.
            </p>

            <div className="mt-5 p-5 rounded-2xl bg-zinc-950/85 border border-white/[0.08] space-y-4">
              {/* Cursor Force Field Mode */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-zinc-200">Cursor Force Field</div>
                  <div className="text-[11px] text-zinc-400">
                    Hold click anywhere to attract into a tight cluster
                  </div>
                </div>
                <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setForceMode('repel');
                      triggerTactilePulse(150);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                      forceMode === 'repel'
                        ? 'bg-amber-400 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
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
                    className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                      forceMode === 'swirl'
                        ? 'bg-amber-400 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Swirl Vortex
                  </button>
                </div>
              </div>

              {/* Adjustable PARTICLE_COUNT Constant */}
              <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-900">
                <div>
                  <div className="text-xs font-medium text-zinc-200 font-mono">
                    PARTICLE_COUNT Constant
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Batched into 8 depth paths for locked 60fps
                  </div>
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
                      className={`spring-interactive px-2.5 py-1 rounded-md text-xs font-mono border whitespace-nowrap ${
                        particleCount === cnt
                          ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale / Zoom Control */}
              <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-900">
                <label htmlFor="zoom-scale-range" className="text-xs font-medium text-zinc-200">
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
                    className="w-28 accent-amber-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.0)}
                    aria-label="Reset zoom scale"
                    className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* STAGE 4 (1.00): Horizon, Contact & Full SwiftUI File Export */}
          <section
            ref={(el) => {
              stageRefs.current[4] = el;
            }}
            aria-label="Contact and SwiftUI Export"
            className="absolute inset-x-0 w-full md:w-[50%] pr-0 md:pr-8"
            style={stageStyles[4]}
          >
            <p className="text-xs font-mono tracking-wider text-rose-400 mb-3">
              05 · Continuous Horizon & Native macOS Source
            </p>
            <h2
              className="font-display font-bold tracking-tight text-white leading-[1.08]"
              style={{ fontSize: 'clamp(2.1rem, 3.8vw, 3.3rem)', textWrap: 'balance' }}
            >
              Ready for macOS 14+ & high-refresh displays.
            </h2>
            <p className="mt-4 text-base text-zinc-300 leading-relaxed max-w-[52ch]">
              The complete updated SwiftUI file (<code className="text-rose-300">PortfolioView.swift</code>)
              includes native <code className="text-zinc-200">NSHapticFeedbackManager</code> trackpad
              alignment feedback, <code className="text-zinc-200">CoreGraphics</code> glyph bitmap
              sampling, and depth-bucketed <code className="text-zinc-200">Canvas</code> rendering.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSwiftModalOpen(true);
                  triggerTactilePulse(200);
                }}
                className="spring-interactive flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-rose-500 text-white hover:bg-rose-400 whitespace-nowrap shadow-lg shadow-rose-500/20"
              >
                <Code2 className="w-4 h-4" />
                Open Full SwiftUI File (.swift)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRainbowBurstTrigger((c) => c + 1);
                  triggerTactilePulse(240);
                }}
                className="spring-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-rose-400" />
                Konami Rainbow Burst
              </button>
              <button
                type="button"
                onClick={() => scrollToProgress(0)}
                className="spring-interactive px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 whitespace-nowrap"
              >
                Return to Top
              </button>
            </div>
          </section>
        </div>
      </main>

        {/* Persistent Bottom Interactive Control Dock (Type-to-Morph, 1-5 Shapes, Force Toggle, Shortcuts) */}
        <footer className="absolute bottom-4 inset-x-0 z-30 px-4 md:px-10 pointer-events-none flex justify-center">
          <div className="pointer-events-auto w-full max-w-[1160px] rounded-2xl bg-zinc-950/90 border border-white/[0.09] px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
            {/* Type-to-Morph Live Text Input */}
            <div className="flex items-center gap-2 min-w-[220px] flex-1 max-w-xs">
              <Type className="w-4 h-4 text-sky-400 shrink-0" />
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
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-sky-400 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none"
              />
              {customTypedWord && (
                <button
                  type="button"
                  onClick={() => setCustomTypedWord('')}
                  className="px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 rounded-md"
                >
                  Reset
                </button>
              )}
            </div>

            {/* 1-5 Direct Shape Switcher */}
            <div className="flex items-center gap-1" role="group" aria-label="Select particle shape">
              {SHAPE_ORDER.map((shape, idx) => {
                const isSelected = customTypedWord.trim() === '' && activeShapeId === shape;
                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => {
                      setManualShapeOverride(shape);
                      setCustomTypedWord('');
                      triggerTactilePulse(165 + idx * 15);
                    }}
                    className={`spring-interactive px-2.5 py-1.5 rounded-lg text-xs font-mono capitalize whitespace-nowrap border ${
                      isSelected
                        ? 'bg-white text-zinc-950 border-white font-medium'
                        : 'bg-zinc-900/70 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
                    }`}
                  >
                    {idx + 1}.{shape}
                  </button>
                );
              })}
            </div>

            {/* Scrub Progress Bar + Utility Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setForceMode((m) => (m === 'repel' ? 'swirl' : 'repel'));
                  triggerTactilePulse(160);
                }}
                className="spring-interactive hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 whitespace-nowrap"
                title="Toggle cursor force field mode (Repel vs Swirl)"
              >
                <Wand2 className="w-3.5 h-3.5 text-sky-400" />
                {forceMode === 'repel' ? 'Force: Repel' : 'Force: Swirl'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPaused((p) => !p);
                  triggerTactilePulse(130);
                }}
                aria-label={isPaused ? 'Resume particle motion' : 'Pause particle motion'}
                className="spring-interactive flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 whitespace-nowrap"
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
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
                className="spring-interactive flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>?</span>
              </button>

              {/* Continuous Timeline Scrub Readout */}
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-zinc-800 text-xs font-mono text-zinc-400 tabular-nums">
                <span>Timeline</span>
                <span ref={timelineReadoutRef} className="text-zinc-200">
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
          triggerTactilePulse(250);
        }}
        onTogglePause={() => setIsPaused((p) => !p)}
        isPaused={isPaused}
      />

      {/* Full Updated SwiftUI macOS Source Modal */}
      <SwiftCodeModal isOpen={isSwiftModalOpen} onClose={() => setIsSwiftModalOpen(false)} />
    </div>
  );
}
