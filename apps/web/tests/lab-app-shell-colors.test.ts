// @vitest-environment jsdom

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const directory = resolve(import.meta.dirname, '../src/lab/app-shell-workspace');
const sheets = readdirSync(directory, { recursive: true }).filter((file) => String(file).endsWith('.css'))
  .map((file) => postcss.parse(readFileSync(resolve(directory, String(file)), 'utf8'), { from: String(file) }));

function colorsOutsideTokens(sheet: postcss.Root): string[] {
  const violations: string[] = [];
  const allowed = new Set(['transparent', 'currentcolor', 'inherit']);
  const cssWide = new Set(['initial', 'unset', 'revert', 'revert-layer']);
  const color = document.createElement('span').style;
  sheet.walkDecls((declaration) => {
    if (declaration.parent?.type === 'rule' && declaration.parent.selector === '.theme') return;
    const words = declaration.value.replace(/url\([^)]*\)|"[^"]*"|'[^']*'/gi, '').match(/(?<![\w-])[a-z][a-z-]*\b/gi) ?? [];
    const namedColor = words.some((word) => {
      const name = word.toLowerCase();
      if (allowed.has(name)) return false;
      if (cssWide.has(name)) return /color|background|border|outline|shadow|fill|stroke|^--/.test(declaration.prop);
      color.color = '';
      color.color = name;
      return color.color !== '';
    });
    if (namedColor || /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(declaration.value)) {
      violations.push(declaration.toString());
    }
  });
  return violations;
}

describe('app shell dark palette', () => {
  it.each(['theme', 'labPage'])('defines the .%s rule consumed by page chrome', (className) => {
    const theme = postcss.parse(readFileSync(resolve(directory, 'theme.module.css'), 'utf8'));
    const selectors: string[] = [];
    theme.walkRules((rule) => { selectors.push(...rule.selectors); });
    expect(selectors).toContain(`.${className}`);
  });

  it.each([
    ['.drawerHeader .iconButton', 'none'],
    ['.sidebarDrawerHeader', 'none'],
    ['.shell:not([data-mode="docked"]) .drawerHeader .iconButton', 'grid'],
    ['.shell:not([data-mode="docked"]) .sidebarDrawerHeader', 'block'],
  ])('sets %s display to %s for the docked-style focus fake', (selector, display) => {
    const values: string[] = [];
    for (const sheet of sheets) {
      sheet.walkRules((rule) => {
        if (rule.selectors.includes(selector)) {
          rule.walkDecls('display', (declaration) => { values.push(declaration.value); });
        }
      });
    }
    expect(values).toEqual([display]);
  });

  it.each(['sidebar', 'workspace'])('takes the %s drawer width and clearance only from the shared variables', (side) => {
    const widths: string[] = [];
    for (const sheet of sheets) {
      sheet.walkRules(`.shell:not([data-mode="docked"]) .${side}`, (rule) => {
        rule.walkDecls('width', (declaration) => { widths.push(declaration.value); });
      });
    }
    expect(widths).toEqual([`min(var(--${side}-width), calc(100% - var(--drawer-clearance)))`]);
    expect(widths.join('')).not.toMatch(/\d+(?:\.\d+)?px/);
  });

  it('registers only the experiment font family', () => {
    const families: string[] = [];
    for (const sheet of sheets) {
      sheet.walkAtRules('font-face', (rule) => {
        rule.walkDecls('font-family', (declaration) => { families.push(declaration.value); });
      });
    }
    expect(families).toEqual(Array(4).fill('"Inter Lab"'));
  });

  it('keeps every color literal in the single experiment token block across all stylesheets', () => {
    const tokens = sheets.flatMap((sheet) => sheet.nodes.filter((node) => node.type === 'rule' && node.selector === '.theme'));
    expect(tokens).toHaveLength(1);
    for (const sheet of sheets) {
      expect(colorsOutsideTokens(sheet), sheet.source?.input.file).toEqual([]);
    }
  });

  it.each([
    'red', 'rebeccapurple', 'CanvasText', 'initial', 'unset', 'revert', 'revert-layer',
    'color-mix(in srgb, var(--ink), var(--page))', 'linear-gradient(white, var(--page))',
    '#abcdef', 'rgb(1 2 3)', 'oklch(40% 0.1 20)',
  ])('rejects %s outside the palette', (value) => {
    expect(colorsOutsideTokens(postcss.parse(`.example { color: ${value}; }`))).toEqual([`color: ${value}`]);
  });

  it.each(['transparent', 'currentColor', 'inherit', 'var(--ink)'])('allows %s outside the palette', (value) => {
    expect(colorsOutsideTokens(postcss.parse(`.example { color: ${value}; }`))).toEqual([]);
  });

  it('allows quoted font names, URL paths, and non-color resets', () => {
    expect(colorsOutsideTokens(postcss.parse('.example { font-family: "Black"; src: url("/red.woff2"); all: unset; }'))).toEqual([]);
  });
});
