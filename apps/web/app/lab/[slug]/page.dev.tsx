import Link from 'next/link';
import { notFound } from 'next/navigation';
import { labExperiments } from '../../../src/lab/registry';
import styles from '../lab.module.css';
import { LabPageHeading } from '../../../src/lab/page-heading';

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();

  const { slug } = await params;
  const experiment = labExperiments.find((entry) => entry.slug === slug);
  if (!experiment) notFound();

  const { default: Experiment, page } = await experiment.load();

  return (
    <main className={page?.className ?? styles.page}>
      <header className={styles.header}>
        <Link className={styles.back} href="/lab">Back to UI lab</Link>
        <LabPageHeading title={experiment.title} description={experiment.description} compact={page?.compactHeader} />
      </header>
      <Experiment />
    </main>
  );
}
