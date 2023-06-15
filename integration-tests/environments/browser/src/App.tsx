import React from 'react';
import logo from './logo.svg';
import './App.css';

import { Client } from 'mocha-remote-client';

import { install as enable_sourcemaps } from 'source-map-support';

enable_sourcemaps();

async function runTests() {
  const client = new Client({
    async tests(context) {
      const testsGlobal = global as any;
      testsGlobal.path = {
        dirname() {
          throw new Error("Not supported on this platform");
        },
        resolve() {
          throw new Error("Not supported on this platform");
        },
      };
      testsGlobal.fs = {
        exists() {
          throw new Error("Not supported on this platform");
        },
      };
      testsGlobal.environment = {
        ...context,
        browser: true,
        missingServer: false,
      }
      await import(/* webpackMode: "eager" */ '@realm/integration-tests');
    }
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
