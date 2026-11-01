import React, { useEffect, useRef, useState } from 'react';
import { ShaderController } from './ShaderController';
import { ShaderFallback } from './ShaderFallback';

/**
 * Mounts the single persistent full-viewport WebGL canvas at the root of the app.
 * Handles webglcontextlost and webglcontextrestored gracefully.
 */
export function ShaderCanvas({
  controllerRef,
  interactionManagerRef,
  initialMode = 'aurora',
  capabilities,
}) {
  const canvasRef = useRef(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    if (!capabilities?.supported || !canvasRef.current) return undefined;

    const canvas = canvasRef.current;
    const handleContextLost = (e) => {
      e.preventDefault();
      setContextLost(true);
      if (controllerRef.current) {
        controllerRef.current.stopLoop();
      }
    };

    const handleContextRestored = () => {
      setContextLost(false);
      if (controllerRef.current) {
        controllerRef.current.startLoop();
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    let controller = null;
    try {
      controller = new ShaderController(canvas, interactionManagerRef?.current, {
        initialMode,
        isSoftwareGl: capabilities.isSoftwareGl,
      });
      controllerRef.current = controller;
      controller.startLoop();
    } catch {
      setContextLost(true);
    }

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      if (controller) {
        controller.dispose();
      }
      controllerRef.current = null;
    };
  }, [capabilities?.supported, capabilities?.isSoftwareGl]);

  if (!capabilities?.supported || contextLost) {
    return <ShaderFallback activeShader={initialMode} />;
  }

  return (
    <canvas
      ref={canvasRef}
      id="shader-webgl-canvas"
      data-shader-engine="active"
      aria-hidden="true"
      className="shader-root-canvas"
    />
  );
}

export default ShaderCanvas;
