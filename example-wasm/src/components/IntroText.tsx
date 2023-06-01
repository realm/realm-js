import React from 'react';

export function IntroText() {
  return (
    <div>
      <p>
        Welcome to the MongoDB Realm + WASM example app!
      </p>
      <p>
        Start adding a task using the form at the top of the screen to see it get
        created in Realm (local-first) then MongoDB Atlas. You can also toggle the
        task status or remove it from the list.
      </p>
    </div>
  );
}
