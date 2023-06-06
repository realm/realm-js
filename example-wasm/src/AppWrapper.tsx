import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import config from './atlas-app-services/config.json';
import { App } from './App';
import { ErrorPage } from './pages/ErrorPage';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';

const { AppProvider } = await import('@realm/react');

const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    element: <App />,
    children: [
      {
        path: 'tasks',
        element: <TaskPage />
      }
    ]
  }
]);

function AppWrapper() {
  return (
    <AppProvider id={config.ATLAS_APP_ID} logLevel='all'>
      <RouterProvider router={router}/>
    </AppProvider>
  );
}

export default AppWrapper;
