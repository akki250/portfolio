import React from 'react';
import { X, Sparkles, Keyboard } from 'lucide-react';
import { SHAPE_ORDER, ShapeId } from '../engine/math';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShape: (shape: ShapeId) => void;
  onTriggerKonami: () => void;
  onTogglePause: () => void;
  isPaused: boolean;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  onClose,
  onSelectShape,
  onTriggerKonami,
  onTogglePause,
  isPaused,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['1', '2', '3', '4', '5'], description: 'Morph directly to Brain, Name, Chip, Bulb, or Torus' },
    { keys: ['↑', '↓'], description: 'Scrub smoothly to previous or next timeline keyframe' },
    { keys: ['Space'], description: 'Pause or resume particle physics & rotation' },
    { keys: ['Click'], description: 'Click empty space to cycle shape with radial ripple wave' },
    { keys: ['Hold Click'], description: 'Attract particles into tight cluster; release to burst outward' },
    { keys: ['Drag'], description: 'Spin 3D constellation with momentum & ease back to auto-rotate' },
    { keys: ['Pinch / Alt+Scroll'], description: 'Scale constellation zoom level (0.55x – 2.20x)' },
    { keys: ['↑↑↓↓←→←→BA'], description: 'Konami Code Easter Egg: Prismatic Rainbow Explosion' },
    { keys: ['?'], description: 'Toggle this keyboard shortcut overlay' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="cyber-card relative w-full max-w-xl p-6 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/25">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[#fcee0a]" />
            <h2 id="shortcut-modal-title" className="text-lg font-semibold tracking-tight font-display">
              Interactive Controls &amp; Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts overlay"
            className="cyber-control p-1.5 rounded text-zinc-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-4 py-2 border-b border-cyan-500/15 last:border-none text-sm"
            >
              <span className="text-zinc-200">{item.description}</span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-1 text-xs font-mono bg-zinc-950 border border-cyan-400/40 rounded text-[#fcee0a] whitespace-nowrap"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-cyan-500/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {SHAPE_ORDER.map((shape, idx) => (
              <button
                key={shape}
                type="button"
                onClick={() => {
                  onSelectShape(shape);
                }}
                className="spring-interactive cyber-control px-2.5 py-1.5 rounded text-xs font-mono capitalize whitespace-nowrap"
              >
                {idx + 1}. {shape}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePause}
              className="spring-interactive cyber-control px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap"
            >
              {isPaused ? 'Resume Motion' : 'Pause Motion'}
            </button>
            <button
              type="button"
              onClick={() => {
                onTriggerKonami();
                onClose();
              }}
              className="spring-interactive cyber-btn-yellow flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Trigger Konami Rainbow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
