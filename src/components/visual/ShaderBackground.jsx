import React from 'react';
import { ShaderCanvas } from './ShaderCanvas';

/**
 * Persistent site-wide shader background layer with subtle atmospheric vignette
 * and volumetric depth framing positioned behind all DOM content.
 */
export function ShaderBackground({
  controllerRef,
  interactionManagerRef,
  activeShader,
  capabilities,
}) {
  return (
    <div
      id="site-shader-background"
      data-active-shader={activeShader}
      aria-hidden="true"
      className="shader-background-root"
    >
      <ShaderCanvas
        controllerRef={controllerRef}
        interactionManagerRef={interactionManagerRef}
        initialMode={activeShader}
        capabilities={capabilities}
      />
      <div className="shader-atmospheric-vignette" />
      <div className="shader-subtle-grain" />
    </div>
  );
}

export default ShaderBackground;
