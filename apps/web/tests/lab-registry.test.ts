import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { labExperiments } from '../src/lab/registry';

describe('lab registry', () => {
  it('registers every experiment directory and has no missing directories', () => {
    const directories = readdirSync(new URL('../src/lab/', import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(new Set(labExperiments.map((entry) => entry.slug))).toEqual(new Set(directories));
  });

  it('uses unique slugs', () => {
    const slugs = labExperiments.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
