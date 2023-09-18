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

import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View, useWindowDimensions} from 'react-native';

import {Icon} from './Icon';
import {colors} from '../styles/colors';

type LoadingProps = {
  duration: number;
};

export function Loading({duration}: LoadingProps) {
  const [loading, setLoading] = useState(true);
  const {height, width} = useWindowDimensions();
  const styles = useMemo(
    () => getStyles({height, width, show: loading}),
    [height, width, loading],
  );

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (loading) {
      timerId = setTimeout(() => setLoading(false), duration);
    }
    return () => clearTimeout(timerId);
  }, [duration, loading]);

  return (
    <View style={styles.container}>
      <Icon name="alpha-n" color={colors.red} size={350} style={styles.logo} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

// We're using a function to get the styles in order to pass
// the props that may change.
type StylesProp = {
  height: number;
  width: number;
  show: boolean;
};
const getStyles = ({height, width, show}: StylesProp) =>
  StyleSheet.create({
    container: {
      display: show ? 'flex' : 'none',
      position: 'absolute',
      height,
      width,
      alignItems: 'center',
      backgroundColor: colors.black,
      zIndex: 1,
    },
    logo: {
      marginBottom: 40,
    },
    text: {
      color: colors.white,
      fontSize: 20,
    },
  });
