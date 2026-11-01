import { useEffect, useRef } from 'react';

/**
 * Syncs continuous scroll/timeline progress (0..1) and scroll velocity
 * with the centralized InteractionManager and ShaderController.
 */
export function useScrollProgress(externalScrollProgress, interactionManagerRef) {
  const scrollStateRef = useRef({
    progress: externalScrollProgress || 0,
    velocity: 0,
  });

  useEffect(() => {
    if (typeof externalScrollProgress === 'number') {
      const prev = scrollStateRef.current.progress;
      const delta = externalScrollProgress - prev;
      scrollStateRef.current.progress = externalScrollProgress;
      scrollStateRef.current.velocity = delta * 12;

      if (interactionManagerRef?.current) {
        interactionManagerRef.current.setScrollTarget(externalScrollProgress);
      }
    }
  }, [externalScrollProgress, interactionManagerRef]);

  return scrollStateRef;
}

export default useScrollProgress;
