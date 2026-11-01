import React, { createContext, useContext } from 'react';
import { SHADER_PRESETS, SHADER_MODES } from '../components/visual/shaderEngineLogic';

export const VisualContext = createContext({
  activeShader: 'aurora',
  autoSyncRoute: true,
  shaderIntensity: 1.05,
  isShaderPaused: false,
  constellationOverlayEnabled: true,
  capabilities: {
    supported: true,
    isWebGL2: true,
    isSoftwareGl: false,
    prefersReducedMotion: false,
    rendererInfo: '',
  },
  presets: SHADER_PRESETS,
  modes: SHADER_MODES,
  setShaderMode: (_mode) => {},
  setAutoSyncRoute: (_auto) => {},
  setShaderIntensity: (_val) => {},
  setIsShaderPaused: (_paused) => {},
  setConstellationOverlayEnabled: (_enabled) => {},
  syncRouteKeyframe: (_keyframeIndex) => {},
  triggerShaderRipple: (_x, _y, _strength) => {},
  setHoverAccentTint: (_rgb) => {},
});

export function useVisualContext() {
  return useContext(VisualContext);
}

export default VisualContext;
