# UI lab

Open `/lab` in the web development server to browse experiments.
Production route discovery excludes the `page.dev.tsx` files.

## Add an experiment

1. Create `src/lab/<slug>/index.tsx` with a default component export. Add `'use client'` if it needs interactivity.
2. Keep its CSS Module and other experiment files in that folder. Use the app's CSS tokens and `@open-design/components`.
3. Add a `labExperiments` entry in `registry.ts` with the same slug, a title, a description, and `load: () => import('./<slug>')`.
4. Open `/lab/<slug>` and run `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/lab-registry.test.ts` from the repository root.

## Throw away an experiment

Delete its folder and registry entry. The registry test checks that the two stay in sync.

## Promote an experiment

Move the component and its CSS Module into the feature that owns it.
Update its imports and connect it to the real workflow, then delete its lab folder and registry entry.
