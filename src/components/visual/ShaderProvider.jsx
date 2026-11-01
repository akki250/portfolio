import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VisualContext } from '../../contexts/VisualContext';
import { InteractionManager } from './InteractionManager';
import { ShaderBackground } from './ShaderBackground';
import { useWebGLSupport } from './hooks/useWebGLSupport';
import { usePointerPosition } from './hooks/usePointerPosition';
import { useScrollProgress } from './hooks/useScrollProgress';
import { useShaderTransition } from './hooks/useShaderTransition';
import {
  SHADER_MODES,
  SHADER_PRESETS,
  resolveShaderForKeyframe,
} from './shaderEngineLogic';

/**
 * Root-level ShaderProvider that mounts the persistent site-wide WebGL ShaderBackground
 * once at the application root and exposes shader controls via VisualContext.
 */
export function ShaderProvider({ children, scrollProgress = 0 }) {
  const capabilities = useWebGLSupport();
  const controllerRef = useRef(null);
  const interactionManagerRef = useRef(null);

  if (!interactionManagerRef.current) {
    interactionManagerRef.current = new InteractionManager();
  }

  useEffect(() => {
    const mgr = interactionManagerRef.current;
    mgr.attach();
    return () => mgr.detach();
  }, []);

  usePointerPosition(interactionManagerRef);
  useScrollProgress(scrollProgress, interactionManagerRef);

  const { transitionToPreset } = useShaderTransition(controllerRef);

  const [activeShader, setActiveShader] = useState('aurora');
  const [autoSyncRoute, setAutoSyncRoute] = useState(true);
  const [shaderIntensity, setShaderIntensityState] = useState(1.05);
  const [isShaderPaused, setIsShaderPausedState] = useState(false);
  const [constellationOverlayEnabled, setConstellationOverlayEnabled] = useState(true);

  const setShaderMode = useCallback(
    (nextMode, manualOverride = true) => {
      if (!SHADER_PRESETS[nextMode]) return;
      if (manualOverride) {
        setAutoSyncRoute(false);
      }
      setActiveShader(nextMode);
      transitionToPreset(nextMode, 1.1);
    },
    [transitionToPreset]
  );

  const syncRouteKeyframe = useCallback(
    (keyframeIndex) => {
      if (!autoSyncRoute) return;
      const mapped = resolveShaderForKeyframe(keyframeIndex);
      setActiveShader((prev) => {
        if (prev !== mapped) {
          transitionToPreset(mapped, 1.25);
        }
        return mapped;
      });
    },
    [autoSyncRoute, transitionToPreset]
  );

  const setShaderIntensity = useCallback((val) => {
    const clamped = Math.max(0.25, Math.min(2.2, val));
    setShaderIntensityState(clamped);
    if (controllerRef.current) {
      controllerRef.current.setIntensityMultiplier(clamped);
    }
  }, []);

  const setIsShaderPaused = useCallback((paused) => {
    setIsShaderPausedState(paused);
    if (controllerRef.current) {
      controllerRef.current.setPaused(paused);
    }
  }, []);

  const triggerShaderRipple = useCallback((nx = 0.5, ny = 0.5, strength = 1.25) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.spawnRipple(nx, ny, strength);
    }
  }, []);

  const setHoverAccentTint = useCallback((rgb255) => {
    if (!controllerRef.current) return;
    if (rgb255) {
      controllerRef.current.setCustomAccentTint(rgb255);
    } else {
      const preset = SHADER_PRESETS[activeShader] || SHADER_PRESETS.aurora;
      controllerRef.current.uniforms.uColorAccent.value.set(
        preset.accent.r,
        preset.accent.g,
        preset.accent.b
      );
    }
  }, [activeShader]);

  const contextValue = useMemo(
    () => ({
      activeShader,
      autoSyncRoute,
      shaderIntensity,
      isShaderPaused,
      constellationOverlayEnabled,
      capabilities,
      presets: SHADER_PRESETS,
      modes: SHADER_MODES,
      setShaderMode,
      setAutoSyncRoute,
      setShaderIntensity,
      setIsShaderPaused,
      setConstellationOverlayEnabled,
      syncRouteKeyframe,
      triggerShaderRipple,
      setHoverAccentTint,
    }),
    [
      activeShader,
      autoSyncRoute,
      shaderIntensity,
      isShaderPaused,
      constellationOverlayEnabled,
      capabilities,
      setShaderMode,
      syncRouteKeyframe,
      setShaderIntensity,
      setIsShaderPaused,
      triggerShaderRipple,
      setHoverAccentTint,
    ]
  );

  return (
    <VisualContext.Provider value={contextValue}>
      <ShaderBackground
        controllerRef={controllerRef}
        interactionManagerRef={interactionManagerRef}
        activeShader={activeShader}
        capabilities={capabilities}
      />
      {children}
    </VisualContext.Provider>
  );
}

export default ShaderProvider;
