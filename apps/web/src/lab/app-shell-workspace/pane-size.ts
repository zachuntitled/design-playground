export type PaneSize = Readonly<{ default: number; min: number; max: number }>;
export type PaneState = Readonly<{ width: number; collapsed: false | 'user' | 'auto' }>;
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

export type ShellMode = 'docked' | 'drawer' | 'compact';

const DRAWER_BREAKPOINT = 900;
const COMPACT_BREAKPOINT = 600;
const MIN_PAGE_WIDTH = 320;
export const FRAME_GAP = 8;
// Mirrors the compact sidebar clearance beside the overlay.
const SIDEBAR_OVERLAY_CLEARANCE = 48;
// Mirrors the workspace overlay clearance including the page frame gap.
const WORKSPACE_OVERLAY_CLEARANCE = SIDEBAR_OVERLAY_CLEARANCE + FRAME_GAP;
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

export function fitPanes(containerWidth: number, mode: ShellMode, sidebar: PaneState, workspace: PaneState, priority: PaneSide = 'sidebar') {
  const budget = Math.max(0, containerWidth - MIN_PAGE_WIDTH - FRAME_GAP);
  if (mode !== 'docked') {
    const sidebarSize = effectiveSize('sidebar', Math.max(0, mode === 'compact'
      ? containerWidth - SIDEBAR_OVERLAY_CLEARANCE : budget - COLLAPSED_WIDTHS.workspace));
    const workspaceSize = effectiveSize('workspace', Math.max(0, Math.min(PANE_SIZES.workspace.default, containerWidth - WORKSPACE_OVERLAY_CLEARANCE)));
    return {
      sidebar: { width: clampWidth(sidebar.width, sidebarSize), size: sidebarSize },
      workspace: { width: clampWidth(workspace.width, workspaceSize), size: workspaceSize },
    };
  }

  const panes = { sidebar, workspace };
  const otherSide = priority === 'sidebar' ? 'workspace' : 'sidebar';
  const active = panes[priority];
  const other = panes[otherSide];
  const activeSize = effectiveSize(priority, Math.max(0, budget - (
    other.collapsed ? COLLAPSED_WIDTHS[otherSide] : PANE_SIZES[otherSide].min
  )));
  const activeWidth = clampWidth(active.width, activeSize);
  // Reserve the active pane's default so shrinking it does not grow the untouched pane.
  const baselineSidebar = clampWidth(priority === 'sidebar' ? PANE_SIZES.sidebar.default : sidebar.width,
    effectiveSize('sidebar', Math.max(0, budget - (workspace.collapsed ? COLLAPSED_WIDTHS.workspace : PANE_SIZES.workspace.min))));
  const otherBaseline = priority === 'sidebar'
    ? budget - baselineSidebar : baselineSidebar;
  const otherSpace = Math.max(0, budget - (active.collapsed ? COLLAPSED_WIDTHS[priority] : activeWidth));
  const otherSize = effectiveSize(otherSide, otherSpace);
  const otherWidth = clampWidth(other.width, effectiveSize(otherSide, active.collapsed ? otherSpace : Math.min(otherSpace, otherBaseline)));
  const activeFit = { width: activeWidth, size: activeSize };
  const otherFit = { width: otherWidth, size: otherSize };
  return priority === 'sidebar'
    ? { sidebar: activeFit, workspace: otherFit }
    : { sidebar: otherFit, workspace: activeFit };
}
