import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  GLITCH_DURATION_SEC,
  buildRgbGlitchKeyframes,
  computeNextGlitchDelayMs,
} from '../../engine/math';

export interface RgbGlitchSchedulerState {
  glitchPulse: number;
  isGlitching: boolean;
  nextDelayMs: number;
  triggerGlitchNow: () => void;
}

/**
 * Schedules a random RGB-split glitch burst every 8–12 seconds (8,000ms–12,000ms)
 * and exposes an imperative trigger for interactive or automated testing.
 */
export function useRandomRgbGlitch(onGlitchBurst?: () => void): RgbGlitchSchedulerState {
  const [glitchPulse, setGlitchPulse] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [nextDelayMs, setNextDelayMs] = useState(() => computeNextGlitchDelayMs());

  const onGlitchBurstRef = useRef(onGlitchBurst);
  useEffect(() => {
    onGlitchBurstRef.current = onGlitchBurst;
  }, [onGlitchBurst]);

  const activeTimeoutRef = useRef<number | null>(null);

  const triggerGlitchNow = useCallback(() => {
    setGlitchPulse((c) => c + 1);
    setIsGlitching(true);
    onGlitchBurstRef.current?.();

    if (activeTimeoutRef.current !== null) {
      window.clearTimeout(activeTimeoutRef.current);
    }
    activeTimeoutRef.current = window.setTimeout(() => {
      setIsGlitching(false);
      activeTimeoutRef.current = null;
    }, Math.round(GLITCH_DURATION_SEC * 1000) + 40);
  }, []);

  // Recursive 8–12 second random interval scheduler
  useEffect(() => {
    let timerId: number | null = null;
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = computeNextGlitchDelayMs(Math.random());
      setNextDelayMs(delay);
      timerId = window.setTimeout(() => {
        if (cancelled) return;
        triggerGlitchNow();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      if (activeTimeoutRef.current !== null) {
        window.clearTimeout(activeTimeoutRef.current);
      }
    };
  }, [triggerGlitchNow]);

  // Expose deterministic hook on window for automated Playwright verification
  useEffect(() => {
    const win = window as unknown as { __triggerRgbGlitch?: () => void };
    win.__triggerRgbGlitch = triggerGlitchNow;
    return () => {
      delete win.__triggerRgbGlitch;
    };
  }, [triggerGlitchNow]);

  return {
    glitchPulse,
    isGlitching,
    nextDelayMs,
    triggerGlitchNow,
  };
}

interface GlitchHeadingProps {
  as?: 'h1' | 'h2';
  isActiveStage: boolean;
  glitchPulse: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const HEADING_KEYFRAMES = buildRgbGlitchKeyframes('heading', 1);

/**
 * Main stage heading with Framer Motion RGB-split chromatic aberration keyframes
 * and sliced cyan/magenta ghost layers during the 8–12s glitch window.
 */
export const GlitchHeading: React.FC<GlitchHeadingProps> = ({
  as = 'h2',
  isActiveStage,
  glitchPulse,
  className = '',
  style,
  children,
}) => {
  const MotionTag = as === 'h1' ? motion.h1 : motion.h2;
  const shouldAnimate = isActiveStage && glitchPulse > 0;

  return (
    <MotionTag
      key={`${as}-glitch-${shouldAnimate ? glitchPulse : 0}`}
      data-glitch-heading={as}
      data-glitch-stage-active={isActiveStage ? 'true' : 'false'}
      data-glitch-pulse={shouldAnimate ? glitchPulse : 0}
      className={`relative inline-block ${className}`}
      style={style}
      initial={false}
      animate={
        shouldAnimate
          ? {
              x: HEADING_KEYFRAMES.x,
              y: HEADING_KEYFRAMES.y,
              skewX: HEADING_KEYFRAMES.skewX,
              textShadow: HEADING_KEYFRAMES.textShadow,
            }
          : {
              x: 0,
              y: 0,
              skewX: 0,
              textShadow: '0px 0px 0px rgba(0, 240, 255, 0), 0px 0px 0px rgba(255, 42, 133, 0)',
            }
      }
      transition={{
        duration: HEADING_KEYFRAMES.duration,
        times: HEADING_KEYFRAMES.times,
        ease: 'linear',
      }}
    >
      <span className="relative z-10">{children}</span>

      {/* Cyan upper-slice RGB-split ghost layer */}
      {shouldAnimate && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 z-20 text-cyan-300 mix-blend-screen"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 46%, 0 46%)' }}
          initial={{ opacity: 0, x: 0 }}
          animate={{
            opacity: [0, 0.9, 0.25, 0.85, 0.5, 0],
            x: [0, -6, 5, -4, 3, 0],
            y: [0, -1, 1, 0, -1, 0],
          }}
          transition={{
            duration: HEADING_KEYFRAMES.duration,
            times: [0, 0.16, 0.36, 0.58, 0.82, 1],
            ease: 'linear',
          }}
        >
          {children}
        </motion.span>
      )}

      {/* Magenta/Violet lower-slice RGB-split ghost layer */}
      {shouldAnimate && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 z-20 text-fuchsia-400 mix-blend-screen"
          style={{ clipPath: 'polygon(0 52%, 100% 52%, 100% 100%, 0 100%)' }}
          initial={{ opacity: 0, x: 0 }}
          animate={{
            opacity: [0, 0.88, 0.75, 0.3, 0.8, 0],
            x: [0, 6, -5, 4, -2.5, 0],
            y: [0, 1, -1, 1, 0, 0],
          }}
          transition={{
            duration: HEADING_KEYFRAMES.duration,
            times: [0, 0.16, 0.36, 0.58, 0.82, 1],
            ease: 'linear',
          }}
        >
          {children}
        </motion.span>
      )}
    </MotionTag>
  );
};

interface GlitchStageCardProps {
  as?: 'div' | 'article';
  isActiveStage: boolean;
  glitchPulse: number;
  staggerIndex?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
  'data-interactive-card'?: string;
  children: React.ReactNode;
}

const CARD_KEYFRAMES = buildRgbGlitchKeyframes('card', 1);

/**
 * Active stage card wrapper that plays a Framer Motion RGB-split chromatic
 * boxShadow + micro-jitter keyframe animation when its stage is active.
 */
export const GlitchStageCard: React.FC<GlitchStageCardProps> = ({
  as = 'div',
  isActiveStage,
  glitchPulse,
  staggerIndex = 0,
  className = '',
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  'data-interactive-card': dataInteractiveCard,
  children,
}) => {
  const MotionComponent = as === 'article' ? motion.article : motion.div;
  const shouldAnimate = isActiveStage && glitchPulse > 0;
  const delaySec = Math.min(0.12, staggerIndex * 0.022);

  return (
    <MotionComponent
      key={`card-glitch-${staggerIndex}-${shouldAnimate ? glitchPulse : 0}`}
      data-glitch-card="true"
      data-glitch-stage-active={isActiveStage ? 'true' : 'false'}
      data-glitch-pulse={shouldAnimate ? glitchPulse : 0}
      data-interactive-card={dataInteractiveCard}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative ${className}`}
      style={style}
      initial={false}
      animate={
        shouldAnimate
          ? {
              x: CARD_KEYFRAMES.x,
              y: CARD_KEYFRAMES.y,
              skewX: CARD_KEYFRAMES.skewX,
              boxShadow: CARD_KEYFRAMES.boxShadow,
            }
          : {
              x: 0,
              y: 0,
              skewX: 0,
            }
      }
      transition={{
        duration: CARD_KEYFRAMES.duration,
        times: CARD_KEYFRAMES.times,
        delay: delaySec,
        ease: 'linear',
      }}
    >
      {shouldAnimate && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 rounded-[inherit] z-20"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.95, 0.4, 0.9, 0.5, 0],
            x: [0, -3, 3, -2, 1.5, 0],
            boxShadow: [
              '0 0 0 0px rgba(0, 240, 255, 0), 0 0 0 0px rgba(255, 42, 133, 0)',
              '-3px 0 0 1px rgba(0, 240, 255, 0.85), 3px 0 0 1px rgba(255, 42, 133, 0.85)',
              '3px -1px 0 1px rgba(0, 240, 255, 0.8), -3px 1px 0 1px rgba(168, 85, 247, 0.85)',
              '-2px 1px 0 1px rgba(255, 42, 133, 0.75), 2px -1px 0 1px rgba(0, 240, 255, 0.75)',
              '1.5px 0 0 1px rgba(0, 240, 255, 0.5), -1.5px 0 0 1px rgba(255, 42, 133, 0.5)',
              '0 0 0 0px rgba(0, 240, 255, 0), 0 0 0 0px rgba(255, 42, 133, 0)',
            ],
          }}
          transition={{
            duration: CARD_KEYFRAMES.duration,
            times: [0, 0.16, 0.36, 0.58, 0.82, 1],
            delay: delaySec,
            ease: 'linear',
          }}
        />
      )}
      {children}
    </MotionComponent>
  );
};

