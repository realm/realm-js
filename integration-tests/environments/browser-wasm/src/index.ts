// import { formData } from './forms';
// import { client } from './test';

// const form = document.querySelector('form')!;

// form.addEventListener('submit', (e) => {
//   e.preventDefault();
//   require("./test");
//   // const data = formData(form);
//   // console.log("Hello Zepp");
//   // console.log(data);
// });


import { Client as MochaRemoteClient } from "mocha-remote-client";
import { expect } from 'chai';
import { Realm } from "realm";

// Create a client, which will automatically connect to the server on the default port (8090)
export const client = new MochaRemoteClient({
  // Called when the server asks the client to run
  tests: () => {
      describe('Realm tests', () => {
        it('imported Realm should not be undefined', () => { 
            expect(Realm).not.undefined;           
        });
    });
  },
});