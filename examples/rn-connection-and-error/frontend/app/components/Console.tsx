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

import React, {memo, useEffect, useRef} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';

import {useLoggerOutput} from '../providers/LoggerProvider';

/**
 * Console for more easily showing log messages.
 *
 * @note
 * Used for demoing purposes.
 */
export function Console() {
  const outputRef = useRef<FlatList<string>>(null);
  const output = useLoggerOutput();

  useEffect(() => {
    outputRef.current?.scrollToEnd();
  }, [output.length]);

  return (
    <View style={styles.console}>
      <Text style={styles.label}>Console</Text>
      <FlatList
        ref={outputRef}
        data={output}
        renderItem={({item: message}) => <LogEntry message={message} />}
        style={styles.output}
      />
    </View>
  );
}

type LogEntryProps = {
  message: string;
};

const LogEntry = memo(function ({message}: LogEntryProps) {
  return <Text>{message}</Text>;
});

const styles = StyleSheet.create({
  console: {
    height: 200,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: 'black',
  },
  label: {
    color: 'gray',
  },
  output: {
    flex: 1,
  },
});
