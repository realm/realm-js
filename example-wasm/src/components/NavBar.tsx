import { useNavigate } from 'react-router-dom';

import logo from '../assets/logo.png';
import styles from '../styles/NavBar.module.css';

const { useUser } = await import('@realm/react');

export function NavBar() {
  const navigate = useNavigate();
  const user = useUser();

  const handleLogout = async () => {
    await user.logOut();
    navigate('/');
  };

  return (
    <nav className={styles.nav}>
      <img
        className={styles.logo}
        src={logo}
        alt='Realm by MongoDB'
      />
      <button className={styles.button} onClick={handleLogout}>
        Log out
      </button>
    </nav>
  );
}
