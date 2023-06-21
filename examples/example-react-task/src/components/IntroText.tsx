////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import styles from '../styles/IntroText.module.css';

export function IntroText() {
  return (
    <div className={styles.container}>
      <p>
        Welcome to a MongoDB Realm, WASM, and Sync app!
      </p>
      <p>
        Add a task using the form at the top of the screen. It will create a
        task and store it in an in-memory realm, then sync it to MongoDB Atlas
        and any other apps connected to the same Atlas App.
      </p>
    </div>
  );
}
