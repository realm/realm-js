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

import {useCallback, useEffect, useState} from 'react';
import {ConnectionState} from 'realm';
import {useRealm} from '@realm/react';

/**
 * Handles setting up a connection listener and provides functions
 * for manually reconnecting and disconnecting from the sync session.
 */
export function useSyncConnection() {
  const realm = useRealm();
  const [isConnected, setIsConnected] = useState(true);

  /**
   * Reconnect to the sync session.
   */
  const reconnect = useCallback(() => {
    realm.syncSession?.resume();
  }, [realm]);

  /**
   * Disconnect from the sync session.
   */
  const disconnect = useCallback(() => {
    realm.syncSession?.pause();
  }, [realm]);

  useEffect(() => {
    /**
     * The connection listener - Will be invoked when the the underlying sync
     * session changes its connection state.
     *
     * @note
     * Be aware of that there may be a delay from the time of actual disconnect
     * until this listener is invoked.
     */
    const handleConnectionChange = (newState: ConnectionState) => {
      setIsConnected(newState === ConnectionState.Connected);
    };
    realm.syncSession?.addConnectionNotification(handleConnectionChange);

    return () =>
      realm.syncSession?.removeConnectionNotification(handleConnectionChange);
  }, [realm.syncSession]);

  return {isConnected, reconnect, disconnect};
}
