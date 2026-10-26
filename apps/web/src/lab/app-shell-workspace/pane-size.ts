export type PaneSize = Readonly<{ default: number; min: number; max: number }>;
export type PaneState = Readonly<{ width: number; collapsed: boolean }>;
export type PaneSide = 'sidebar' | 'workspace';

export const PANE_SIZES: Readonly<Record<PaneSide, PaneSize>> = {
  sidebar: { default: 272, min: 220, max: 380 },
  workspace: { default: 360, min: 280, max: 560 },
};

export const PANE_DIRECTIONS: Readonly<Record<PaneSide, 1 | -1>> = {
  sidebar: 1,
  workspace: -1,
};

const KEY_ACTIONS: Readonly<Record<string, { delta: number } | { boundary: 'min' | 'max' }>> = {
  ArrowLeft: { delta: -1 },
  ArrowRight: { delta: 1 },
  Home: { boundary: 'min' },
  End: { boundary: 'max' },
};
const KEY_STEPS = { normal: 8, shift: 32 } as const;

export function clampWidth(width: number, size: PaneSize): number {
  return Math.min(size.max, Math.max(size.min, width));
}

export function resizeWidth(width: number, deltaX: number, side: PaneSide): number {
  return clampWidth(width + deltaX * PANE_DIRECTIONS[side], PANE_SIZES[side]);
}

export function widthForKey(width: number, key: string, shift: boolean, side: PaneSide): number | undefined {
  const action = Object.hasOwn(KEY_ACTIONS, key) ? KEY_ACTIONS[key] : undefined;
  if (!action) return undefined;
  if ('boundary' in action) return PANE_SIZES[side][action.boundary];
  return resizeWidth(width, action.delta * KEY_STEPS[shift ? 'shift' : 'normal'], side);
}

export function resetWidth(side: PaneSide): number {
  return clampWidth(PANE_SIZES[side].default, PANE_SIZES[side]);
}
