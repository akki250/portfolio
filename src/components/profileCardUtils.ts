export const THEMES = {
  dark: {
    '--pc-frame': 'rgba(38, 35, 46, 0.66)',
    '--pc-frame-edge': 'rgba(255, 255, 255, 0.08)',
    '--pc-frame-highlight': 'rgba(255, 255, 255, 0.07)',
    '--pc-frame-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--pc-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--pc-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--pc-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--pc-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--pc-ink': '#f4f4f5',
    '--pc-muted': 'rgba(244, 244, 245, 0.6)',
    '--pc-hover': 'brightness(1.12)',
    '--pc-press': 'brightness(0.8)',
    '--pc-shade': 'rgba(0, 0, 0, 0.4)'
  },
  light: {
    '--pc-frame': 'rgba(240, 240, 243, 0.8)',
    '--pc-frame-edge': 'rgba(24, 24, 27, 0.07)',
    '--pc-frame-highlight': 'rgba(255, 255, 255, 0.95)',
    '--pc-frame-shadow': '0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)',
    '--pc-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--pc-tile-edge': 'rgba(24, 24, 27, 0.08)',
    '--pc-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--pc-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.25)',
    '--pc-ink': '#27272a',
    '--pc-muted': 'rgba(39, 39, 42, 0.6)',
    '--pc-hover': 'brightness(0.97)',
    '--pc-press': 'brightness(0.92)',
    '--pc-shade': 'rgba(24, 24, 27, 0.14)'
  }
} as const;

export const FOILS = {
  dark: {
    '--pc-blend': 'color-dodge',
    '--pc-holo-filter': 'hue-rotate(0deg)',
    '--pc-sheen': 'rgba(255, 255, 255, 0.16)'
  },
  light: {
    '--pc-blend': 'multiply',
    '--pc-holo-filter': 'invert(1) hue-rotate(180deg)',
    '--pc-sheen': 'rgba(255, 255, 255, 0)'
  }
} as const;

export const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0 0 0 0 1'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>"
)}")`;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const isDark = (color: string | undefined | null): boolean | null => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color ?? '').trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].replace(/./g, digit => digit + digit) : match[1];
  const [r, g, b] = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
};

export const PROFILE_CARD_CSS = `
.profile-card {
  --pc-light-x: 50%;
  --pc-light-y: 50%;
  --pc-pointer-x: 50%;
  --pc-pointer-y: 50%;
  --pc-band-x: 50%;
  --pc-band-y: 50%;
  --pc-reach: 0;
  --pc-rotate-x: 0deg;
  --pc-rotate-y: 0deg;
  --pc-shift-x: 0px;
  --pc-shift-y: 0px;
  --pc-tilt: 0;
  --pc-active: 0;
  position: relative;
  width: 340px;
  max-width: 100%;
  perspective: 1000px;
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
}

.profile-card__body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-radius: calc(var(--pc-radius) + 10px);
  background: var(--pc-frame);
  box-shadow: var(--pc-frame-shadow);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  backdrop-filter: blur(20px) saturate(1.6);
  transform: rotateX(var(--pc-rotate-x)) rotateY(var(--pc-rotate-y));
  will-change: transform;
}

.profile-card__tile {
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: var(--pc-radius);
  background: var(--pc-backdrop);
  box-shadow: var(--pc-tile-shadow);
  overflow: hidden;
  isolation: isolate;
}

.profile-card__sheen,
.profile-card__holo,
.profile-card__scrim,
.profile-card__tile-rim,
.profile-card__glare,
.profile-card__shade,
.profile-card__rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.profile-card__sheen {
  background: radial-gradient(
    farthest-corner circle at calc(var(--pc-light-x) - 10px) calc(var(--pc-light-y) - 10px),
    var(--pc-sheen) 0%,
    transparent 55%
  );
  opacity: calc(var(--pc-holo) * var(--pc-active));
}

.profile-card__holo {
  --pc-spectrum: repeating-linear-gradient(
    0deg,
    hsl(2, 100%, 73%) 5%,
    hsl(53, 100%, 69%) 10%,
    hsl(93, 100%, 69%) 15%,
    hsl(176, 100%, 76%) 20%,
    hsl(228, 100%, 74%) 25%,
    hsl(260, 100%, 76%) 30%,
    hsl(2, 100%, 73%) 35%
  );
  --pc-bars: repeating-linear-gradient(
    -45deg,
    #0e152e 0%,
    hsl(180, 10%, 60%) 3.8%,
    hsl(180, 29%, 66%) 4.5%,
    hsl(180, 10%, 60%) 5.2%,
    #0e152e 10%,
    #0e152e 12%
  );
  --pc-falloff: radial-gradient(
    farthest-corner circle at var(--pc-pointer-x) var(--pc-pointer-y),
    hsla(0, 0%, 0%, 0.1) 12%,
    hsla(0, 0%, 0%, 0.15) 20%,
    hsla(0, 0%, 0%, 0.25) 120%
  );
  background-image: var(--pc-spectrum), var(--pc-bars), var(--pc-falloff);
  background-position:
    0 var(--pc-band-y),
    var(--pc-band-x) var(--pc-band-y),
    center;
  background-size:
    500% 500%,
    300% 300%,
    200% 200%;
  background-blend-mode: color, hard-light;
  mix-blend-mode: var(--pc-blend);
  filter: brightness(calc(0.66 + 0.19 * var(--pc-active))) contrast(calc(1.33 + 0.17 * var(--pc-active)))
    saturate(calc(0.33 + 0.17 * var(--pc-active))) var(--pc-holo-filter);
  opacity: calc(var(--pc-holo) * var(--pc-holo-gain) * (0.5 + 0.5 * var(--pc-active)));
  -webkit-mask-image: var(--pc-pattern);
  -webkit-mask-size: var(--pc-pattern-size);
  -webkit-mask-position: calc(50% - var(--pc-shift-x) * 1.5) calc(65% - var(--pc-shift-y) * 1.5);
  -webkit-mask-repeat: repeat;
  mask-image: var(--pc-pattern);
  mask-size: var(--pc-pattern-size);
  mask-position: calc(50% - var(--pc-shift-x) * 1.5) calc(65% - var(--pc-shift-y) * 1.5);
  mask-repeat: repeat;
}

.profile-card__holo-glow,
.profile-card__holo-shift {
  position: absolute;
  inset: 0;
  opacity: calc(var(--pc-active) * var(--pc-holo-detail));
}

.profile-card__holo-glow {
  background-image:
    linear-gradient(
      45deg,
      hsl(176, 100%, 76%),
      hsl(228, 100%, 74%),
      hsl(260, 100%, 76%),
      hsl(2, 100%, 73%),
      hsl(53, 100%, 69%),
      hsl(93, 100%, 69%)
    ),
    radial-gradient(circle at var(--pc-pointer-x) var(--pc-pointer-y), hsl(0, 0%, 70%) 0%, hsla(0, 0%, 30%, 0.2) 90%),
    var(--pc-grain);
  background-size:
    250% 250%,
    100% 100%,
    220px 220px;
  background-position:
    var(--pc-pointer-x) var(--pc-pointer-y),
    center,
    0 0;
  background-blend-mode: color-dodge;
  filter: brightness(calc(2 - var(--pc-reach))) contrast(calc(var(--pc-reach) + 2))
    saturate(calc(0.5 + var(--pc-reach)));
  mix-blend-mode: luminosity;
}

.profile-card__holo-shift {
  background-image: var(--pc-spectrum), var(--pc-bars), var(--pc-falloff);
  background-position:
    0 var(--pc-band-y),
    calc(var(--pc-band-x) * 0.4) calc(var(--pc-band-y) * 0.5),
    center;
  background-size:
    200% 300%,
    700% 700%,
    100% 100%;
  background-blend-mode: color, hard-light;
  mix-blend-mode: difference;
  filter: brightness(0.8) contrast(1.5);
}

.profile-card__photo {
  position: absolute;
  inset: calc(var(--pc-parallax) * -1);
  width: calc(100% + var(--pc-parallax) * 2);
  height: calc(100% + var(--pc-parallax) * 2);
  object-fit: cover;
  object-position: center bottom;
  transform: translate3d(var(--pc-shift-x), var(--pc-shift-y), 0);
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

.profile-card__scrim {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.57) 6%,
    rgba(0, 0, 0, 0.5) 12%,
    rgba(0, 0, 0, 0.4) 19%,
    rgba(0, 0, 0, 0.28) 26%,
    rgba(0, 0, 0, 0.16) 33%,
    rgba(0, 0, 0, 0.07) 40%,
    rgba(0, 0, 0, 0.02) 46%,
    rgba(0, 0, 0, 0) 52%
  );
}

.profile-card__info {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 18px;
  color: #ffffff;
}

.profile-card__name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: inherit;
}

.profile-card__title {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.78);
}

.profile-card__tile-rim {
  box-shadow:
    inset 0 0 0 1px var(--pc-tile-edge),
    inset 0 1px 0 var(--pc-tile-highlight);
}

.profile-card__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 6px 20px 8px;
}

.profile-card__avatar {
  position: relative;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--pc-tile);
  overflow: hidden;
}

.profile-card__avatar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--pc-tile-edge);
}

.profile-card__avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.profile-card__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.profile-card__handle {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--pc-ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.profile-card__status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.25;
  color: var(--pc-muted);
  white-space: nowrap;
}

.profile-card__status::before {
  content: '';
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pc-status);
}

.profile-card__contact {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: calc(var(--pc-radius) * 0.75);
  background: var(--pc-tile);
  box-shadow:
    inset 0 0 0 1px var(--pc-tile-edge),
    inset 0 1px 0 var(--pc-tile-highlight),
    var(--pc-tile-shadow);
  color: var(--pc-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    filter 0.2s ease,
    transform 0.2s ease;
}

.profile-card__contact:active {
  filter: var(--pc-press);
  transform: scale(0.96);
  transition-duration: 0s;
}

.profile-card__contact:focus-visible {
  outline: 2px solid var(--pc-ink);
  outline-offset: 2px;
}

.profile-card__glare {
  background: radial-gradient(
    farthest-corner circle at var(--pc-light-x) var(--pc-light-y),
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.36) 20%,
    rgba(255, 255, 255, 0) 60%
  );
  mix-blend-mode: overlay;
  opacity: calc(var(--pc-glare) * var(--pc-active));
}

.profile-card__shade {
  background: radial-gradient(
    farthest-corner circle at var(--pc-light-x) var(--pc-light-y),
    transparent 30%,
    var(--pc-shade) 100%
  );
  opacity: calc(var(--pc-glare) * var(--pc-tilt));
}

.profile-card__rim {
  box-shadow:
    inset 0 0 0 1px var(--pc-frame-edge),
    inset 0 1px 0 var(--pc-frame-highlight);
}

@media (hover: hover) {
  .profile-card__contact:hover {
    filter: var(--pc-hover);
  }

  .profile-card__contact:hover:active {
    filter: var(--pc-press);
  }
}
`;
