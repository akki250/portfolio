export const SIDES = ['bottom', 'top', 'left', 'right'] as const;
export type DockPosition = (typeof SIDES)[number];
export type DockTheme = 'dark' | 'light';

export const EDGE = 12;
export const HOP = 0.4;
export const HOP_TIME = 0.38;
export const HOLD_TIME = 450;
export const TAIL = 9;
export const TAIL_HALF = 9;
export const MENU_RADIUS = 10;
export const MENU_GAP = 8;
export const MARGIN = 8;
export const POP = 'cubic-bezier(0.2, 1.25, 0.4, 1)';

export const THEMES: Record<DockTheme, Record<string, string>> = {
  dark: {
    '--dock-panel': 'rgba(38, 35, 46, 0.66)',
    '--dock-panel-edge': 'rgba(255, 255, 255, 0.08)',
    '--dock-panel-highlight': 'rgba(255, 255, 255, 0.07)',
    '--dock-panel-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--dock-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--dock-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--dock-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--dock-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--dock-ink': '#f4f4f5',
    '--dock-label': '#2a2731',
    '--dock-label-ink': '#f4f4f5',
    '--dock-dot': 'rgba(255, 255, 255, 0.72)',
    '--dock-separator': 'rgba(255, 255, 255, 0.12)',
    '--dock-press': 'brightness(0.75)',
    '--dock-menu': 'rgba(40, 37, 47, 0.8)',
    '--dock-menu-edge': 'rgba(255, 255, 255, 0.13)',
    '--dock-menu-ink': '#f4f4f5',
    '--dock-menu-muted': 'rgba(244, 244, 245, 0.42)',
    '--dock-menu-separator': 'rgba(255, 255, 255, 0.1)',
    '--dock-menu-shadow': '0 18px 40px -12px rgba(0, 0, 0, 0.65), 0 3px 10px rgba(0, 0, 0, 0.3)'
  },
  light: {
    '--dock-panel': 'rgba(240, 240, 243, 0.8)',
    '--dock-panel-edge': 'rgba(24, 24, 27, 0.07)',
    '--dock-panel-highlight': 'rgba(255, 255, 255, 0.95)',
    '--dock-panel-shadow': '0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)',
    '--dock-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--dock-tile-edge': 'rgba(24, 24, 27, 0.08)',
    '--dock-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--dock-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.25)',
    '--dock-ink': '#27272a',
    '--dock-label': '#ffffff',
    '--dock-label-ink': '#18181b',
    '--dock-dot': 'rgba(24, 24, 27, 0.55)',
    '--dock-separator': 'rgba(24, 24, 27, 0.12)',
    '--dock-press': 'brightness(0.9)',
    '--dock-menu': 'rgba(248, 248, 250, 0.86)',
    '--dock-menu-edge': 'rgba(24, 24, 27, 0.1)',
    '--dock-menu-ink': '#18181b',
    '--dock-menu-muted': 'rgba(24, 24, 27, 0.4)',
    '--dock-menu-separator': 'rgba(24, 24, 27, 0.1)',
    '--dock-menu-shadow': '0 18px 40px -14px rgba(24, 24, 27, 0.3), 0 3px 10px rgba(24, 24, 27, 0.1)'
  }
};

export const hasBadge = (badge: unknown): boolean =>
  badge !== undefined && badge !== null && badge !== false;

export const usable = (row: { separator?: boolean; disabled?: boolean } | null | undefined): boolean =>
  !!row && !row.separator && !row.disabled;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const menuPath = (width: number, height: number, side: string | null, at: number): string => {
  const r = MENU_RADIUS;
  const p = (x: number, y: number) => `${(x + TAIL).toFixed(2)} ${(y + TAIL).toFixed(2)}`;
  const tail = (x: number, y: number, dx: number, dy: number, nx: number, ny: number) => {
    const q = (u: number, v: number) => p(x + dx * u + nx * v, y + dy * u + ny * v);
    return `L ${q(-TAIL_HALF, 0)} L ${q(-TAIL_HALF * 0.18, TAIL * 0.82)} Q ${q(0, TAIL)} ${q(TAIL_HALF * 0.18, TAIL * 0.82)} L ${q(TAIL_HALF, 0)}`;
  };
  return [
    `M ${p(r, 0)}`,
    side === 'top' ? tail(at, 0, 1, 0, 0, -1) : '',
    `L ${p(width - r, 0)} A ${r} ${r} 0 0 1 ${p(width, r)}`,
    side === 'right' ? tail(width, at, 0, 1, 1, 0) : '',
    `L ${p(width, height - r)} A ${r} ${r} 0 0 1 ${p(width - r, height)}`,
    side === 'bottom' ? tail(at, height, -1, 0, 0, 1) : '',
    `L ${p(r, height)} A ${r} ${r} 0 0 1 ${p(0, height - r)}`,
    side === 'left' ? tail(0, at, 0, -1, -1, 0) : '',
    `L ${p(0, r)} A ${r} ${r} 0 0 1 ${p(r, 0)} Z`
  ].join(' ');
};

export const DOCK_CSS = `
.dock {
  position: absolute;
  z-index: 10;
  display: flex;
  gap: var(--dock-gap);
  box-sizing: border-box;
  padding: var(--dock-pad);
  border-radius: calc(var(--dock-base) * var(--dock-round) * 0.5 + var(--dock-pad));
  background: var(--dock-panel);
  box-shadow:
    inset 0 0 0 1px var(--dock-panel-edge),
    inset 0 1px 0 var(--dock-panel-highlight),
    var(--dock-panel-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  backdrop-filter: blur(20px) saturate(1.6);
  touch-action: none;
  transition:
    translate 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}

.dock[data-hidden] {
  opacity: 0;
  pointer-events: none;
  transition:
    translate 0.36s cubic-bezier(0.55, 0, 0.75, 0.15),
    opacity 0.24s ease 0.1s;
}

.dock::before {
  content: '';
  position: absolute;
  z-index: -1;
  display: none;
}

.dock:hover::before {
  display: block;
}

.dock--bottom,
.dock--top {
  left: 50%;
  height: var(--dock-thickness);
  transform: translateX(-50%);
}

.dock--left,
.dock--right {
  top: 50%;
  flex-direction: column;
  width: var(--dock-thickness);
  transform: translateY(-50%);
}

.dock--bottom {
  bottom: 12px;
  align-items: flex-end;
}

.dock--top {
  top: 12px;
  align-items: flex-start;
}

.dock--left {
  left: 12px;
  align-items: flex-start;
}

.dock--right {
  right: 12px;
  align-items: flex-end;
}

.dock--bottom[data-hidden] {
  translate: 0 calc(100% + 12px);
}

.dock--top[data-hidden] {
  translate: 0 calc(-100% - 12px);
}

.dock--left[data-hidden] {
  translate: calc(-100% - 12px) 0;
}

.dock--right[data-hidden] {
  translate: calc(100% + 12px) 0;
}

.dock--bottom::before,
.dock--top::before {
  left: 0;
  right: 0;
  height: calc(var(--dock-reach) + 8px);
}

.dock--left::before,
.dock--right::before {
  top: 0;
  bottom: 0;
  width: calc(var(--dock-reach) + 8px);
}

.dock--bottom::before {
  bottom: 100%;
}

.dock--top::before {
  top: 100%;
}

.dock--left::before {
  left: 100%;
}

.dock--right::before {
  right: 100%;
}

.dock-item {
  position: relative;
  flex: none;
  width: var(--dock-base);
  height: var(--dock-base);
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--dock-ink);
  font: inherit;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.dock-item:hover,
.dock-item:focus-visible {
  z-index: 1;
}

.dock-tile {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--dock-base);
  height: var(--dock-base);
  transform-origin: 0 0;
  pointer-events: none;
}

.dock-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: calc(var(--dock-base) * var(--dock-round) * 0.5);
  background: var(--dock-tile);
  box-shadow:
    inset 0 0 0 1px var(--dock-tile-edge),
    inset 0 1px 0 var(--dock-tile-highlight),
    var(--dock-tile-shadow);
  font-size: calc(var(--dock-base) * 0.44);
  line-height: 1;
  transition: filter 0.2s ease;
}

.dock--bare .dock-face {
  overflow: visible;
  background: none;
  box-shadow: none;
  font-size: calc(var(--dock-base) * 0.62);
}

.dock-item:active .dock-face,
.dock-item[data-open] .dock-face {
  filter: var(--dock-press);
  transition-duration: 0s;
}

.dock-item:focus-visible .dock-face {
  outline: 2px solid var(--dock-accent);
  outline-offset: 3px;
}

.dock-badge {
  position: absolute;
  top: calc(var(--dock-base) * (0.1465 * var(--dock-round) - 0.19));
  right: calc(var(--dock-base) * (0.1465 * var(--dock-round) - 0.19));
  box-sizing: border-box;
  min-width: calc(var(--dock-base) * 0.38);
  height: calc(var(--dock-base) * 0.38);
  padding: 0 calc(var(--dock-base) * 0.1);
  border-radius: calc(var(--dock-base) * 0.19);
  background: var(--dock-badge);
  color: #ffffff;
  font-size: calc(var(--dock-base) * 0.22);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: calc(var(--dock-base) * 0.38);
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.dock-badge:empty {
  top: calc(var(--dock-base) * (0.1465 * var(--dock-round) - 0.11));
  right: calc(var(--dock-base) * (0.1465 * var(--dock-round) - 0.11));
  min-width: 0;
  width: calc(var(--dock-base) * 0.22);
  height: calc(var(--dock-base) * 0.22);
  padding: 0;
}

.dock-dot {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--dock-dot);
  pointer-events: none;
}

.dock--bottom .dock-dot,
.dock--top .dock-dot {
  left: 50%;
  margin-left: -2px;
}

.dock--left .dock-dot,
.dock--right .dock-dot {
  top: 50%;
  margin-top: -2px;
}

.dock--bottom .dock-dot {
  top: calc(100% + max(var(--dock-pad) / 2, 5px) - 2px);
}

.dock--top .dock-dot {
  bottom: calc(100% + max(var(--dock-pad) / 2, 5px) - 2px);
}

.dock--left .dock-dot {
  right: calc(100% + max(var(--dock-pad) / 2, 5px) - 2px);
}

.dock--right .dock-dot {
  left: calc(100% + max(var(--dock-pad) / 2, 5px) - 2px);
}

.dock-separator {
  flex: none;
  align-self: center;
  border-radius: 1px;
  background: var(--dock-separator);
}

.dock--bottom .dock-separator,
.dock--top .dock-separator {
  width: 1px;
  height: calc(var(--dock-base) * 0.72);
}

.dock--left .dock-separator,
.dock--right .dock-separator {
  width: calc(var(--dock-base) * 0.72);
  height: 1px;
}

.dock-label {
  position: absolute;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--dock-label);
  color: var(--dock-label-ink);
  box-shadow:
    inset 0 0 0 1px var(--dock-panel-edge),
    0 8px 20px -8px rgba(0, 0, 0, 0.35);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.dock--bottom .dock-label {
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translate(-50%, 4px);
}

.dock--top .dock-label {
  top: calc(100% + 12px);
  left: 50%;
  transform: translate(-50%, -4px);
}

.dock--left .dock-label {
  top: 50%;
  left: calc(100% + 12px);
  transform: translate(-4px, -50%);
}

.dock--right .dock-label {
  top: 50%;
  right: calc(100% + 12px);
  transform: translate(4px, -50%);
}

.dock-item:focus-visible .dock-label {
  opacity: 1;
}

.dock--bottom .dock-item:focus-visible .dock-label,
.dock--top .dock-item:focus-visible .dock-label {
  transform: translate(-50%, 0);
}

.dock--left .dock-item:focus-visible .dock-label,
.dock--right .dock-item:focus-visible .dock-label {
  transform: translate(0, -50%);
}

@media (hover: hover) {
  .dock-item:hover .dock-label {
    opacity: 1;
  }

  .dock--bottom .dock-item:hover .dock-label,
  .dock--top .dock-item:hover .dock-label {
    transform: translate(-50%, 0);
  }

  .dock--left .dock-item:hover .dock-label,
  .dock--right .dock-item:hover .dock-label {
    transform: translate(0, -50%);
  }
}

.dock .dock-item[data-hop] .dock-label {
  opacity: 0;
}

.dock-menu {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  visibility: hidden;
  color: var(--dock-menu-ink);
  font-size: 13px;
  line-height: 1;
}

.dock-menu-shadow {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  box-shadow: var(--dock-menu-shadow);
  pointer-events: none;
}

.dock-menu-glass {
  position: absolute;
  inset: -9px;
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  backdrop-filter: blur(24px) saturate(1.8);
  pointer-events: none;
}

.dock-menu-shape {
  position: absolute;
  top: -9px;
  left: -9px;
  width: calc(100% + 18px);
  height: calc(100% + 18px);
  overflow: visible;
  pointer-events: none;
}

.dock-menu-shape path {
  fill: var(--dock-menu);
  stroke: var(--dock-menu-edge);
  stroke-width: 1px;
}

.dock-menu-list {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 172px;
  max-width: 280px;
  padding: 5px;
  outline: none;
}

.dock-menu-highlight {
  position: absolute;
  top: 0;
  left: 5px;
  right: 5px;
  height: 24px;
  border-radius: 6px;
  background: var(--dock-accent);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.16s cubic-bezier(0.3, 0.8, 0.3, 1),
    height 0.16s cubic-bezier(0.3, 0.8, 0.3, 1),
    opacity 0.12s ease;
}

.dock-menu-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  box-sizing: border-box;
  width: 100%;
  height: 24px;
  margin: 0;
  padding: 0 10px 0 7px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: default;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.dock-menu-row[data-active] {
  color: #ffffff;
}

.dock-menu-row[aria-disabled='true'] {
  color: var(--dock-menu-muted);
}

.dock-menu-check {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 14px;
}

.dock-menu-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  margin-right: 1px;
  font-size: 15px;
}

.dock-menu-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dock-menu-shortcut {
  flex: none;
  margin-left: 18px;
  color: var(--dock-menu-muted);
}

.dock-menu-row[data-active] .dock-menu-shortcut {
  color: rgba(255, 255, 255, 0.72);
}

.dock-menu-chevron {
  display: flex;
  flex: none;
  margin-left: 14px;
  color: var(--dock-menu-muted);
}

.dock-menu-row[data-active] .dock-menu-chevron {
  color: inherit;
}

.dock-menu-separator {
  flex: none;
  height: 1px;
  margin: 5px 10px;
  background: var(--dock-menu-separator);
}

@media (prefers-reduced-motion: reduce) {
  .dock,
  .dock[data-hidden],
  .dock-menu-highlight {
    transition: none;
  }
}
`;
