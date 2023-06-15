import { NavBar } from './NavBar';
import styles from '../styles/PageLayout.module.css';

type PageLayoutProps = {
  children: React.ReactNode;
};

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className={styles.container}>
      <NavBar />
      <main>
        {children}
      </main>
    </div>
  );
}
