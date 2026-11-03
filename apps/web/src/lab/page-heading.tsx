'use client';

import { VisuallyHidden } from '@open-design/components';

export function LabPageHeading({ title, description, compact }: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  const heading = <><h1>{title}</h1><p>{description}</p></>;
  return compact ? <VisuallyHidden>{heading}</VisuallyHidden> : heading;
}
