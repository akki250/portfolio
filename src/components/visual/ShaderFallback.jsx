import React from 'react';
import { SHADER_PRESETS } from './shaderEngineLogic';

/**
 * Graceful atmospheric fallback when WebGL is unavailable or context is lost.
 */
export function ShaderFallback({ activeShader = 'aurora' }) {
  const preset = SHADER_PRESETS[activeShader] || SHADER_PRESETS.aurora;

  return (
    <div
      aria-hidden="true"
      data-testid="shader-fallback"
      className="shader-fallback-surface"
      style={{
        '--fallback-primary': preset.primaryHex,
        '--fallback-secondary': preset.secondaryHex,
        '--fallback-accent': preset.accentHex,
      }}
    >
      <div className="shader-fallback-orb shader-fallback-orb-a" />
      <div className="shader-fallback-orb shader-fallback-orb-b" />
      <div className="shader-fallback-orb shader-fallback-orb-c" />
    </div>
  );
}

export default ShaderFallback;
