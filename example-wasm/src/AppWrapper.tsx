import React from 'react';
// import { Outlet } from 'react-router-dom';

import config from './atlas-app-services/config.json';
import { App } from './App';

const { AppProvider } = await import('@realm/react');

function AppWrapper() {
  return (
    <div>
      {/* <Outlet /> */}
      <AppProvider id={config.ATLAS_APP_ID}>
        <App />
      </AppProvider>
    </div>
  );
}

export default AppWrapper;
