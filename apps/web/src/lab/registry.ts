import type { ComponentType } from 'react';

export type LabExperiment = Readonly<{
  slug: string;
  title: string;
  description: string;
  load: () => Promise<{ default: ComponentType; page?: Readonly<{ className: string; compactHeader: boolean }> }>;
}>;

export const labExperiments: readonly LabExperiment[] = [
  {
    slug: 'app-shell-workspace',
    title: 'App shell workspace',
    description: 'An inset app frame with a resizable sidebar, conversation, and folding workspace.',
    load: async () => {
      const [{ default: Experiment }, { default: theme }] = await Promise.all([
        import('./app-shell-workspace'),
        import('./app-shell-workspace/theme.module.css'),
      ]);
      return { default: Experiment, page: { className: `${theme.theme} ${theme.labPage}`, compactHeader: true } };
    },
  },
  {
    slug: 'sample',
    title: 'Component sampler',
    description: 'Shared buttons, form controls, a dialog, and live design tokens.',
    load: () => import('./sample'),
  },
];
