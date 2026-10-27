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

  it('loads each experiment from its own directory', async () => {
    for (const entry of labExperiments) {
      const { default: fromRegistry } = await entry.load();
      const { default: fromDirectory } = await import(`../src/lab/${entry.slug}/index.tsx`);
      expect(fromRegistry, entry.slug).toBe(fromDirectory);
    }
  });

  it('loads compact page chrome only for the workspace experiment', async () => {
    const workspace = await labExperiments.find((entry) => entry.slug === 'app-shell-workspace')!.load();
    const sample = await labExperiments.find((entry) => entry.slug === 'sample')!.load();
    expect(workspace.page).toEqual({ className: expect.any(String), compactHeader: true });
    expect(sample.page).toBeUndefined();
  });

  it('uses unique slugs', () => {
    const slugs = labExperiments.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
