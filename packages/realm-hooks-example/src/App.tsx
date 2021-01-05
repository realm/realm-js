import React from 'react';
import { useApp } from "realm-hooks";

import './App.css';

function App() {
  // Determine the id of the app
  const REALM_APP_ID = process.env.REACT_APP_REALM_APP_ID;
  if (typeof REALM_APP_ID !== "string") {
    throw new Error("Expected an REALM_APP_ID");
  }
  const app = useApp(REALM_APP_ID);
  return (
    <div className="App">
      <header className="App-header">
        <p>{app.id}</p>
      </header>
    </div>
  );
}

export default App;
