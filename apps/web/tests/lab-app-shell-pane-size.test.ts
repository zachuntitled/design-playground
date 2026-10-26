import { describe, expect, it } from 'vitest';
import {
  clampWidth, fitPanes, PANE_SIZES, resizeWidth, shellMode, widthForKey,
} from '../src/lab/app-shell-workspace/pane-size';

describe('lab app shell pane sizes', () => {
  it.each(['sidebar', 'workspace'] as const)('clamps %s widths and uses directional pointer and keyboard steps', (side) => {
    const size = PANE_SIZES[side];
    const direction = side === 'sidebar' ? 1 : -1;
    expect(clampWidth(0, size)).toBe(size.min);
    expect(clampWidth(1000, size)).toBe(size.max);
    expect(resizeWidth(size.default, 20, side)).toBe(size.default + 20 * direction);
    expect(resizeWidth(size.default, -20, side)).toBe(size.default - 20 * direction);
    for (const shift of [false, true]) {
      const step = shift ? 48 : 16;
      expect(widthForKey(size.default, 'ArrowRight', shift, side)).toBe(size.default + step * direction);
      expect(widthForKey(size.default, 'ArrowLeft', shift, side)).toBe(size.default - step * direction);
      expect(widthForKey(size.default, 'Home', shift, side)).toBe(size.min);
      expect(widthForKey(size.default, 'End', shift, side)).toBe(size.max);
    }
    for (const key of ['Tab', 'toString', 'constructor', '__proto__']) {
      expect(widthForKey(size.default, key, false, side)).toBeUndefined();
    }
    const constrained = { ...size, max: size.default };
    expect(resizeWidth(size.default, 1000 * direction, side, constrained)).toBe(size.default);
    expect(widthForKey(size.default, side === 'sidebar' ? 'ArrowRight' : 'ArrowLeft', true, side, constrained)).toBe(size.default);
    expect(widthForKey(size.default, 'End', false, side, constrained)).toBe(size.default);
  });

  it('reserves a usable page when both requested widths are at maximum', () => {
    const panes = fitPanes(918, 'docked', { width: 380, collapsed: false }, { width: 560, collapsed: false });
    expect(panes.sidebar.width).toBe(310);
    expect(panes.workspace.width).toBe(280);
    expect(panes.sidebar.size.max).toBe(310);
    expect(panes.workspace.size.max).toBe(280);
    expect(panes.sidebar.size.default).toBe(272);
    expect(panes.workspace.size.default).toBe(280);
  });

  it('restores the sidebar after shrinking with the other rendered pane held fixed', () => {
    let sidebar = { width: 272, collapsed: false };
    let workspace = { width: 360, collapsed: false };
    let panes = fitPanes(918, 'docked', sidebar, workspace);
    expect(panes.workspace.width).toBe(318);
    workspace = { ...workspace, width: panes.workspace.width };
    sidebar = { ...sidebar, width: widthForKey(panes.sidebar.width, 'ArrowLeft', false, 'sidebar', panes.sidebar.size)! };
    panes = fitPanes(918, 'docked', sidebar, workspace);
    expect(panes.sidebar.width).toBe(256);
    expect(panes.workspace.width).toBe(318);
    sidebar = { ...sidebar, width: widthForKey(panes.sidebar.width, 'ArrowRight', false, 'sidebar', panes.sidebar.size)! };
    panes = fitPanes(918, 'docked', sidebar, workspace);
    expect(panes.sidebar.width).toBe(272);
    expect(panes.workspace.width).toBe(318);
  });

  it('reclaims folded space and does not shrink the docked sidebar when its drawer opens', () => {
    expect(fitPanes(918, 'docked', { width: 380, collapsed: true }, { width: 560, collapsed: false }).workspace.width).toBe(560);
    expect(fitPanes(918, 'docked', { width: 380, collapsed: false }, { width: 560, collapsed: true }).sidebar.width).toBe(380);
    for (const collapsed of [false, true]) {
      expect(fitPanes(760, 'drawer', { width: 272, collapsed: false }, { width: 360, collapsed }).sidebar.width).toBe(272);
    }
  });

  it('owns both breakpoints without rounding fractional widths', () => {
    expect(shellMode(900.4)).toBe('docked');
    expect(shellMode(900)).toBe('drawer');
    expect(shellMode(600.4)).toBe('drawer');
    expect(shellMode(600)).toBe('compact');
  });
});
