'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';

import './Dock.css';
import {
  SIDES,
  EDGE,
  HOP,
  HOP_TIME,
  HOLD_TIME,
  TAIL,
  TAIL_HALF,
  MENU_RADIUS,
  MENU_GAP,
  MARGIN,
  POP,
  THEMES,
  hasBadge,
  usable,
  clamp,
  menuPath,
  type DockPosition,
  type DockTheme
} from './dockUtils';

export interface DockMenuItem {
  label?: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  shortcut?: ReactNode;
  items?: DockMenuItem[];
  separator?: boolean;
}

export interface DockItemData {
  icon?: ReactNode;
  label?: string;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  badge?: number | string | boolean;
  menu?: DockMenuItem[];
  separator?: boolean;
}

export interface DockProps {
  items?: DockItemData[];
  position?: DockPosition;
  theme?: DockTheme;
  baseItemSize?: number;
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  gap?: number;
  roundness?: number;
  spring?: { mass?: number; stiffness?: number; damping?: number };
  bounce?: boolean;
  autoHide?: boolean;
  tiles?: boolean;
  showLabels?: boolean;
  showIndicators?: boolean;
  showBadges?: boolean;
  badgeColor?: string;
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const CheckGlyph = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronGlyph = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 3.5L10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface DockMenuProps {
  rows: DockMenuItem[];
  label?: string;
  side?: string | null;
  point?: { x: number; y: number };
  edge?: { left: number; right: number; top: number };
  tokens: CSSProperties;
  portalTarget?: HTMLElement;
  nested?: boolean;
  focusFirst?: boolean;
  closing?: boolean;
  pressingRef?: MutableRefObject<boolean>;
  onSelect?: (row: DockMenuItem, keyboard: boolean) => void;
  onDismiss?: (restore: boolean) => void;
  onBack?: () => void;
  onEnter?: () => void;
  onExited?: () => void;
}

function DockMenu({
  rows,
  label,
  side = null,
  point,
  edge,
  tokens,
  portalTarget,
  nested = false,
  focusFirst = false,
  closing = false,
  pressingRef,
  onSelect,
  onDismiss,
  onBack,
  onEnter,
  onExited
}: DockMenuProps) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const glassRef = useRef<HTMLSpanElement | null>(null);
  const shapeRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const frameRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const timerRef = useRef<number>(0);
  const aliveRef = useRef<boolean>(true);
  const reduceRef = useRef<boolean>(false);
  const callbacks = useRef<{
    onSelect?: (row: DockMenuItem, keyboard: boolean) => void;
    onDismiss?: (restore: boolean) => void;
    onBack?: () => void;
    onExited?: () => void;
  }>({});
  const [active, setActive] = useState(-1);
  const [sub, setSub] = useState<{
    index: number;
    keyboard: boolean;
    edge: { left: number; right: number; top: number };
  } | null>(null);
  const [blink, setBlink] = useState(false);
  const [chosen, setChosen] = useState(false);
  const checks = rows.some(row => row && !row.separator && row.checked !== undefined);

  callbacks.current = { onSelect, onDismiss, onBack, onExited };

  useIsomorphicLayoutEffect(() => {
    const outer = outerRef.current;
    const list = listRef.current;
    const glass = glassRef.current;
    const shape = pathRef.current;
    if (!outer || !list || !glass || !shape) return undefined;
    const doc = outer.ownerDocument;
    const win = doc.defaultView ?? window;
    aliveRef.current = true;
    const layers = [outer.firstElementChild, glass, shapeRef.current, list].filter(Boolean) as Element[];
    const { x, y } = point ?? { x: 0, y: 0 };
    const box = edge ?? { left: 0, right: 0, top: 0 };
    const reduce = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    reduceRef.current = reduce;
    const width = list.offsetWidth;
    const height = list.offsetHeight;
    const vw = doc.documentElement.clientWidth;
    const vh = doc.documentElement.clientHeight;
    let left: number;
    let top: number;
    let at = 0;
    let origin: string;
    if (side === 'bottom' || side === 'top') {
      left = clamp(x - width / 2, MARGIN, vw - MARGIN - width);
      top = side === 'bottom' ? y - TAIL - height : y + TAIL;
      at = clamp(x - left, MENU_RADIUS + TAIL_HALF, width - MENU_RADIUS - TAIL_HALF);
      origin = `${at}px ${side === 'bottom' ? height + TAIL : -TAIL}px`;
    } else if (side === 'left' || side === 'right') {
      top = clamp(y - height / 2, MARGIN, vh - MARGIN - height);
      left = side === 'right' ? x - TAIL - width : x + TAIL;
      at = clamp(y - top, MENU_RADIUS + TAIL_HALF, height - MENU_RADIUS - TAIL_HALF);
      origin = `${side === 'right' ? width + TAIL : -TAIL}px ${at}px`;
    } else {
      const flip = box.right - 4 + width > vw - MARGIN && box.left + 4 - width >= MARGIN;
      left = flip ? box.left + 4 - width : box.right - 4;
      top = clamp(box.top - 5, MARGIN, vh - MARGIN - height);
      origin = flip ? 'right top' : 'left top';
    }
    const path = menuPath(width, height, side, at);
    frameRef.current = { left, top, width, height };
    outer.style.left = `${left}px`;
    outer.style.top = `${top}px`;
    outer.style.transformOrigin = origin;
    outer.style.visibility = 'visible';
    glass.style.clipPath = `path('${path}')`;
    shape.setAttribute('d', path);
    if (reduce) {
      layers.forEach(layer => layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'ease-out' }));
    } else {
      outer.animate([{ transform: `scale(${nested ? 0.94 : 0.82})` }, { transform: 'scale(1)' }], {
        duration: nested ? 220 : 340,
        easing: POP
      });
      layers.forEach(layer =>
        layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: nested ? 120 : 160, easing: 'ease-out' })
      );
    }
    const first = rows.findIndex(usable);
    if (focusFirst && first >= 0) {
      setActive(first);
      rowRefs.current[first]?.focus({ preventScroll: true });
    } else {
      list.focus({ preventScroll: true });
    }
    return () => {
      aliveRef.current = false;
      window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!closing) return undefined;
    const outer = outerRef.current;
    const layers = [outer?.firstElementChild, glassRef.current, shapeRef.current, listRef.current].filter(
      Boolean
    ) as Element[];
    const duration = reduceRef.current ? 100 : 150;
    let done = false;
    const finish = () => {
      if (done || !aliveRef.current) return;
      done = true;
      callbacks.current.onExited?.();
    };
    if (outer && !reduceRef.current) {
      outer.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.96)' }], {
        duration,
        easing: 'ease-in',
        fill: 'forwards'
      });
    }
    layers.forEach(layer =>
      layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-in', fill: 'forwards' })
    );
    const timer = window.setTimeout(finish, duration);
    return () => window.clearTimeout(timer);
  }, [closing]);

  useIsomorphicLayoutEffect(() => {
    const highlight = highlightRef.current;
    if (!highlight) return;
    const row = rowRefs.current[active];
    if (!row || blink) {
      if (blink) highlight.style.transition = 'none';
      highlight.style.opacity = '0';
      return;
    }
    const jump = highlight.style.opacity !== '1' || reduceRef.current;
    if (jump) highlight.style.transition = 'none';
    highlight.style.transform = `translateY(${row.offsetTop}px)`;
    highlight.style.height = `${row.offsetHeight}px`;
    highlight.style.opacity = '1';
    if (jump) {
      void highlight.offsetHeight;
      highlight.style.transition = '';
    }
  }, [active, blink]);

  const activate = (index: number) => {
    setActive(index);
    rowRefs.current[index]?.focus({ preventScroll: true });
  };

  const openSub = (index: number, keyboard: boolean) => {
    window.clearTimeout(timerRef.current);
    const frame = frameRef.current;
    const row = rowRefs.current[index];
    if (!frame || !row) return;
    setSub({
      index,
      keyboard,
      edge: { left: frame.left, right: frame.left + frame.width, top: frame.top + row.offsetTop }
    });
  };

  const closeSub = () => {
    window.clearTimeout(timerRef.current);
    setSub(null);
  };

  const choose = (index: number, keyboard: boolean) => {
    if (chosen) return;
    const row = rows[index];
    setChosen(true);
    setActive(index);
    window.clearTimeout(timerRef.current);
    if (reduceRef.current) {
      callbacks.current.onSelect?.(row, keyboard);
      return;
    }
    setBlink(true);
    window.setTimeout(() => aliveRef.current && setBlink(false), 70);
    window.setTimeout(() => aliveRef.current && callbacks.current.onSelect?.(row, keyboard), 150);
  };

  const enterRow = (index: number) => {
    if (chosen || active === index || !usable(rows[index])) return;
    activate(index);
    window.clearTimeout(timerRef.current);
    if (rows[index].items?.length) {
      if (sub?.index !== index) timerRef.current = window.setTimeout(() => openSub(index, false), 120);
    } else if (sub) {
      timerRef.current = window.setTimeout(closeSub, 220);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (chosen) return;
    const { key } = event;
    const order = rows.flatMap((row, i) => (usable(row) ? [i] : []));
    let handled = true;
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
      if (order.length) {
        const at = order.indexOf(active);
        let next = order[0];
        if (key === 'End') next = order[order.length - 1];
        else if (key === 'ArrowDown') next = order[(at + 1) % order.length];
        else if (key === 'ArrowUp') next = order[at <= 0 ? order.length - 1 : at - 1];
        if (sub) closeSub();
        activate(next);
      }
    } else if (key === 'ArrowRight' && rows[active]?.items?.length) {
      openSub(active, true);
    } else if ((key === 'ArrowLeft' || key === 'Escape') && nested) {
      callbacks.current.onBack?.();
    } else if (key === 'Escape' || key === 'Tab') {
      callbacks.current.onDismiss?.(true);
    } else {
      handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const subRow = sub ? rows[sub.index] : null;
  const targetBody = portalTarget ?? document.body;

  return (
    <>
      {createPortal(
        <div ref={outerRef} className="dock-menu" style={tokens} data-dock-menu="">
          <span className="dock-menu-shadow" />
          <span ref={glassRef} className="dock-menu-glass" />
          <svg ref={shapeRef} className="dock-menu-shape" aria-hidden="true">
            <path ref={pathRef} />
          </svg>
          <div
            ref={listRef}
            className="dock-menu-list"
            role="menu"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            onPointerEnter={() => onEnter?.()}
            onPointerLeave={() => {
              if (sub || chosen) return;
              setActive(-1);
              listRef.current?.focus({ preventScroll: true });
            }}
          >
            <span ref={highlightRef} className="dock-menu-highlight" />
            {rows.map((row, index) => {
              if (!row) return null;
              if (row.separator) return <span key={index} className="dock-menu-separator" role="separator" />;
              const lit = index === active && !blink;
              const submenu = Boolean(row.items?.length);
              return (
                <button
                  key={index}
                  ref={node => {
                    rowRefs.current[index] = node;
                  }}
                  type="button"
                  className="dock-menu-row"
                  role={row.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
                  aria-checked={row.checked !== undefined ? Boolean(row.checked) : undefined}
                  aria-disabled={row.disabled ? true : undefined}
                  aria-haspopup={submenu ? 'menu' : undefined}
                  aria-expanded={submenu ? sub?.index === index : undefined}
                  tabIndex={-1}
                  data-dock-row={index}
                  data-active={lit ? '' : undefined}
                  onPointerMove={() => enterRow(index)}
                  onPointerUp={() => {
                    if (!pressingRef?.current || !usable(row) || submenu) return;
                    pressingRef.current = false;
                    choose(index, false);
                  }}
                  onClick={event => {
                    if (chosen || !usable(row)) return;
                    if (submenu) openSub(index, event.detail === 0);
                    else choose(index, event.detail === 0);
                  }}
                >
                  {checks ? <span className="dock-menu-check">{row.checked ? <CheckGlyph /> : null}</span> : null}
                  {row.icon ? <span className="dock-menu-icon">{row.icon}</span> : null}
                  <span className="dock-menu-text">{row.label}</span>
                  {row.shortcut ? <span className="dock-menu-shortcut">{row.shortcut}</span> : null}
                  {submenu ? (
                    <span className="dock-menu-chevron">
                      <ChevronGlyph />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>,
        targetBody
      )}
      {sub ? (
        <DockMenu
          key={sub.index}
          rows={subRow?.items ?? []}
          label={typeof subRow?.label === 'string' ? subRow.label : undefined}
          edge={sub.edge}
          tokens={tokens}
          portalTarget={targetBody}
          nested
          focusFirst={sub.keyboard}
          closing={closing}
          pressingRef={pressingRef}
          onSelect={(row, keyboard) => callbacks.current.onSelect?.(row, keyboard)}
          onDismiss={restore => callbacks.current.onDismiss?.(restore)}
          onBack={() => {
            const index = sub.index;
            closeSub();
            activate(index);
          }}
          onEnter={() => {
            window.clearTimeout(timerRef.current);
            setActive(sub.index);
          }}
        />
      ) : null}
    </>
  );
}

export default function Dock({
  items = [],
  position = 'bottom',
  theme = 'dark',
  baseItemSize = 50,
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  gap = 10,
  roundness = 0.5,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  bounce = true,
  autoHide = false,
  tiles = true,
  showLabels = true,
  showIndicators = true,
  showBadges = true,
  badgeColor = '#ff453a',
  accentColor = '#0a84ff',
  className = '',
  style
}: DockProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wakeRef = useRef<(() => void) | null>(null);
  const actionsRef = useRef<{
    hop: (index: number) => void;
    focus: (index: number) => void;
    hold: (index: number | null) => void;
  } | null>(null);
  const menuRef = useRef<{
    id: number;
    index: number;
    point: { x: number; y: number };
    keyboard: boolean;
    closing: boolean;
    restore: boolean;
    rows?: DockMenuItem[];
  } | null>(null);
  const serialRef = useRef(0);
  const pressRef = useRef<{
    id: number;
    x: number;
    y: number;
    timer: number;
    cleanup: () => void;
  } | null>(null);
  const pressingRef = useRef(false);
  const skipRef = useRef(-1);
  const [fit, setFit] = useState(1);
  const [menu, setMenu] = useState<{
    id: number;
    index: number;
    point: { x: number; y: number };
    keyboard: boolean;
    closing: boolean;
    restore: boolean;
    rows?: DockMenuItem[];
  } | null>(null);
  const side: DockPosition = (SIDES as readonly string[]).includes(position) ? position : 'bottom';
  const vertical = side === 'left' || side === 'right';
  const rawBase = Math.max(16, baseItemSize);
  const rawPeak = Math.max(rawBase, magnification);
  const rawThickness = Math.max(rawBase, panelHeight);
  const rawGap = Math.max(0, gap);
  const length =
    items.reduce((sum, item) => sum + (item?.separator ? 1 : rawBase), 0) +
    rawGap * Math.max(0, items.length - 1) +
    rawThickness -
    rawBase;
  const base = rawBase * fit;
  const peak = rawPeak * fit;
  const thickness = rawThickness * fit;
  const tokens = {
    ...(THEMES[theme] ?? THEMES.dark),
    '--dock-accent': accentColor,
    '--dock-badge': badgeColor
  } as CSSProperties;

  const settings = {
    items,
    side,
    vertical,
    length: length + rawPeak - rawBase,
    base,
    peak,
    thickness,
    gap: rawGap * fit,
    distance: Math.max(1, distance) * fit,
    mass: Math.max(0.01, spring?.mass ?? 0.1),
    stiffness: Math.max(1, spring?.stiffness ?? 150),
    damping: Math.max(0, spring?.damping ?? 12),
    bounce,
    autoHide
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  menuRef.current = menu;

  useEffect(() => {
    wakeRef.current?.();
  });

  useIsomorphicLayoutEffect(() => {
    if (autoHide) rootRef.current?.setAttribute('data-hidden', '');
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const doc = root.ownerDocument;
    const host = (root.offsetParent as HTMLElement | null) ?? doc.documentElement;
    const measure = () => {
      const s = settingsRef.current;
      const room = (s.vertical ? host.clientHeight : host.clientWidth) - EDGE * 2;
      const next = s.length > 0 ? Math.min(1, Math.max(0.4, room / s.length)) : 1;
      setFit(Math.round(next * 1000) / 1000);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [length, vertical, rawPeak, rawBase]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const doc = root.ownerDocument;
    const win = doc.defaultView ?? window;

    const reduce = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const motion = new Map<
      number,
      {
        size: number;
        velocity: number;
        lift: number;
        rise: number;
        launch: number;
        gravity: number;
        hopping: boolean;
        drawn: string;
        node: HTMLElement | null;
      }
    >();
    const pointer = { x: 0, y: 0, inside: false };
    let focused = -1;
    let held: number | null = null;
    let lastFocus: number | null = null;
    let lastRest: number[] = [];
    let lastBase = settingsRef.current.base;
    let hidden = root.hasAttribute('data-hidden');
    let hiding = settingsRef.current.autoHide;
    let hideTimer = 0;
    let raf = 0;
    let last = 0;
    let alive = true;

    const entry = (index: number) => {
      let state = motion.get(index);
      if (!state) {
        state = {
          size: settingsRef.current.base,
          velocity: 0,
          lift: 0,
          rise: 0,
          launch: 0,
          gravity: 0,
          hopping: false,
          drawn: '',
          node: null
        };
        motion.set(index, state);
      }
      return state;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(1 / 30, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (s.base !== lastBase) {
        const ratio = s.base / lastBase;
        motion.forEach(state => {
          state.size *= ratio;
          state.velocity *= ratio;
        });
        lastBase = s.base;
      }
      const rect = root.getBoundingClientRect();
      const center = s.vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
      const spans = s.items.map(item => (item?.separator ? 1 : s.base));
      let cursor = -(spans.reduce((sum, span) => sum + span, 0) + s.gap * Math.max(0, spans.length - 1)) / 2;
      const rest = spans.map(span => {
        const middle = cursor + span / 2;
        cursor += span + s.gap;
        return middle;
      });
      let focus: number | null = null;
      if (held !== null) focus = held;
      else if (pointer.inside) focus = (s.vertical ? pointer.y : pointer.x) - center;
      else if (rest[focused] !== undefined) focus = rest[focused];
      lastFocus = focus;
      lastRest = rest;
      const steps = Math.max(1, Math.ceil(dt * 240));
      const h = dt / steps;
      const k = s.stiffness / s.mass;
      const c = s.damping / s.mass;
      let moving = false;

      s.items.forEach((item, index) => {
        const node = itemRefs.current[index];
        if (!node || item?.separator) return;
        const state = entry(index);
        const reach = focus === null ? 1 : Math.abs(focus - rest[index]) / s.distance;
        const target = s.base + (s.peak - s.base) * (reach < 1 ? Math.cos((reach * Math.PI) / 2) ** 2 : 0);
        if (reduce) {
          state.size = target;
          state.velocity = 0;
        } else {
          for (let i = 0; i < steps; i++) {
            state.velocity = (state.velocity + h * k * (target - state.size)) / (1 + h * c + h * h * k);
            state.size += state.velocity * h;
            if (!state.hopping) continue;
            state.rise -= state.gravity * h;
            state.lift += state.rise * h;
            if (state.lift > 0) continue;
            state.lift = 0;
            state.rise *= -0.36;
            if (state.rise < state.launch * 0.2) {
              state.rise = 0;
              state.hopping = false;
              node.removeAttribute('data-hop');
            }
          }
        }
        if (Math.abs(state.velocity) < 0.01 && Math.abs(target - state.size) < 0.01) {
          state.size = target;
          state.velocity = 0;
        } else {
          moving = true;
        }
        if (state.hopping) moving = true;
        const size = Math.max(1, state.size);
        const drawn = `${size.toFixed(2)} ${state.lift.toFixed(2)} ${s.side}`;
        if (drawn === state.drawn && node === state.node) return;
        state.drawn = drawn;
        state.node = node;
        const lift = s.side === 'bottom' || s.side === 'right' ? -state.lift : state.lift;
        const tile = node.firstElementChild as HTMLElement | null;
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        if (tile)
          tile.style.transform = `translate(${s.vertical ? `${lift}px, 0` : `0, ${lift}px`}) scale(${size / s.base})`;
      });

      if (moving) raf = win.requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = win.requestAnimationFrame(tick);
    };

    const show = () => {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
      if (!hidden) return;
      hidden = false;
      root.removeAttribute('data-hidden');
    };

    const hide = () => {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
      const blocked = pointer.inside || held !== null || root.contains(doc.activeElement);
      if (hidden || !settingsRef.current.autoHide || blocked) return;
      hidden = true;
      root.setAttribute('data-hidden', '');
    };

    const hideLater = () => {
      if (hidden || hideTimer || !settingsRef.current.autoHide) return;
      hideTimer = window.setTimeout(hide, 600);
    };

    wakeRef.current = () => {
      const enabled = settingsRef.current.autoHide;
      if (enabled !== hiding) {
        hiding = enabled;
        if (enabled) hide();
        else show();
      }
      wake();
    };

    actionsRef.current = {
      hop: index => {
        const node = itemRefs.current[index];
        if (reduce || !settingsRef.current.bounce || !node) return;
        const state = entry(index);
        if (state.hopping) return;
        const height = state.size * HOP;
        state.gravity = (8 * height) / (HOP_TIME * HOP_TIME);
        state.launch = (state.gravity * HOP_TIME) / 2;
        state.rise = state.launch;
        state.hopping = true;
        node.setAttribute('data-hop', '');
        wake();
      },
      focus: index => {
        focused = index;
        wake();
      },
      hold: index => {
        if (index === null) {
          held = null;
          wake();
          hideLater();
          return;
        }
        held = lastFocus ?? lastRest[index] ?? 0;
        show();
        wake();
      }
    };

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      show();
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
      wake();
      hideLater();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!root.contains(event.relatedTarget as Node | null)) hideLater();
    };
    const onWindowMove = (event: PointerEvent) => {
      const s = settingsRef.current;
      if (!s.autoHide || pointer.inside) return;
      const host = root.offsetParent as HTMLElement | null;
      const rect = host
        ? host.getBoundingClientRect()
        : { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight };
      const zone = EDGE + s.thickness * 0.6;
      const x = event.clientX;
      const y = event.clientY;
      const within = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      const near = {
        bottom: y >= rect.bottom - zone,
        top: y <= rect.top + zone,
        left: x <= rect.left + zone,
        right: x >= rect.right - zone
      }[s.side];
      if (within && near) show();
      else hideLater();
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointercancel', onLeave);
    root.addEventListener('focusin', show);
    root.addEventListener('focusout', onFocusOut);
    win.addEventListener('pointermove', onWindowMove);
    win.addEventListener('pointerdown', onWindowMove);
    wake();

    return () => {
      alive = false;
      win.cancelAnimationFrame(raf);
      window.clearTimeout(hideTimer);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerdown', onMove);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointercancel', onLeave);
      root.removeEventListener('focusin', show);
      root.removeEventListener('focusout', onFocusOut);
      win.removeEventListener('pointermove', onWindowMove);
      win.removeEventListener('pointerdown', onWindowMove);
      wakeRef.current = null;
      actionsRef.current = null;
      const press = pressRef.current;
      if (press) {
        window.clearTimeout(press.timer);
        press.cleanup();
      }
    };
  }, []);

  const closeMenu = useCallback((restore: boolean) => {
    const current = menuRef.current;
    if (!current || current.closing) return;
    const rows = settingsRef.current.items[current.index]?.menu ?? [];
    const next = { ...current, closing: true, restore, rows };
    menuRef.current = next;
    setMenu(next);
  }, []);

  const finishMenu = useCallback(() => {
    const current = menuRef.current;
    menuRef.current = null;
    setMenu(null);
    actionsRef.current?.hold(null);
    if (current?.restore) itemRefs.current[current.index]?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!menu || menu.closing) return undefined;
    const root = rootRef.current;
    const doc = root?.ownerDocument ?? document;
    const win = doc.defaultView ?? window;
    const owner = itemRefs.current[menu.index];
    const onDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && (target.closest('[data-dock-menu]') || owner?.contains(target))) return;
      closeMenu(false);
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-dock-menu]')) return;
      closeMenu(false);
    };
    const onAway = () => closeMenu(false);
    doc.addEventListener('pointerdown', onDown, true);
    win.addEventListener('scroll', onScroll, true);
    win.addEventListener('resize', onAway);
    win.addEventListener('blur', onAway);
    return () => {
      doc.removeEventListener('pointerdown', onDown, true);
      win.removeEventListener('scroll', onScroll, true);
      win.removeEventListener('resize', onAway);
      win.removeEventListener('blur', onAway);
    };
  }, [menu, closeMenu]);

  const openMenu = (index: number, mode: 'keyboard' | 'press' | 'pointer') => {
    const node = itemRefs.current[index];
    if (!node || !items[index]?.menu?.length) return false;
    const current = menuRef.current;
    if (current && current.index === index && !current.closing) return true;
    actionsRef.current?.hold(index);
    const rect = node.getBoundingClientRect();
    const point = {
      bottom: { x: rect.left + rect.width / 2, y: rect.top - MENU_GAP },
      top: { x: rect.left + rect.width / 2, y: rect.bottom + MENU_GAP },
      left: { x: rect.right + MENU_GAP, y: rect.top + rect.height / 2 },
      right: { x: rect.left - MENU_GAP, y: rect.top + rect.height / 2 }
    }[side];
    serialRef.current += 1;
    const next = {
      id: serialRef.current,
      index,
      point,
      keyboard: mode === 'keyboard',
      closing: false,
      restore: false
    };
    menuRef.current = next;
    setMenu(next);
    return true;
  };

  const endPress = () => {
    const press = pressRef.current;
    if (!press) return;
    window.clearTimeout(press.timer);
    press.cleanup();
    pressRef.current = null;
  };

  const startPress = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    endPress();
    const target = event.currentTarget;
    const doc = target.ownerDocument;
    const win = doc.defaultView ?? window;
    const press = { id: event.pointerId, x: event.clientX, y: event.clientY, timer: 0, cleanup: () => {} };
    if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    const onMove = (moved: PointerEvent) => {
      if (moved.pointerId !== press.id) return;
      if (Math.hypot(moved.clientX - press.x, moved.clientY - press.y) > 8) endPress();
    };
    const onUp = (released: PointerEvent) => {
      if (released.pointerId === press.id) endPress();
    };
    press.cleanup = () => {
      win.removeEventListener('pointermove', onMove);
      win.removeEventListener('pointerup', onUp);
      win.removeEventListener('pointercancel', onUp);
    };
    press.timer = window.setTimeout(() => {
      press.cleanup();
      pressRef.current = null;
      if (!openMenu(index, 'press')) return;
      skipRef.current = index;
      pressingRef.current = true;
      win.addEventListener(
        'pointerup',
        () => {
          pressingRef.current = false;
        },
        { once: true }
      );
    }, HOLD_TIME);
    win.addEventListener('pointermove', onMove);
    win.addEventListener('pointerup', onUp);
    win.addEventListener('pointercancel', onUp);
    pressRef.current = press;
  };

  const onItemKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const toward = { bottom: 'ArrowUp', top: 'ArrowDown', left: 'ArrowRight', right: 'ArrowLeft' }[side];
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10') || event.key === toward) {
      if (openMenu(index, 'keyboard')) event.preventDefault();
      return;
    }
    const order = items.flatMap((item, i) => (item?.separator ? [] : [i]));
    const at = order.indexOf(index);
    const keys = vertical ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    let next: number | undefined;
    if (event.key === keys[0]) next = order[(at - 1 + order.length) % order.length];
    else if (event.key === keys[1]) next = order[(at + 1) % order.length];
    else if (event.key === 'Home') next = order[0];
    else if (event.key === 'End') next = order[order.length - 1];
    if (next === undefined) return;
    event.preventDefault();
    itemRefs.current[next]?.focus();
  };

  const openIndex = menu && !menu.closing ? menu.index : -1;

  return (
    <div
      ref={rootRef}
      className={`dock dock--${side}${tiles ? '' : ' dock--bare'}${className ? ` ${className}` : ''}`}
      role="toolbar"
      aria-label="Dock"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      style={{
        ...tokens,
        '--dock-base': `${base}px`,
        '--dock-thickness': `${thickness}px`,
        '--dock-gap': `${rawGap * fit}px`,
        '--dock-pad': `${(thickness - base) / 2}px`,
        '--dock-reach': `${peak - base}px`,
        '--dock-round': clamp(roundness, 0, 1),
        ...style
      } as CSSProperties}
    >
      {items.map((item, index) =>
        item?.separator ? (
          <span key={index} className="dock-separator" aria-hidden="true" />
        ) : (
          <button
            key={index}
            ref={node => {
              itemRefs.current[index] = node;
            }}
            type="button"
            className={`dock-item${item.className ? ` ${item.className}` : ''}`}
            aria-label={item.label}
            aria-haspopup={item.menu?.length ? 'menu' : undefined}
            aria-expanded={item.menu?.length ? openIndex === index : undefined}
            data-open={openIndex === index ? '' : undefined}
            onPointerDown={event => {
              skipRef.current = -1;
              const current = menuRef.current;
              if (current && !current.closing) {
                if (event.button === 2 || event.ctrlKey) return;
                skipRef.current = index;
                closeMenu(false);
                return;
              }
              if (item.menu?.length && event.button === 0 && !event.ctrlKey) startPress(event, index);
            }}
            onContextMenu={event => {
              if (!item.menu?.length) return;
              event.preventDefault();
              endPress();
              openMenu(index, 'pointer');
            }}
            onClick={() => {
              if (skipRef.current === index) {
                skipRef.current = -1;
                return;
              }
              actionsRef.current?.hop(index);
              item.onClick?.();
            }}
            onFocus={event => {
              if (event.currentTarget.matches(':focus-visible')) actionsRef.current?.focus(index);
            }}
            onBlur={() => actionsRef.current?.focus(-1)}
            onKeyDown={event => onItemKeyDown(event, index)}
          >
            <span className="dock-tile">
              <span className="dock-face">{item.icon}</span>
              {showBadges && hasBadge(item.badge) ? (
                <span className="dock-badge">{item.badge === true ? null : item.badge}</span>
              ) : null}
            </span>
            {showIndicators && item.active ? <span className="dock-dot" aria-hidden="true" /> : null}
            {showLabels && item.label && !menu ? (
              <span className="dock-label" aria-hidden="true">
                {item.label}
              </span>
            ) : null}
          </button>
        )
      )}
      {menu ? (
        <DockMenu
          key={menu.id}
          rows={menu.rows ?? items[menu.index]?.menu ?? []}
          label={items[menu.index]?.label}
          side={side}
          point={menu.point}
          tokens={tokens}
          portalTarget={rootRef.current?.ownerDocument?.body}
          focusFirst={menu.keyboard}
          closing={menu.closing}
          pressingRef={pressingRef}
          onSelect={(row, keyboard) => {
            closeMenu(keyboard || Boolean(menuRef.current?.keyboard));
            row.onClick?.();
          }}
          onDismiss={closeMenu}
          onExited={finishMenu}
        />
      ) : null}
    </div>
  );
}
