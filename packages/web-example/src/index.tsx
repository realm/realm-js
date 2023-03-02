import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Realm } from "realm";

async function setupRealm() {
  type Task = {
    name: string;
    done: boolean;
  };
  
  const TASK_SCHEMA: Realm.ObjectSchema = {
    name: "Task",
    properties: {
      name: "string",
      done: "bool",
    },
  };

  const realm = await Realm.open({
    schema: [TASK_SCHEMA],
  });
  
  console.log("Realm open:");
  console.log({realm});  

  console.log("**** CREATE ****");
  realm.write(() => {
    let task1 = realm.create<Task>("Task", {
      name: "go grocery shopping", done: false
    });
    console.log({task1});

    let task2 = realm.create<Task>("Task", {
      name: "go exercise", done: false
    });
    console.log({task2});  
});

console.log("**** QUERY ****");
var results = realm.objects<Task>("Task");

console.log("**** READ ****");
results.forEach((value: Task, index) => {  
  console.log(`Task#${index}:  ${value.name}`);
}); 

console.log("**** UPDATE **** ");
realm.write(() => {
  results[0].done = true;
});

results = realm.objects<Task>("Task").filtered("done == true");
console.log(`Number of completed tasks: ${results.length}`);

console.log("**** DELETE ****");
realm.write(() => {
  realm.delete(results[0] as unknown as Task & Realm.Object);
});
console.log(`Number of tasks after deletion: ${realm.objects<Task>("Task").length}`);  
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
setupRealm();