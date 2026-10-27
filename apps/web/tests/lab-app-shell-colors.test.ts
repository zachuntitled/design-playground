import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const directory = new URL('../src/lab/app-shell-workspace/', import.meta.url);
const css = readdirSync(directory).filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(new URL(file, directory), 'utf8')).join('\n');

describe('app shell dark palette', () => {
  it('registers only the experiment font family', () => {
    const families: string[] = [];
    postcss.parse(css).walkAtRules('font-face', (rule) => {
      rule.walkDecls('font-family', (declaration) => { families.push(declaration.value); });
    });
    expect(families).toEqual(Array(4).fill('"Inter Lab"'));
  });

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
