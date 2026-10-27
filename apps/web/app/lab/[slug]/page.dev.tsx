import Link from 'next/link';
import { notFound } from 'next/navigation';
import { labExperiments } from '../../../src/lab/registry';
import styles from '../lab.module.css';
import workspaceStyles from '../../../src/lab/app-shell-workspace/workspace.module.css';

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();

  const { slug } = await params;
  const experiment = labExperiments.find((entry) => entry.slug === slug);
  if (!experiment) notFound();

  const { default: Experiment } = await experiment.load();

  return (
    <main className={slug === 'app-shell-workspace' ? `${workspaceStyles.theme} ${workspaceStyles.labPage}` : styles.page}>
      <header className={styles.header}>
        <Link className={styles.back} href="/lab">Back to UI lab</Link>
        <h1>{experiment.title}</h1>
        <p>{experiment.description}</p>
      </header>
      <Experiment />
    </main>
  );
}
