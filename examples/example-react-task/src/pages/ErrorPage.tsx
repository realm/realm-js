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

import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';

import styles from '../styles/ErrorPage.module.css';

export function ErrorPage() {
  const navigate = useNavigate();
  const error = useRouteError();

  return (
    <div className={styles.container}>
      <h1>
        Oh no, an error occurred..
      </h1>
      {isRouteErrorResponse(error) && (
        <>
          <p>{`Status: ${error.status} ${error.statusText}`}</p>
          {error.data?.message && <p>{error.data.message}</p>}
        </>
      )}
      <button className={styles.button} onClick={() => navigate('/')}>
        Go back
      </button>
    </div>
  );
}
