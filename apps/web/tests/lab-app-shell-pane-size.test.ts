import { describe, expect, it } from 'vitest';
import {
  clampWidth, PANE_SIZES, resetWidth, resizeWidth, widthForKey, type PaneSide,
} from '../src/lab/app-shell-workspace/pane-size';

describe('lab app shell pane sizes', () => {
  it.each<PaneSide>(['sidebar', 'workspace'])('clamps %s at both limits and preserves in-range widths', (side) => {
    const size = PANE_SIZES[side];
    expect(clampWidth(size.min - 100, size)).toBe(size.min);
    expect(clampWidth(size.max + 100, size)).toBe(size.max);
    expect(clampWidth(size.default, size)).toBe(size.default);
    expect(clampWidth(size.min, size)).toBe(size.min);
    expect(clampWidth(size.max, size)).toBe(size.max);
  });

  it.each([
    ['sidebar', 'ArrowLeft', false, 264],
    ['sidebar', 'ArrowRight', false, 280],
    ['sidebar', 'ArrowLeft', true, 240],
    ['sidebar', 'ArrowRight', true, 304],
    ['workspace', 'ArrowLeft', false, 368],
    ['workspace', 'ArrowRight', false, 352],
    ['workspace', 'ArrowLeft', true, 392],
    ['workspace', 'ArrowRight', true, 328],
  ] as const)('%s handles %s with shift=%s', (side, key, shift, expected) => {
    expect(widthForKey(PANE_SIZES[side].default, key, shift, side)).toBe(expected);
  });

  it.each<PaneSide>(['sidebar', 'workspace'])('jumps to %s bounds regardless of Shift and stops there', (side) => {
    const size = PANE_SIZES[side];
    for (const shift of [false, true]) {
      expect(widthForKey(size.default, 'Home', shift, side)).toBe(size.min);
      expect(widthForKey(size.default, 'End', shift, side)).toBe(size.max);
    }
    const shrink = side === 'sidebar' ? 'ArrowLeft' : 'ArrowRight';
    const grow = side === 'sidebar' ? 'ArrowRight' : 'ArrowLeft';
    expect(widthForKey(size.min, shrink, true, side)).toBe(size.min);
    expect(widthForKey(size.max, grow, true, side)).toBe(size.max);
    expect(widthForKey(size.default, 'Tab', false, side)).toBeUndefined();
    expect(widthForKey(size.default, 'toString', false, side)).toBeUndefined();
  });

  it('uses the same clamping and mirrored directions for pointer movement', () => {
    expect(resizeWidth(272, 20, 'sidebar')).toBe(292);
    expect(resizeWidth(360, 20, 'workspace')).toBe(340);
    expect(resizeWidth(272, -1000, 'sidebar')).toBe(220);
    expect(resizeWidth(272, 1000, 'sidebar')).toBe(380);
    expect(resizeWidth(360, 1000, 'workspace')).toBe(280);
    expect(resizeWidth(360, -1000, 'workspace')).toBe(560);
  });

  it('resets each edge to its documented default', () => {
    expect(resetWidth('sidebar')).toBe(272);
    expect(resetWidth('workspace')).toBe(360);
  });
});
