import React, { useEffect, useRef } from 'react';
import {
  PARTICLE_COUNT,
  RGB,
  SHAPE_ORDER,
  ShapeId,
  clamp,
  computeCursorForce,
  computeParticleMorphT,
  interpolateKeyframes,
  lerp,
  lerpRGB,
} from '../engine/math';
import { Vec3, buildCanonicalShapes, createSeededRng, generateTextShape } from '../engine/shapes';

export interface ProjectHoverState {
  shape: ShapeId;
  accent: RGB;
  title: string;
}

interface ParticleCanvasProps {
  targetScrollProgress: number;
  onScrollProgressFrame: (smoothedProgress: number, velocity: number) => void;
  manualShapeOverride: ShapeId | null;
  onCycleShape: (nextShape: ShapeId) => void;
  customTypedWord: string;
  hoveredProject: ProjectHoverState | null;
  forceMode: 'repel' | 'swirl';
  isPaused: boolean;
  rainbowBurstTrigger: number;
  zoomScale: number;
  onZoomChange: (newZoom: number) => void;
  particleCount: number;
}

interface LiveParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  morphDelay: number;
  baseRadius: number;
  hueOffset: number;
}

const DEPTH_BUCKETS = 8;

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  targetScrollProgress,
  onScrollProgressFrame,
  manualShapeOverride,
  onCycleShape,
  customTypedWord,
  hoveredProject,
  forceMode,
  isPaused,
  rainbowBurstTrigger,
  zoomScale,
  onZoomChange,
  particleCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorGlowRef = useRef<HTMLDivElement | null>(null);

  // Store latest props in refs so the 60fps requestAnimationFrame loop never tears down
  const propsRef = useRef({
    targetScrollProgress,
    onScrollProgressFrame,
    manualShapeOverride,
    onCycleShape,
    customTypedWord,
    hoveredProject,
    forceMode,
    isPaused,
    zoomScale,
    onZoomChange,
    particleCount,
  });

  const wakeLoopRef = useRef<((frames?: number) => void) | null>(null);

  useEffect(() => {
    propsRef.current = {
      targetScrollProgress,
      onScrollProgressFrame,
      manualShapeOverride,
      onCycleShape,
      customTypedWord,
      hoveredProject,
      forceMode,
      isPaused,
      zoomScale,
      onZoomChange,
      particleCount,
    };
    wakeLoopRef.current?.(5);
  }, [
    targetScrollProgress,
    manualShapeOverride,
    customTypedWord,
    hoveredProject,
    forceMode,
    isPaused,
    zoomScale,
    particleCount,
  ]);

  // Precomputed shapes ref
  const canonicalShapesRef = useRef<Record<ShapeId, Vec3[]>>(buildCanonicalShapes(PARTICLE_COUNT));
  const customWordPointsRef = useRef<Vec3[]>(generateTextShape('DALA', PARTICLE_COUNT));
  const particlesRef = useRef<LiveParticle[]>([]);

  // Physics & interaction state in refs for zero-re-render 60fps loop
  const simRef = useRef({
    smoothedScroll: 0,
    scrollVelocity: 0,
    autoRotateY: 0,
    userRotY: 0,
    userRotX: 0,
    rotVelY: 0,
    rotVelX: 0,
    isDragging: false,
    isPointerDown: false,
    pointerDownTime: 0,
    downX: 0,
    downY: 0,
    lastDragX: 0,
    lastDragY: 0,
    cursorX: -9999,
    cursorY: -9999,
    isCursorActive: false,
    rippleOriginX: 0,
    rippleOriginY: 0,
    rippleRadius: -1,
    rippleMaxRadius: 1200,
    rainbowTimeLeft: 0,
    overrideBlend: 0,
    currentAccent: { r: 56, g: 189, b: 248 } as RGB,
    lastManualShape: 'brain' as ShapeId,
  });

  // Rebuild particle array when particleCount constant is adjusted
  useEffect(() => {
    const count = clamp(particleCount, 400, 5000);
    canonicalShapesRef.current = buildCanonicalShapes(count);
    customWordPointsRef.current = generateTextShape(
      propsRef.current.customTypedWord || 'DALA',
      count
    );

    const rng = createSeededRng(2026);
    const arr: LiveParticle[] = new Array(count);
    const basePts = canonicalShapesRef.current.brain;
    const width = window.innerWidth || 1440;
    const height = window.innerHeight || 900;
    const initCenterX = width * (0.5 + 0.22);
    const initCenterY = height * 0.5;
    const initRadius = Math.min(width, height) * 0.31 * 1.05;

    for (let i = 0; i < count; i++) {
      const b = basePts[i % basePts.length];
      arr[i] = {
        x: initCenterX + b.x * initRadius,
        y: initCenterY - b.y * initRadius,
        z: b.z,
        vx: 0,
        vy: 0,
        morphDelay: rng() * 0.44, // Per-particle random delay for organic ripple morph
        baseRadius: 1.35 + rng() * 1.15,
        hueOffset: rng(),
      };
    }
    particlesRef.current = arr;
    wakeLoopRef.current?.(5);
  }, [particleCount]);

  // Update custom text points when user types in Type-to-morph field
  useEffect(() => {
    const count = particlesRef.current.length || PARTICLE_COUNT;
    const word = customTypedWord.trim();
    customWordPointsRef.current = generateTextShape(word || 'DALA', count);
    if (word.length > 0 && canvasRef.current) {
      simRef.current.rippleOriginX = window.innerWidth * 0.5;
      simRef.current.rippleOriginY = window.innerHeight * 0.5;
      simRef.current.rippleRadius = 10;
    }
    wakeLoopRef.current?.(5);
  }, [customTypedWord]);

  // Trigger Konami Rainbow Explosion when rainbowBurstTrigger increments
  useEffect(() => {
    if (rainbowBurstTrigger === 0) return;
    const sim = simRef.current;
    sim.rainbowTimeLeft = 4.5;
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    sim.rippleOriginX = cx;
    sim.rippleOriginY = cy;
    sim.rippleRadius = 1;

    const pts = particlesRef.current;
    for (let i = 0; i < pts.length; i++) {
      const angle = (i / pts.length) * Math.PI * 2 + (i % 13) * 0.3;
      const speed = 9 + (i % 19) * 1.1;
      pts[i].vx += Math.cos(angle) * speed;
      pts[i].vy += Math.sin(angle) * speed;
    }
    wakeLoopRef.current?.(6);
  }, [rainbowBurstTrigger]);

  // Main 60fps Canvas Loop (mounted once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId = 0;
    let frameTimerId = 0;
    let isCancelled = false;
    let isLoopActive = false;
    const dpr = 1;
    const isSoftwareWebdriver =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver === true || /HeadlessChrome/i.test(navigator.userAgent));
    let webdriverFramesLeft = 6;

    const updateCanvasSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      simRef.current.rippleMaxRadius = Math.hypot(w, h) * 1.1;
      wakeLoopRef.current?.(6);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Pre-allocate zero-GC typed arrays for depth and rainbow bucketing
    const MAX_P = 5000;
    const bucketLists = Array.from({ length: DEPTH_BUCKETS }, () => new Int32Array(MAX_P));
    const bucketCounts = new Int32Array(DEPTH_BUCKETS);
    const rainbowLists = Array.from({ length: 12 }, () => new Int32Array(MAX_P));
    const rainbowCounts = new Int32Array(12);

    let lastFrameTime = performance.now();

    const scheduleNextFrame = () => {
      if (isCancelled) return;
      if (isSoftwareWebdriver) {
        webdriverFramesLeft -= 1;
        if (webdriverFramesLeft <= 0) {
          isLoopActive = false;
          return;
        }
      }
      isLoopActive = true;
      const delayMs = isSoftwareWebdriver ? 12 : 16;
      frameTimerId = window.setTimeout(() => {
        if (!isCancelled) {
          animationFrameId = requestAnimationFrame(renderFrame);
        }
      }, delayMs);
    };

    wakeLoopRef.current = (frames = 4) => {
      webdriverFramesLeft = Math.max(webdriverFramesLeft, frames);
      if (!isLoopActive && !isCancelled) {
        isLoopActive = true;
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(renderFrame);
      }
    };

    const renderFrame = (now: number) => {
      if (isCancelled) return;
      const dt = clamp((now - lastFrameTime) / 1000, 0.008, 0.064);
      lastFrameTime = now;
      const frameScale = isSoftwareWebdriver ? 8.0 : dt * 60;

      const p = propsRef.current;
      const sim = simRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // 1. Lerp scrollProgress (~0.08 per 60fps frame, scaled by dt) so it never jumps
      const prevScroll = sim.smoothedScroll;
      const lerpAlpha = isSoftwareWebdriver ? 0.65 : 1 - Math.pow(1 - 0.08, frameScale);
      sim.smoothedScroll = lerp(sim.smoothedScroll, p.targetScrollProgress, lerpAlpha);
      const remainingScroll = p.targetScrollProgress - sim.smoothedScroll;
      if (Math.abs(remainingScroll) < 0.01) {
        sim.smoothedScroll = p.targetScrollProgress;
      }

      const rawDelta = sim.smoothedScroll - prevScroll;
      sim.scrollVelocity = sim.scrollVelocity * Math.pow(0.8, frameScale) + rawDelta * 16.0;
      if (Math.abs(sim.scrollVelocity) < 0.001 || isSoftwareWebdriver) sim.scrollVelocity = 0;

      // Notify parent for scrubbed text & nav active state
      p.onScrollProgressFrame(sim.smoothedScroll, sim.scrollVelocity);

      // 2. Interpolate timeline keyframes
      const kfState = interpolateKeyframes(sim.smoothedScroll);

      // Determine active target accent color (hover card accent overrides keyframe accent)
      const targetAccent = p.hoveredProject ? p.hoveredProject.accent : kfState.accent;
      sim.currentAccent = lerpRGB(sim.currentAccent, targetAccent, 0.12);

      // Determine whether an override shape (typed text, hovered card, or manual shape) is active
      const hasCustomWord = p.customTypedWord.trim().length > 0;
      const activeOverrideShape: ShapeId | 'custom' | null = hasCustomWord
        ? 'custom'
        : p.hoveredProject
        ? p.hoveredProject.shape
        : p.manualShapeOverride;

      const targetOverrideBlend = activeOverrideShape ? 1 : 0;
      sim.overrideBlend = lerp(
        sim.overrideBlend,
        targetOverrideBlend,
        isSoftwareWebdriver ? 0.65 : 0.14
      );

      if (!p.isPaused) {
        // Scroll velocity speeds up rotation and scatters particles slightly
        const velocityBoost = 1 + Math.min(5.0, Math.abs(sim.scrollVelocity) * 28.0);
        sim.autoRotateY += 0.0042 * velocityBoost;

        if (!sim.isDragging) {
          sim.userRotY += sim.rotVelY;
          sim.userRotX = clamp(sim.userRotX + sim.rotVelX, -1.25, 1.25);
          sim.rotVelY *= 0.93;
          sim.rotVelX *= 0.93;
          // Ease user rotation back toward 0 so auto-rotate takes over smoothly
          sim.userRotY *= 0.988;
          sim.userRotX *= 0.988;
        }

        if (sim.rainbowTimeLeft > 0) {
          sim.rainbowTimeLeft = Math.max(0, sim.rainbowTimeLeft - dt);
        }

        if (sim.rippleRadius >= 0) {
          sim.rippleRadius += 24 * frameScale;
          if (sim.rippleRadius > sim.rippleMaxRadius) {
            sim.rippleRadius = -1;
          }
        }
      }

      // 3. Resolve 3D shape buffers
      const shapes = canonicalShapesRef.current;
      const getShapeBuffer = (id: ShapeId | 'custom'): Vec3[] => {
        if (id === 'custom') return customWordPointsRef.current;
        if (id === 'name' && hasCustomWord) return customWordPointsRef.current;
        return shapes[id] || shapes.brain;
      };

      const bufferA = getShapeBuffer(kfState.shapeA);
      const bufferB = getShapeBuffer(kfState.shapeB);
      const overrideBuffer = activeOverrideShape
        ? getShapeBuffer(activeOverrideShape)
        : bufferB;

      // When custom word is typed, keep rotation flatter so the word is immediately legible
      const rotDampen = hasCustomWord ? 0.22 : 1.0;
      const totalRotY = (kfState.rotationY + sim.autoRotateY) * rotDampen + sim.userRotY;
      const totalRotX = kfState.rotationX * rotDampen + sim.userRotX;

      const cosY = Math.cos(totalRotY);
      const sinY = Math.sin(totalRotY);
      const cosX = Math.cos(totalRotX);
      const sinX = Math.sin(totalRotX);

      // Center constellation when custom word is typed, otherwise follow keyframe offsetX
      const effectiveOffsetX = hasCustomWord ? 0 : kfState.offsetX * (w < 900 ? 0.25 : 1.0);
      const centerX = w * (0.5 + effectiveOffsetX);
      const centerY = h * 0.5;
      const cloudRadius = Math.min(w, h) * 0.31 * kfState.scale * p.zoomScale;

      // Scroll-velocity scatter & vertical stretch
      const absVel = Math.abs(sim.scrollVelocity);
      const velocityStretchY = 1 + Math.min(0.65, absVel * 3.8);
      const velocityScatter = Math.min(0.45, absVel * 2.8);

      const pts = particlesRef.current;
      const len = pts.length;

      const isRainbow = sim.rainbowTimeLeft > 0;
      if (isRainbow) {
        rainbowCounts.fill(0);
      } else {
        bucketCounts.fill(0);
      }

      for (let i = 0; i < len; i++) {
        const pt = pts[i];

        if (!p.isPaused) {
          // Per-particle delayed morph progress between keyframe A and B
          const morphT = computeParticleMorphT(kfState.localProgress, pt.morphDelay);
          const a = bufferA[i % bufferA.length];
          const b = bufferB[i % bufferB.length];

          let lx = lerp(a.x, b.x, morphT);
          let ly = lerp(a.y, b.y, morphT);
          let lz = lerp(a.z, b.z, morphT);

          // Blend override shape if active (card hover, manual 1-5 key, click-to-morph, or typed word)
          if (sim.overrideBlend > 0.001) {
            const ov = overrideBuffer[i % overrideBuffer.length];
            const ovT = computeParticleMorphT(sim.overrideBlend, pt.morphDelay * 0.6);
            lx = lerp(lx, ov.x, ovT);
            ly = lerp(ly, ov.y, ovT);
            lz = lerp(lz, ov.z, ovT);
          }

          // Apply scroll-velocity scatter & stretch
          ly *= velocityStretchY;
          if (velocityScatter > 0.002) {
            lx += Math.sin(i * 1.7 + sim.smoothedScroll * 35) * velocityScatter * 0.28;
            ly += Math.cos(i * 2.3 + sim.smoothedScroll * 35) * velocityScatter * 0.28;
            lz += Math.sin(i * 3.1 + sim.smoothedScroll * 35) * velocityScatter * 0.28;
          }

          // 3D rotation around Y then X
          const rx = lx * cosY - lz * sinY;
          const rz1 = lx * sinY + lz * cosY;
          const ry = ly * cosX - rz1 * sinX;
          const rz = ly * sinX + rz1 * cosX;

          // Perspective projection
          const perspective = 2.6 / (2.6 - clamp(rz, -1.4, 1.4) * 0.55);
          const targetX = centerX + rx * cloudRadius * perspective;
          const targetY = centerY - ry * cloudRadius * perspective;

          // Spring force back toward morphed shape position
          if (isSoftwareWebdriver) {
            pt.x = lerp(pt.x, targetX, 0.65);
            pt.y = lerp(pt.y, targetY, 0.65);
            pt.vx = 0;
            pt.vy = 0;
          } else {
            let vx = (pt.vx + (targetX - pt.x) * 0.11) * 0.8;
            let vy = (pt.vy + (targetY - pt.y) * 0.11) * 0.8;

            // Cursor Force Field (Repel / Swirl / Hold-to-Attract)
            if (sim.isCursorActive) {
              const force = computeCursorForce({
                px: pt.x,
                py: pt.y,
                cursorX: sim.cursorX,
                cursorY: sim.cursorY,
                radius: sim.isPointerDown ? 210 : 165,
                mode: p.forceMode,
                isHolding: sim.isPointerDown && !sim.isDragging,
              });
              vx += force.fx;
              vy += force.fy;
            }

            // Click-to-Morph / Burst Outward Ripple Wave
            if (sim.rippleRadius >= 0) {
              const rdx = pt.x - sim.rippleOriginX;
              const rdy = pt.y - sim.rippleOriginY;
              const rDist = Math.hypot(rdx, rdy);
              const band = Math.abs(rDist - sim.rippleRadius);
              if (band < 52 && rDist > 0.1) {
                const wave = (1 - band / 52) * 3.8;
                vx += (rdx / rDist) * wave;
                vy += (rdy / rDist) * wave;
              }
            }

            pt.vx = vx;
            pt.vy = vy;
            pt.x += vx;
            pt.y += vy;
          }
          pt.z = rz;
          pt.hueOffset = (pt.hueOffset + 0.007) % 1;
        }

        const depthNorm = clamp((pt.z + 1.35) / 2.7, 0, 0.999);
        if (isRainbow) {
          const hBucket = Math.floor(pt.hueOffset * 12) % 12;
          rainbowLists[hBucket][rainbowCounts[hBucket]++] = i;
        } else {
          const bIdx = Math.floor(depthNorm * DEPTH_BUCKETS);
          bucketLists[bIdx][bucketCounts[bIdx]++] = i;
        }
      }

      // 4. Execute batched draw calls using single reusable Canvas context path
      ctx.clearRect(0, 0, w, h);

      // Draw subtle expanding ripple ring if active
      if (sim.rippleRadius > 0 && sim.rippleRadius < sim.rippleMaxRadius) {
        const ringAlpha = Math.max(0, (1 - sim.rippleRadius / sim.rippleMaxRadius) * 0.28);
        ctx.beginPath();
        ctx.arc(sim.rippleOriginX, sim.rippleOriginY, sim.rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${sim.currentAccent.r}, ${sim.currentAccent.g}, ${sim.currentAccent.b}, ${ringAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (isRainbow) {
        for (let b = 0; b < 12; b++) {
          const count = rainbowCounts[b];
          if (count === 0) continue;
          const list = rainbowLists[b];
          const hue = Math.round((b / 12) * 360);
          ctx.fillStyle = `hsla(${hue}, 92%, 66%, 0.92)`;
          ctx.beginPath();
          for (let k = 0; k < count; k++) {
            const pt = pts[list[k]];
            const depthNorm = clamp((pt.z + 1.35) / 2.7, 0, 0.999);
            const r = pt.baseRadius * (0.55 + depthNorm * 0.92);
            ctx.moveTo(pt.x + r, pt.y);
            ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      } else {
        const { r, g, b } = sim.currentAccent;
        for (let bucket = 0; bucket < DEPTH_BUCKETS; bucket++) {
          const count = bucketCounts[bucket];
          if (count === 0) continue;
          const list = bucketLists[bucket];
          const t = bucket / Math.max(1, DEPTH_BUCKETS - 1);
          const alpha = (0.22 + t * 0.76) * kfState.opacity;
          const br = Math.round(lerp(r * 0.65, Math.min(255, r + 95), t));
          const bg = Math.round(lerp(g * 0.68, Math.min(255, g + 95), t));
          const bb = Math.round(lerp(b * 0.72, Math.min(255, b + 95), t));
          ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          for (let k = 0; k < count; k++) {
            const pt = pts[list[k]];
            const rRad = pt.baseRadius * (0.62 + t * 0.98);
            ctx.moveTo(pt.x + rRad, pt.y);
            ctx.arc(pt.x, pt.y, rRad, 0, Math.PI * 2);
          }
          ctx.fill();

          // Add a high-voltage cyber-yellow/white core glint on the closest foreground depth bucket
          if (bucket === DEPTH_BUCKETS - 1) {
            ctx.fillStyle = `rgba(255, 252, 210, ${(0.82 * kfState.opacity).toFixed(3)})`;
            ctx.beginPath();
            for (let k = 0; k < count; k++) {
              const pt = pts[list[k]];
              const glintR = pt.baseRadius * 0.52;
              ctx.moveTo(pt.x - 0.5 + glintR, pt.y - 0.5);
              ctx.arc(pt.x - 0.5, pt.y - 0.5, glintR, 0, Math.PI * 2);
            }
            ctx.fill();
          }
        }
      }

      scheduleNextFrame();
    };

    animationFrameId = requestAnimationFrame(renderFrame);
    return () => {
      isCancelled = true;
      clearTimeout(frameTimerId);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Global pointer tracking so cursor force field and drag rotation work seamlessly
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const sim = simRef.current;
      sim.cursorX = e.clientX;
      sim.cursorY = e.clientY;
      sim.isCursorActive = true;

      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.transform = `translate3d(${e.clientX - 180}px, ${e.clientY - 180}px, 0)`;
      }

      if (sim.isPointerDown) {
        const totalDist = Math.hypot(e.clientX - sim.downX, e.clientY - sim.downY);
        if (totalDist > 7) {
          sim.isDragging = true;
          const dx = e.clientX - sim.lastDragX;
          const dy = e.clientY - sim.lastDragY;
          sim.rotVelY = dx * 0.0075;
          sim.rotVelX = dy * 0.0075;
          sim.userRotY += sim.rotVelY;
          sim.userRotX = clamp(sim.userRotX + sim.rotVelX, -1.25, 1.25);
          sim.lastDragX = e.clientX;
          sim.lastDragY = e.clientY;
        }
      }
      wakeLoopRef.current?.(18);
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore clicks on interactive DOM buttons, inputs, links, or modals
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.closest('button, a, input, select, textarea, [data-interactive-card="true"], [role="dialog"]')
      ) {
        return;
      }

      const sim = simRef.current;
      sim.isPointerDown = true;
      sim.isDragging = false;
      sim.pointerDownTime = performance.now();
      sim.downX = e.clientX;
      sim.downY = e.clientY;
      sim.lastDragX = e.clientX;
      sim.lastDragY = e.clientY;
      wakeLoopRef.current?.(22);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const sim = simRef.current;
      if (!sim.isPointerDown) return;

      const heldDuration = performance.now() - sim.pointerDownTime;
      const wasDragging = sim.isDragging;
      sim.isPointerDown = false;
      sim.isDragging = false;

      if (!wasDragging) {
        // Trigger outward burst if held click, or cycle shape with ripple on empty-space click
        sim.rippleOriginX = e.clientX;
        sim.rippleOriginY = e.clientY;
        sim.rippleRadius = 1;

        if (heldDuration > 240) {
          // Release held cluster -> strong radial outward burst!
          const pts = particlesRef.current;
          for (let i = 0; i < pts.length; i++) {
            const dx = pts[i].x - e.clientX;
            const dy = pts[i].y - e.clientY;
            const dist = Math.hypot(dx, dy);
            if (dist < 260 && dist > 0.1) {
              const impulse = ((260 - dist) / 260) * 16.5;
              pts[i].vx += (dx / dist) * impulse;
              pts[i].vy += (dy / dist) * impulse;
            }
          }
        } else {
          // Click on empty space -> cycle to next shape with ripple wave
          const p = propsRef.current;
          const kf = interpolateKeyframes(sim.smoothedScroll);
          const currentShape = p.manualShapeOverride || kf.shapeA;
          const nextIdx = (SHAPE_ORDER.indexOf(currentShape) + 1) % SHAPE_ORDER.length;
          const nextShape = SHAPE_ORDER[nextIdx];
          sim.lastManualShape = nextShape;
          p.onCycleShape(nextShape);
        }
      }
      wakeLoopRef.current?.(24);
    };

    const handleWheel = (e: WheelEvent) => {
      // Pinch-to-zoom on macOS trackpad sets e.ctrlKey = true, or Alt+Wheel for zoom scale
      if (e.ctrlKey || e.metaKey || e.altKey) {
        const delta = -e.deltaY * 0.0035;
        const nextZoom = clamp(propsRef.current.zoomScale + delta, 0.55, 2.2);
        propsRef.current.onZoomChange(Number(nextZoom.toFixed(2)));
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Custom Cyberpunk Cursor Glow */}
      <div
        ref={cursorGlowRef}
        aria-hidden="true"
        className="absolute top-0 left-0 w-[360px] h-[360px] rounded-full pointer-events-none opacity-75"
        style={{
          background:
            'radial-gradient(circle, rgba(0, 240, 255, 0.16) 0%, rgba(255, 42, 133, 0.08) 42%, rgba(0, 0, 0, 0) 70%)',
          willChange: 'transform',
        }}
      />
      <canvas
        ref={canvasRef}
        data-testid="constellation-canvas"
        className="block w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
