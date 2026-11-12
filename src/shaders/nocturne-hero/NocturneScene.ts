export const NOCTURNE_VARIANTS = ["midnight"] as const;
export type NocturneVariant = (typeof NOCTURNE_VARIANTS)[number];

export const NOCTURNE_TITLES: Record<NocturneVariant, string> = {
  midnight: "Nocturne — Midnight",
};

export function buildNocturneDocument(_variant: NocturneVariant): string | undefined {
  return undefined;
}
