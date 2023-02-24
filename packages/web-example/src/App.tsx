import React from 'react';
import './App.css';

import { App as RealmApp } from "realm";

const realmApp = new RealmApp("my-awesome-app");

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>Realm app id = {realmApp.id}</p>
      </header>
    </div>
  );
}

export default App;
