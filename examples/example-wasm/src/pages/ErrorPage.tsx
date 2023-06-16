import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';

import styles from '../styles/ErrorPage.module.css';

export function ErrorPage() {
  const navigate = useNavigate();
  const error = useRouteError();

  return (
    <div className={styles.container}>
      <h1>
        Oh no, an error occurred..
      </h1>
      {isRouteErrorResponse(error) && (
        <>
          <p>{`Status: ${error.status} ${error.statusText}`}</p>
          {error.data?.message && <p>{error.data.message}</p>}
        </>
      )}
      <button className={styles.button} onClick={() => navigate('/')}>
        Go back
      </button>
    </div>
  );
}
