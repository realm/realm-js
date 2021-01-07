import React from 'react';
import { AppProvider, UserProvider } from "realm-hooks";

import { Header } from "./Header";
import { LogInForm } from "./LogInForm";
import { Overview } from "./Overview";

import './App.css';

export function App() {
  // Determine the id of the app
  const REALM_APP_ID = process.env.REACT_APP_REALM_APP_ID;
  if (typeof REALM_APP_ID !== "string") {
    throw new Error("Expected an REALM_APP_ID");
  }
  return (
    <AppProvider id={REALM_APP_ID}>
    <div className="App">
        <Header />
        <UserProvider fallback={LogInForm}>
            <Overview />
        </UserProvider>
    </div>
    </AppProvider>
  );
}
