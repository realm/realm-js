import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AuthenticatedApp } from './AuthenticatedApp';
import { ErrorPage } from './pages/ErrorPage';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import config from './atlas-app-services/config.json';
import styles from './styles/AppWrapper.module.css';

const { AppProvider } = await import('@realm/react');

const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    element: <AuthenticatedApp />,
    children: [
      {
        path: 'tasks',
        element: <TaskPage />
      }
    ]
  }
]);

function App() {
  return (
    <div className={styles.container}>
      <AppProvider id={config.ATLAS_APP_ID}>
        <RouterProvider router={router} />
      </AppProvider>
    </div>
  );
}

export default App;
