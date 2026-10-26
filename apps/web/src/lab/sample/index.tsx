'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Textarea,
  type ButtonSize,
  type ButtonVariant,
} from '@open-design/components';
import styles from './sample.module.css';

const variants: Record<ButtonVariant, string> = {
  default: 'Default',
  primary: 'Primary',
  'primary-ghost': 'Primary ghost',
  ghost: 'Ghost',
  subtle: 'Subtle',
  secondary: 'Secondary',
};

const sizes: Record<ButtonSize, string> = {
  default: 'Default',
  icon: 'Icon',
  sm: 'Small',
};

const swatches = ['--bg-app', '--bg-panel', '--bg-subtle', '--text', '--accent', '--brand', '--green', '--blue', '--red'] as const;

export default function SampleExperiment() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className={styles.sample}>
      <section className={styles.section} aria-labelledby="sample-buttons">
        <h2 id="sample-buttons">Buttons</h2>
        {Object.entries(variants).map(([variant, label]) => (
          <div className={styles.buttonRow} key={variant}>
            <span className={styles.variant}>{label}</span>
            {Object.entries(sizes).map(([size, sizeLabel]) => (
              <Button
                key={size}
                variant={variant as ButtonVariant}
                size={size as ButtonSize}
                aria-label={`${label}, ${sizeLabel}`}
              >
                {size === 'icon' ? <span aria-hidden="true">+</span> : sizeLabel}
              </Button>
            ))}
          </div>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="sample-forms">
        <h2 id="sample-forms">Form controls</h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            Experiment name
            <Input placeholder="A new idea" />
          </label>
          <label className={styles.field}>
            Stage
            <Select defaultValue="exploring">
              <option value="exploring">Exploring</option>
              <option value="reviewing">Reviewing</option>
              <option value="ready">Ready to promote</option>
            </Select>
          </label>
          <label className={styles.field}>
            Notes
            <Textarea placeholder="What do you want to try?" rows={3} />
          </label>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="sample-tokens">
        <h2 id="sample-tokens">Design tokens</h2>
        <ul className={styles.swatches}>
          {swatches.map((token) => (
            <li key={token}>
              <div className={styles.swatch} style={{ background: `var(${token})` }} />
              <code>{token}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="sample-dialog">
        <h2 id="sample-dialog">Dialog</h2>
        <Button onClick={() => setDialogOpen(true)}>Open sample dialog</Button>
        {dialogOpen && (
          <Dialog
            layout="sectioned"
            ariaLabelledBy="sample-dialog-title"
            onClose={() => setDialogOpen(false)}
            closeOnEscape
          >
            <DialogHeader>
              <DialogTitle id="sample-dialog-title">Sample dialog</DialogTitle>
            </DialogHeader>
            <DialogBody>This dialog uses the shared OpenDesign component.</DialogBody>
            <DialogFooter>
              <Button autoFocus onClick={() => setDialogOpen(false)}>Close dialog</Button>
            </DialogFooter>
          </Dialog>
        )}
      </section>
    </div>
  );
}
