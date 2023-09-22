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

import { useAuth } from '@realm/react';

import logo from '../assets/logo.png';
import styles from '../styles/NavBar.module.css';

export function NavBar() {
  const { logOut } = useAuth();

  return (
    <nav className={styles.nav}>
      <img
        className={styles.logo}
        src={logo}
        alt='Realm by MongoDB'
      />
      <button className={styles.button} onClick={logOut}>
        Log out
      </button>
    </nav>
  );
}
