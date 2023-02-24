import React from 'react';
import logo from './logo.svg';
import './App.css';

import { App as RealmApp } from "realm";

const realmApp = new RealmApp("my-awesome-app");

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Your app has id = {realmApp.id}</p>
      </header>
    </div>
  );
}

export default App;
