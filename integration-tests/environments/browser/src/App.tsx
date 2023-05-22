import React from 'react';
import logo from './logo.svg';
import './App.css';

import Realm from 'realm';

function runTests() {
  const realm = new Realm({
    schema: [
      {
        name: "Person",
        "properties": {
          name: "string"
        }
      }
    ],
    schemaVersion: 0
  });
  const people = realm.objects("Person");
  people.addListener((collection, changes) => {
    console.log("length:", collection.length);
  });
  realm.write(() => {
    realm.create("Person", { name: "Web" });
  });
}
runTests();

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
