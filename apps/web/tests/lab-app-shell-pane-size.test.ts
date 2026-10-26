import { describe, expect, it } from 'vitest';
import {
  clampWidth, fitPanes, maxWidth, PANE_SIZES, resetWidth, resizeWidth, widthForKey,
} from '../src/lab/app-shell-workspace/pane-size';

describe('lab app shell pane sizes', () => {
  it('clamps widths and mirrors pointer movement at the right edge', () => {
    expect(clampWidth(100, PANE_SIZES.sidebar)).toBe(220);
    expect(clampWidth(600, PANE_SIZES.workspace)).toBe(560);
    expect(resizeWidth(272, 20, 'sidebar')).toBe(292);
    expect(resizeWidth(360, 20, 'workspace')).toBe(340);
  });

  it('uses 16px steps and 48px Shift steps, bounded by available space', () => {
    expect(widthForKey(272, 'ArrowRight', false, 'sidebar')).toBe(288);
    expect(widthForKey(360, 'ArrowRight', true, 'workspace')).toBe(312);
    const size = { ...PANE_SIZES.workspace, max: 400 };
    expect(widthForKey(380, 'ArrowLeft', true, 'workspace', size)).toBe(400);
    expect(widthForKey(360, 'End', false, 'workspace', size)).toBe(400);
    expect(widthForKey(360, 'Home', true, 'workspace', size)).toBe(280);
    expect(widthForKey(360, 'Tab', false, 'workspace')).toBeUndefined();
    expect(widthForKey(360, 'toString', false, 'workspace')).toBeUndefined();
  });

  it('reserves a usable page when both requested widths are at maximum', () => {
    const widths = fitPanes(918, { width: 380, collapsed: false }, { width: 560, collapsed: false });
    expect(widths).toEqual({ sidebar: 310, workspace: 280 });
    expect(maxWidth('workspace', 918, widths.sidebar)).toBe(280);
    expect(fitPanes(1400, { width: 380, collapsed: false }, { width: 560, collapsed: false }))
      .toEqual({ sidebar: 380, workspace: 560 });
  });

  it('reclaims folded pane space and preserves the reset defaults', () => {
    expect(fitPanes(918, { width: 380, collapsed: true }, { width: 560, collapsed: false }).workspace).toBe(560);
    expect(fitPanes(918, { width: 380, collapsed: false }, { width: 560, collapsed: true }).sidebar).toBe(380);
    expect(resetWidth('sidebar')).toBe(272);
    expect(resetWidth('workspace')).toBe(360);
  });
});
