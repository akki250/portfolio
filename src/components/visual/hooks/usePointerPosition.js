import { useEffect, useRef } from 'react';

/**
 * Tracks normalized pointer coordinates (0..1) and velocity in a ref
 * so high-frequency mouse/touch movement never triggers 60Hz React re-renders.
 */
export function usePointerPosition(interactionManagerRef) {
  const pointerRef = useRef({
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
  });

  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      const w = Math.max(window.innerWidth, 1);
      const h = Math.max(window.innerHeight, 1);
      const nx = clientX / w;
      const ny = 1.0 - clientY / h;
      pointerRef.current.x = nx;
      pointerRef.current.y = ny;

      // Update CSS custom properties for interactive card spotlight tracking
      document.documentElement.style.setProperty('--pointer-x', `${clientX}px`);
      document.documentElement.style.setProperty('--pointer-y', `${clientY}px`);
      document.documentElement.style.setProperty('--pointer-nx', nx.toFixed(3));
      document.documentElement.style.setProperty('--pointer-ny', (1.0 - ny).toFixed(3));

      if (interactionManagerRef?.current) {
        interactionManagerRef.current.setPointerTarget(nx, ny);
      }
    };

    const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('pointermove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [interactionManagerRef]);

  return pointerRef;
}

export default usePointerPosition;
