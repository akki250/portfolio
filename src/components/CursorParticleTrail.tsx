import { useEffect, useRef } from "react";
import {
  CURSOR_TRAIL_FRAGMENT_SHADER,
  CURSOR_TRAIL_VERTEX_SHADER,
  FLOATS_PER_PARTICLE,
  createParticlePool,
  emitParticlesAlongSegment,
  hexToRgbNormalized,
  stepParticlePool,
} from "./cursorTrailUtils";

export interface CursorParticleTrailProps {
  primaryColor?: string;
  secondaryColor?: string;
  coreColor?: string;
  capacity?: number;
  baseSize?: number;
  iframeEl?: HTMLIFrameElement | null;
}

export interface CursorTrailDiagnostics {
  shaderCompiled: boolean;
  activeParticles: number;
  totalEmitted: number;
  lastX: number;
  lastY: number;
}

declare global {
  interface Window {
    __cursorParticleTrailStats?: CursorTrailDiagnostics;
  }
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createShaderProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function CursorParticleTrail({
  primaryColor = "#e0231c",
  secondaryColor = "#ff8a3d",
  coreColor = "#fff7f0",
  capacity = 460,
  baseSize = 24,
  iframeEl = null,
}: CursorParticleTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl =
      (canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
      }) as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    const pool = createParticlePool(capacity);
    const pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      hasMoved: false,
      lastMoveTime: performance.now(),
    };

    window.__cursorParticleTrailStats = {
      shaderCompiled: false,
      activeParticles: 0,
      totalEmitted: 0,
      lastX: pointer.x,
      lastY: pointer.y,
    };

    if (!gl) return undefined;

    const program = createShaderProgram(
      gl,
      CURSOR_TRAIL_VERTEX_SHADER,
      CURSOR_TRAIL_FRAGMENT_SHADER
    );
    if (!program) return undefined;

    window.__cursorParticleTrailStats.shaderCompiled = true;

    const aPosition = gl.getAttribLocation(program, "aPosition");
    const aVelocity = gl.getAttribLocation(program, "aVelocity");
    const aAge = gl.getAttribLocation(program, "aAge");
    const aLife = gl.getAttribLocation(program, "aLife");
    const aSize = gl.getAttribLocation(program, "aSize");
    const aSeed = gl.getAttribLocation(program, "aSeed");

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uPixelRatio = gl.getUniformLocation(program, "uPixelRatio");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uPrimaryColor = gl.getUniformLocation(program, "uPrimaryColor");
    const uSecondaryColor = gl.getUniformLocation(program, "uSecondaryColor");
    const uCoreColor = gl.getUniformLocation(program, "uCoreColor");

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, pool.bufferData.byteLength, gl.DYNAMIC_DRAW);

    const stride = FLOATS_PER_PARTICLE * Float32Array.BYTES_PER_ELEMENT;
    if (aPosition >= 0) {
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
    }
    if (aVelocity >= 0) {
      gl.enableVertexAttribArray(aVelocity);
      gl.vertexAttribPointer(
        aVelocity,
        2,
        gl.FLOAT,
        false,
        stride,
        2 * Float32Array.BYTES_PER_ELEMENT
      );
    }
    if (aAge >= 0) {
      gl.enableVertexAttribArray(aAge);
      gl.vertexAttribPointer(
        aAge,
        1,
        gl.FLOAT,
        false,
        stride,
        4 * Float32Array.BYTES_PER_ELEMENT
      );
    }
    if (aLife >= 0) {
      gl.enableVertexAttribArray(aLife);
      gl.vertexAttribPointer(
        aLife,
        1,
        gl.FLOAT,
        false,
        stride,
        5 * Float32Array.BYTES_PER_ELEMENT
      );
    }
    if (aSize >= 0) {
      gl.enableVertexAttribArray(aSize);
      gl.vertexAttribPointer(
        aSize,
        1,
        gl.FLOAT,
        false,
        stride,
        6 * Float32Array.BYTES_PER_ELEMENT
      );
    }
    if (aSeed >= 0) {
      gl.enableVertexAttribArray(aSeed);
      gl.vertexAttribPointer(
        aSeed,
        1,
        gl.FLOAT,
        false,
        stride,
        7 * Float32Array.BYTES_PER_ELEMENT
      );
    }

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = Math.max(1, window.innerWidth);
    let height = Math.max(1, window.innerHeight);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const primaryRgb = hexToRgbNormalized(primaryColor);
    const secondaryRgb = hexToRgbNormalized(secondaryColor);
    const coreRgb = hexToRgbNormalized(coreColor);

    const handleCursorMove = (clientX: number, clientY: number) => {
      const now = performance.now();
      const dt = Math.max(0.004, Math.min(0.08, (now - pointer.lastMoveTime) / 1000));
      const prevX = pointer.hasMoved ? pointer.x : clientX;
      const prevY = pointer.hasMoved ? pointer.y : clientY;

      emitParticlesAlongSegment(pool, prevX, prevY, clientX, clientY, dt, {
        count: 3,
        spread: 44,
        baseSize,
        minLife: 0.55,
        maxLife: 1.15,
      });

      pointer.x = clientX;
      pointer.y = clientY;
      pointer.hasMoved = true;
      pointer.lastMoveTime = now;

      if (window.__cursorParticleTrailStats) {
        window.__cursorParticleTrailStats.totalEmitted = pool.totalEmitted;
        window.__cursorParticleTrailStats.lastX = clientX;
        window.__cursorParticleTrailStats.lastY = clientY;
      }
    };

    const handleBurst = (clientX: number, clientY: number) => {
      emitParticlesAlongSegment(pool, clientX, clientY, clientX + 1, clientY + 1, 0.016, {
        count: 18,
        spread: 115,
        baseSize: baseSize * 1.2,
        minLife: 0.65,
        maxLife: 1.35,
      });
      pointer.x = clientX;
      pointer.y = clientY;
      pointer.hasMoved = true;
      if (window.__cursorParticleTrailStats) {
        window.__cursorParticleTrailStats.totalEmitted = pool.totalEmitted;
        window.__cursorParticleTrailStats.lastX = clientX;
        window.__cursorParticleTrailStats.lastY = clientY;
      }
    };

    const onWindowPointerMove = (e: PointerEvent | MouseEvent) => {
      handleCursorMove(e.clientX, e.clientY);
    };
    const onWindowPointerDown = (e: PointerEvent | MouseEvent) => {
      handleBurst(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
    window.addEventListener("mousemove", onWindowPointerMove, { passive: true });
    window.addEventListener("pointerdown", onWindowPointerDown, { passive: true });
    window.addEventListener("resize", resize);

    // Attach listeners to embedded same-origin iframes (such as kage.html)
    const attachedDocs = new WeakSet<Document>();
    const cleanupFns: Array<() => void> = [];

    const bindIframeListeners = (frame: HTMLIFrameElement | null) => {
      if (!frame) return;
      const doc = frame.contentDocument;
      if (!doc || attachedDocs.has(doc)) return;
      attachedDocs.add(doc);

      const onFrameMove = (e: PointerEvent | MouseEvent) => {
        const rect = frame.getBoundingClientRect();
        handleCursorMove(rect.left + e.clientX, rect.top + e.clientY);
      };
      const onFrameDown = (e: PointerEvent | MouseEvent) => {
        const rect = frame.getBoundingClientRect();
        handleBurst(rect.left + e.clientX, rect.top + e.clientY);
      };

      doc.addEventListener("pointermove", onFrameMove, { passive: true });
      doc.addEventListener("mousemove", onFrameMove, { passive: true });
      doc.addEventListener("pointerdown", onFrameDown, { passive: true });

      cleanupFns.push(() => {
        doc.removeEventListener("pointermove", onFrameMove);
        doc.removeEventListener("mousemove", onFrameMove);
        doc.removeEventListener("pointerdown", onFrameDown);
      });
    };

    bindIframeListeners(iframeEl);
    const allFrames = Array.from(document.querySelectorAll("iframe"));
    allFrames.forEach((f) => {
      bindIframeListeners(f);
      const onLoad = () => bindIframeListeners(f);
      f.addEventListener("load", onLoad);
      cleanupFns.push(() => f.removeEventListener("load", onLoad));
    });

    let rafId = 0;
    const startTime = performance.now();
    let lastFrameTime = startTime;

    const render = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
      lastFrameTime = now;
      const elapsed = (now - startTime) / 1000;

      // Check if iframe document loaded after initial mount
      if (iframeEl) {
        bindIframeListeners(iframeEl);
      }

      const activeCount = stepParticlePool(pool, dt, elapsed);
      if (window.__cursorParticleTrailStats) {
        window.__cursorParticleTrailStats.activeParticles = activeCount;
        window.__cursorParticleTrailStats.totalEmitted = pool.totalEmitted;
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (activeCount > 0) {
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);

        gl.uniform2f(uResolution, width, height);
        gl.uniform1f(uPixelRatio, dpr);
        gl.uniform1f(uTime, elapsed);
        gl.uniform3f(uPrimaryColor, primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        gl.uniform3f(uSecondaryColor, secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        gl.uniform3f(uCoreColor, coreRgb[0], coreRgb[1], coreRgb[2]);

        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, pool.bufferData);
        gl.drawArrays(gl.POINTS, 0, pool.capacity);
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("mousemove", onWindowPointerMove);
      window.removeEventListener("pointerdown", onWindowPointerDown);
      window.removeEventListener("resize", resize);
      cleanupFns.forEach((fn) => fn());
      gl.deleteBuffer(vbo);
      gl.deleteProgram(program);
    };
  }, [primaryColor, secondaryColor, coreColor, capacity, baseSize, iframeEl]);

  return (
    <canvas
      ref={canvasRef}
      className="cursor-particle-trail-canvas"
      aria-hidden="true"
    />
  );
}
