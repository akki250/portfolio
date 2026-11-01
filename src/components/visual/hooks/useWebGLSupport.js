import { useEffect, useState } from 'react';

export function detectWebGLCapabilities() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      supported: true,
      isWebGL2: true,
      isSoftwareGl: false,
      prefersReducedMotion: false,
      rendererInfo: 'SSR',
    };
  }

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2', {
      powerPreference: 'high-performance',
      antialias: false,
    });
    const gl =
      gl2 ||
      canvas.getContext('webgl', {
        powerPreference: 'high-performance',
        antialias: false,
      }) ||
      canvas.getContext('experimental-webgl');

    if (!gl) {
      return {
        supported: false,
        isWebGL2: false,
        isSoftwareGl: false,
        prefersReducedMotion,
        rendererInfo: 'Unavailable',
      };
    }

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererInfo = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');

    const isSoftwareGl =
      /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererInfo) ||
      Boolean(navigator.webdriver);

    return {
      supported: true,
      isWebGL2: Boolean(gl2),
      isSoftwareGl,
      prefersReducedMotion,
      rendererInfo,
    };
  } catch {
    return {
      supported: false,
      isWebGL2: false,
      isSoftwareGl: false,
      prefersReducedMotion,
      rendererInfo: 'Error',
    };
  }
}

export function useWebGLSupport() {
  const [capabilities, setCapabilities] = useState(() => detectWebGLCapabilities());

  useEffect(() => {
    setCapabilities(detectWebGLCapabilities());
  }, []);

  return capabilities;
}

export default useWebGLSupport;
