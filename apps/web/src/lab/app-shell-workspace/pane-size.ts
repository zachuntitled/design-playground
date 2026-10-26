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

type ShellMode = 'docked' | 'drawer' | 'compact';

const DRAWER_BREAKPOINT = 900;
const COMPACT_BREAKPOINT = 600;
const MIN_PAGE_WIDTH = 320;
export const FRAME_GAP = 8;
export const COLLAPSED_WIDTHS = { sidebar: 0, workspace: FRAME_GAP } as const;

export function shellMode(containerWidth: number): ShellMode {
  if (containerWidth <= COMPACT_BREAKPOINT) return 'compact';
  return containerWidth <= DRAWER_BREAKPOINT ? 'drawer' : 'docked';
}

function effectiveSize(side: PaneSide, available: number): PaneSize {
  const max = Math.min(PANE_SIZES[side].max, available);
  const min = Math.min(PANE_SIZES[side].min, max);
  return { min, max, default: Math.min(max, Math.max(min, PANE_SIZES[side].default)) };
}

export function fitPanes(containerWidth: number, mode: ShellMode, sidebar: PaneState, workspace: PaneState) {
  const budget = Math.max(0, containerWidth - MIN_PAGE_WIDTH - FRAME_GAP);
  const sidebarSpace = mode === 'compact' ? containerWidth - 48 : budget - (
    mode !== 'docked' || workspace.collapsed ? COLLAPSED_WIDTHS.workspace : PANE_SIZES.workspace.min
  );
  const sidebarWidth = clampWidth(sidebar.width, effectiveSize('sidebar', Math.max(0, sidebarSpace)));
  const workspaceSpace = mode !== 'docked' ? Math.min(PANE_SIZES.workspace.default, containerWidth - 56) : budget - (
    sidebar.collapsed ? COLLAPSED_WIDTHS.sidebar : sidebarWidth
  );
  const workspaceSize = effectiveSize('workspace', Math.max(0, workspaceSpace));
  const workspaceWidth = clampWidth(workspace.width, workspaceSize);
  const sidebarSize = effectiveSize('sidebar', Math.max(0, mode === 'docked' ? budget - (
    workspace.collapsed ? COLLAPSED_WIDTHS.workspace : workspaceWidth
  ) : sidebarSpace));
  return {
    sidebar: { width: sidebarWidth, size: sidebarSize },
    workspace: { width: workspaceWidth, size: workspaceSize },
  };
}
