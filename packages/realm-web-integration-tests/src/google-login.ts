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

// This global is injected by WebPack
declare const GOOGLE_CLIENT_ID: string | undefined;

import { Credentials } from "realm-web";

import { createApp } from "./utils";

if (typeof GOOGLE_CLIENT_ID !== "string") {
    throw new Error("Missing the GOOGLE_CLIENT_ID environment variable");
}

const app = createApp();

// Following this guide on setting up Google Sign-In button
// https://developers.google.com/identity/sign-in/web/build-button

function onSuccess(googleUser: any) {
    const response = googleUser.getAuthResponse();
    const idToken = response.id_token;
    // Try authenticating with MongoDB Realm
    const credentials = Credentials.google(idToken);
    app.logIn(credentials).then(
        user => {
            console.log("Successfully authenticated as", user);
            document.body.style.backgroundColor = "#ccffcc";
        },
        err => {
            document.body.style.backgroundColor = "#ffcccc";
            alert(err);
            console.error(err);
        },
    );
}

function onFailure(err: Error) {
    document.body.style.backgroundColor = "#ffeeee";
    const details = err.message || JSON.stringify(err);
    alert(`Failed to authenticate with Google: ${details}`);
    console.error("Failed to authenticate with Google", err);
}

declare const gapi: any;
function renderButton() {
    gapi.signin2.render("google-signin-button", {
        scope: "profile email",
        longtitle: true,
        onsuccess: onSuccess,
        onfailure: onFailure,
    });
}

// Add the client id to the head-tag
const metaElement = document.createElement("meta");
metaElement.setAttribute("name", "google-signin-client_id");
metaElement.setAttribute("content", GOOGLE_CLIENT_ID);
document.head.appendChild(metaElement);

// Add a container for the button
const containerElement = document.createElement("div");
containerElement.setAttribute("id", "google-signin-button");
document.body.appendChild(containerElement);

// Add the Google SDK to the page
const scriptElement = document.createElement("script");
scriptElement.setAttribute("src", "https://apis.google.com/js/platform.js");
scriptElement.addEventListener("load", renderButton);
document.body.appendChild(scriptElement);
