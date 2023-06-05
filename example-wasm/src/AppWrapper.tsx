import React from 'react';
import { Outlet } from 'react-router-dom';

import config from './atlas-app-services/config.json';
import { App } from './App';

const { AppProvider } = await import('@realm/react');

function AppWrapper() {
  return (
    <div>
      <AppProvider id={config.ATLAS_APP_ID} logLevel='all'>
        <App />
        <Outlet />
      </AppProvider>
    </div>
  );
}

export default AppWrapper;
