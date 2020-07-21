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
import type * as RealmWeb from "realm-web";

import { describeIf } from "./utils";

declare const IIFE_BUNDLE_URL: string;
declare const APP_ID: string;
declare const BASE_URL: string;

declare const Realm: typeof RealmWeb;

describeIf(typeof window === "object", "IIFE bundle", () => {
    let globalsBefore = new Set();

    function getNewGlobals() {
        const globalsAfter = new Set(Object.keys(window));
        return new Set([...globalsAfter].filter(x => !globalsBefore.has(x)));
    }

    before(async () => {
        // Load the IIFE bundle into the browser
        console.log("Loading bundle from", IIFE_BUNDLE_URL);
        globalsBefore = new Set(Object.keys(window));
        // Expect that the Realm global is not available
        expect(globalsBefore.has("realm")).equals(false);
        expect(typeof window.Realm).equals("undefined");
        const scriptElement = document.createElement("script");
        scriptElement.src = IIFE_BUNDLE_URL;
        // Await the loading of the script and add it to the document
        await new Promise(resolve => {
            scriptElement.addEventListener("load", resolve);
            document.head.appendChild(scriptElement);
        });
    });

    it("exports the Realm global and nothing more", () => {
        // Expect exactly one global to be added when loading the script
        const newGlobals = getNewGlobals();
        console.log(Object.keys(window));
        expect([...newGlobals.values()]).deep.equals(["Realm"]);
        expect(typeof Realm).equals("object");
    });

    it("exports an App constructor and can create an app", () => {
        expect(typeof Realm.App).equals("function");
        const app = new Realm.App(APP_ID);
        expect(app).instanceOf(Realm.App);
    });

    it("exports a method to get an app", () => {
        expect(typeof Realm.App).equals("function");
        const appA = Realm.getApp(APP_ID);
        const appB = Realm.getApp(APP_ID);
        expect(appA).instanceOf(Realm.App);
        expect(appA).equals(appB);
    });

    it("can authenticate and call a function", async () => {
        const app = new Realm.App({ id: APP_ID, baseUrl: BASE_URL });
        // Authenticate
        const credentials = Realm.Credentials.anonymous();
        await app.logIn(credentials);
        // Call a function
        const response = await app.functions.translate("hello", "en_fr");
        expect(response).to.equal("bonjour");
    });
});
