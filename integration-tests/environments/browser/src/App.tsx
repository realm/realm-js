import { MochaRemoteProvider, ConnectionText, StatusEmoji, StatusText } from "./MochaRemoteProvider";

import './App.css'

async function loadTests() {
  describe("harness", () => {
    it("loads", () => {
      console.log("yay!");
    });
  });
  await import("@realm/integration-tests");
  await new Promise(resolve => setTimeout(resolve, 2000));
} 

function App() {
  return (
    <MochaRemoteProvider tests={loadTests}>
      <ConnectionText id="connection-text" />
      <div id="container">
        <StatusEmoji id="status-emoji" />
        <StatusText id="status-text" />
      </div>
    </MochaRemoteProvider>
  )
}

export default App
