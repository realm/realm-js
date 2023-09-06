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

import React, {useEffect} from 'react';
import {Text, View} from 'react-native';
import {useApp, useAuth} from '@realm/react';

// TODO: Consider logging in with a "public" profile rather  than anonymous
//       in order to cache those login credentials.
export function AnonymousLogin() {
  const atlasApp = useApp();
  const {logInWithAnonymous, result} = useAuth();

  useEffect(() => {
    // Log in as an anonymous user if there is not a logged in user yet.
    if (!atlasApp.currentUser && !result.pending) {
      logInWithAnonymous();
    }
  }, [atlasApp.currentUser, logInWithAnonymous, result.pending]);

  // TODO: Replace.
  return (
    <View>
      <Text>Loading...</Text>
    </View>
  );
}
