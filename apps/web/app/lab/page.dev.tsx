import Link from 'next/link';
import { notFound } from 'next/navigation';
import { labExperiments } from '../../src/lab/registry';
import styles from './lab.module.css';

export default function LabPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Development only</p>
        <h1>UI lab</h1>
        <p>Experiments using the OpenDesign components and design tokens.</p>
      </header>
      <ul className={styles.list}>
        {labExperiments.map((experiment) => (
          <li key={experiment.slug}>
            <Link className={styles.card} href={`/lab/${experiment.slug}`}>
              <h2>{experiment.title}</h2>
              <p>{experiment.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
