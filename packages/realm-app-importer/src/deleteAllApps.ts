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
const fetch = require("node-fetch");

const getApps = async (headers: any) => {
  const options = {
    method: "GET",
    headers,
  };

  const result = await fetch(
    "https://realm-qa.mongodb.com/api/admin/v3.0/groups/62b9a958f75dad65d5a2dd39/apps",
    options,
  );

  const apps = await result.json();

  console.log(apps);

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
    await fetch(`https://realm-qa.mongodb.com/api/admin/v3.0/groups/62b9a958f75dad65d5a2dd39/apps/${app._id}`, options);
  });
};

const getLoginHeaders = async () => {
  const result = await fetch(`https://realm-qa.mongodb.com/api/admin/v3.0/auth/providers/mongodb-cloud/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "nnikbswv",
      apiKey: "1b17ff02-c070-4a86-ac84-0616796ed195",
    }),
  });

  console.log(result.ok);
  console.log(result);

  const resultJson = (await result.json()) as any;

  console.log(resultJson);

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${resultJson?.access_token ?? ""}`,
  };
};

const main = async () => {
  const headers = await getLoginHeaders();
  console.log(headers);
  const apps = await getApps(headers);

  deleteApps(apps, headers);
};

main();
