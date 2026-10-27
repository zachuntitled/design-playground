import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const css = readFileSync(new URL('../src/lab/app-shell-workspace/workspace.module.css', import.meta.url), 'utf8');

describe('app shell dark palette', () => {
  it('keeps every color literal in the single experiment token block', () => {
    const sheet = postcss.parse(css);
    const tokens = sheet.nodes.filter((node) => node.type === 'rule' && node.selector === '.theme');
    expect(tokens).toHaveLength(1);
    const literalsOutsideTokens: string[] = [];
    sheet.walkDecls((declaration) => {
      if (/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/i.test(declaration.value)
        && declaration.parent !== tokens[0]) {
        literalsOutsideTokens.push(declaration.toString());
      }
    });
    expect(literalsOutsideTokens).toEqual([]);
  });
});
