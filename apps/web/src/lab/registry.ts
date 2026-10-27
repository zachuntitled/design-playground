import type { ComponentType } from 'react';

export type LabExperiment = Readonly<{
  slug: string;
  title: string;
  description: string;
  load: () => Promise<{ default: ComponentType }>;
}>;

export const labExperiments: readonly LabExperiment[] = [
  {
    slug: 'app-shell-workspace',
    title: 'App shell workspace',
    description: 'An inset app frame with a resizable sidebar, conversation, and folding workspace.',
    load: () => import('./app-shell-workspace'),
  },
  {
    slug: 'sample',
    title: 'Component sampler',
    description: 'Shared buttons, form controls, a dialog, and live design tokens.',
    load: () => import('./sample'),
  },
];
