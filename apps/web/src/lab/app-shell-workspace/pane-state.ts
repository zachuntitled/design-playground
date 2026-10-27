import { PANE_SIZES, type PaneSide, type PaneState, type ShellMode } from './pane-size';

export type ShellState = Readonly<{
  sidebar: PaneState;
  workspace: PaneState;
  lastResized: PaneSide;
  mode: ShellMode;
}>;

type PaneAction =
  | { type: 'toggle'; side: PaneSide }
  | { type: 'close'; side: PaneSide }
  | { type: 'resize'; side: PaneSide; width: number }
  | { type: 'reset'; side: PaneSide }
  | { type: 'modeChanged'; mode: ShellMode };

export const initialPanes: ShellState = {
  sidebar: { width: PANE_SIZES.sidebar.default, collapsed: false },
  workspace: { width: PANE_SIZES.workspace.default, collapsed: false },
  lastResized: 'sidebar',
  mode: 'docked',
};

export function isOverlay(mode: ShellMode): boolean {
  return mode !== 'docked';
}

export function paneReducer(state: ShellState, action: PaneAction): ShellState {
  if (action.type === 'modeChanged') {
    if (action.mode === state.mode) return state;
    const transition = (side: PaneSide): PaneState => {
      const pane = state[side];
      if (isOverlay(action.mode) && !isOverlay(state.mode) && !pane.collapsed) {
        return { ...pane, collapsed: 'auto' };
      }
      if (!isOverlay(action.mode) && pane.collapsed === 'auto') {
        return { ...pane, collapsed: false };
      }
      return pane;
    };
    return { ...state, mode: action.mode, sidebar: transition('sidebar'), workspace: transition('workspace') };
  }
  const { side } = action;
  const pane = state[side];
  if (action.type === 'resize' || action.type === 'reset') {
    const width = action.type === 'reset' ? PANE_SIZES[side].default : action.width;
    if (width === pane.width) return state;
    return { ...state, [side]: { ...pane, width }, lastResized: side };
  }
  const collapsed = action.type === 'close' || !pane.collapsed ? 'user' : false;
  const otherSide = side === 'sidebar' ? 'workspace' : 'sidebar';
  const other = state[otherSide];
  return {
    ...state,
    [side]: { ...pane, collapsed },
    [otherSide]: !collapsed && isOverlay(state.mode) && !other.collapsed
      ? { ...other, collapsed: 'auto' } : other,
  };
}
