////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { expect } from "chai";

import { IPerson, PersonAndDogSchema } from "./schemas/person-and-dogs";

interface IEvent {
    action: string;
    data?: any;
}

describe("Realm#Results", () => {
    let realm: Realm;

    beforeEach(() => {
        realm = new Realm({ schema: PersonAndDogSchema });
        realm.write(() => {
            realm.create<IPerson>("Person", { name: "Alice", age: 17 });
        });
    });

    it("calls listeners asynchronously", async () => {
        const persons = realm.objects<IPerson>("Person");
        const events: IEvent[] = [{ action: "started-synchronously" }];
        setTimeout(() => {
            events.push({ action: "started-asynchronously" });
        });

        const listenerFired = new Promise(resolve => {
            persons.addListener((collection, change) => {
                events.push({ action: "listener-fired", data: change });
                if (change.insertions.length > 0) {
                    resolve();
                }
            });
        });

        const objectCreated = new Promise(resolve => {
            // We need a function object to capture its arguments
            // tslint:disable-next-line:only-arrow-functions

            // Write an object - asynchronously
            setTimeout(() => {
                realm.write(() => {
                    events.push({ action: "pre-object-creation" });
                    realm.create<IPerson>("Person", { name: "Bob", age: 42 });
                    events.push({ action: "post-object-creation" });
                });
                // Perform something synchronously
                events.push({ action: "synchronously-post-creation" });
                // Perform something asynchronously
                setTimeout(() => {
                    events.push({ action: "asynchronously-post-creation" });
                    resolve();
                });
            });
        });

        await Promise.all([listenerFired, objectCreated]);

        expect(events).to.deep.equal([
            { action: "started-synchronously" },
            // FIXME: Some times this fires after the listener callback initially fires
            { action: "started-asynchronously" },
            {
                // FIXME: Why do we fire initially?
                action: "listener-fired",
                data: {
                    deletions: [],
                    insertions: [],
                    newModifications: [],
                    modifications: [],
                    oldModifications: []
                }
            },
            { action: "pre-object-creation" },
            { action: "post-object-creation" },
            { action: "synchronously-post-creation" },
            { action: "asynchronously-post-creation" },
            {
                action: "listener-fired",
                data: {
                    deletions: [],
                    insertions: [1],
                    newModifications: [],
                    modifications: [],
                    oldModifications: []
                }
            }
        ]);
    });
});
