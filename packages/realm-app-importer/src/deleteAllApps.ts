////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import fetch from "node-fetch";

const PUBLIC_KEY = "nnikbswv";
const PRIVATE_KEY = "1b17ff02-c070-4a86-ac84-0616796ed195";
const GROUP_ID = "62b9a958f75dad65d5a2dd39";

const getApps = async (headers: any) => {
  const options = {
    method: "GET",
    headers,
  };

  const result = await fetch(`https://realm-qa.mongodb.com/api/admin/v3.0/groups/${GROUP_ID}/apps`, options);

  console.log(result.ok);
  console.log(result.statusText);

  const apps = await result.json();

  return apps;
};

const deleteApps = async (apps: any, headers: any) => {
  const options = {
    method: "DELETE",
    headers,
    body: "false",
  };

  console.log(apps);

  apps.forEach(async (app: any) => {
    await fetch(`https://realm-qa.mongodb.com/api/admin/v3.0/groups/${GROUP_ID}/apps/${app._id}`, options);
  });
};

const getLoginHeaders = async () => {
  const result = await fetch(`https://realm-qa.mongodb.com/api/admin/v3.0/auth/providers/mongodb-cloud/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: PUBLIC_KEY,
      apiKey: PRIVATE_KEY,
    }),
  });

  const resultJson = await result.json();

  console.log("results: ", resultJson);

  return {
    "content-type": "application/json",
    Authorization: `Bearer ${resultJson.access_token}`,
  };
};

const main = async () => {
  const headers = await getLoginHeaders();
  console.log("xxx: ", headers);
  const apps = await getApps(headers);

  deleteApps(apps, headers);
};

main();
