import { useCallback, useRef } from 'react';
import gsap from 'gsap';
import { SHADER_PRESETS } from '../shaderEngineLogic';

/**
 * Orchestrates smooth GSAP-powered shader preset transitions (uTransition 0 -> 1)
 * and color palette interpolation without recreating WebGL contexts or flickering.
 */
export function useShaderTransition(controllerRef) {
  const tweenRef = useRef(null);

  const transitionToPreset = useCallback(
    (nextModeId, duration = 1.15) => {
      const controller = controllerRef?.current;
      if (!controller) return;

      const preset = SHADER_PRESETS[nextModeId] || SHADER_PRESETS.aurora;

      if (tweenRef.current) {
        tweenRef.current.kill();
      }

      controller.prepareModeTransition(nextModeId, preset);

      const proxy = { t: 0 };
      tweenRef.current = gsap.to(proxy, {
        t: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          controller.setTransitionProgress(proxy.t);
        },
        onComplete: () => {
          controller.commitModeTransition(nextModeId);
        },
      });
    },
    [controllerRef]
  );

  return { transitionToPreset };
}

export default useShaderTransition;
