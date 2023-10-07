////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppProvider } from '@realm/react';

import { AuthenticatedApp } from './AuthenticatedApp';
import { ErrorPage } from './pages/ErrorPage';
import { LoginPage } from './pages/LoginPage';
import { TaskPage } from './pages/TaskPage';
import config from './atlas-app-services/config.json';
import styles from './styles/App.module.css';

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

/**
 * The root React component which renders `@realm/react`'s `AppProvider`
 * for instantiation an Atlas App Services App.
 */
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
