export type PaneSize = Readonly<{ default: number; min: number; max: number }>;
export type PaneState = Readonly<{ width: number; collapsed: boolean }>;
export type PaneSide = 'sidebar' | 'workspace';

export const PANE_SIZES: Readonly<Record<PaneSide, PaneSize>> = {
  sidebar: { default: 272, min: 220, max: 380 },
  workspace: { default: 360, min: 280, max: 560 },
};

const PANE_DIRECTIONS: Readonly<Record<PaneSide, 1 | -1>> = {
  sidebar: 1,
  workspace: -1,
};

const KEY_ACTIONS: Readonly<Record<string, { delta: number } | { boundary: 'min' | 'max' }>> = {
  ArrowLeft: { delta: -1 },
  ArrowRight: { delta: 1 },
  Home: { boundary: 'min' },
  End: { boundary: 'max' },
};
const KEY_STEPS = { normal: 16, shift: 48 } as const;

export function clampWidth(width: number, size: PaneSize): number {
  return Math.min(size.max, Math.max(size.min, width));
}

export function resizeWidth(width: number, deltaX: number, side: PaneSide, size: PaneSize = PANE_SIZES[side]): number {
  return clampWidth(width + deltaX * PANE_DIRECTIONS[side], size);
}

export function widthForKey(width: number, key: string, shift: boolean, side: PaneSide, size: PaneSize = PANE_SIZES[side]): number | undefined {
  const action = Object.hasOwn(KEY_ACTIONS, key) ? KEY_ACTIONS[key] : undefined;
  if (!action) return undefined;
  if ('boundary' in action) return size[action.boundary];
  return resizeWidth(width, action.delta * KEY_STEPS[shift ? 'shift' : 'normal'], side, size);
}

export function resetWidth(side: PaneSide): number {
  return clampWidth(PANE_SIZES[side].default, PANE_SIZES[side]);
}

export const DRAWER_BREAKPOINT = 900;
export const MIN_PAGE_WIDTH = 320;
const FRAME_GAP = 8;

export function maxWidth(side: PaneSide, containerWidth: number, otherWidth: number): number {
  return Math.min(PANE_SIZES[side].max, Math.max(PANE_SIZES[side].min, containerWidth - otherWidth - MIN_PAGE_WIDTH - FRAME_GAP));
}

export function fitPanes(containerWidth: number, sidebar: PaneState, workspace: PaneState) {
  const sidebarWidth = clampWidth(sidebar.width, {
    ...PANE_SIZES.sidebar,
    max: maxWidth('sidebar', containerWidth, workspace.collapsed ? FRAME_GAP : PANE_SIZES.workspace.min),
  });
  const workspaceWidth = clampWidth(workspace.width, {
    ...PANE_SIZES.workspace,
    max: maxWidth('workspace', containerWidth, sidebar.collapsed ? 0 : sidebarWidth),
  });
  return { sidebar: sidebarWidth, workspace: workspaceWidth };
}
